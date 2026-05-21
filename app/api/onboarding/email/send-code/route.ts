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

type EmailProvider = "resend";

type EmailSendFailureReason =
  | "UNSUPPORTED_EMAIL_PROVIDER"
  | "EMAIL_FROM_MISSING"
  | "RESEND_API_KEY_MISSING"
  | "RESEND_SEND_REJECTED"
  | "RESEND_NETWORK_ERROR";

type EmailProviderConfig = {
  provider: EmailProvider;
  from: string;
  resendApiKey: string;
};

class EmailSendError extends Error {
  readonly reason: EmailSendFailureReason;
  readonly providerStatus?: number;
  readonly providerError?: string;

  constructor(params: {
    reason: EmailSendFailureReason;
    message: string;
    providerStatus?: number;
    providerError?: string;
  }) {
    super(params.message);
    this.name = "EmailSendError";
    this.reason = params.reason;
    this.providerStatus = params.providerStatus;
    this.providerError = params.providerError;
  }
}

function isOtpDevEchoEnabled(): boolean {
  return process.env.HBCE_OTP_DEV_ECHO === "true";
}

function sanitizeProviderError(errorText: string): string {
  return errorText
    .replaceAll(process.env.RESEND_API_KEY ?? "", "[REDACTED_RESEND_API_KEY]")
    .slice(0, 2000);
}

function getEmailProviderConfig(): EmailProviderConfig {
  const provider = (process.env.HBCE_EMAIL_PROVIDER ?? "resend")
    .trim()
    .toLowerCase();

  const from = process.env.HBCE_EMAIL_FROM?.trim();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();

  if (provider !== "resend") {
    throw new EmailSendError({
      reason: "UNSUPPORTED_EMAIL_PROVIDER",
      message: `Unsupported email provider: ${provider}`
    });
  }

  if (!from) {
    throw new EmailSendError({
      reason: "EMAIL_FROM_MISSING",
      message: "HBCE_EMAIL_FROM is missing."
    });
  }

  if (!resendApiKey) {
    throw new EmailSendError({
      reason: "RESEND_API_KEY_MISSING",
      message: "RESEND_API_KEY is missing."
    });
  }

  return {
    provider: "resend",
    from,
    resendApiKey
  };
}

async function readResponseBody(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return sanitizeProviderError(text);
  } catch {
    return "Provider response body could not be read.";
  }
}

async function sendEmailWithProvider(params: {
  to: string;
  code: string;
}): Promise<void> {
  const config = getEmailProviderConfig();

  let response: Response;

  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: config.from,
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
        html: [
          '<div style="font-family:Arial,sans-serif;line-height:1.5">',
          "<h2>HBCE IPR Onboarding</h2>",
          "<p>Your verification code is:</p>",
          `<p style="font-size:24px;font-weight:bold;letter-spacing:4px">${params.code}</p>`,
          "<p>This code expires shortly.</p>",
          "<p>If you did not request this code, ignore this email.</p>",
          "<p><strong>HERMETICUM B.C.E. S.r.l.</strong></p>",
          "</div>"
        ].join("")
      })
    });
  } catch (error) {
    throw new EmailSendError({
      reason: "RESEND_NETWORK_ERROR",
      message:
        error instanceof Error
          ? `Resend network request failed: ${error.message}`
          : "Resend network request failed."
    });
  }

  if (!response.ok) {
    const providerError = await readResponseBody(response);

    throw new EmailSendError({
      reason: "RESEND_SEND_REJECTED",
      message: `Resend rejected the email send request with status ${response.status}.`,
      providerStatus: response.status,
      providerError
    });
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

  let email: string;

  try {
    email = normalizeEmail(body.email);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        reason: "INVALID_EMAIL",
        message:
          error instanceof Error ? error.message : "Invalid email address."
      },
      { status: 400 }
    );
  }

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

      if (error instanceof EmailSendError) {
        console.error("[HBCE_ONBOARDING_EMAIL_SEND_FAILED]", {
          reason: error.reason,
          message: error.message,
          provider_status: error.providerStatus,
          provider_error: error.providerError
        });

        return NextResponse.json(
          {
            ok: false,
            reason: error.reason,
            message: error.message,
            provider_status: error.providerStatus ?? null,
            provider_error: error.providerError ?? null
          },
          { status: 502 }
        );
      }

      console.error("[HBCE_ONBOARDING_EMAIL_SEND_UNKNOWN_FAILED]", error);

      return NextResponse.json(
        {
          ok: false,
          reason: "EMAIL_SEND_FAILED",
          message: "Email verification code could not be sent."
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
    console.error("[HBCE_ONBOARDING_EMAIL_OTP_CREATION_FAILED]", error);

    return NextResponse.json(
      {
        ok: false,
        reason: "OTP_CREATION_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Email verification code could not be created."
      },
      { status: 400 }
    );
  }
}
