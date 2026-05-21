import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

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

const globalOtpStore = globalThis as typeof globalThis & {
  __HBCE_EMAIL_OTP_STORE__?: Map<string, HbceEmailOtpChallenge>;
};

function getStore(): Map<string, HbceEmailOtpChallenge> {
  if (!globalOtpStore.__HBCE_EMAIL_OTP_STORE__) {
    globalOtpStore.__HBCE_EMAIL_OTP_STORE__ = new Map();
  }

  return globalOtpStore.__HBCE_EMAIL_OTP_STORE__;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isOtpDevEchoEnabled(): boolean {
  return process.env.HBCE_OTP_DEV_ECHO === "true";
}

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

function safeEqualHex(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getCurrentTimeBucket(): number {
  return Math.floor(Date.now() / getOtpTtlMs());
}

function generateDeterministicDevOtpCode(email: string, bucket: number): string {
  const digest = hmac(`HBCE_EMAIL_DEV_OTP:${email}:${bucket}`);
  const numeric = Number.parseInt(digest.slice(0, 12), 16) % 1_000_000;

  return String(numeric).padStart(6, "0");
}

function isValidDeterministicDevOtpCode(email: string, code: string): boolean {
  const currentBucket = getCurrentTimeBucket();
  const acceptedBuckets = [currentBucket, currentBucket - 1];

  return acceptedBuckets.some(
    (bucket) => generateDeterministicDevOtpCode(email, bucket) === code
  );
}

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
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

  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + getOtpTtlMs());

  const code = isOtpDevEchoEnabled()
    ? generateDeterministicDevOtpCode(email, getCurrentTimeBucket())
    : generateOtpCode();

  const challenge: HbceEmailOtpChallenge = {
    email,
    code_hash: hmac(`HBCE_EMAIL_OTP:${email}:${code}`),
    attempts: 0,
    max_attempts: getMaxAttempts(),
    created_at: createdAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    verified_at: null
  };

  if (!isOtpDevEchoEnabled()) {
    getStore().set(email, challenge);
  }

  return {
    email,
    code,
    challenge
  };
}

export function deleteEmailOtpChallenge(emailInput: string): void {
  getStore().delete(normalizeEmail(emailInput));
}

function verifyEmailOtpCodeInDevEchoMode(
  email: string,
  code: string
): HbceEmailOtpVerificationResult {
  if (!isValidDeterministicDevOtpCode(email, code)) {
    return {
      valid: false,
      reason: "INVALID_CODE",
      message:
        "Email verification failed. Invalid development code or expired time window."
    };
  }

  const verifiedAt = new Date().toISOString();
  const emailVerificationHash = hmac(
    `HBCE_EMAIL_VERIFIED_DEV:${email}:${verifiedAt}:${code}`
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

  if (isOtpDevEchoEnabled()) {
    return verifyEmailOtpCodeInDevEchoMode(email, code);
  }

  const store = getStore();
  const challenge = store.get(email);

  if (!challenge) {
    return {
      valid: false,
      reason: "NO_ACTIVE_CHALLENGE",
      message: "Email verification failed. No active code was found."
    };
  }

  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    store.delete(email);

    return {
      valid: false,
      reason: "CODE_EXPIRED",
      message: "Email verification failed. The code has expired."
    };
  }

  if (challenge.attempts >= challenge.max_attempts) {
    store.delete(email);

    return {
      valid: false,
      reason: "TOO_MANY_ATTEMPTS",
      message: "Email verification failed. Too many attempts."
    };
  }

  const receivedHash = hmac(`HBCE_EMAIL_OTP:${email}:${code}`);

  if (!safeEqualHex(challenge.code_hash, receivedHash)) {
    challenge.attempts += 1;
    store.set(email, challenge);

    return {
      valid: false,
      reason: "INVALID_CODE",
      message: "Email verification failed. Invalid code."
    };
  }

  const verifiedAt = new Date().toISOString();
  const emailVerificationHash = hmac(
    `HBCE_EMAIL_VERIFIED:${email}:${verifiedAt}:${challenge.code_hash}`
  );

  challenge.verified_at = verifiedAt;
  store.set(email, challenge);

  return {
    valid: true,
    email,
    email_verified: true,
    email_verified_at: verifiedAt,
    email_verification_channel: "EMAIL_OTP",
    email_verification_hash: emailVerificationHash
  };
}
