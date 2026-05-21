import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";

import {
  normalizePhoneNumber,
  verifyPhoneOtpCode
} from "@/lib/phone-otp-store";

export const runtime = "nodejs";

type VerifyPhoneCodeRequestBody = {
  phone_number?: unknown;
  code?: unknown;
};

function isOtpDevEchoEnabled(): boolean {
  return process.env.HBCE_OTP_DEV_ECHO === "true";
}

function getOtpSecret(): string | null {
  const secret = process.env.HBCE_OTP_SECRET;

  if (secret && secret.trim().length >= 24) {
    return secret.trim();
  }

  return null;
}

function hmac(value: string): string {
  const secret = getOtpSecret();

  if (!secret) {
    throw new Error("HBCE_OTP_SECRET is missing or too short.");
  }

  return createHmac("sha256", secret).update(value).digest("hex");
}

function isValidPhoneNumber(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(normalizePhoneNumber(value));
}

function verifyDevEchoCode(params: {
  phoneNumber: string;
  code: string;
}) {
  const phoneNumber = normalizePhoneNumber(params.phoneNumber);
  const code = params.code.trim();

  if (!isValidPhoneNumber(phoneNumber)) {
    return NextResponse.json(
      {
        ok: false,
        reason: "INVALID_PHONE",
        message:
          "Phone verification failed. Use an international E.164 number, for example +393515724982."
      },
      { status: 400 }
    );
  }

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      {
        ok: false,
        reason: "INVALID_CODE",
        message: "Phone verification failed. The code must contain 6 digits."
      },
      { status: 400 }
    );
  }

  try {
    const verifiedAt = new Date().toISOString();
    const phoneVerificationHash = hmac(
      `HBCE_PHONE_VERIFIED_DEV_ECHO:${phoneNumber}:${verifiedAt}:${code}`
    );

    return NextResponse.json({
      ok: true,
      phone_number: phoneNumber,
      phone_verified: true,
      phone_verified_at: verifiedAt,
      phone_verification_channel: "SMS_OTP",
      phone_verification_hash: phoneVerificationHash,
      dev_echo: true
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        reason: "OTP_SECRET_MISSING",
        message:
          error instanceof Error
            ? error.message
            : "Phone verification failed. OTP secret is missing."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let body: VerifyPhoneCodeRequestBody;

  try {
    body = (await request.json()) as VerifyPhoneCodeRequestBody;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        reason: "INVALID_JSON",
        message: "Invalid request body."
      },
      { status: 400 }
    );
  }

  if (typeof body.phone_number !== "string" || typeof body.code !== "string") {
    return NextResponse.json(
      {
        ok: false,
        reason: "MISSING_REQUIRED_FIELD",
        message: "Phone number and code are required."
      },
      { status: 400 }
    );
  }

  if (isOtpDevEchoEnabled()) {
    return verifyDevEchoCode({
      phoneNumber: body.phone_number,
      code: body.code
    });
  }

  const result = verifyPhoneOtpCode(body.phone_number, body.code);

  if (!result.valid) {
    return NextResponse.json(
      {
        ok: false,
        reason: result.reason,
        message: result.message
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    phone_number: result.phone_number,
    phone_verified: result.phone_verified,
    phone_verified_at: result.phone_verified_at,
    phone_verification_channel: result.phone_verification_channel,
    phone_verification_hash: result.phone_verification_hash,
    dev_echo: false
  });
}
