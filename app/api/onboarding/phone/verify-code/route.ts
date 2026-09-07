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
  OnboardingContactVerificationServiceError,
  createOnboardingContactVerificationService
} from "@/lib/server/onboarding-contact-verification-service";

import {
  OnboardingNextHttpTrustAdapter,
  OnboardingNextHttpTrustAdapterError,
  setOnboardingSessionCookie
} from "@/lib/server/onboarding-next-http-trust-adapter";

import {
  PHONE_VERIFY_SESSION_LIMIT,
  derivePhoneChallengeUsageKey,
  derivePhoneRateLimitPhoneKey,
  derivePhoneRateLimitSessionKey
} from "@/lib/server/onboarding-phone-abuse-control";

import {
  OnboardingOtpChallengeBindingError,
  verifyOnboardingOtpChallengeBinding
} from "@/lib/server/onboarding-otp-challenge-binding";

import {
  OnboardingPhoneOtpV2Error,
  computePhoneVerificationEvidenceSha256,
  isPhoneOtpV2DevEchoEnabled,
  isValidPhoneForOtpV2,
  normalizePhoneForOtpV2,
  readPhoneOtpV2Secret,
  verifyPhoneOtpV2Code
} from "@/lib/server/onboarding-phone-otp-v2";

import {
  OnboardingSessionRuntimeOrchestrator
} from "@/lib/server/onboarding-session-runtime";

export const runtime =
  "nodejs";

const PHONE_SMS_PROVIDER_TIMEOUT_MILLISECONDS =
  8000;

type VerifyPhoneCodeRequestBody = {
  readonly phone_number?: unknown;
  readonly code?: unknown;
  readonly challenge_token?: unknown;
};

type TwilioVerifyCheckResponse = {
  readonly status: string;
};

type PhoneProviderFailureReason =
  | "UNSUPPORTED_SMS_PROVIDER"
  | "TWILIO_ACCOUNT_SID_MISSING"
  | "TWILIO_AUTH_TOKEN_MISSING"
  | "TWILIO_VERIFY_SERVICE_SID_MISSING"
  | "TWILIO_VERIFY_CHECK_REJECTED"
  | "TWILIO_VERIFY_INVALID_RESPONSE"
  | "TWILIO_VERIFY_NETWORK_ERROR"
  | "SMS_PROVIDER_TIMEOUT";

type TwilioVerifyConfig = {
  readonly accountSid: string;
  readonly authToken: string;
  readonly verifyServiceSid: string;
};

class PhoneProviderError
  extends Error
{
  readonly reason:
    PhoneProviderFailureReason;

  readonly providerStatus:
    number | undefined;

  readonly providerError:
    string | undefined;

  constructor(
    params: {
      readonly reason:
        PhoneProviderFailureReason;

      readonly message:
        string;

      readonly providerStatus?:
        number;

      readonly providerError?:
        string;
    }
  ) {
    super(params.message);

    this.name =
      "PhoneProviderError";

    this.reason =
      params.reason;

    this.providerStatus =
      params.providerStatus;

    this.providerError =
      params.providerError;
  }
}

