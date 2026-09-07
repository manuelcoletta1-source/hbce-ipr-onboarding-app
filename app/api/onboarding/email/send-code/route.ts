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
  OnboardingNextHttpTrustAdapter,
  OnboardingNextHttpTrustAdapterError
} from "@/lib/server/onboarding-next-http-trust-adapter";

import {
  createOnboardingOtpChallengeBinding
} from "@/lib/server/onboarding-otp-challenge-binding";

import {
  OnboardingEmailOtpV2Error,
  deriveEmailOtpV2Code,
  isEmailOtpV2DevEchoEnabled,
  isValidEmailForOtpV2,
  normalizeEmailForOtpV2,
  readEmailOtpV2Secret
} from "@/lib/server/onboarding-email-otp-v2";

import {
  OnboardingSessionRuntimeOrchestrator
} from "@/lib/server/onboarding-session-runtime";

export const runtime =
  "nodejs";

type SendCodeRequestBody = {
  readonly email?: unknown;
};

type EmailProvider =
  "resend";

type EmailSendFailureReason =
  | "UNSUPPORTED_EMAIL_PROVIDER"
  | "EMAIL_FROM_MISSING"
  | "RESEND_API_KEY_MISSING"
  | "RESEND_SEND_REJECTED"
  | "RESEND_NETWORK_ERROR";

type EmailProviderConfig = {
  readonly provider:
    EmailProvider;

  readonly from:
    string;

  readonly resendApiKey:
    string;
};

class EmailSendError
  extends Error
{
  readonly reason:
    EmailSendFailureReason;

  readonly providerStatus:
    number | undefined;

  readonly providerError:
    string | undefined;

  constructor(
    params: {
      readonly reason:
        EmailSendFailureReason;

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
      "EmailSendError";

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
    "email"
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

function sanitizeProviderError(
  errorText: string
): string {
  const resendApiKey =
    process.env
      .RESEND_API_KEY
      ?.trim();

  if (!resendApiKey) {
    return errorText.slice(
      0,
      2000
    );
  }

  return errorText
    .replaceAll(
      resendApiKey,
      "[REDACTED_RESEND_API_KEY]"
    )
    .slice(
      0,
      2000
    );
}

function getEmailProviderConfig():
  EmailProviderConfig
{
  const provider =
    (
      process.env
        .HBCE_EMAIL_PROVIDER ??
      "resend"
    )
      .trim()
      .toLowerCase();

  const from =
    process.env
      .HBCE_EMAIL_FROM
      ?.trim();

  const resendApiKey =
    process.env
      .RESEND_API_KEY
      ?.trim();

  if (
    provider !==
      "resend"
  ) {
    throw new EmailSendError({
      reason:
        "UNSUPPORTED_EMAIL_PROVIDER",
      message:
        "Configured email provider is unsupported."
    });
  }

  if (!from) {
    throw new EmailSendError({
      reason:
        "EMAIL_FROM_MISSING",
      message:
        "Email sender configuration is unavailable."
    });
  }

  if (!resendApiKey) {
    throw new EmailSendError({
      reason:
        "RESEND_API_KEY_MISSING",
      message:
        "Email provider configuration is unavailable."
    });
  }

  return {
    provider:
      "resend",
    from,
    resendApiKey
  };
}

async function readResponseBody(
  response:
    Response
): Promise<string> {
  try {
    return sanitizeProviderError(
      await response.text()
    );
  } catch {
    return (
      "Provider response body could not be read."
    );
  }
}

async function sendEmailWithProvider(
  params: {
    readonly to:
      string;

    readonly code:
      string;
  }
): Promise<void> {
  const config =
    getEmailProviderConfig();

  let response:
    Response;

  try {
    response =
      await fetch(
        "https://api.resend.com/emails",
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${config.resendApiKey}`,

            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              from:
                config.from,

              to:
                params.to,

              subject:
                "HBCE IPR email verification code",

              text: [
                "HBCE IPR Onboarding",
                "",
                `Your verification code is: ${params.code}`,
                "",
                "This code expires shortly.",
                "If you did not request this code, ignore this email.",
                "",
                "HERMETICUM B.C.E. S.r.l."
              ].join(
                "\n"
              ),

              html: [
                '<div style="font-family:Arial,sans-serif;line-height:1.5">',
                "<h2>HBCE IPR Onboarding</h2>",
                "<p>Your verification code is:</p>",
                `<p style="font-size:24px;font-weight:bold;letter-spacing:4px">${params.code}</p>`,
                "<p>This code expires shortly.</p>",
                "<p>If you did not request this code, ignore this email.</p>",
                "<p><strong>HERMETICUM B.C.E. S.r.l.</strong></p>",
                "</div>"
              ].join(
                ""
              )
            })
        }
      );
  } catch (error) {
    throw new EmailSendError({
      reason:
        "RESEND_NETWORK_ERROR",

      message:
        error instanceof Error
          ? error.message
          : "Email provider network request failed."
    });
  }

  if (!response.ok) {
    throw new EmailSendError({
      reason:
        "RESEND_SEND_REJECTED",

      message:
        "Email provider rejected the verification message.",

      providerStatus:
        response.status,

      providerError:
        await readResponseBody(
          response
        )
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
      "Email verification requires an exact STARTED onboarding session."
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
      "Invalid email verification request."
    );
  }

  const body =
    parsedBody as
      SendCodeRequestBody;

  if (
    typeof body.email !==
      "string"
  ) {
    return jsonError(
      "INVALID_EMAIL",
      400,
      "Email is required."
    );
  }

  const normalizedEmail =
    normalizeEmailForOtpV2(
      body.email
    );

  if (
    !isValidEmailForOtpV2(
      normalizedEmail
    )
  ) {
    return jsonError(
      "INVALID_EMAIL",
      400,
      "Email address is invalid."
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
          "EMAIL",

        sessionId:
          authority.sessionId,

        normalizedContact:
          normalizedEmail
      });

    const secret =
      readEmailOtpV2Secret();

    otpCode =
      deriveEmailOtpV2Code(
        {
          sessionId:
            authority.sessionId,

          normalizedEmail,

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
        OnboardingEmailOtpV2Error
    ) {
      return jsonError(
        "OTP_DEPENDENCY_FAILURE",
        503,
        "Email verification dependencies are unavailable."
      );
    }

    return jsonError(
      "OTP_DEPENDENCY_FAILURE",
      503,
      "Email verification dependencies are unavailable."
    );
  }

  if (
    isEmailOtpV2DevEchoEnabled()
  ) {
    return NextResponse.json({
      ok: true,

      message:
        "Email verification code generated in certified non-production development mode.",

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
    await sendEmailWithProvider({
      to:
        normalizedEmail,

      code:
        otpCode
    });
  } catch (error) {
    if (
      error instanceof
        EmailSendError
    ) {
      console.error(
        "[HBCE_ONBOARDING_EMAIL_SEND_FAILED]",
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
            "Email verification code could not be sent.",

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
      "[HBCE_ONBOARDING_EMAIL_SEND_UNKNOWN_FAILED]"
    );

    return jsonError(
      "EMAIL_SEND_FAILED",
      502,
      "Email verification code could not be sent."
    );
  }

  return NextResponse.json({
    ok: true,

    message:
      "Email verification code sent.",

    challenge_token:
      challenge.token,

    expires_at:
      challenge.expiresAtEpochSeconds,

    dev_echo:
      false
  });
}
