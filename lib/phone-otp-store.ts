import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export type HbcePhoneOtpChallenge = {
  phone_number: string;
  code_hash: string;
  attempts: number;
  max_attempts: number;
  created_at: string;
  expires_at: string;
  verified_at: string | null;
};

export type HbcePhoneOtpVerificationResult =
  | {
      valid: true;
      phone_number: string;
      phone_verified: true;
      phone_verified_at: string;
      phone_verification_channel: "SMS_OTP";
      phone_verification_hash: string;
    }
  | {
      valid: false;
      reason:
        | "INVALID_PHONE"
        | "INVALID_CODE"
        | "CODE_EXPIRED"
        | "TOO_MANY_ATTEMPTS"
        | "NO_ACTIVE_CHALLENGE"
        | "OTP_SECRET_MISSING";
      message: string;
    };

const globalOtpStore = globalThis as typeof globalThis & {
  __HBCE_PHONE_OTP_STORE__?: Map<string, HbcePhoneOtpChallenge>;
};

function getStore(): Map<string, HbcePhoneOtpChallenge> {
  if (!globalOtpStore.__HBCE_PHONE_OTP_STORE__) {
    globalOtpStore.__HBCE_PHONE_OTP_STORE__ = new Map();
  }

  return globalOtpStore.__HBCE_PHONE_OTP_STORE__;
}

export function normalizePhoneNumber(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

export function isValidPhoneNumber(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(normalizePhoneNumber(value));
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

function getOtpTtlMs(): number {
  const raw = Number(process.env.HBCE_OTP_TTL_SECONDS ?? "600");
  const seconds = Number.isFinite(raw) && raw > 0 ? raw : 600;

  return seconds * 1000;
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

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function createPhoneOtpChallenge(phoneInput: string): {
  phone_number: string;
  code: string;
  challenge: HbcePhoneOtpChallenge;
} {
  const phoneNumber = normalizePhoneNumber(phoneInput);

  if (!isValidPhoneNumber(phoneNumber)) {
    throw new Error("INVALID_PHONE");
  }

  const code = generateOtpCode();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + getOtpTtlMs());

  const challenge: HbcePhoneOtpChallenge = {
    phone_number: phoneNumber,
    code_hash: hmac(`HBCE_PHONE_OTP:${phoneNumber}:${code}`),
    attempts: 0,
    max_attempts: getMaxAttempts(),
    created_at: createdAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    verified_at: null
  };

  getStore().set(phoneNumber, challenge);

  return {
    phone_number: phoneNumber,
    code,
    challenge
  };
}

export function deletePhoneOtpChallenge(phoneInput: string): void {
  getStore().delete(normalizePhoneNumber(phoneInput));
}

export function verifyPhoneOtpCode(
  phoneInput: string,
  codeInput: string
): HbcePhoneOtpVerificationResult {
  const phoneNumber = normalizePhoneNumber(phoneInput);
  const code = codeInput.trim();

  if (!isValidPhoneNumber(phoneNumber)) {
    return {
      valid: false,
      reason: "INVALID_PHONE",
      message:
        "Phone verification failed. Use an international E.164 number, for example +393515724982."
    };
  }

  if (!/^\d{6}$/.test(code)) {
    return {
      valid: false,
      reason: "INVALID_CODE",
      message: "Phone verification failed. The code must contain 6 digits."
    };
  }

  const secret = getOtpSecret();

  if (!secret) {
    return {
      valid: false,
      reason: "OTP_SECRET_MISSING",
      message:
        "Phone verification failed. The OTP secret is missing in the server environment."
    };
  }

  const store = getStore();
  const challenge = store.get(phoneNumber);

  if (!challenge) {
    return {
      valid: false,
      reason: "NO_ACTIVE_CHALLENGE",
      message: "Phone verification failed. No active code was found."
    };
  }

  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    store.delete(phoneNumber);

    return {
      valid: false,
      reason: "CODE_EXPIRED",
      message: "Phone verification failed. The code has expired."
    };
  }

  if (challenge.attempts >= challenge.max_attempts) {
    store.delete(phoneNumber);

    return {
      valid: false,
      reason: "TOO_MANY_ATTEMPTS",
      message: "Phone verification failed. Too many attempts."
    };
  }

  const receivedHash = hmac(`HBCE_PHONE_OTP:${phoneNumber}:${code}`);

  if (!safeEqualHex(challenge.code_hash, receivedHash)) {
    challenge.attempts += 1;
    store.set(phoneNumber, challenge);

    return {
      valid: false,
      reason: "INVALID_CODE",
      message: "Phone verification failed. Invalid code."
    };
  }

  const verifiedAt = new Date().toISOString();
  const phoneVerificationHash = hmac(
    `HBCE_PHONE_VERIFIED:${phoneNumber}:${verifiedAt}:${challenge.code_hash}`
  );

  challenge.verified_at = verifiedAt;
  store.set(phoneNumber, challenge);

  return {
    valid: true,
    phone_number: phoneNumber,
    phone_verified: true,
    phone_verified_at: verifiedAt,
    phone_verification_channel: "SMS_OTP",
    phone_verification_hash: phoneVerificationHash
  };
}
