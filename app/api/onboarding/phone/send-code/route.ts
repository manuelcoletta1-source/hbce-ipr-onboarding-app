import {
  NextResponse,
  type NextRequest
} from "next/server";

import {
  createNeonOnboardingSessionLifecycleCommands
} from "@/lib/server/neon-onboarding-session-lifecycle-commands";

import {
  createNeonOnboardingSessionRepository
} from "@/lib/server/neon-onboarding-session-repository";

import {
  createNeonPhoneAbuseControlRepository
} from "@/lib/server/neon-phone-abuse-control-repository";

import {
  OnboardingNextHttpTrustAdapter,
  OnboardingNextHttpTrustAdapterError
} from "@/lib/server/onboarding-next-http-trust-adapter";

import {
  derivePhoneRateLimitPhoneKey,
  derivePhoneRateLimitSessionKey
} from "@/lib/server/onboarding-phone-abuse-control";

import {
  createOnboardingOtpChallengeBinding
} from "@/lib/server/onboarding-otp-challenge-binding";

import {
  OnboardingPhoneOtpV2Error,
  derivePhoneOtpV2Code,
  isPhoneOtpV2DevEchoEnabled,
  isValidPhoneForOtpV2,
  normalizePhoneForOtpV2,
  readPhoneOtpV2Secret
} from "@/lib/server/onboarding-phone-otp-v2";

import {
  OnboardingSessionRuntimeOrchestrator
} from "@/lib/server/onboarding-session-runtime";

export const runtime =
  "nodejs";

const PHONE_SMS_PROVIDER_TIMEOUT_MILLISECONDS =
  8000;

type SendPhoneCodeRequestBody = {
  readonly phone_number?:
    unknown;
};

type SmsProvider =
  "twilio_verify";

type PhoneSendFailureReason =
  | "UNSUPPORTED_SMS_PROVIDER"
  | "TWILIO_ACCOUNT_SID_MISSING"
  | "TWILIO_AUTH_TOKEN_MISSING"
  | "TWILIO_VERIFY_SERVICE_SID_MISSING"
  | "TWILIO_VERIFY_SEND_REJECTED"
  | "TWILIO_VERIFY_INVALID_RESPONSE"
  | "TWILIO_VERIFY_NETWORK_ERROR"
  | "SMS_PROVIDER_TIMEOUT";

type SmsProviderConfig = {
  readonly provider:
    SmsProvider;

  readonly accountSid:
    string;

  readonly authToken:
    string;

  readonly verifyServiceSid:
    string;
};

type TwilioVerifyStartResponse = {
  readonly sid?:
    string;

  readonly status?:
    string;
};

class PhoneSendError
  extends Error
{
  readonly reason:
    PhoneSendFailureReason;

  readonly providerStatus:
    number | undefined;

  readonly providerError:
    string | undefined;

  constructor(
    params: {
      readonly reason:
        PhoneSendFailureReason;

      readonly message:
        string;

      readonly providerStatus?:
        number;

      readonly providerError?:
        string;
    }
  ) {
    super(
      params.message
    );

    this.name =
      "PhoneSendError";

    this.reason =
      params.reason;

    this.providerStatus =
      params.providerStatus;

    this.providerError =
      params.providerError;
  }
}

const SEND_BODY_FIELDS =
  new Set([
    "phone_number"
  ]);

function jsonError(
  reason: string,
  status: number,
  message: string
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      reason,
      message
    },
    {
      status
    }
  );
}

function isPlainJsonObject(
  value: unknown
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(
      value
    )
  );
}

function hasOnlySendFields(
  value:
    Record<
      string,
      unknown
    >
): boolean {
  return Object.keys(
    value
  ).every(
    (field) =>
      SEND_BODY_FIELDS.has(
        field
      )
  );
}

