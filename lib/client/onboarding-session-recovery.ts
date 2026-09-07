export const ONBOARDING_SESSION_RECOVERY_ENDPOINT =
  "/api/onboarding/session/recover" as const;

export type OnboardingSessionRecoveryMode =
  | "retry-after-recovery"
  | "recover-without-retry";

export type OnboardingSessionRecoveryFetch = (
  input: string,
  init?: RequestInit
) => Promise<Response>;

export type OnboardingSessionOperation =
  () => Promise<Response>;

export type OnboardingSessionRecoveryResult =
  | {
      readonly recovered: true;
      readonly reason: null;
    }
  | {
      readonly recovered: false;
      readonly reason: string;
    };

export type OnboardingSessionOperationResult = {
  readonly response: Response;
  readonly recoveryAttempted: boolean;
  readonly recovered: boolean;
  readonly retried: boolean;
  readonly recoveryFailureReason: string | null;
};

type RecoverySuccessPayload = {
  readonly ok: true;
  readonly recovery_status: "recovered";
  readonly onboarding_status: "started";
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

function hasExactRecoverySuccessKeys(
  value: Record<string, unknown>
): boolean {
  const keys = Object.keys(value).sort();

  return (
    keys.length === 3 &&
    keys[0] === "ok" &&
    keys[1] === "onboarding_status" &&
    keys[2] === "recovery_status"
  );
}

function isRecoverySuccessPayload(
  value: unknown
): value is RecoverySuccessPayload {
  return (
    isPlainObject(value) &&
    hasExactRecoverySuccessKeys(value) &&
    value.ok === true &&
    value.recovery_status === "recovered" &&
    value.onboarding_status === "started"
  );
}

function readFailureReason(
  value: unknown,
  fallback: string
): string {
  if (
    isPlainObject(value) &&
    value.ok === false &&
    typeof value.reason === "string" &&
    value.reason.length > 0
  ) {
    return value.reason;
  }

  return fallback;
}

async function isSessionUnauthorizedResponse(
  response: Response
): Promise<boolean> {
  if (response.status !== 401) {
    return false;
  }

  try {
    const payload: unknown =
      await response.clone().json();

    return (
      isPlainObject(payload) &&
      payload.ok === false &&
      payload.reason === "SESSION_UNAUTHORIZED"
    );
  } catch {
    return false;
  }
}

export async function recoverOnboardingSessionOnce(
  fetchImpl:
    OnboardingSessionRecoveryFetch =
      fetch
): Promise<OnboardingSessionRecoveryResult> {
  let response: Response;

  try {
    response =
      await fetchImpl(
        ONBOARDING_SESSION_RECOVERY_ENDPOINT,
        {
          method: "POST",

          credentials: "same-origin",

          headers: {
            "Content-Type": "application/json"
          },

          body: "{}"
        }
      );
  } catch {
    return {
      recovered: false,
      reason: "RECOVERY_NETWORK_FAILURE"
    };
  }

  let payload: unknown;

  try {
    payload =
      await response.json();
  } catch {
    return {
      recovered: false,
      reason: "INVALID_RECOVERY_RESPONSE"
    };
  }

  if (
    response.status === 200 &&
    response.ok &&
    isRecoverySuccessPayload(payload)
  ) {
    return {
      recovered: true,
      reason: null
    };
  }

  return {
    recovered: false,

    reason:
      readFailureReason(
        payload,
        "RECOVERY_REQUEST_FAILED"
      )
  };
}

export async function runWithOnboardingSessionRecovery(
  operation:
    OnboardingSessionOperation,

  mode:
    OnboardingSessionRecoveryMode,

  fetchImpl:
    OnboardingSessionRecoveryFetch =
      fetch
): Promise<OnboardingSessionOperationResult> {
  const initialResponse =
    await operation();

  const unauthorized =
    await isSessionUnauthorizedResponse(
      initialResponse
    );

  if (!unauthorized) {
    return {
      response: initialResponse,
      recoveryAttempted: false,
      recovered: false,
      retried: false,
      recoveryFailureReason: null
    };
  }

  const recovery =
    await recoverOnboardingSessionOnce(
      fetchImpl
    );

  if (!recovery.recovered) {
    return {
      response: initialResponse,
      recoveryAttempted: true,
      recovered: false,
      retried: false,
      recoveryFailureReason:
        recovery.reason
    };
  }

  if (
    mode ===
    "recover-without-retry"
  ) {
    return {
      response: initialResponse,
      recoveryAttempted: true,
      recovered: true,
      retried: false,
      recoveryFailureReason: null
    };
  }

  const retryResponse =
    await operation();

  return {
    response: retryResponse,
    recoveryAttempted: true,
    recovered: true,
    retried: true,
    recoveryFailureReason: null
  };
}