const VERIFY_BODY_FIELDS =
  new Set([
    "phone_number",
    "code",
    "challenge_token"
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

function isPositiveRetryAfterSeconds(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}

function phoneVerifyRateLimited(
  retryAfterSeconds: number
): NextResponse {
  return NextResponse.json(
    {
      ok:
        false,
      reason:
        "PHONE_VERIFY_RATE_LIMITED",
      message:
        "Too many phone verification attempts. Retry later."
    },
    {
      status:
        429,
      headers: {
        "Retry-After":
          String(
            retryAfterSeconds
          )
      }
    }
  );
}

function isPlainJsonObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasOnlyVerifyFields(
  value: Record<string, unknown>
): boolean {
  return Object.keys(value)
    .every(
      (field) =>
        VERIFY_BODY_FIELDS.has(field)
    );
}

function requiredProviderEnv(
  name:
    | "TWILIO_ACCOUNT_SID"
    | "TWILIO_AUTH_TOKEN"
    | "TWILIO_VERIFY_SERVICE_SID"
): string {
  const value =
    process.env[name]?.trim();

  if (value) {
    return value;
  }

  const reason:
    PhoneProviderFailureReason =
      name === "TWILIO_ACCOUNT_SID"
        ? "TWILIO_ACCOUNT_SID_MISSING"
        : name === "TWILIO_AUTH_TOKEN"
          ? "TWILIO_AUTH_TOKEN_MISSING"
          : "TWILIO_VERIFY_SERVICE_SID_MISSING";

  throw new PhoneProviderError({
    reason,
    message:
      "SMS provider configuration is unavailable."
  });
}

function getTwilioVerifyConfig():
  TwilioVerifyConfig
{
  const provider =
    (
      process.env.HBCE_SMS_PROVIDER ??
      ""
    )
      .trim()
      .toLowerCase();

  if (
    provider !==
      "twilio_verify"
  ) {
    throw new PhoneProviderError({
      reason:
        "UNSUPPORTED_SMS_PROVIDER",
      message:
        "Configured SMS provider is unsupported."
    });
  }

  return {
    accountSid:
      requiredProviderEnv(
        "TWILIO_ACCOUNT_SID"
      ),

    authToken:
      requiredProviderEnv(
        "TWILIO_AUTH_TOKEN"
      ),

    verifyServiceSid:
      requiredProviderEnv(
        "TWILIO_VERIFY_SERVICE_SID"
      )
  };
}

function buildBasicAuthHeader(
  accountSid: string,
  authToken: string
): string {
  return `Basic ${Buffer.from(
    `${accountSid}:${authToken}`
  ).toString("base64")}`;
}

function sanitizeProviderError(
  value: string
): string {
  let result =
    value;

  const sensitiveValues = [
    process.env.TWILIO_AUTH_TOKEN,
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_VERIFY_SERVICE_SID
  ];

  for (
    const sensitiveValue
    of sensitiveValues
  ) {
    const normalized =
      sensitiveValue?.trim();

    if (normalized) {
      result =
        result.replaceAll(
          normalized,
          "[REDACTED]"
        );
    }
  }

  return result.slice(
    0,
    2000
  );
}

async function readProviderError(
  response: Response
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

async function checkTwilioPhoneVerification(
  params: {
    readonly phoneNumber:
      string;

    readonly code:
      string;
  }
): Promise<TwilioVerifyCheckResponse> {
  const config =
    getTwilioVerifyConfig();

  const requestBody =
    new URLSearchParams({
      To:
        params.phoneNumber,

      Code:
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
        `https://verify.twilio.com/v2/Services/${config.verifyServiceSid}/VerificationCheck`,
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

          body:
            requestBody,

          signal:
            providerSignal
        }
      );
  } catch {
    if (
      providerSignal.aborted
    ) {
      throw new PhoneProviderError({
        reason:
          "SMS_PROVIDER_TIMEOUT",

        message:
          "SMS verification provider request timed out."
      });
    }

    throw new PhoneProviderError({
      reason:
        "TWILIO_VERIFY_NETWORK_ERROR",

      message:
        "SMS verification provider request failed."
    });
  }

  if (!response.ok) {
    throw new PhoneProviderError({
      reason:
        "TWILIO_VERIFY_CHECK_REJECTED",

      message:
        "SMS verification provider rejected the verification check.",

      providerStatus:
        response.status,

      providerError:
        await readProviderError(
          response
        )
    });
  }

  let parsed:
    unknown;

  try {
    parsed =
      await response.json();
  } catch {
    throw new PhoneProviderError({
      reason:
        "TWILIO_VERIFY_INVALID_RESPONSE",

      message:
        "SMS verification provider returned an invalid response."
    });
  }

  if (
    !isPlainJsonObject(parsed) ||
    typeof parsed.status !== "string" ||
    parsed.status.length === 0
  ) {
    throw new PhoneProviderError({
      reason:
        "TWILIO_VERIFY_INVALID_RESPONSE",

      message:
        "SMS verification provider returned an invalid response."
    });
  }

  return {
    status:
      parsed.status
  };
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

function mapContactServiceError(
  error:
    OnboardingContactVerificationServiceError
): NextResponse {
  switch (error.code) {
    case "AUTHORITY_INVALID":
      return jsonError(
        "CONTACT_AUTHORITY_INVALID",
        409,
        "Canonical contact verification authority is no longer valid."
      );

    case "FACTOR_DENIED":
      return jsonError(
        "PHONE_FACTOR_DENIED",
        409,
        "Phone verification factor could not be recorded."
      );

    case "FINALIZATION_DENIED":
      return jsonError(
        "CONTACT_FINALIZATION_DENIED",
        409,
        "Contact verification finalization was denied."
      );

    case "DEPENDENCY_FAILURE":
      return jsonError(
        "CONTACT_DEPENDENCY_FAILURE",
        503,
        "Contact verification dependencies are unavailable."
      );
  }
}

export async function POST(
  request: NextRequest
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
    !hasOnlyVerifyFields(
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
      VerifyPhoneCodeRequestBody;

  if (
    typeof body.phone_number !== "string" ||
    typeof body.code !== "string" ||
    typeof body.challenge_token !== "string"
  ) {
    return jsonError(
      "MISSING_REQUIRED_FIELD",
      400,
      "Phone number, code and challenge token are required."
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
      "Phone number must be in international E.164 format."
    );
  }

  try {
    const sessionKeyDigest =
      derivePhoneRateLimitSessionKey(
        authority.sessionId
      );

    const sessionRateResult =
      await createNeonPhoneAbuseControlRepository()
        .consumeRateWindow({
          scope:
            "VERIFY_SESSION",
          keyDigest:
            sessionKeyDigest,
          now:
            new Date()
              .toISOString(),
          limit:
            PHONE_VERIFY_SESSION_LIMIT
        });

    if (
      sessionRateResult.status ===
        "RATE_LIMITED"
    ) {
      if (
        !isPositiveRetryAfterSeconds(
          sessionRateResult
            .retryAfterSeconds
        )
      ) {
        return jsonError(
          "PHONE_RATE_LIMIT_DEPENDENCY_FAILURE",
          503,
          "Phone verification rate-limit dependencies are unavailable."
        );
      }

      return phoneVerifyRateLimited(
        sessionRateResult
          .retryAfterSeconds
      );
    }
  } catch {
    return jsonError(
      "PHONE_RATE_LIMIT_DEPENDENCY_FAILURE",
      503,
      "Phone verification rate-limit dependencies are unavailable."
    );
  }

  let verifiedChallenge:
    ReturnType<
      typeof verifyOnboardingOtpChallengeBinding
    >;

  try {
    verifiedChallenge =
      verifyOnboardingOtpChallengeBinding({
        token:
          body.challenge_token,

        channel:
          "PHONE",

        sessionId:
          authority.sessionId,

        normalizedContact:
          normalizedPhone
      });
  } catch (error) {
    if (
      error instanceof
        OnboardingOtpChallengeBindingError
    ) {
      if (
        error.code ===
          "DEPENDENCY_FAILURE"
      ) {
        return jsonError(
          "CHALLENGE_DEPENDENCY_FAILURE",
          503,
          "Phone challenge verification dependencies are unavailable."
        );
      }

      if (
        error.code ===
          "EXPIRED_CHALLENGE"
      ) {
        return jsonError(
          "CHALLENGE_EXPIRED",
          400,
          "Phone verification challenge has expired."
        );
      }

      return jsonError(
        "INVALID_CHALLENGE",
        400,
        "Phone verification challenge is invalid."
      );
    }

    return jsonError(
      "CHALLENGE_DEPENDENCY_FAILURE",
      503,
      "Phone challenge verification dependencies are unavailable."
    );
  }

  let challengeDigest:
    string;

  let phoneKeyDigest:
    string;

  let challengeExpiresAtIso:
    string;

  try {
    challengeDigest =
      derivePhoneChallengeUsageKey(
        body.challenge_token
      );

    phoneKeyDigest =
      derivePhoneRateLimitPhoneKey(
        normalizedPhone
      );

    challengeExpiresAtIso =
      new Date(
        verifiedChallenge
          .expiresAtEpochSeconds *
          1000
      ).toISOString();

    const attemptResult =
      await createNeonPhoneAbuseControlRepository()
        .recordChallengeAttempt({
          challengeDigest,
          sessionId:
            authority.sessionId,
          phoneKeyDigest,
          expiresAt:
            challengeExpiresAtIso,
          now:
            new Date()
              .toISOString()
        });

    if (
      attemptResult.status ===
        "ATTEMPT_LIMITED"
    ) {
      if (
        !isPositiveRetryAfterSeconds(
          attemptResult
            .retryAfterSeconds
        )
      ) {
        return jsonError(
          "PHONE_RATE_LIMIT_DEPENDENCY_FAILURE",
          503,
          "Phone verification rate-limit dependencies are unavailable."
        );
      }

      return phoneVerifyRateLimited(
        attemptResult
          .retryAfterSeconds
      );
    }

    if (
      attemptResult.status !==
        "ATTEMPT_RECORDED"
    ) {
      return jsonError(
        "INVALID_CHALLENGE",
        400,
        "Phone verification challenge is invalid."
      );
    }
  } catch {
    return jsonError(
      "PHONE_RATE_LIMIT_DEPENDENCY_FAILURE",
      503,
      "Phone verification rate-limit dependencies are unavailable."
    );
  }

  const otpContext = {
    sessionId:
      authority.sessionId,

    normalizedPhone,

    challengeNonce:
      verifiedChallenge.nonce,

    issuedAtEpochSeconds:
      verifiedChallenge.issuedAtEpochSeconds,

    expiresAtEpochSeconds:
      verifiedChallenge.expiresAtEpochSeconds
  };

  try {
    const secret =
      readPhoneOtpV2Secret();

    if (
      !verifyPhoneOtpV2Code(
        otpContext,
        body.code,
        secret
      )
    ) {
      return jsonError(
        "INVALID_OTP",
        400,
        "Phone verification code is invalid."
      );
    }
  } catch (error) {
    if (
      error instanceof
        OnboardingPhoneOtpV2Error
    ) {
      if (
        error.reason ===
          "PHONE_OTP_SECRET_MISSING" ||
        error.reason ===
          "PHONE_OTP_SECRET_INVALID"
      ) {
        return jsonError(
          "OTP_DEPENDENCY_FAILURE",
          503,
          "Phone OTP verification dependencies are unavailable."
        );
      }

      return jsonError(
        "INVALID_OTP_CONTEXT",
        400,
        "Phone OTP verification context is invalid."
      );
    }

    return jsonError(
      "OTP_DEPENDENCY_FAILURE",
      503,
      "Phone OTP verification dependencies are unavailable."
    );
  }

  if (
    !isPhoneOtpV2DevEchoEnabled()
  ) {
    let providerVerification:
      TwilioVerifyCheckResponse;

    try {
      providerVerification =
        await checkTwilioPhoneVerification({
          phoneNumber:
            normalizedPhone,

          code:
            body.code
        });
    } catch (error) {
      if (
        error instanceof
          PhoneProviderError
      ) {
    if (
      error.reason ===
        "SMS_PROVIDER_TIMEOUT"
    ) {
      console.error(
        "[HBCE_ONBOARDING_PHONE_VERIFY_PROVIDER_TIMEOUT]",
        {
          reason:
            "SMS_PROVIDER_TIMEOUT"
        }
      );

      return jsonError(
        "SMS_PROVIDER_TIMEOUT",
        504,
        "SMS verification provider request timed out."
      );
    }


        console.error(
          "[HBCE_ONBOARDING_PHONE_VERIFY_PROVIDER_FAILED]",
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
            ok: false,

            reason:
              error.reason,

            message:
              "Phone verification provider confirmation failed.",

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
        "[HBCE_ONBOARDING_PHONE_VERIFY_PROVIDER_UNKNOWN_FAILED]"
      );

      return jsonError(
        "PHONE_PROVIDER_FAILURE",
        502,
        "Phone verification provider confirmation failed."
      );
    }

    if (
      providerVerification.status !==
        "approved"
    ) {
      return jsonError(
        "PHONE_CODE_NOT_APPROVED",
        400,
        "Phone verification failed. Invalid or expired SMS code."
      );
    }
  }

  let verifiedAtIso:
    string;

  try {
    const successResult =
      await createNeonPhoneAbuseControlRepository()
        .consumeChallengeSuccess({
          challengeDigest,
          sessionId:
            authority.sessionId,
          phoneKeyDigest,
          expiresAt:
            challengeExpiresAtIso,
          now:
            new Date()
              .toISOString()
        });

    if (
      successResult.status !==
        "CONSUMED"
    ) {
      return jsonError(
        "INVALID_CHALLENGE",
        400,
        "Phone verification challenge is invalid."
      );
    }

    verifiedAtIso =
      successResult.consumedAt;
  } catch {
    return jsonError(
      "PHONE_RATE_LIMIT_DEPENDENCY_FAILURE",
      503,
      "Phone verification rate-limit dependencies are unavailable."
    );
  }

  let verificationEvidenceSha256:
    string;

  try {
    verificationEvidenceSha256 =
      computePhoneVerificationEvidenceSha256({
        sessionId:
          authority.sessionId,

        normalizedPhone,

        challengeToken:
          body.challenge_token,

        verifiedAtIso
      });
  } catch {
    return jsonError(
      "VERIFICATION_EVIDENCE_FAILURE",
      503,
      "Phone verification evidence could not be created."
    );
  }

  const contactService =
    createOnboardingContactVerificationService();

  let finalization;

  try {
    await contactService
      .recordFactor(
        authority,
        {
          factor:
            "PHONE_VERIFIED",

          verificationEvidenceSha256
        }
      );

    finalization =
      await contactService
        .finalizeContact(
          authority
        );
  } catch (error) {
    if (
      error instanceof
        OnboardingContactVerificationServiceError
    ) {
      return mapContactServiceError(
        error
      );
    }

    return jsonError(
      "CONTACT_DEPENDENCY_FAILURE",
      503,
      "Contact verification dependencies are unavailable."
    );
  }

  const response =
    NextResponse.json({
      ok: true,

      phone_verified:
        true,

      phone_verified_at:
        verifiedAtIso,

      phone_verification_channel:
        "SMS_OTP",

      phone_verification_hash:
        verificationEvidenceSha256,

      contact_state:
        finalization.status
    });

  if (
    finalization.status ===
      "CONTACT_VERIFIED"
  ) {
    try {
      setOnboardingSessionCookie(
        response,
        finalization.rawToken
      );
    } catch {
      return jsonError(
        "COOKIE_ROTATION_FAILURE",
        503,
        "CONTACT_VERIFIED session cookie could not be installed."
      );
    }
  }

  return response;
}
