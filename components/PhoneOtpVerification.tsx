"use client";

import { useEffect, useState } from "react";

export type PhoneOtpVerificationPayload = {
  phone_number: string;
  phone_verified: true;
  phone_verified_at: string;
  phone_verification_channel: "SMS_OTP";
  phone_verification_hash: string;
};

export type PhoneOtpVerificationProps = {
  phoneValue: string;
  disabled?: boolean;
  onVerified: (payload: PhoneOtpVerificationPayload) => void;
  onReset?: () => void;
};

type SendPhoneCodeResponse = {
  ok: boolean;
  message?: string;
  reason?: string;
  dev_code?: string;
};

type VerifyPhoneCodeResponse =
  | {
      ok: true;
      phone_number: string;
      phone_verified: true;
      phone_verified_at: string;
      phone_verification_channel: "SMS_OTP";
      phone_verification_hash: string;
    }
  | {
      ok: false;
      reason?: string;
      message?: string;
    };

function normalizePhoneNumber(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

function normalizeOtpCode(value: string): string {
  return value.replace(/\D+/g, "").trim();
}

function getResponseMessage(
  data: SendPhoneCodeResponse | VerifyPhoneCodeResponse,
  fallback: string
): string {
  if ("message" in data && typeof data.message === "string") {
    return data.message;
  }

  return fallback;
}

export default function PhoneOtpVerification({
  phoneValue,
  disabled = false,
  onVerified,
  onReset
}: PhoneOtpVerificationProps) {
  const normalizedPhone = normalizePhoneNumber(phoneValue);

  const [code, setCode] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState("");
  const [devCode, setDevCode] = useState("");

  const isVerified =
    verifiedPhone === normalizedPhone && normalizedPhone.length > 0;

  useEffect(() => {
    if (!verifiedPhone) {
      return;
    }

    if (verifiedPhone !== normalizedPhone) {
      setVerifiedPhone("");
      setCode("");
      setMessage("");
      setDevCode("");
      onReset?.();
    }
  }, [normalizedPhone, onReset, verifiedPhone]);

  async function sendCode() {
    setMessage("");
    setDevCode("");

    if (!normalizedPhone) {
      setMessage("Insert a phone number before requesting the verification code.");
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch("/api/onboarding/phone/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phone_number: normalizedPhone
        })
      });

      const data = (await response.json()) as SendPhoneCodeResponse;

      if (!response.ok || !data.ok) {
        setMessage(
          getResponseMessage(data, "Phone verification code could not be sent.")
        );
        return;
      }

      setMessage(data.message ?? "Phone verification code sent.");
      setDevCode(data.dev_code ?? "");
    } catch {
      setMessage("Phone verification code could not be sent.");
    } finally {
      setIsSending(false);
    }
  }

  async function verifyCode() {
    setMessage("");

    if (!normalizedPhone) {
      setMessage("Insert a phone number before verifying the code.");
      return;
    }

    const normalizedCode = normalizeOtpCode(code);

    if (!/^\d{4,10}$/.test(normalizedCode)) {
      setMessage("Insert the SMS verification code received by phone.");
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch("/api/onboarding/phone/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          phone_number: normalizedPhone,
          code: normalizedCode
        })
      });

      const data = (await response.json()) as VerifyPhoneCodeResponse;

      if (!response.ok || data.ok !== true) {
        setMessage(getResponseMessage(data, "Phone verification failed."));
        return;
      }

      setVerifiedPhone(data.phone_number);
      setMessage("Phone verified.");

      onVerified({
        phone_number: data.phone_number,
        phone_verified: true,
        phone_verified_at: data.phone_verified_at,
        phone_verification_channel: data.phone_verification_channel,
        phone_verification_hash: data.phone_verification_hash
      });
    } catch {
      setMessage("Phone verification failed.");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <section className="hbce-card hbce-card--soft">
      <div className="hbce-stack">
        <div>
          <p className="hbce-kicker">Phone verification</p>
          <h2>Verify the customer phone before Certificate 01.</h2>
          <p className="hbce-muted">
            The first HBCE-IPR certificate can be generated only after the phone
            number has been verified through a one-time SMS code.
          </p>
        </div>

        <p className="hbce-mono">phone: {normalizedPhone || "missing"}</p>

        <div className="hbce-actions">
          <button
            className="hbce-btn"
            type="button"
            disabled={disabled || isSending || !normalizedPhone}
            onClick={sendCode}
          >
            {isSending ? "Sending SMS code" : "Send SMS code"}
          </button>
        </div>

        <label className="hbce-field">
          <span>SMS verification code</span>
          <input
            type="text"
            inputMode="numeric"
            value={code}
            placeholder="000000000"
            disabled={disabled || isVerifying || isVerified}
            onChange={(event) => setCode(event.target.value)}
          />
          <small>
            Enter the code received by SMS. The code is never written inside the
            HBCE-IPR certificate.
          </small>
        </label>

        <div className="hbce-actions">
          <button
            className="hbce-btn hbce-btn--primary"
            type="button"
            disabled={disabled || isVerifying || isVerified}
            onClick={verifyCode}
          >
            {isVerifying ? "Verifying SMS code" : "Verify phone"}
          </button>
        </div>

        {message ? (
          <p className={isVerified ? "hbce-success-text" : "hbce-muted"}>
            {message}
          </p>
        ) : null}

        {devCode ? <p className="hbce-mono">dev_code: {devCode}</p> : null}

        {isVerified ? (
          <div className="hbce-upload-status hbce-upload-status--valid">
            <strong>PHONE_VERIFIED</strong>
            <p>The customer phone number has been verified for Certificate 01.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
