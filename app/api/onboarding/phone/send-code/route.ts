import { NextResponse } from "next/server";

import {
  createPhoneOtpChallenge,
  deletePhoneOtpChallenge,
  normalizePhoneNumber
} from "@/lib/phone-otp-store";

export const runtime = "nodejs";

type SendPhoneCodeRequestBody = {
  phone_number?: unknown;
};

function isOtpDevEchoEnabled(): boolean {
  return process.env.HBCE_OTP_DEV_ECHO === "true";
}

async function sendSmsWithProvider(params: {
  to: string;
  code: string;
}): Promise<void> {
  const provider = process.env.HBCE_SMS_PROVIDER ?? "twilio";
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (provider !== "twilio") {
    throw new Error("Unsupported SMS provider.");
  }

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("SMS provider is not configured.");
  }

  const body = new URLSearchParams({
    From: fromNumber,
    To: params.to,
    Body: `HBCE IPR verification code: ${params.code}. This code expires shortly.`
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${accountSid}:${authToken}`
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SMS provider rejected the request: ${errorText}`);
  }
}

export async function POST(request: Request) {
  let body: SendPhoneCodeRequestBody;

  try {
    body = (await request.json()) as SendPhoneCodeRequestBody;
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

  if (typeof body.phone_number !== "string") {
    return NextResponse.json(
      {
        ok: false,
        reason: "INVALID_PHONE",
        message: "Phone number is required."
      },
      { status: 400 }
    );
  }

  const phoneNumber = normalizePhoneNumber(body.phone_number);

  try {
    const challenge = createPhoneOtpChallenge(phoneNumber);

    if (isOtpDevEchoEnabled()) {
      return NextResponse.json({
        ok: true,
        phone_number: challenge.phone_number,
        message:
          "Phone verification code generated in HBCE_OTP_DEV_ECHO mode. No SMS was sent.",
        dev_code: challenge.code,
        dev_echo: true
      });
    }

    try {
      await sendSmsWithProvider({
        to: challenge.phone_number,
        code: challenge.code
      });
    } catch (error) {
      deletePhoneOtpChallenge(challenge.phone_number);

      return NextResponse.json(
        {
          ok: false,
          reason: "SMS_SEND_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Phone verification code could not be sent."
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      phone_number: challenge.phone_number,
      message: "Phone verification code sent.",
      dev_echo: false
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        reason:
          error instanceof Error && error.message === "INVALID_PHONE"
            ? "INVALID_PHONE"
            : "OTP_CREATION_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Phone verification code could not be created."
      },
      { status: 400 }
    );
  }
}
