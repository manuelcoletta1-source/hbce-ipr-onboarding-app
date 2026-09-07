import "server-only";

import {
  ONBOARDING_SESSION_IDLE_TTL_SECONDS,
  type OnboardingSessionIssuedState,
  type OnboardingSessionTrustState
} from "@/lib/server/neon-onboarding-session-repository";

export type OnboardingSessionAuthorityRequirement =
  | "STARTED"
  | "CONTACT_VERIFIED";

export type OnboardingSessionAuthority = {
  readonly sessionId: string;
  readonly onboardingId: string;
  readonly subjectId: string;
  readonly issuedState: OnboardingSessionIssuedState;
};

export type OnboardingSessionAuthorityFailureCode =
  | "SESSION_NOT_FOUND"
  | "INVALID_SERVER_TIME"
  | "INVALID_SESSION_STATE"
  | "SESSION_ROTATED"
  | "SESSION_REVOKED"
  | "SESSION_EXPIRED_EVENT"
  | "SESSION_ABSOLUTE_EXPIRED"
  | "SESSION_IDLE_EXPIRED"
  | "INSUFFICIENT_TRUST";

export type OnboardingSessionAuthorityDecision =
  | {
      readonly ok: true;
      readonly authority: OnboardingSessionAuthority;
    }
  | {
      readonly ok: false;
      readonly code:
        OnboardingSessionAuthorityFailureCode;
    };

export type EvaluateOnboardingSessionAuthorityInput = {
  readonly trustState:
    OnboardingSessionTrustState | null;
  readonly now: string;
  readonly requiredState:
    OnboardingSessionAuthorityRequirement;
};

function parseNormalizedIsoDateTime(
  value: string
): number | null {
  const parsed = new Date(value);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString() !== value
  ) {
    return null;
  }

  return parsed.getTime();
}

function deny(
  code: OnboardingSessionAuthorityFailureCode
): OnboardingSessionAuthorityDecision {
  return {
    ok: false,
    code
  };
}

export function evaluateOnboardingSessionAuthority(
  input: EvaluateOnboardingSessionAuthorityInput
): OnboardingSessionAuthorityDecision {
  if (!input.trustState) {
    return deny("SESSION_NOT_FOUND");
  }

  const nowMs =
    parseNormalizedIsoDateTime(input.now);

  if (nowMs === null) {
    return deny("INVALID_SERVER_TIME");
  }

  const absoluteExpiresAtMs =
    parseNormalizedIsoDateTime(
      input.trustState.session.absoluteExpiresAt
    );

  const lastActivityAtMs =
    parseNormalizedIsoDateTime(
      input.trustState.lastActivityAt
    );

  if (
    absoluteExpiresAtMs === null ||
    lastActivityAtMs === null ||
    lastActivityAtMs > nowMs
  ) {
    return deny("INVALID_SESSION_STATE");
  }

  if (input.trustState.rotated) {
    return deny("SESSION_ROTATED");
  }

  if (input.trustState.revoked) {
    return deny("SESSION_REVOKED");
  }

  if (input.trustState.expiredEvent) {
    return deny("SESSION_EXPIRED_EVENT");
  }

  if (nowMs >= absoluteExpiresAtMs) {
    return deny("SESSION_ABSOLUTE_EXPIRED");
  }

  const idleExpiryMs =
    lastActivityAtMs +
    ONBOARDING_SESSION_IDLE_TTL_SECONDS *
      1000;

  if (nowMs >= idleExpiryMs) {
    return deny("SESSION_IDLE_EXPIRED");
  }

  if (
    input.requiredState ===
      "CONTACT_VERIFIED" &&
    (
      input.trustState.session.issuedState !==
        "CONTACT_VERIFIED" ||
      !input.trustState.contactVerified
    )
  ) {
    return deny("INSUFFICIENT_TRUST");
  }

  return {
    ok: true,
    authority: {
      sessionId:
        input.trustState.session.sessionId,
      onboardingId:
        input.trustState.session.onboardingId,
      subjectId:
        input.trustState.session.subjectId,
      issuedState:
        input.trustState.session.issuedState
    }
  };
}
