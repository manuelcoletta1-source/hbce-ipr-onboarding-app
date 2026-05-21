import { createHmac, timingSafeEqual } from "node:crypto";

export type HbceEmailOtpChallenge = {
  email: string;
  code_hash: string;
  attempts: number;
  max_attempts: number;
  created_at: string;
  expires_at: string;
  verified_at: string | null;
};

export type HbceEmailOtpVerificationResult =
  | {
      valid: true;
      email: string;
      email_verified: true;
      email_verified_at: string;
      email_verification_channel: "EMAIL_OTP";
      email_verification_hash: string;
    }
  | {
      valid: false;
      reason:
        | "INVALID_EMAIL"
        | "INVALID_CODE"
        | "CODE_EXPIRED"
        | "TOO_MANY_ATTEMPTS"
        | "NO_ACTIVE_CHALLENGE"
        | "OTP_SECRET_MISSING";
      message: string;
    };

function getOtpSecret(): string | null {
  const secret = process.env.HBCE_OTP_SECRET;

  if (secret && secret.trim().length >= 24) {
    return secret.trim();
  }

  if (process.env.NODE_ENV !== "production") {
    return "HBCE_DEV_ONLY_OTP_SECRET_DO_NOT_USE_IN_PRODUCTION";
  }

  return null;
}

function getOtpTtlSeconds(): number {
  const raw = Number(process.env.HBCE_OTP_TTL_SECONDS ?? "600");

  return Number.isFinite(raw) && raw > 0 ? raw : 600;
}

function getOtpTtlMs(): number {
  return getOtpTtlSeconds() * 1000;
}

function getMaxAttempts(): number {
  const raw = Number(process.env.HBCE_OTP_MAX_ATTEMPTS ?? "5");

  return Number.isFinite(raw) && raw > 0 ? raw : 5;
}

function hmac(value: string): string {
  const secret = getOtpSecret();

  if (!secret) {
    throw new Error("HBCE_OTP_SECRET is missing or too short.");
  }

  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getTimeSlot(date: Date): number {
  return Math.floor(date.getTime() / getOtpTtlMs());
}

function getSlotExpiresAt(slot: number): Date {
  return new Date((slot + 1) * getOtpTtlMs());
}

function generateOtpCodeForSlot(email: string, slot: number): string {
  const digest = hmac(`HBCE_EMAIL_OTP_CODE:${email}:${slot}`);
  const numericSeed = Number.parseInt(digest.slice(0, 12), 16);
  const code = numericSeed % 1_000_000;

  return String(code).padStart(6, "0");
}

function getValidOtpSlots(): number[] {
  const currentSlot = getTimeSlot(new Date());

  return [currentSlot, currentSlot - 1];
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function generateOtpCode(): string {
  const digest = hmac(`HBCE_EMAIL_OTP_RANDOM_COMPAT:${Date.now()}`);
  const numericSeed = Number.parseInt(digest.slice(0, 12), 16);
  const code = numericSeed % 1_000_000;

  return String(code).padStart(6, "0");
}

export function createEmailOtpChallenge(emailInput: string): {
  email: string;
  code: string;
  challenge: HbceEmailOtpChallenge;
} {
  const email = normalizeEmail(emailInput);

  if (!isValidEmail(email)) {
    throw new Error("INVALID_EMAIL");
  }

  const secret = getOtpSecret();

  if (!secret) {
    throw new Error("HBCE_OTP_SECRET is missing or too short.");
  }

  const createdAt = new Date();
  const slot = getTimeSlot(createdAt);
  const expiresAt = getSlotExpiresAt(slot);
  const code = generateOtpCodeForSlot(email, slot);
  const codeHash = hmac(`HBCE_EMAIL_OTP_HASH:${email}:${code}:${slot}`);

  const challenge: HbceEmailOtpChallenge = {
    email,
    code_hash: codeHash,
    attempts: 0,
    max_attempts: getMaxAttempts(),
    created_at: createdAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    verified_at: null
  };

  return {
    email,
    code,
    challenge
  };
}

export function deleteEmailOtpChallenge(_emailInput: string): void {
  /*
   * Stateless OTP mode:
   * no server-side challenge is stored on Vercel.
   *
   * This function is intentionally kept as a no-op because existing API routes
   * call it after provider failures. Keeping the exported function avoids
   * breaking the route contract while removing the volatile in-memory store.
   */
}

function verifyEmailOtpCodeInDevEchoMode(
  email: string,
  code: string
): HbceEmailOtpVerificationResult {
  if (!/^\d{6}$/.test(code)) {
    return {
      valid: false,
      reason: "INVALID_CODE",
      message: "Email verification failed. The code must contain 6 digits."
    };
  }

  const verifiedAt = new Date().toISOString();
  const emailVerificationHash = hmac(
    `HBCE_EMAIL_VERIFIED_DEV_ECHO:${email}:${verifiedAt}:${code}`
  );

  return {
    valid: true,
    email,
    email_verified: true,
    email_verified_at: verifiedAt,
    email_verification_channel: "EMAIL_OTP",
    email_verification_hash: emailVerificationHash
  };
}

export function verifyEmailOtpCode(
  emailInput: string,
  codeInput: string
): HbceEmailOtpVerificationResult {
  const email = normalizeEmail(emailInput);
  const code = codeInput.trim();

  if (!isValidEmail(email)) {
    return {
      valid: false,
      reason: "INVALID_EMAIL",
      message: "Email verification failed. Invalid email address."
    };
  }

  if (!/^\d{6}$/.test(code)) {
    return {
      valid: false,
      reason: "INVALID_CODE",
      message: "Email verification failed. The code must contain 6 digits."
    };
  }

  const secret = getOtpSecret();

  if (!secret) {
    return {
      valid: false,
      reason: "OTP_SECRET_MISSING",
      message:
        "Email verification failed. The OTP secret is missing in the server environment."
    };
  }

  if (process.env.HBCE_OTP_DEV_ECHO === "true") {
    return verifyEmailOtpCodeInDevEchoMode(email, code);
  }

  const validSlots = getValidOtpSlots();
  const matchedSlot = validSlots.find((slot) => {
    const expectedCode = generateOtpCodeForSlot(email, slot);

    return safeEqual(expectedCode, code);
  });

  if (matchedSlot === undefined) {
    return {
      valid: false,
      reason: "INVALID_CODE",
      message: "Email verification failed. Invalid or expired code."
    };
  }

  const verifiedAt = new Date().toISOString();
  const codeHash = hmac(`HBCE_EMAIL_OTP_HASH:${email}:${code}:${matchedSlot}`);
  const emailVerificationHash = hmac(
    `HBCE_EMAIL_VERIFIED:${email}:${verifiedAt}:${codeHash}`
  );

  return {
    valid: true,
    email,
    email_verified: true,
    email_verified_at: verifiedAt,
    email_verification_channel: "EMAIL_OTP",
    email_verification_hash: emailVerificationHash
  };
}