function getRequiredProviderEnv(
  name:
    | "TWILIO_ACCOUNT_SID"
    | "TWILIO_AUTH_TOKEN"
    | "TWILIO_VERIFY_SERVICE_SID"
): string {
  const value =
    process.env[
      name
    ]?.trim();

  if (!value) {
    throw new PhoneSendError({
      reason:
        `${name}_MISSING`,
      message:
        "SMS provider configuration is unavailable."
    });
  }

  return value;
}

function getSmsProviderConfig():
  SmsProviderConfig
{
  const provider =
    (
      process.env
        .HBCE_SMS_PROVIDER ??
      ""
    )
      .trim()
      .toLowerCase();

  if (
    provider !==
      "twilio_verify"
  ) {
    throw new PhoneSendError({
      reason:
        "UNSUPPORTED_SMS_PROVIDER",
      message:
        "Configured SMS provider is unsupported."
    });
  }

  return {
    provider:
      "twilio_verify",

    accountSid:
      getRequiredProviderEnv(
        "TWILIO_ACCOUNT_SID"
      ),

    authToken:
      getRequiredProviderEnv(
        "TWILIO_AUTH_TOKEN"
      ),

    verifyServiceSid:
      getRequiredProviderEnv(
        "TWILIO_VERIFY_SERVICE_SID"
      )
  };
}

function buildBasicAuthHeader(
  accountSid:
    string,
  authToken:
    string
): string {
  return `Basic ${Buffer.from(
    `${accountSid}:${authToken}`
  ).toString(
    "base64"
  )}`;
}

function sanitizeProviderError(
  errorText:
    string
): string {
  const secrets = [
    process.env
      .TWILIO_AUTH_TOKEN
      ?.trim(),

    process.env
      .TWILIO_ACCOUNT_SID
      ?.trim(),

    process.env
      .TWILIO_VERIFY_SERVICE_SID
      ?.trim()
  ].filter(
    (
      value
    ): value is string =>
      typeof value ===
        "string" &&
      value.length >
        0
  );

  let sanitized =
    errorText;

  for (
    const secret
    of secrets
  ) {
    sanitized =
      sanitized.replaceAll(
        secret,
        "[REDACTED_TWILIO_VALUE]"
      );
  }

  return sanitized.slice(
    0,
    2000
  );
}

async function readProviderError(
  response:
    Response
): Promise<string> {
  try {
    return sanitizeProviderError(
      await response.text()
    );
  } catch {
    return (
      "SMS provider response body could not be read."
    );
  }
}

async function sendPhoneCodeWithProvider(
  params: {
    readonly to:
      string;

    readonly code:
      string;
  }
): Promise<void> {
  const config =
    getSmsProviderConfig();

  const body =
    new URLSearchParams({
      To:
        params.to,

      Channel:
        "sms",

      CustomCode:
        params.code
    });

  let response:
    Response;

  const providerSignal =
    AbortSignal.timeout(
      PHONE_SMS_PROVIDER_TIMEOUT_MILLISECONDS
    );

  try {
    response =
      await fetch(
        `https://verify.twilio.com/v2/Services/${config.verifyServiceSid}/Verifications`,
        {
          method:
            "POST",

          headers: {
            Authorization:
              buildBasicAuthHeader(
                config.accountSid,
                config.authToken
              ),

            "Content-Type":
              "application/x-www-form-urlencoded"
          },

          body,

          signal:
            providerSignal
        }
      );
  } catch {
    if (
      providerSignal.aborted
    ) {
      throw new PhoneSendError({
        reason:
          "SMS_PROVIDER_TIMEOUT",

        message:
          "SMS provider request timed out."
      });
    }

    throw new PhoneSendError({
      reason:
        "TWILIO_VERIFY_NETWORK_ERROR",

      message:
        "SMS provider network request failed."
    });
  }

  if (
    !response.ok
  ) {
    throw new PhoneSendError({
      reason:
        "TWILIO_VERIFY_SEND_REJECTED",

      message:
        "SMS provider rejected the verification request.",

      providerStatus:
        response.status,

      providerError:
        await readProviderError(
          response
        )
    });
  }

  let data:
    TwilioVerifyStartResponse;

  try {
    data =
      await response.json() as
        TwilioVerifyStartResponse;
  } catch {
    throw new PhoneSendError({
      reason:
        "TWILIO_VERIFY_INVALID_RESPONSE",

      message:
        "SMS provider returned an invalid verification response.",

      providerStatus:
        response.status
    });
  }

  if (
    typeof data.sid !==
      "string" ||
    data.sid.length ===
      0 ||
    typeof data.status !==
      "string" ||
    data.status.length ===
      0
  ) {
    throw new PhoneSendError({
      reason:
        "TWILIO_VERIFY_INVALID_RESPONSE",

      message:
        "SMS provider returned an invalid verification response.",

      providerStatus:
        response.status
    });
  }
}

