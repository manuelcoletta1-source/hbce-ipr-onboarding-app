"use client";

import {
  runWithOnboardingSessionRecovery
} from "@/lib/client/onboarding-session-recovery";

import {
  useState
} from "react";

export type EmailOtpVerificationPayload = {
  email:
    string;

  email_verified:
    true;

  email_verified_at:
    string;

  email_verification_channel:
    "EMAIL_OTP";

  email_verification_hash:
    string;
};

export type EmailOtpVerificationProps = {
  emailValue:
    string;

  disabled?:
    boolean;

  onVerified:
    (
      payload:
        EmailOtpVerificationPayload
    ) => void;
};

type SendCodeResponse =
  | {
      ok:
        true;

      message?:
        string;

      challenge_token:
        string;

      expires_at:
        number;

      dev_echo:
        boolean;

      dev_code?:
        string;
    }
  | {
      ok:
        false;

      message?:
        string;

      reason?:
        string;
    };

type VerifyCodeResponse =
  | {
      ok:
        true;

      email_verified:
        true;

      email_verified_at:
        string;

      email_verification_channel:
        "EMAIL_OTP";

      email_verification_hash:
        string;

      contact_state:
        | "CONTACT_NOT_READY"
        | "CONTACT_VERIFIED";
    }
  | {
      ok:
        false;

      reason?:
        string;

      message?:
        string;
    };

function normalizeEmail(
  value:
    string
): string {
  return value
    .trim()
    .toLowerCase();
}

function getResponseMessage(
  data:
    SendCodeResponse |
    VerifyCodeResponse,
  fallback:
    string
): string {
  if (
    "message" in data &&
    typeof data.message ===
      "string"
  ) {
    return data.message;
  }

  return fallback;
}

function isValidChallengeResponse(
  data:
    SendCodeResponse
): data is Extract<
  SendCodeResponse,
  {
    ok:
      true;
  }
> {
  return (
    data.ok ===
      true &&
    typeof data.challenge_token ===
      "string" &&
    data.challenge_token.length >
      0 &&
    Number.isSafeInteger(
      data.expires_at
    ) &&
    data.expires_at >
      0 &&
    typeof data.dev_echo ===
      "boolean"
  );
}

function shouldDiscardChallenge(
  data:
    VerifyCodeResponse
): boolean {
  if (
    data.ok ===
      true
  ) {
    return false;
  }

  return (
    data.reason ===
      "INVALID_CHALLENGE" ||
    data.reason ===
      "CHALLENGE_EXPIRED"
  );
}

