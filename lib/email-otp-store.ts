"use client";

import { useEffect, useState } from "react";

export type EmailOtpVerificationPayload = {
  email: string;
  email_verified: true;
  email_verified_at: string;
  email_verification_channel: "EMAIL_OTP";
  email_verification_hash: string;
};

export type EmailOtpVerificationProps = {
  emailValue: string;
  disabled?: boolean;
  onVerified: (payload: EmailOtpVerificationPayload) => void;
  onReset?: () => void;
};

type SendCodeResponse = {
  ok: boolean;
  message?: string;
  reason?: string;
  dev_code?: string;
};

type VerifyCodeResponse =
  | {
      ok: true;
      email: string;
      email_verified: true;
      email_verified_at: string;
      email_verification_channel: "EMAIL_OTP";
      email_verification_hash: string;
    }
  | {
      ok: false;
      reason?: string;
      message?: string;
    };

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export default function EmailOtpVerification({
  emailValue,
  disabled = false,
  onVerified,
  onReset
}: EmailOtpVerificationProps) {
  const normalizedEmail = normalizeEmail(emailValue);

  const [code, setCode] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState("");
  const [devCode, setDevCode] = useState("");

  const isVerified = verifiedEmail === normalizedEmail && normalizedEmail.length > 0;

  useEffect(() => {
    if (!isVerified) {
      return;
    }

    if (verifiedEmail !== normalizedEmail) {
      setVerifiedEmail("");
      setCode("");
      setMessage("");
      setDevCode("");
      onReset?.();
    }
  }, [isVerified, normalizedEmail, onReset, verifiedEmail]);

  async function sendCode() {
    setMessage("");
    setDevCode("");

    if (!normalizedEmail) {
      setMessage("Insert an email before requesting the verification code.");
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch("/api/onboarding/email/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: normalizedEmail
        })
      });

      const data = (await response.json()) as SendCodeResponse;

      if (!response.ok || !data.ok) {
        setMessage(data.message ?? "Email verification code could not be sent.");
        return;
      }

      setMessage(data.message ?? "Email verification code sent.");
      setDevCode(data.dev_code ?? "");
    } catch {
      setMessage("Email verification code could not be sent.");
    } finally {
      setIsSending(false);
    }
  }

  async function verifyCode() {
    setMessage("");

    if (!normalizedEmail) {
      setMessage("Insert an email before verifying the code.");
      return;
    }

    if (!/^\d{6}$/.test(code.trim())) {
      setMessage("Insert the 6-digit verification code.");
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch("/api/onboarding/email/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: normalizedEmail,
          code: code.trim()
        })
      });

      const data = (await response.json()) as VerifyCodeResponse;

      if (!response.ok || !data.ok) {
        setMessage(data.message ?? "Email verification failed.");
        return;
      }

      setVerifiedEmail(data.email);
      setMessage("Email verified.");

      onVerified({
        email: data.email,
        email_verified: true,
        email_verified_at: data.email_verified_at,
        email_verification_channel: data.email_verification_channel,
        email_verification_hash: data.email_verification_hash
      });
    } catch {
      setMessage("Email verification failed.");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <section className="hbce-card hbce-card--soft">
      <div className="hbce-stack">
        <div>
          <p className="hbce-kicker">Email verification</p>
          <h2>Verify the customer email before Certificate 01.</h2>
          <p className="hbce-muted">
            The first HBCE-IPR certificate can be generated only after the email
            address has been verified through a one-time code.
          </p>
        </div>

        <p className="hbce-mono">
          email: {normalizedEmail || "missing"}
        </p>

        <div className="hbce-actions">
          <button
            className="hbce-btn"
            type="button"
            disabled={disabled || isSending || !normalizedEmail}
            onClick={sendCode}
          >
            {isSending ? "Sending code" : "Send email code"}
          </button>
        </div>

        <label className="hbce-field">
          <span>Email verification code</span>
          <input
            type="text"
            inputMode="numeric"
            value={code}
            placeholder="000000"
            disabled={disabled || isVerifying || isVerified}
            onChange={(event) => setCode(event.target.value)}
          />
          <small>
            Enter the 6-digit code received by email. The code is never written
            inside the HBCE-IPR certificate.
          </small>
        </label>

        <div className="hbce-actions">
          <button
            className="hbce-btn hbce-btn--primary"
            type="button"
            disabled={disabled || isVerifying || isVerified}
            onClick={verifyCode}
          >
            {isVerifying ? "Verifying code" : "Verify email"}
          </button>
        </div>

        {message ? (
          <p className={isVerified ? "hbce-success-text" : "hbce-muted"}>
            {message}
          </p>
        ) : null}

        {devCode ? (
          <p className="hbce-mono">
            dev_code: {devCode}
          </p>
        ) : null}

        {isVerified ? (
          <div className="hbce-upload-status hbce-upload-status--valid">
            <strong>EMAIL_VERIFIED</strong>
            <p>The customer email has been verified for Certificate 01.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