function createTrustAdapter():
  OnboardingNextHttpTrustAdapter
{
  const repository =
    createNeonOnboardingSessionRepository();

  const lifecycle =
    createNeonOnboardingSessionLifecycleCommands();

  const sessionRuntime =
    new OnboardingSessionRuntimeOrchestrator(
      repository,
      lifecycle
    );

  return new OnboardingNextHttpTrustAdapter(
    sessionRuntime
  );
}

export async function POST(
  request:
    NextRequest
): Promise<NextResponse> {
  let authority;

  try {
    authority =
      await createTrustAdapter()
        .authorize({
          request,

          requestPolicy:
            "STATE_CHANGING",

          requiredState:
            "STARTED"
        });
  } catch (error) {
    if (
      error instanceof
        OnboardingNextHttpTrustAdapterError
    ) {
      switch (
        error.httpStatus
      ) {
        case 401:
          return jsonError(
            "SESSION_UNAUTHORIZED",
            401,
            "A valid onboarding session is required."
          );

        case 403:
          return jsonError(
            "REQUEST_FORBIDDEN",
            403,
            "The onboarding request is not authorized."
          );

        case 503:
          return jsonError(
            "TRUST_DEPENDENCY_FAILURE",
            503,
            "Onboarding trust dependencies are unavailable."
          );
      }
    }

    return jsonError(
      "TRUST_DEPENDENCY_FAILURE",
      503,
      "Onboarding trust dependencies are unavailable."
    );
  }

  if (
    authority.issuedState !==
      "STARTED"
  ) {
    return jsonError(
      "SESSION_STATE_FORBIDDEN",
      403,
      "Phone verification requires an exact STARTED onboarding session."
    );
  }

  let parsedBody:
    unknown;

  try {
    parsedBody =
      await request.json();
  } catch {
    return jsonError(
      "INVALID_JSON",
      400,
      "Invalid request body."
    );
  }

  if (
    !isPlainJsonObject(
      parsedBody
    ) ||
    !hasOnlySendFields(
      parsedBody
    )
  ) {
    return jsonError(
      "INVALID_BODY",
      400,
      "Invalid phone verification request."
    );
  }

  const body =
    parsedBody as
      SendPhoneCodeRequestBody;

  if (
    typeof body
      .phone_number !==
      "string"
  ) {
    return jsonError(
      "INVALID_PHONE_NUMBER",
      400,
      "Phone number is required."
    );
  }

  const normalizedPhone =
    normalizePhoneForOtpV2(
      body.phone_number
    );

  if (
    !isValidPhoneForOtpV2(
      normalizedPhone
    )
  ) {
    return jsonError(
      "INVALID_PHONE_NUMBER",
      400,
      "Phone number must be in canonical international E.164 format."
    );
  }

  try {
    const phoneKeyDigest =
      derivePhoneRateLimitPhoneKey(
        normalizedPhone
      );

    const sessionKeyDigest =
      derivePhoneRateLimitSessionKey(
        authority.sessionId
      );

    const rateNow =
      new Date().toISOString();

    const rateResult =
      await createNeonPhoneAbuseControlRepository()
        .consumeSendRateWindows({
          sessionKeyDigest,
          phoneKeyDigest,
          now:
            rateNow
        });

    if (
      rateResult.status ===
        "RATE_LIMITED"
    ) {
      return NextResponse.json(
        {
          ok:
            false,
          reason:
            "PHONE_SEND_RATE_LIMITED",
          message:
            "Too many phone verification requests. Retry later."
        },
        {
          status:
            429,
          headers: {
            "Retry-After":
              String(
                rateResult
                  .retryAfterSeconds
              )
          }
        }
      );
    }
  } catch {
    return jsonError(
      "PHONE_RATE_LIMIT_DEPENDENCY_FAILURE",
      503,
      "Phone rate-limit dependency is unavailable."
    );
  }

  let challenge:
    ReturnType<
      typeof createOnboardingOtpChallengeBinding
    >;

  let otpCode:
    string;

  try {
    challenge =
      createOnboardingOtpChallengeBinding({
        channel:
          "PHONE",

        sessionId:
          authority.sessionId,

        normalizedContact:
          normalizedPhone
      });

    const secret =
      readPhoneOtpV2Secret();

    otpCode =
      derivePhoneOtpV2Code(
        {
          sessionId:
            authority.sessionId,

          normalizedPhone,

          challengeNonce:
            challenge.nonce,

          issuedAtEpochSeconds:
            challenge.issuedAtEpochSeconds,

          expiresAtEpochSeconds:
            challenge.expiresAtEpochSeconds
        },
        secret
      );
  } catch (error) {
    if (
      error instanceof
        OnboardingPhoneOtpV2Error
    ) {
      return jsonError(
        "OTP_DEPENDENCY_FAILURE",
        503,
        "Phone verification dependencies are unavailable."
      );
    }

    return jsonError(
      "OTP_DEPENDENCY_FAILURE",
      503,
      "Phone verification dependencies are unavailable."
    );
  }

  if (
    isPhoneOtpV2DevEchoEnabled()
  ) {
    return NextResponse.json({
      ok:
        true,

      message:
        "Phone verification code generated in certified non-production development mode.",

      challenge_token:
        challenge.token,

      expires_at:
        challenge.expiresAtEpochSeconds,

      dev_echo:
        true,

      dev_code:
        otpCode
    });
  }

  try {
    await sendPhoneCodeWithProvider({
      to:
        normalizedPhone,

      code:
        otpCode
    });
  } catch (error) {
    if (
      error instanceof
        PhoneSendError
    ) {
    if (
      error.reason ===
        "SMS_PROVIDER_TIMEOUT"
    ) {
      console.error(
        "[HBCE_ONBOARDING_PHONE_SEND_TIMEOUT]",
        {
          reason:
            "SMS_PROVIDER_TIMEOUT"
        }
      );

      return NextResponse.json(
        {
          ok:
            false,

          reason:
            "SMS_PROVIDER_TIMEOUT",

          message:
            "SMS provider request timed out."
        },
        {
          status:
            504
        }
      );
    }


      console.error(
        "[HBCE_ONBOARDING_PHONE_SEND_FAILED]",
        {
          reason:
            error.reason,

          provider_status:
            error.providerStatus,

          provider_error:
            error.providerError
        }
      );

      return NextResponse.json(
        {
          ok:
            false,

          reason:
            error.reason,

          message:
            "Phone verification code could not be sent.",

          provider_status:
            error.providerStatus ??
            null
        },
        {
          status:
            502
        }
      );
    }

    console.error(
      "[HBCE_ONBOARDING_PHONE_SEND_UNKNOWN_FAILED]"
    );

    return jsonError(
      "PHONE_SEND_FAILED",
      502,
      "Phone verification code could not be sent."
    );
  }

  return NextResponse.json({
    ok:
      true,

    message:
      "SMS verification code sent.",

    challenge_token:
      challenge.token,

    expires_at:
      challenge.expiresAtEpochSeconds,

    dev_echo:
      false
  });
}
