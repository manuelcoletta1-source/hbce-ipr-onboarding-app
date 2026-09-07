import "server-only";

import {
  createHash,
  createHmac,
  timingSafeEqual
} from "node:crypto";

export const HBCE_EMAIL_OTP_V2_TTL_SECONDS =
  600;

export const HBCE_EMAIL_OTP_V2_CODE_DOMAIN =
  "HBCE_EMAIL_OTP_CODE_V2";

export const HBCE_EMAIL_VERIFICATION_EVIDENCE_DOMAIN =
  "HBCE_EMAIL_VERIFICATION_EVIDENCE_V1";

export type OnboardingEmailOtpV2ErrorCode =
  | "INVALID_INPUT"
  | "OTP_SECRET_MISSING";

export class OnboardingEmailOtpV2Error
  extends Error
{
  readonly code:
    OnboardingEmailOtpV2ErrorCode;

  constructor(
    code:
      OnboardingEmailOtpV2ErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "OnboardingEmailOtpV2Error";

    this.code =
      code;
  }
}

export type OnboardingEmailOtpV2Environment =
  Readonly<
    Record<
      string,
      string | undefined
    >
  >;

export type OnboardingEmailOtpV2ChallengeContext = {
  readonly sessionId:
    string;

  readonly normalizedEmail:
    string;

  readonly challengeNonce:
    string;

  readonly issuedAtEpochSeconds:
    number;

  readonly expiresAtEpochSeconds:
    number;
};

export type OnboardingEmailVerificationEvidenceInput = {
  readonly sessionId:
    string;

  readonly normalizedEmail:
    string;

  readonly challengeToken:
    string;

  readonly verifiedAtIso:
    string;
};

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SIX_DIGIT_CODE =
  /^\d{6}$/;

const BASE64URL_32_BYTES =
  /^[A-Za-z0-9_-]{43}$/;

function fail(
  code:
    OnboardingEmailOtpV2ErrorCode,
  message: string
): never {
  throw new OnboardingEmailOtpV2Error(
    code,
    message
  );
}

function isCanonicalIdentifier(
  value: string
): boolean {
  return (
    value.length > 0 &&
    value === value.trim() &&
    !value.includes("\n") &&
    !value.includes("\r") &&
    !value.includes("\0")
  );
}

export function normalizeEmailForOtpV2(
  value: string
): string {
  return value
    .trim()
    .toLowerCase();
}

export function isValidEmailForOtpV2(
  value: string
): boolean {
  const normalized =
    normalizeEmailForOtpV2(
      value
    );

  return (
    normalized.length > 0 &&
    normalized === value &&
    EMAIL_PATTERN.test(
      normalized
    )
  );
}

function assertChallengeNonce(
  value: string
): void {
  if (
    !BASE64URL_32_BYTES.test(
      value
    )
  ) {
    fail(
      "INVALID_INPUT",
      "Email OTP v2 challenge nonce must encode exactly 32 bytes."
    );
  }

  let decoded:
    Buffer;

  try {
    decoded =
      Buffer.from(
        value,
        "base64url"
      );
  } catch {
    fail(
      "INVALID_INPUT",
      "Email OTP v2 challenge nonce is invalid."
    );
  }

  if (
    decoded.length !==
      32
  ) {
    fail(
      "INVALID_INPUT",
      "Email OTP v2 challenge nonce must encode exactly 32 bytes."
    );
  }
}

function assertChallengeContext(
  context:
    OnboardingEmailOtpV2ChallengeContext
): void {
  if (
    !isCanonicalIdentifier(
      context.sessionId
    )
  ) {
    fail(
      "INVALID_INPUT",
      "Email OTP v2 requires one canonical server session identifier."
    );
  }

  if (
    !isValidEmailForOtpV2(
      context.normalizedEmail
    )
  ) {
    fail(
      "INVALID_INPUT",
      "Email OTP v2 requires one canonical normalized email."
    );
  }

  assertChallengeNonce(
    context.challengeNonce
  );

  if (
    !Number.isSafeInteger(
      context.issuedAtEpochSeconds
    ) ||
    !Number.isSafeInteger(
      context.expiresAtEpochSeconds
    ) ||
    context.issuedAtEpochSeconds < 0 ||
    context.expiresAtEpochSeconds < 0 ||
    (
      context.expiresAtEpochSeconds -
      context.issuedAtEpochSeconds
    ) !==
      HBCE_EMAIL_OTP_V2_TTL_SECONDS
  ) {
    fail(
      "INVALID_INPUT",
      "Email OTP v2 challenge timestamps must encode the exact 600-second policy."
    );
  }
}

