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
  OnboardingContactVerificationServiceError,
  createOnboardingContactVerificationService
} from "@/lib/server/onboarding-contact-verification-service";

import {
  OnboardingEmailOtpV2Error,
  computeEmailVerificationEvidenceSha256,
  isValidEmailForOtpV2,
  normalizeEmailForOtpV2,
  readEmailOtpV2Secret,
  verifyEmailOtpV2Code
} from "@/lib/server/onboarding-email-otp-v2";

import {
  OnboardingNextHttpTrustAdapter,
  OnboardingNextHttpTrustAdapterError,
  setOnboardingSessionCookie
} from "@/lib/server/onboarding-next-http-trust-adapter";

import {
  OnboardingOtpChallengeBindingError,
  verifyOnboardingOtpChallengeBinding
} from "@/lib/server/onboarding-otp-challenge-binding";

import {
  OnboardingSessionRuntimeOrchestrator
} from "@/lib/server/onboarding-session-runtime";

export const runtime =
  "nodejs";

type VerifyCodeRequestBody = {
  readonly email?: unknown;
  readonly code?: unknown;
  readonly challenge_token?: unknown;
};

const VERIFY_BODY_FIELDS =
  new Set([
    "email",
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

function hasOnlyVerifyFields(
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
      VERIFY_BODY_FIELDS.has(
        field
      )
  );
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
        "EMAIL_FACTOR_DENIED",
        409,
        "Email verification factor could not be recorded."
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
    !hasOnlyVerifyFields(
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
      VerifyCodeRequestBody;

  if (
    typeof body.email !==
      "string" ||
    typeof body.code !==
      "string" ||
    typeof body.challenge_token !==
      "string"
  ) {
    return jsonError(
      "MISSING_REQUIRED_FIELD",
      400,
      "Email, code and challenge token are required."
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
          "EMAIL",

        sessionId:
          authority.sessionId,

        normalizedContact:
          normalizedEmail
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
          "Email challenge verification dependencies are unavailable."
        );
      }

      if (
        error.code ===
          "EXPIRED_CHALLENGE"
      ) {
        return jsonError(
          "CHALLENGE_EXPIRED",
          400,
          "Email verification challenge has expired."
        );
      }

      return jsonError(
        "INVALID_CHALLENGE",
        400,
        "Email verification challenge is invalid."
      );
    }

    return jsonError(
      "CHALLENGE_DEPENDENCY_FAILURE",
      503,
      "Email challenge verification dependencies are unavailable."
    );
  }

  const otpContext = {
    sessionId:
      authority.sessionId,

    normalizedEmail,

    challengeNonce:
      verifiedChallenge.nonce,

    issuedAtEpochSeconds:
      verifiedChallenge.issuedAtEpochSeconds,

    expiresAtEpochSeconds:
      verifiedChallenge.expiresAtEpochSeconds
  };

  try {
    const secret =
      readEmailOtpV2Secret();

    if (
      !verifyEmailOtpV2Code(
        otpContext,
        body.code,
        secret
      )
    ) {
      return jsonError(
        "INVALID_OTP",
        400,
        "Email verification code is invalid."
      );
    }
  } catch (error) {
    if (
      error instanceof
        OnboardingEmailOtpV2Error
    ) {
      if (
        error.code ===
          "OTP_SECRET_MISSING"
      ) {
        return jsonError(
          "OTP_DEPENDENCY_FAILURE",
          503,
          "Email OTP verification dependencies are unavailable."
        );
      }

      return jsonError(
        "INVALID_OTP_CONTEXT",
        400,
        "Email OTP verification context is invalid."
      );
    }

    return jsonError(
      "OTP_DEPENDENCY_FAILURE",
      503,
      "Email OTP verification dependencies are unavailable."
    );
  }

  const verifiedAtIso =
    new Date()
      .toISOString();

  let verificationEvidenceSha256:
    string;

  try {
    verificationEvidenceSha256 =
      computeEmailVerificationEvidenceSha256({
        sessionId:
          authority.sessionId,

        normalizedEmail,

        challengeToken:
          body.challenge_token,

        verifiedAtIso
      });
  } catch (error) {
    if (
      error instanceof
        OnboardingEmailOtpV2Error
    ) {
      return jsonError(
        "VERIFICATION_EVIDENCE_FAILURE",
        503,
        "Email verification evidence could not be created."
      );
    }

    return jsonError(
      "VERIFICATION_EVIDENCE_FAILURE",
      503,
      "Email verification evidence could not be created."
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
            "EMAIL_VERIFIED",

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

      email_verified:
        true,

      email_verified_at:
        verifiedAtIso,

      email_verification_channel:
        "EMAIL_OTP",

      email_verification_hash:
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
