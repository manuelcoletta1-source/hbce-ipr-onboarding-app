import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";

import { normalizeEmail, verifyEmailOtpCode } from "@/lib/email-otp-store";

export const runtime = "nodejs";

type VerifyCodeRequestBody = {
  email?: unknown;
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

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function verifyDevEchoCode(params: {
  email: string;
  code: string;
}) {
  const email = normalizeEmail(params.email);
  const code = params.code.trim();

  if (!isValidEmail(email)) {
    return NextResponse.json(
      {
        ok: false,
        reason: "INVALID_EMAIL",
        message: "Email verification failed. Invalid email address."
      },
      { status: 400 }
    );
  }

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      {
        ok: false,
        reason: "INVALID_CODE",
        message: "Email verification failed. The code must contain 6 digits."
      },
      { status: 400 }
    );
  }

  try {
    const verifiedAt = new Date().toISOString();
    const emailVerificationHash = hmac(
      `HBCE_EMAIL_VERIFIED_DEV_ECHO:${email}:${verifiedAt}:${code}`
    );

    return NextResponse.json({
      ok: true,
      email,
      email_verified: true,
      email_verified_at: verifiedAt,
      email_verification_channel: "EMAIL_OTP",
      email_verification_hash: emailVerificationHash,
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
            : "Email verification failed. OTP secret is missing."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let body: VerifyCodeRequestBody;

  try {
    body = (await request.json()) as VerifyCodeRequestBody;
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

  if (typeof body.email !== "string" || typeof body.code !== "string") {
    return NextResponse.json(
      {
        ok: false,
        reason: "MISSING_REQUIRED_FIELD",
        message: "Email and code are required."
      },
      { status: 400 }
    );
  }

  if (isOtpDevEchoEnabled()) {
    return verifyDevEchoCode({
      email: body.email,
      code: body.code
    });
  }

  const result = verifyEmailOtpCode(body.email, body.code);

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
    email: result.email,
    email_verified: result.email_verified,
    email_verified_at: result.email_verified_at,
    email_verification_channel: result.email_verification_channel,
    email_verification_hash: result.email_verification_hash,
    dev_echo: false
  });
}