function assertSecret(
  secret: string
): string {
  const canonical =
    secret.trim();

  if (
    canonical.length < 24 ||
    canonical !== secret
  ) {
    fail(
      "OTP_SECRET_MISSING",
      "HBCE email OTP v2 secret is missing or too short."
    );
  }

  return canonical;
}

function buildOtpPreimage(
  context:
    OnboardingEmailOtpV2ChallengeContext
): string {
  return [
    HBCE_EMAIL_OTP_V2_CODE_DOMAIN,
    context.sessionId,
    context.normalizedEmail,
    context.challengeNonce,
    String(
      context.issuedAtEpochSeconds
    ),
    String(
      context.expiresAtEpochSeconds
    )
  ].join("\n");
}

function safeEqualCode(
  left: string,
  right: string
): boolean {
  const leftBuffer =
    Buffer.from(
      left,
      "utf8"
    );

  const rightBuffer =
    Buffer.from(
      right,
      "utf8"
    );

  if (
    leftBuffer.length !==
      rightBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    leftBuffer,
    rightBuffer
  );
}

export function readEmailOtpV2Secret(
  environment:
    OnboardingEmailOtpV2Environment =
      process.env
): string {
  const secret =
    environment
      .HBCE_OTP_SECRET;

  if (
    typeof secret !==
      "string"
  ) {
    fail(
      "OTP_SECRET_MISSING",
      "HBCE_OTP_SECRET is required for email OTP v2."
    );
  }

  return assertSecret(
    secret
  );
}

export function isEmailOtpV2DevEchoEnabled(
  environment:
    OnboardingEmailOtpV2Environment =
      process.env
): boolean {
  return (
    environment.NODE_ENV !==
      "production" &&
    environment.HBCE_OTP_DEV_ECHO ===
      "true"
  );
}

export function deriveEmailOtpV2Code(
  context:
    OnboardingEmailOtpV2ChallengeContext,
  secret: string
): string {
  assertChallengeContext(
    context
  );

  const canonicalSecret =
    assertSecret(
      secret
    );

  const digest =
    createHmac(
      "sha256",
      canonicalSecret
    )
      .update(
        buildOtpPreimage(
          context
        ),
        "utf8"
      )
      .digest(
        "hex"
      );

  const numericSeed =
    Number.parseInt(
      digest.slice(
        0,
        12
      ),
      16
    );

  const code =
    numericSeed %
      1_000_000;

  return String(
    code
  ).padStart(
    6,
    "0"
  );
}

export function verifyEmailOtpV2Code(
  context:
    OnboardingEmailOtpV2ChallengeContext,
  codeInput: string,
  secret: string
): boolean {
  const code =
    codeInput.trim();

  if (
    !SIX_DIGIT_CODE.test(
      code
    )
  ) {
    return false;
  }

  const expected =
    deriveEmailOtpV2Code(
      context,
      secret
    );

  return safeEqualCode(
    expected,
    code
  );
}

function assertCanonicalIso(
  value: string
): void {
  const parsed =
    new Date(
      value
    );

  if (
    Number.isNaN(
      parsed.getTime()
    ) ||
    parsed.toISOString() !==
      value
  ) {
    fail(
      "INVALID_INPUT",
      "Email verification evidence time must be canonical ISO-8601."
    );
  }
}

export function computeEmailVerificationEvidenceSha256(
  input:
    OnboardingEmailVerificationEvidenceInput
): string {
  if (
    !isCanonicalIdentifier(
      input.sessionId
    ) ||
    !isValidEmailForOtpV2(
      input.normalizedEmail
    ) ||
    !isCanonicalIdentifier(
      input.challengeToken
    )
  ) {
    fail(
      "INVALID_INPUT",
      "Email verification evidence input is invalid."
    );
  }

  assertCanonicalIso(
    input.verifiedAtIso
  );

  const preimage =
    [
      HBCE_EMAIL_VERIFICATION_EVIDENCE_DOMAIN,
      input.sessionId,
      input.normalizedEmail,
      input.challengeToken,
      input.verifiedAtIso
    ].join("\n");

  return createHash(
    "sha256"
  )
    .update(
      preimage,
      "utf8"
    )
    .digest(
      "hex"
    );
}