export default function EmailOtpVerification({
  emailValue,
  disabled = false,
  onVerified
}: EmailOtpVerificationProps) {
  const normalizedEmail =
    normalizeEmail(
      emailValue
    );

  const [
    code,
    setCode
  ] =
    useState(
      ""
    );

  const [
    verifiedEmail,
    setVerifiedEmail
  ] =
    useState(
      ""
    );

  const [
    challengeToken,
    setChallengeToken
  ] =
    useState(
      ""
    );

  const [
    challengeEmail,
    setChallengeEmail
  ] =
    useState(
      ""
    );

  const [
    challengeExpiresAt,
    setChallengeExpiresAt
  ] =
    useState<
      number | null
    >(
      null
    );

  const [
    isSending,
    setIsSending
  ] =
    useState(
      false
    );

  const [
    isVerifying,
    setIsVerifying
  ] =
    useState(
      false
    );

  const [
    message,
    setMessage
  ] =
    useState(
      ""
    );

  const [
    devCode,
    setDevCode
  ] =
    useState(
      ""
    );

  const isVerified =
    verifiedEmail ===
      normalizedEmail &&
    normalizedEmail.length >
      0;

  const hasCurrentChallenge =
    challengeToken.length >
      0 &&
    challengeEmail ===
      normalizedEmail &&
    challengeExpiresAt !==
      null;

  function clearChallenge():
    void {
    setChallengeToken(
      ""
    );

    setChallengeEmail(
      ""
    );

    setChallengeExpiresAt(
      null
    );
  }

  async function sendCode() {
    setMessage(
      ""
    );

    setDevCode(
      ""
    );

    setCode(
      ""
    );

    clearChallenge();

    if (!normalizedEmail) {
      setMessage(
        "Insert an email before requesting the verification code."
      );

      return;
    }

    setIsSending(
      true
    );

    const requestCode =
      () =>
        fetch(
          "/api/onboarding/email/send-code",
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
                email:
                  normalizedEmail
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
        clearChallenge();

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
          SendCodeResponse;

      if (
        !requestResult.response.ok ||
        !isValidChallengeResponse(
          data
        )
      ) {
        setMessage(
          getResponseMessage(
            data,
            "Email verification code could not be sent."
          )
        );

        return;
      }

      setChallengeToken(
        data.challenge_token
      );

      setChallengeEmail(
        normalizedEmail
      );

      setChallengeExpiresAt(
        data.expires_at
      );

      setMessage(
        data.message ??
          "Email verification code sent."
      );

      if (
        data.dev_echo ===
          true &&
        typeof data.dev_code ===
          "string"
      ) {
        setDevCode(
          data.dev_code
        );
      }
    } catch {
      clearChallenge();

      setMessage(
        "Email verification code could not be sent."
      );
    } finally {
      setIsSending(
        false
      );
    }
  }

  async function verifyCode() {
    setMessage(
      ""
    );

    if (!normalizedEmail) {
      setMessage(
        "Insert an email before verifying the code."
      );

      return;
    }

    if (
      !hasCurrentChallenge
    ) {
      setMessage(
        "Request a new email verification code before verification."
      );

      return;
    }

    if (
      !/^\d{6}$/.test(
        code.trim()
      )
    ) {
      setMessage(
        "Insert the 6-digit verification code."
      );

      return;
    }

    setIsVerifying(
      true
    );

    const verifyRequest =
      () =>
        fetch(
          "/api/onboarding/email/verify-code",
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
                email:
                  normalizedEmail,

                code:
                  code.trim(),

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
        clearChallenge();

        setCode(
          ""
        );

        setDevCode(
          ""
        );

        if (
          requestResult.recovered
        ) {
          setMessage(
            "Onboarding session recovered. Request a new email verification code."
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
          VerifyCodeResponse;

      if (
        !requestResult.response.ok ||
        data.ok !==
          true
      ) {
        if (
          shouldDiscardChallenge(
            data
          )
        ) {
          clearChallenge();

          setCode(
            ""
          );

          setDevCode(
            ""
          );
        }

        setMessage(
          getResponseMessage(
            data,
            "Email verification failed."
          )
        );

        return;
      }

      setVerifiedEmail(
        normalizedEmail
      );

      setCode(
        ""
      );

      setDevCode(
        ""
      );

      clearChallenge();

      setMessage(
        "Email verified."
      );

      onVerified({
        email:
          normalizedEmail,

        email_verified:
          true,

        email_verified_at:
          data.email_verified_at,

        email_verification_channel:
          data.email_verification_channel,

        email_verification_hash:
          data.email_verification_hash
      });
    } catch {
      setMessage(
        "Email verification failed."
      );
    } finally {
      setIsVerifying(
        false
      );
    }
  }

  return (
    <section className="hbce-card hbce-card--soft">
      <div className="hbce-stack">
        <div>
          <p className="hbce-kicker">
            Email verification
          </p>

          <h2>
            Verify the customer email before Certificate 01.
          </h2>

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
            disabled={
              disabled ||
              isSending ||
              isVerifying ||
              !normalizedEmail ||
              isVerified
            }
            onClick={sendCode}
          >
            {isSending
              ? "Sending code"
              : hasCurrentChallenge
                ? "Send new email code"
                : "Send email code"}
          </button>
        </div>

        <label className="hbce-field">
          <span>
            Email verification code
          </span>

          <input
            type="text"
            inputMode="numeric"
            value={code}
            placeholder="000000"
            disabled={
              disabled ||
              isVerifying ||
              isSending ||
              isVerified
            }
            onChange={
              (
                event
              ) =>
                setCode(
                  event.target.value
                )
            }
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
            disabled={
              disabled ||
              isVerifying ||
              isSending ||
              isVerified ||
              !hasCurrentChallenge
            }
            onClick={verifyCode}
          >
            {isVerifying
              ? "Verifying code"
              : "Verify email"}
          </button>
        </div>

        {message ? (
          <p
            className={
              isVerified
                ? "hbce-success-text"
                : "hbce-muted"
            }
          >
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
            <strong>
              EMAIL_VERIFIED
            </strong>

            <p>
              The customer email has been verified for Certificate 01.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
