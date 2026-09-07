"use client";

import {
  type FormEvent,
  useRef,
  useState
} from "react";

import {
  useRouter
} from "next/navigation";

import {
  generateBrowserStartIdempotencyKey
} from "@/lib/client/onboarding-start-idempotency";

type StartSuccessPayload = {
  readonly onboarding_status:
    "started";
  readonly joker_c2_access_status:
    "denied";
  readonly next_route:
    "/onboarding/identity";
};

function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isValidStartSuccessPayload(
  value: unknown
): value is StartSuccessPayload {
  if (
    !isPlainObject(value)
  ) {
    return false;
  }

  const keys =
    Object.keys(
      value
    ).sort();

  if (
    keys.length !== 3 ||
    keys[0] !==
      "joker_c2_access_status" ||
    keys[1] !==
      "next_route" ||
    keys[2] !==
      "onboarding_status"
  ) {
    return false;
  }

  return (
    value.onboarding_status ===
      "started" &&
    value.joker_c2_access_status ===
      "denied" &&
    value.next_route ===
      "/onboarding/identity"
  );
}

async function readErrorCode(
  response: Response
): Promise<string> {
  try {
    const payload:
      unknown =
        await response.json();

    if (
      isPlainObject(
        payload
      ) &&
      isPlainObject(
        payload.error
      ) &&
      typeof payload.error.code ===
        "string" &&
      payload.error.code.length > 0
    ) {
      return payload.error.code;
    }
  } catch {
    // Error payload parsing must not change
    // retry-key authority or navigation.
  }

  return "START_REQUEST_FAILED";
}

export function OnboardingStartClient() {
  const router =
    useRouter();

  const idempotencyKeyRef =
    useRef<string | null>(
      null
    );

  const pendingRef =
    useRef(
      false
    );

  const [
    acceptTerms,
    setAcceptTerms
  ] =
    useState(
      false
    );

  const [
    acceptPrivacy,
    setAcceptPrivacy
  ] =
    useState(
      false
    );

  const [
    pending,
    setPending
  ] =
    useState(
      false
    );

  const [
    errorCode,
    setErrorCode
  ] =
    useState<string | null>(
      null
    );

  const [
    duplicateConflict,
    setDuplicateConflict
  ] =
    useState(
      false
    );

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      pendingRef.current
    ) {
      return;
    }

    if (
      !acceptTerms ||
      !acceptPrivacy
    ) {
      setErrorCode(
        "CONSENT_REQUIRED"
      );

      return;
    }

    pendingRef.current =
      true;

    setPending(
      true
    );

    setErrorCode(
      null
    );

    setDuplicateConflict(
      false
    );

    try {
      if (
        idempotencyKeyRef.current ===
        null
      ) {
        idempotencyKeyRef.current =
          generateBrowserStartIdempotencyKey();
      }

      const response =
        await fetch(
          "/api/onboarding/start",
          {
            method:
              "POST",
            credentials:
              "same-origin",
            headers: {
              "Content-Type":
                "application/json",
              "Idempotency-Key":
                idempotencyKeyRef.current
            },
            body:
              JSON.stringify({
                accept_terms:
                  true,
                accept_privacy:
                  true
              })
          }
        );

      if (
        response.status !==
        201
      ) {
        const code =
          await readErrorCode(
            response
          );

        setErrorCode(
          code
        );

        if (
          response.status ===
          409
        ) {
          setDuplicateConflict(
            true
          );
        }

        return;
      }

      let payload:
        unknown;

      try {
        payload =
          await response.json();
      } catch {
        setErrorCode(
          "INVALID_START_SUCCESS_RESPONSE"
        );

        return;
      }

      if (
        !isValidStartSuccessPayload(
          payload
        )
      ) {
        setErrorCode(
          "INVALID_START_SUCCESS_RESPONSE"
        );

        return;
      }

      idempotencyKeyRef.current =
        null;

      router.push(
        "/onboarding/identity"
      );
    } catch {
      setErrorCode(
        "START_NETWORK_FAILURE"
      );
    } finally {
      pendingRef.current =
        false;

      setPending(
        false
      );
    }
  }

  function handleExplicitRestart() {
    if (
      pendingRef.current
    ) {
      return;
    }

    idempotencyKeyRef.current =
      null;

    setDuplicateConflict(
      false
    );

    setErrorCode(
      null
    );
  }

  return (
    <form
      className="hbce-form"
      onSubmit={handleSubmit}
    >
      <div className="hbce-field">
        <label className="hbce-label">
          <input
            checked={acceptTerms}
            disabled={pending}
            name="accept_terms"
            onChange={(event) => {
              setAcceptTerms(
                event.target.checked
              );
            }}
            type="checkbox"
          />{" "}
          I accept the operational onboarding
          terms.
        </label>
      </div>

      <div className="hbce-field">
        <label className="hbce-label">
          <input
            checked={acceptPrivacy}
            disabled={pending}
            name="accept_privacy"
            onChange={(event) => {
              setAcceptPrivacy(
                event.target.checked
              );
            }}
            type="checkbox"
          />{" "}
          I accept the privacy boundary for
          the onboarding start operation.
        </label>
      </div>

      {errorCode !== null ? (
        <div
          className="hbce-card hbce-card--soft"
          role="status"
        >
          <p className="hbce-kicker">
            Start not completed
          </p>

          <p>
            The onboarding session was not
            confirmed. No JOKER-C2 access has
            been granted.
          </p>

          <p className="hbce-mono">
            error: {errorCode}
          </p>
        </div>
      ) : null}

      {duplicateConflict ? (
        <div className="hbce-actions">
          <button
            className="hbce-btn"
            disabled={pending}
            onClick={
              handleExplicitRestart
            }
            type="button"
          >
            Start a new attempt
          </button>
        </div>
      ) : null}

      <div className="hbce-actions">
        <button
          className="hbce-btn hbce-btn--primary"
          disabled={pending}
          type="submit"
        >
          {pending
            ? "Starting onboarding…"
            : "Start onboarding"}
        </button>
      </div>
    </form>
  );
}
