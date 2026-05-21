import { NextResponse } from "next/server";

import { verifyPhoneOtpCode } from "@/lib/phone-otp-store";

export const runtime = "nodejs";

type VerifyPhoneCodeRequestBody = {
  phone_number?: unknown;
  code?: unknown;
};

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
    phone_verification_hash: result.phone_verification_hash
  });
}
