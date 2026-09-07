import "server-only";

import {
  createHash,
  createHmac,
  timingSafeEqual
} from "node:crypto";

export const HBCE_PHONE_OTP_V2_CODE_DOMAIN =
  "HBCE_PHONE_OTP_CODE_V2";

export const HBCE_PHONE_VERIFICATION_EVIDENCE_DOMAIN =
  "HBCE_PHONE_VERIFICATION_EVIDENCE_V1";

export const HBCE_PHONE_OTP_V2_TTL_SECONDS = 600;

export class OnboardingPhoneOtpV2Error extends Error {
  readonly reason: string;

  constructor(reason: string, message: string) {
    super(message);
    this.name = "OnboardingPhoneOtpV2Error";
    this.reason = reason;
  }
}

export type OnboardingPhoneOtpV2ChallengeContext = {
  sessionId: string;
  normalizedPhone: string;
  challengeNonce: string;
  issuedAtEpochSeconds: number;
  expiresAtEpochSeconds: number;
};

export type OnboardingPhoneVerificationEvidenceInput = {
  sessionId: string;
  normalizedPhone: string;
  challengeToken: string;
  verifiedAtIso: string;
};

function requireNonEmptyString(
  value: string,
  fieldName: string
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new OnboardingPhoneOtpV2Error(
      "INVALID_CONTEXT",
      `${fieldName} is invalid.`
    );
  }

  return value;
}

function requireInteger(
  value: number,
  fieldName: string
): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new OnboardingPhoneOtpV2Error(
      "INVALID_CONTEXT",
      `${fieldName} is invalid.`
    );
  }

  return value;
}

export function normalizePhoneForOtpV2(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

export function isValidPhoneForOtpV2(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

function validateCanonicalPhone(value: string): string {
  const normalized = normalizePhoneForOtpV2(value);

  if (normalized !== value || !isValidPhoneForOtpV2(value)) {
    throw new OnboardingPhoneOtpV2Error(
      "INVALID_PHONE_NUMBER",
      "Phone number must be canonical E.164."
    );
  }

  return value;
}

function validateChallengeContext(
  context: OnboardingPhoneOtpV2ChallengeContext
): void {
  requireNonEmptyString(context.sessionId, "sessionId");
  validateCanonicalPhone(context.normalizedPhone);
  requireNonEmptyString(
    context.challengeNonce,
    "challengeNonce"
  );

  const issuedAt = requireInteger(
    context.issuedAtEpochSeconds,
    "issuedAtEpochSeconds"
  );

  const expiresAt = requireInteger(
    context.expiresAtEpochSeconds,
    "expiresAtEpochSeconds"
  );

  if (expiresAt <= issuedAt) {
    throw new OnboardingPhoneOtpV2Error(
      "INVALID_CONTEXT",
      "OTP challenge expiry must be after issue time."
    );
  }

  if (
    expiresAt - issuedAt !==
    HBCE_PHONE_OTP_V2_TTL_SECONDS
  ) {
    throw new OnboardingPhoneOtpV2Error(
      "INVALID_CONTEXT",
      "OTP challenge TTL is invalid."
    );
  }
}

export function readPhoneOtpV2Secret(): string {
  const explicitPhoneSecret =
    process.env.HBCE_PHONE_OTP_SECRET;

  if (explicitPhoneSecret !== undefined) {
    const trimmed = explicitPhoneSecret.trim();

    if (trimmed.length < 24) {
      throw new OnboardingPhoneOtpV2Error(
        "PHONE_OTP_SECRET_INVALID",
        "HBCE_PHONE_OTP_SECRET is too short."
      );
    }

    return trimmed;
  }

  const fallback = process.env.HBCE_OTP_SECRET?.trim();

  if (!fallback || fallback.length < 24) {
    throw new OnboardingPhoneOtpV2Error(
      "PHONE_OTP_SECRET_MISSING",
      "HBCE_PHONE_OTP_SECRET or HBCE_OTP_SECRET is missing or too short."
    );
  }

  return fallback;
}

export function isPhoneOtpV2DevEchoEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.HBCE_OTP_DEV_ECHO?.trim().toLowerCase() ===
      "true"
  );
}

function buildPhoneOtpPreimage(
  context: OnboardingPhoneOtpV2ChallengeContext
): string {
  validateChallengeContext(context);

  return [
    HBCE_PHONE_OTP_V2_CODE_DOMAIN,
    context.sessionId,
    context.normalizedPhone,
    context.challengeNonce,
    String(context.issuedAtEpochSeconds),
    String(context.expiresAtEpochSeconds)
  ].join("\n");
}

export function derivePhoneOtpV2Code(
  context: OnboardingPhoneOtpV2ChallengeContext,
  secret: string = readPhoneOtpV2Secret()
): string {
  if (secret.trim().length < 24) {
    throw new OnboardingPhoneOtpV2Error(
      "PHONE_OTP_SECRET_INVALID",
      "Phone OTP secret is too short."
    );
  }

  const digest = createHmac(
    "sha256",
    secret.trim()
  )
    .update(buildPhoneOtpPreimage(context), "utf8")
    .digest("hex");

  const reduced =
    Number.parseInt(digest.slice(0, 12), 16) %
    1_000_000;

  return String(reduced).padStart(6, "0");
}

export function verifyPhoneOtpV2Code(
  context: OnboardingPhoneOtpV2ChallengeContext,
  submittedCode: string,
  secret: string = readPhoneOtpV2Secret()
): boolean {
  if (!/^\d{6}$/.test(submittedCode)) {
    return false;
  }

  const expectedCode = derivePhoneOtpV2Code(
    context,
    secret
  );

  const expected = Buffer.from(expectedCode, "ascii");
  const received = Buffer.from(submittedCode, "ascii");

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}

export function computePhoneVerificationEvidenceSha256(
  input: OnboardingPhoneVerificationEvidenceInput
): string {
  requireNonEmptyString(input.sessionId, "sessionId");
  validateCanonicalPhone(input.normalizedPhone);
  requireNonEmptyString(
    input.challengeToken,
    "challengeToken"
  );
  requireNonEmptyString(
    input.verifiedAtIso,
    "verifiedAtIso"
  );

  if (
    !Number.isFinite(
      Date.parse(input.verifiedAtIso)
    )
  ) {
    throw new OnboardingPhoneOtpV2Error(
      "INVALID_VERIFIED_AT",
      "verifiedAtIso is invalid."
    );
  }

  const preimage = [
    HBCE_PHONE_VERIFICATION_EVIDENCE_DOMAIN,
    input.sessionId,
    input.normalizedPhone,
    input.challengeToken,
    input.verifiedAtIso
  ].join("\n");

  return createHash("sha256")
    .update(preimage, "utf8")
    .digest("hex");
}
