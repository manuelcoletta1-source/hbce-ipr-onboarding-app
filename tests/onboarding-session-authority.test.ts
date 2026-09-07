import {
  describe,
  expect,
  it
} from "vitest";

import {
  evaluateOnboardingSessionAuthority
} from "../lib/server/onboarding-session-authority";

import type {
  OnboardingSessionTrustState
} from "../lib/server/neon-onboarding-session-repository";

const TOKEN_SHA256 =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function buildTrustState(
  overrides:
    Partial<OnboardingSessionTrustState> = {}
): OnboardingSessionTrustState {
  return {
    session: {
      sessionId: "session_001",
      onboardingId: "onb_001",
      subjectId: "sub_001",
      tokenSha256: TOKEN_SHA256,
      issuedState: "STARTED",
      issuedAt:
        "2026-09-04T16:00:00.000Z",
      absoluteExpiresAt:
        "2026-09-05T00:00:00.000Z",
      rotatedFromSessionId: null,
      createdAt:
        "2026-09-04T16:00:00.000Z"
    },
    emailVerified: false,
    phoneVerified: false,
    contactVerified: false,
    rotated: false,
    revoked: false,
    expiredEvent: false,
    lastActivityAt:
      "2026-09-04T16:00:00.000Z",
    ...overrides
  };
}

describe("onboarding session authority evaluator", () => {
  it("denies a missing session", () => {
    expect(
      evaluateOnboardingSessionAuthority({
        trustState: null,
        now: "2026-09-04T16:01:00.000Z",
        requiredState: "STARTED"
      })
    ).toEqual({
      ok: false,
      code: "SESSION_NOT_FOUND"
    });
  });

  it("accepts an active STARTED session for STARTED authority", () => {
    expect(
      evaluateOnboardingSessionAuthority({
        trustState: buildTrustState(),
        now: "2026-09-04T16:29:59.999Z",
        requiredState: "STARTED"
      })
    ).toEqual({
      ok: true,
      authority: {
        sessionId: "session_001",
        onboardingId: "onb_001",
        subjectId: "sub_001",
        issuedState: "STARTED"
      }
    });
  });

  it("denies idle expiry exactly at thirty minutes", () => {
    expect(
      evaluateOnboardingSessionAuthority({
        trustState: buildTrustState(),
        now: "2026-09-04T16:30:00.000Z",
        requiredState: "STARTED"
      })
    ).toEqual({
      ok: false,
      code: "SESSION_IDLE_EXPIRED"
    });
  });

  it("denies absolute expiry exactly at the expiry boundary", () => {
    const state = buildTrustState({
      lastActivityAt:
        "2026-09-04T23:59:00.000Z"
    });

    expect(
      evaluateOnboardingSessionAuthority({
        trustState: state,
        now: "2026-09-05T00:00:00.000Z",
        requiredState: "STARTED"
      })
    ).toEqual({
      ok: false,
      code: "SESSION_ABSOLUTE_EXPIRED"
    });
  });

  it("denies rotated, revoked and explicit expired sessions", () => {
    expect(
      evaluateOnboardingSessionAuthority({
        trustState: buildTrustState({
          rotated: true
        }),
        now: "2026-09-04T16:01:00.000Z",
        requiredState: "STARTED"
      })
    ).toMatchObject({
      ok: false,
      code: "SESSION_ROTATED"
    });

    expect(
      evaluateOnboardingSessionAuthority({
        trustState: buildTrustState({
          revoked: true
        }),
        now: "2026-09-04T16:01:00.000Z",
        requiredState: "STARTED"
      })
    ).toMatchObject({
      ok: false,
      code: "SESSION_REVOKED"
    });

    expect(
      evaluateOnboardingSessionAuthority({
        trustState: buildTrustState({
          expiredEvent: true
        }),
        now: "2026-09-04T16:01:00.000Z",
        requiredState: "STARTED"
      })
    ).toMatchObject({
      ok: false,
      code: "SESSION_EXPIRED_EVENT"
    });
  });

  it("does not treat email plus phone evidence on a STARTED token as CONTACT_VERIFIED authority", () => {
    const state = buildTrustState({
      emailVerified: true,
      phoneVerified: true,
      contactVerified: true
    });

    expect(
      evaluateOnboardingSessionAuthority({
        trustState: state,
        now: "2026-09-04T16:01:00.000Z",
        requiredState: "CONTACT_VERIFIED"
      })
    ).toEqual({
      ok: false,
      code: "INSUFFICIENT_TRUST"
    });
  });

  it("accepts only the rotated CONTACT_VERIFIED session for protected authority", () => {
    const state = buildTrustState({
      session: {
        ...buildTrustState().session,
        sessionId: "session_002",
        issuedState: "CONTACT_VERIFIED",
        rotatedFromSessionId: "session_001"
      },
      contactVerified: true
    });

    expect(
      evaluateOnboardingSessionAuthority({
        trustState: state,
        now: "2026-09-04T16:01:00.000Z",
        requiredState: "CONTACT_VERIFIED"
      })
    ).toEqual({
      ok: true,
      authority: {
        sessionId: "session_002",
        onboardingId: "onb_001",
        subjectId: "sub_001",
        issuedState: "CONTACT_VERIFIED"
      }
    });
  });

  it("fails closed on malformed server or persisted timestamps", () => {
    expect(
      evaluateOnboardingSessionAuthority({
        trustState: buildTrustState(),
        now: "not-a-time",
        requiredState: "STARTED"
      })
    ).toEqual({
      ok: false,
      code: "INVALID_SERVER_TIME"
    });

    expect(
      evaluateOnboardingSessionAuthority({
        trustState: buildTrustState({
          lastActivityAt:
            "2026-09-04 16:00:00"
        }),
        now: "2026-09-04T16:01:00.000Z",
        requiredState: "STARTED"
      })
    ).toEqual({
      ok: false,
      code: "INVALID_SESSION_STATE"
    });
  });

  it("fails closed if persisted activity claims to occur in the future", () => {
    expect(
      evaluateOnboardingSessionAuthority({
        trustState: buildTrustState({
          lastActivityAt:
            "2026-09-04T16:10:00.000Z"
        }),
        now: "2026-09-04T16:05:00.000Z",
        requiredState: "STARTED"
      })
    ).toEqual({
      ok: false,
      code: "INVALID_SESSION_STATE"
    });
  });
});
