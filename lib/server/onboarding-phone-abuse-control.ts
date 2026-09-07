import "server-only";

import {
  createHash,
  createHmac
} from "node:crypto";

export const PHONE_ABUSE_CONTROL_PURE_DESIGN_SHA256 =
  "ddac743e2e01fb46d223f48372bce543e91b60dba87f9770e1efd6c77fe70ae9";

export const HBCE_PHONE_RATE_LIMIT_KEY_DOMAIN =
  "HBCE_PHONE_RATE_LIMIT_KEY_V1";

export const HBCE_PHONE_RATE_LIMIT_SESSION_KEY_DOMAIN =
  "HBCE_PHONE_RATE_LIMIT_SESSION_KEY_V1";

export const HBCE_PHONE_CHALLENGE_USAGE_KEY_DOMAIN =
  "HBCE_PHONE_CHALLENGE_USAGE_KEY_V1";

export const HBCE_PHONE_RATE_LIMIT_SECRET_ENV =
  "HBCE_PHONE_RATE_LIMIT_SECRET";

export const HBCE_PHONE_RATE_LIMIT_SECRET_MIN_LENGTH =
  32 as const;

export const PHONE_ABUSE_CONTROL_WINDOW_SECONDS =
  600 as const;

export const PHONE_SEND_SESSION_LIMIT =
  3 as const;

export const PHONE_SEND_PHONE_LIMIT =
  3 as const;

export const PHONE_VERIFY_SESSION_LIMIT =
  10 as const;

export const PHONE_VERIFY_CHALLENGE_LIMIT =
  5 as const;

const CANONICAL_E164_PATTERN =
  /^\+[1-9]\d{7,14}$/;

const LOWERCASE_SHA256_HEX_PATTERN =
  /^[0-9a-f]{64}$/;

export type OnboardingPhoneAbuseControlErrorCode =
  | "PHONE_RATE_LIMIT_SECRET_MISSING"
  | "PHONE_RATE_LIMIT_SECRET_INVALID"
  | "INVALID_INPUT"
  | "DEPENDENCY_FAILURE";

export class OnboardingPhoneAbuseControlError
  extends Error {
  readonly code:
    OnboardingPhoneAbuseControlErrorCode;

  constructor(
    code: OnboardingPhoneAbuseControlErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "OnboardingPhoneAbuseControlError";

    this.code = code;
  }
}

function requireCanonicalScalar(
  value: string,
  fieldName: string
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value !== value.trim() ||
    value.includes("\0")
  ) {
    throw new OnboardingPhoneAbuseControlError(
      "INVALID_INPUT",
      `${fieldName} is not canonical.`
    );
  }

  return value;
}

function requireCanonicalPhone(
  normalizedPhone: string
): string {
  const canonical =
    requireCanonicalScalar(
      normalizedPhone,
      "normalizedPhone"
    );

  if (
    !CANONICAL_E164_PATTERN.test(
      canonical
    )
  ) {
    throw new OnboardingPhoneAbuseControlError(
      "INVALID_INPUT",
      "normalizedPhone must be canonical E.164."
    );
  }

  return canonical;
}

function requirePhoneRateLimitSecret(
  secret: string
): string {
  if (typeof secret !== "string") {
    throw new OnboardingPhoneAbuseControlError(
      "PHONE_RATE_LIMIT_SECRET_INVALID",
      "PHONE rate-limit secret is invalid."
    );
  }

  const canonical = secret.trim();

  if (
    canonical.length <
      HBCE_PHONE_RATE_LIMIT_SECRET_MIN_LENGTH ||
    canonical.includes("\0")
  ) {
    throw new OnboardingPhoneAbuseControlError(
      "PHONE_RATE_LIMIT_SECRET_INVALID",
      "PHONE rate-limit secret is invalid."
    );
  }

  return canonical;
}

function buildDomainPreimage(
  domain: string,
  value: string
): string {
  return [
    domain,
    value
  ].join("\n");
}

function assertDerivedDigest(
  digest: string
): string {
  if (
    !LOWERCASE_SHA256_HEX_PATTERN.test(
      digest
    )
  ) {
    throw new OnboardingPhoneAbuseControlError(
      "DEPENDENCY_FAILURE",
      "PHONE abuse-control digest encoding failed."
    );
  }

  return digest;
}

export function isPhoneAbuseControlDigest(
  value: string
): boolean {
  return (
    typeof value === "string" &&
    LOWERCASE_SHA256_HEX_PATTERN.test(
      value
    )
  );
}

export function readPhoneRateLimitSecret():
  string {
  const configured =
    process.env[
      HBCE_PHONE_RATE_LIMIT_SECRET_ENV
    ];

  if (configured === undefined) {
    throw new OnboardingPhoneAbuseControlError(
      "PHONE_RATE_LIMIT_SECRET_MISSING",
      "HBCE_PHONE_RATE_LIMIT_SECRET is required."
    );
  }

  return requirePhoneRateLimitSecret(
    configured
  );
}

export function derivePhoneRateLimitPhoneKey(
  normalizedPhone: string,
  secret: string = readPhoneRateLimitSecret()
): string {
  const canonicalPhone =
    requireCanonicalPhone(
      normalizedPhone
    );

  const canonicalSecret =
    requirePhoneRateLimitSecret(
      secret
    );

  const digest =
    createHmac(
      "sha256",
      canonicalSecret
    )
      .update(
        buildDomainPreimage(
          HBCE_PHONE_RATE_LIMIT_KEY_DOMAIN,
          canonicalPhone
        ),
        "utf8"
      )
      .digest("hex");

  return assertDerivedDigest(
    digest
  );
}

export function derivePhoneRateLimitSessionKey(
  sessionId: string
): string {
  const canonicalSessionId =
    requireCanonicalScalar(
      sessionId,
      "sessionId"
    );

  const digest =
    createHash("sha256")
      .update(
        buildDomainPreimage(
          HBCE_PHONE_RATE_LIMIT_SESSION_KEY_DOMAIN,
          canonicalSessionId
        ),
        "utf8"
      )
      .digest("hex");

  return assertDerivedDigest(
    digest
  );
}

export function derivePhoneChallengeUsageKey(
  challengeToken: string
): string {
  const canonicalChallengeToken =
    requireCanonicalScalar(
      challengeToken,
      "challengeToken"
    );

  const digest =
    createHash("sha256")
      .update(
        buildDomainPreimage(
          HBCE_PHONE_CHALLENGE_USAGE_KEY_DOMAIN,
          canonicalChallengeToken
        ),
        "utf8"
      )
      .digest("hex");

  return assertDerivedDigest(
    digest
  );
}
