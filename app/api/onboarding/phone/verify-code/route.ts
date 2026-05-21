import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type VerifyPhoneCodeRequestBody = {
  phone_number?: unknown;
  code?: unknown;
};

type TwilioVerifyCheckResponse = {
  sid?: string;
  status?: string;
  to?: string;
  channel?: string;
  valid?: boolean;
};

class PhoneVerificationError extends Error {
  readonly reason: string;
  readonly providerStatus: number | undefined;
  readonly providerError: string | undefined;

  constructor(params: {
    reason: string;
    message: string;
    providerStatus?: number;
    providerError?: string;
  }) {
    super(params.message);
    this.name = "PhoneVerificationError";
    this.reason = params.reason;
    this.providerStatus = params.providerStatus;
    this.providerError = params.providerError;
  }
}

function normalizePhoneNumber(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

function isValidE164PhoneNumber(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new PhoneVerificationError({
      reason: `${name}_MISSING`,
      message: `${name} is missing in the server environment.`
    });
  }

  return value;
}

function getTwilioVerifyConfig(): {
  accountSid: string;
  authToken: string;
  verifyServiceSid: string;
} {
  const provider = (process.env.HBCE_SMS_PROVIDER ?? "")
    .trim()
    .toLowerCase();

  if (provider !== "twilio_verify") {
    throw new PhoneVerificationError({
      reason: "UNSUPPORTED_SMS_PROVIDER",
      message: `Unsupported SMS provider: ${provider || "missing"}`
    });
  }

  return {
    accountSid: getRequiredEnv("TWILIO_ACCOUNT_SID"),
    authToken: getRequiredEnv("TWILIO_AUTH_TOKEN"),
    verifyServiceSid: getRequiredEnv("TWILIO_VERIFY_SERVICE_SID")
  };
}

function getPhoneVerificationSecret(): string {
  const secret =
    process.env.HBCE_PHONE_OTP_SECRET?.trim() ??
    process.env.HBCE_OTP_SECRET?.trim();

  if (!secret || secret.length < 24) {
    throw new PhoneVerificationError({
      reason: "PHONE_VERIFICATION_SECRET_MISSING",
      message:
        "HBCE_PHONE_OTP_SECRET or HBCE_OTP_SECRET is missing or too short."
    });
  }

  return secret;
}

function hmac(value: string): string {
  return createHmac("sha256", getPhoneVerificationSecret())
    .update(value)
    .digest("hex");
}

function buildBasicAuthHeader(accountSid: string, authToken: string): string {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

async function readProviderError(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 2000);
  } catch {
    return "Twilio response body could not be read.";
  }
}

async function checkTwilioPhoneVerification(params: {
  phoneNumber: string;
  code: string;
}): Promise<TwilioVerifyCheckResponse> {
  const config = getTwilioVerifyConfig();

  const body = new URLSearchParams({
    To: params.phoneNumber,
    Code: params.code
  });

  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${config.verifyServiceSid}/VerificationCheck`,
    {
      method: "POST",
      headers: {
        Authorization: buildBasicAuthHeader(
          config.accountSid,
          config.authToken
        ),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    }
  );

  if (!response.ok) {
    const providerError = await readProviderError(response);

    throw new PhoneVerificationError({
      reason: "TWILIO_VERIFY_CHECK_REJECTED",
      message: `Twilio Verify rejected the verification check with status ${response.status}.`,
      providerStatus: response.status,
      providerError
    });
  }

  return (await response.json()) as TwilioVerifyCheckResponse;
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

  const phoneNumber = normalizePhoneNumber(body.phone_number);
  const code = body.code.trim();

  if (!isValidE164PhoneNumber(phoneNumber)) {
    return NextResponse.json(
      {
        ok: false,
        reason: "INVALID_PHONE_NUMBER",
        message:
          "Phone number must be in international E.164 format, for example +393515724982."
      },
      { status: 400 }
    );
  }

  if (!/^\d{4,10}$/.test(code)) {
    return NextResponse.json(
      {
        ok: false,
        reason: "INVALID_CODE",
        message: "Phone verification failed. Insert the SMS verification code."
      },
      { status: 400 }
    );
  }

  try {
    const verification = await checkTwilioPhoneVerification({
      phoneNumber,
      code
    });

    if (verification.status !== "approved") {
      return NextResponse.json(
        {
          ok: false,
          reason: "PHONE_CODE_NOT_APPROVED",
          message: "Phone verification failed. Invalid or expired SMS code.",
          provider_status: verification.status ?? null
        },
        { status: 400 }
      );
    }

    const verifiedAt = new Date().toISOString();
    const phoneVerificationHash = hmac(
      `HBCE_PHONE_VERIFIED:${phoneNumber}:${verifiedAt}:${verification.sid ?? "NO_TWILIO_SID"}`
    );

    return NextResponse.json({
      ok: true,
      phone_number: phoneNumber,
      phone_verified: true,
      phone_verified_at: verifiedAt,
      phone_verification_channel: "SMS_OTP",
      phone_verification_hash: phoneVerificationHash
    });
  } catch (error) {
    if (error instanceof PhoneVerificationError) {
      console.error("[HBCE_ONBOARDING_PHONE_VERIFY_FAILED]", {
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

    console.error("[HBCE_ONBOARDING_PHONE_VERIFY_UNKNOWN_FAILED]", error);

    return NextResponse.json(
      {
        ok: false,
        reason: "PHONE_VERIFICATION_FAILED",
        message: "Phone verification failed."
      },
      { status: 502 }
    );
  }
}
