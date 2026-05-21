import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SendPhoneCodeRequestBody = {
  phone_number?: unknown;
};

type TwilioVerifyStartResponse = {
  sid?: string;
  status?: string;
  to?: string;
  channel?: string;
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

async function startTwilioPhoneVerification(phoneNumber: string): Promise<void> {
  const config = getTwilioVerifyConfig();

  const body = new URLSearchParams({
    To: phoneNumber,
    Channel: "sms"
  });

  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${config.verifyServiceSid}/Verifications`,
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
      reason: "TWILIO_VERIFY_SEND_REJECTED",
      message: `Twilio Verify rejected the SMS request with status ${response.status}.`,
      providerStatus: response.status,
      providerError
    });
  }

  const data = (await response.json()) as TwilioVerifyStartResponse;

  if (!data.sid || !data.status) {
    throw new PhoneVerificationError({
      reason: "TWILIO_VERIFY_INVALID_RESPONSE",
      message: "Twilio Verify returned an invalid verification response."
    });
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
        reason: "INVALID_PHONE_NUMBER",
        message: "Phone number is required."
      },
      { status: 400 }
    );
  }

  const phoneNumber = normalizePhoneNumber(body.phone_number);

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

  try {
    await startTwilioPhoneVerification(phoneNumber);

    return NextResponse.json({
      ok: true,
      phone_number: phoneNumber,
      message: "SMS verification code sent."
    });
  } catch (error) {
    if (error instanceof PhoneVerificationError) {
      console.error("[HBCE_ONBOARDING_PHONE_SEND_FAILED]", {
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

    console.error("[HBCE_ONBOARDING_PHONE_SEND_UNKNOWN_FAILED]", error);

    return NextResponse.json(
      {
        ok: false,
        reason: "PHONE_SEND_FAILED",
        message: "Phone verification code could not be sent."
      },
      { status: 502 }
    );
  }
}
