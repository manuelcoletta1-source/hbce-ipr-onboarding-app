import { NextResponse } from "next/server";

import {
  createEmailOtpChallenge,
  deleteEmailOtpChallenge,
  normalizeEmail
} from "@/lib/email-otp-store";

export const runtime = "nodejs";

type SendCodeRequestBody = {
  email?: unknown;
};

function isOtpDevEchoEnabled(): boolean {
  return process.env.HBCE_OTP_DEV_ECHO === "true";
}

async function sendEmailWithProvider(params: {
  to: string;
  code: string;
}): Promise<void> {
  const provider = process.env.HBCE_EMAIL_PROVIDER ?? "resend";
  const from = process.env.HBCE_EMAIL_FROM;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (provider !== "resend") {
    throw new Error("Unsupported email provider.");
  }

  if (!from || !resendApiKey) {
    throw new Error("Email provider is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: "HBCE IPR email verification code",
      text: [
        "HBCE IPR Onboarding",
        "",
        `Your verification code is: ${params.code}`,
        "",
        "This code expires shortly.",
        "If you did not request this code, ignore this email.",
        "",
        "HERMETICUM B.C.E. S.r.l."
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>HBCE IPR Onboarding</h2>
          <p>Your verification code is:</p>
          <p style="font-size:24px;font-weight:bold;letter-spacing:4px">${params.code}</p>
          <p>This code expires shortly.</p>
          <p>If you did not request this code, ignore this email.</p>
          <p><strong>HERMETICUM B.C.E. S.r.l.</strong></p>
        </div>
      `
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Email provider rejected the request: ${errorText}`);
  }
}

export async function POST(request: Request) {
  let body: SendCodeRequestBody;

  try {
    body = (await request.json()) as SendCodeRequestBody;
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

  if (typeof body.email !== "string") {
    return NextResponse.json(
      {
        ok: false,
        reason: "INVALID_EMAIL",
        message: "Email is required."
      },
      { status: 400 }
    );
  }

  const email = normalizeEmail(body.email);

  try {
    const challenge = createEmailOtpChallenge(email);

    if (isOtpDevEchoEnabled()) {
      return NextResponse.json({
        ok: true,
        email: challenge.email,
        message:
          "Email verification code generated in HBCE_OTP_DEV_ECHO mode. No email was sent.",
        dev_code: challenge.code,
        dev_echo: true
      });
    }

    try {
      await sendEmailWithProvider({
        to: challenge.email,
        code: challenge.code
      });
    } catch (error) {
      deleteEmailOtpChallenge(challenge.email);

      return NextResponse.json(
        {
          ok: false,
          reason: "EMAIL_SEND_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Email verification code could not be sent."
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      email: challenge.email,
      message: "Email verification code sent.",
      dev_echo: false
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        reason:
          error instanceof Error && error.message === "INVALID_EMAIL"
            ? "INVALID_EMAIL"
            : "OTP_CREATION_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Email verification code could not be created."
      },
      { status: 400 }
    );
  }
}
