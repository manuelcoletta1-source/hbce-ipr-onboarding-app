"use client";

import {
  runWithOnboardingSessionRecovery
} from "@/lib/client/onboarding-session-recovery";

import { useState } from "react";

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
};

type SendPhoneCodeResponse =
  | {
      ok: true;
      message?: string;
      challenge_token: string;
      expires_at: number;
      dev_echo: boolean;
      dev_code?: string;
    }
  | {
      ok: false;
      reason?: string;
      message?: string;
    };

type VerifyPhoneCodeResponse =
  | {
      ok: true;
      phone_verified: true;
      phone_verified_at: string;
      phone_verification_channel: "SMS_OTP";
      phone_verification_hash: string;
      contact_state: "CONTACT_NOT_READY" | "CONTACT_VERIFIED";
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

function isValidSendSuccess(
  data: SendPhoneCodeResponse
): data is Extract<SendPhoneCodeResponse, { ok: true }> {
  return (
    data.ok === true &&
    typeof data.challenge_token === "string" &&
    data.challenge_token.length > 0 &&
    data.challenge_token === data.challenge_token.trim() &&
    Number.isSafeInteger(data.expires_at) &&
    data.expires_at > 0 &&
    typeof data.dev_echo === "boolean" &&
    (
      data.dev_code === undefined ||
      typeof data.dev_code === "string"
    )
  );
}

function isValidVerifySuccess(
  data: VerifyPhoneCodeResponse
): data is Extract<VerifyPhoneCodeResponse, { ok: true }> {
  return (
    data.ok === true &&
    data.phone_verified === true &&
    typeof data.phone_verified_at === "string" &&
    data.phone_verified_at.length > 0 &&
    data.phone_verification_channel === "SMS_OTP" &&
    typeof data.phone_verification_hash === "string" &&
    /^[0-9a-f]{64}$/.test(data.phone_verification_hash) &&
    (
      data.contact_state === "CONTACT_NOT_READY" ||
      data.contact_state === "CONTACT_VERIFIED"
    )
  );
}

export default function PhoneOtpVerification({
  phoneValue,
  disabled = false,
  onVerified
}: PhoneOtpVerificationProps) {
  const normalizedPhone = normalizePhoneNumber(phoneValue);

  const [code, setCode] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState("");
  const [devCode, setDevCode] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [challengePhone, setChallengePhone] = useState("");
  const [challengeExpiresAt, setChallengeExpiresAt] =
    useState<number | null>(null);

  const isVerified =
    verifiedPhone === normalizedPhone && normalizedPhone.length > 0;

  const challengeMatchesPhone =
    challengePhone === normalizedPhone && normalizedPhone.length > 0;

  const hasUsableChallenge =
    challengeToken.length > 0 &&
    challengeMatchesPhone &&
    challengeExpiresAt !== null &&
    Number.isSafeInteger(challengeExpiresAt) &&
    challengeExpiresAt > 0;

  function clearChallengeState() {
    setChallengeToken("");
    setChallengePhone("");
    setChallengeExpiresAt(null);
  }

  async function sendCode() {
    setMessage("");
    setDevCode("");
    setCode("");
    setVerifiedPhone("");
    clearChallengeState();

    if (!normalizedPhone) {
      setMessage(
        "Insert a phone number before requesting the verification code."
      );
      return;
    }

    setIsSending(true);

    const requestCode =
      () =>
        fetch(
          "/api/onboarding/phone/send-code",
          {
            method:
              "POST",

            credentials:
              "same-origin",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                phone_number:
                  normalizedPhone
              })
          }
        );

    try {
      const requestResult =
        await runWithOnboardingSessionRecovery(
          requestCode,
          "retry-after-recovery"
        );

      if (
        requestResult.recoveryAttempted &&
        !requestResult.recovered
      ) {
        clearChallengeState();
        setDevCode("");

        setMessage(
          "Onboarding session could not be recovered. Restart onboarding."
        );

        return;
      }

      const data =
        (
          await requestResult
            .response
            .json()
        ) as
          SendPhoneCodeResponse;

      if (
        !requestResult.response.ok ||
        !isValidSendSuccess(data)
      ) {
        setMessage(
          getResponseMessage(
            data,
            "Phone verification code could not be sent."
          )
        );
        return;
      }

      setChallengeToken(
        data.challenge_token
      );

      setChallengePhone(
        normalizedPhone
      );

      setChallengeExpiresAt(
        data.expires_at
      );

      setDevCode(
        data.dev_echo &&
        typeof data.dev_code === "string"
          ? data.dev_code
          : ""
      );

      setMessage(
        data.message ??
          "Phone verification code sent."
      );
    } catch {
      clearChallengeState();
      setDevCode("");

      setMessage(
        "Phone verification code could not be sent."
      );
    } finally {
      setIsSending(false);
    }
  }

  async function verifyCode() {
    setMessage("");

    if (!normalizedPhone) {
      setMessage(
        "Insert a phone number before verifying the code."
      );
      return;
    }

    const normalizedCode =
      normalizeOtpCode(
        code
      );

    if (
      !/^\d{6}$/.test(
        normalizedCode
      )
    ) {
      setMessage(
        "Insert the six-digit SMS verification code."
      );
      return;
    }

    if (!hasUsableChallenge) {
      clearChallengeState();
      setDevCode("");

      setMessage(
        "Request a new SMS verification code before verifying the phone."
      );
      return;
    }

    setIsVerifying(true);

    const verifyRequest =
      () =>
        fetch(
          "/api/onboarding/phone/verify-code",
          {
            method:
              "POST",

            credentials:
              "same-origin",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                phone_number:
                  normalizedPhone,

                code:
                  normalizedCode,

                challenge_token:
                  challengeToken
              })
          }
        );

    try {
      const requestResult =
        await runWithOnboardingSessionRecovery(
          verifyRequest,
          "recover-without-retry"
        );

      if (
        requestResult.recoveryAttempted
      ) {
        clearChallengeState();
        setCode("");
        setDevCode("");

        if (
          requestResult.recovered
        ) {
          setMessage(
            "Onboarding session recovered. Request a new SMS verification code."
          );
        } else {
          setMessage(
            "Onboarding session could not be recovered. Restart onboarding."
          );
        }

        return;
      }

      const data =
        (
          await requestResult
            .response
            .json()
        ) as
          VerifyPhoneCodeResponse;

      if (
        !requestResult.response.ok ||
        data.ok !== true
      ) {
        if (
          data.ok === false &&
          (
            data.reason ===
              "INVALID_CHALLENGE" ||
            data.reason ===
              "CHALLENGE_EXPIRED"
          )
        ) {
          clearChallengeState();
          setDevCode("");
        }

        setMessage(
          getResponseMessage(
            data,
            "Phone verification failed."
          )
        );
        return;
      }

      if (
        !isValidVerifySuccess(
          data
        )
      ) {
        clearChallengeState();
        setDevCode("");

        setMessage(
          "Phone verification failed."
        );
        return;
      }

      setVerifiedPhone(
        normalizedPhone
      );

      setCode("");
      clearChallengeState();
      setDevCode("");

      setMessage(
        data.contact_state ===
          "CONTACT_VERIFIED"
          ? "Phone verified. Contact verification completed."
          : "Phone verified."
      );

      onVerified({
        phone_number:
          normalizedPhone,

        phone_verified:
          true,

        phone_verified_at:
          data.phone_verified_at,

        phone_verification_channel:
          data.phone_verification_channel,

        phone_verification_hash:
          data.phone_verification_hash
      });
    } catch {
      setMessage(
        "Phone verification failed."
      );
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
            value={challengeMatchesPhone ? code : ""}
            placeholder="000000"
            maxLength={6}
            disabled={
              disabled ||
              isVerifying ||
              isVerified ||
              !hasUsableChallenge
            }
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
            disabled={
              disabled ||
              isVerifying ||
              isVerified ||
              !hasUsableChallenge
            }
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

        {devCode && challengeMatchesPhone ? (
          <p className="hbce-mono">dev_code: {devCode}</p>
        ) : null}

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
