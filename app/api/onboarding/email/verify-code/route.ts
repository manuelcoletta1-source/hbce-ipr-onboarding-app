import { NextResponse } from "next/server";

import { verifyEmailOtpCode } from "@/lib/email-otp-store";

export const runtime = "nodejs";

type VerifyCodeRequestBody = {
  email?: unknown;
  code?: unknown;
};

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
    dev_echo: process.env.HBCE_OTP_DEV_ECHO === "true"
  });
}
