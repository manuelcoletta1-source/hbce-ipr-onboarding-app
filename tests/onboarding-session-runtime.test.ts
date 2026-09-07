import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  AUTHENTICATED_SESSION_ACTIVITY_PAYLOAD_KIND,
  OnboardingSessionRuntimeError,
  OnboardingSessionRuntimeOrchestrator
} from "../lib/server/onboarding-session-runtime";

import {
  sha256OnboardingSessionToken
} from "../lib/server/onboarding-session-token";

import type {
  OnboardingSessionRepository,
  OnboardingSessionTrustState
} from "../lib/server/neon-onboarding-session-repository";

import type {
  OnboardingSessionLifecycleCommands
} from "../lib/server/neon-onboarding-session-lifecycle-commands";

const NOW =
  "2026-09-04T16:10:00.000Z";

function rawToken(): string {
  return Buffer.alloc(
    32,
    11
  ).toString(
    "base64url"
  );
}

function buildTrustState(
  options: {
    issuedState?:
      "STARTED" |
      "CONTACT_VERIFIED";
    emailVerified?: boolean;
    phoneVerified?: boolean;
    contactVerified?: boolean;
    rotated?: boolean;
    revoked?: boolean;
    expiredEvent?: boolean;
  } = {}
): OnboardingSessionTrustState {
  const issuedState =
    options.issuedState ??
    "STARTED";

  return {
    session: {
      sessionId:
        "session_server_001",
      onboardingId:
        "onb_server_001",
      subjectId:
        "sub_server_001",
      tokenSha256:
        "a".repeat(64),
      issuedState,
      issuedAt:
        "2026-09-04T16:00:00.000Z",
      absoluteExpiresAt:
        "2026-09-05T00:00:00.000Z",
      rotatedFromSessionId:
        issuedState ===
          "CONTACT_VERIFIED"
          ? "session_started_000"
          : null,
      createdAt:
        "2026-09-04T16:00:00.000Z"
    },
    emailVerified:
      options.emailVerified ??
      false,
    phoneVerified:
      options.phoneVerified ??
      false,
    contactVerified:
      options.contactVerified ??
      false,
    rotated:
      options.rotated ??
      false,
    revoked:
      options.revoked ??
      false,
    expiredEvent:
      options.expiredEvent ??
      false,
    lastActivityAt:
      "2026-09-04T16:00:00.000Z"
  };
}

function createHarness(
  trustState:
    OnboardingSessionTrustState | null =
      buildTrustState()
) {
  const createStartedSession =
    vi.fn<
      OnboardingSessionRepository[
        "createStartedSession"
      ]
    >();

  const getByTokenSha256 =
    vi.fn<
      OnboardingSessionRepository[
        "getByTokenSha256"
      ]
    >();

  const getBySessionId =
    vi.fn<
      OnboardingSessionRepository[
        "getBySessionId"
      ]
    >();

  getByTokenSha256.mockResolvedValue(
    trustState
  );

  getBySessionId.mockResolvedValue(
    trustState
  );

  const repository = {
    createStartedSession,
    getByTokenSha256,
    getBySessionId
  } satisfies OnboardingSessionRepository;

  const recordActivity =
    vi.fn<
      OnboardingSessionLifecycleCommands[
        "recordActivity"
      ]
    >();

  recordActivity.mockResolvedValue({
    status:
      "SKIPPED_THROTTLE",
    event: null
  });

  const revokeSession =
    vi.fn<
      OnboardingSessionLifecycleCommands[
        "revokeSession"
      ]
    >();

  const expireSession =
    vi.fn<
      OnboardingSessionLifecycleCommands[
        "expireSession"
      ]
    >();

  const lifecycle = {
    recordActivity,
    revokeSession,
    expireSession
  } satisfies OnboardingSessionLifecycleCommands;

  const orchestrator =
    new OnboardingSessionRuntimeOrchestrator(
      repository,
      lifecycle,
      () => new Date(NOW)
    );

  return {
    orchestrator,
    repository,
    lifecycle,
    createStartedSession,
    getByTokenSha256,
    getBySessionId,
    recordActivity,
    revokeSession,
    expireSession
  };
}

describe(
  "onboarding session runtime orchestrator",
  () => {
    it.each([
      null,
      undefined,
      "",
      "abc",
      "A".repeat(42),
      "A".repeat(44)
    ])(
      "rejects missing or malformed token before repository access",
      async (token) => {
        const harness =
          createHarness();

        await expect(
          harness.orchestrator.authorize({
            rawToken: token,
            requiredState:
              "STARTED"
          })
        ).rejects.toMatchObject({
          code:
            "UNAUTHORIZED"
        });

        expect(
          harness.getByTokenSha256
        ).not.toHaveBeenCalled();

        expect(
          harness.recordActivity
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "hashes the raw token server-side before repository lookup",
      async () => {
        const token =
          rawToken();

        const harness =
          createHarness();

        await harness.orchestrator.authorize({
          rawToken: token,
          requiredState:
            "STARTED"
        });

        expect(
          harness.getByTokenSha256
        ).toHaveBeenCalledWith(
          sha256OnboardingSessionToken(
            token
          )
        );

        expect(
          harness.getByTokenSha256
        ).not.toHaveBeenCalledWith(
          token
        );
      }
    );

    it(
      "returns only server-derived authority fields",
      async () => {
        const harness =
          createHarness();

        const authority =
          await harness.orchestrator.authorize({
            rawToken:
              rawToken(),
            requiredState:
              "STARTED"
          });

        expect(
          authority
        ).toEqual({
          sessionId:
            "session_server_001",
          onboardingId:
            "onb_server_001",
          subjectId:
            "sub_server_001",
          issuedState:
            "STARTED"
        });

        expect(
          "tokenSha256" in authority
        ).toBe(false);

        expect(
          "rawToken" in authority
        ).toBe(false);

        expect(
          "contactVerified" in authority
        ).toBe(false);
      }
    );

    it(
      "records minimal authenticated activity only after authority succeeds",
      async () => {
        const harness =
          createHarness();

        await harness.orchestrator.authorize({
          rawToken:
            rawToken(),
          requiredState:
            "STARTED"
        });

        expect(
          harness.recordActivity
        ).toHaveBeenCalledTimes(1);

        expect(
          harness.recordActivity
        ).toHaveBeenCalledWith({
          sessionId:
            "session_server_001",
          occurredAt:
            NOW,
          createdAt:
            NOW,
          payload: {
            kind:
              AUTHENTICATED_SESSION_ACTIVITY_PAYLOAD_KIND
          }
        });

        const call =
          harness.recordActivity.mock.calls[
            0
          ]?.[0];

        expect(
          JSON.stringify(call)
        ).not.toContain(
          rawToken()
        );

        expect(
          JSON.stringify(call)
        ).not.toContain(
          sha256OnboardingSessionToken(
            rawToken()
          )
        );
      }
    );

    it(
      "treats SKIPPED_THROTTLE as successful authenticated activity",
      async () => {
        const harness =
          createHarness();

        await expect(
          harness.orchestrator.authorize({
            rawToken:
              rawToken(),
            requiredState:
              "STARTED"
          })
        ).resolves.toMatchObject({
          sessionId:
            "session_server_001"
        });
      }
    );

    it(
      "accepts APPENDED authenticated activity",
      async () => {
        const harness =
          createHarness();

        harness.recordActivity.mockResolvedValue({
          status: "APPENDED",
          event: {
            eventId:
              "evt_session_activity_001",
            sessionId:
              "session_server_001",
            eventSeq: 2,
            eventType:
              "SESSION_ACTIVITY",
            previousEventHash:
              "a".repeat(64),
            eventHash:
              "b".repeat(64),
            eventPayloadSha256:
              "c".repeat(64),
            occurredAt: NOW,
            createdAt: NOW
          }
        });

        await expect(
          harness.orchestrator.authorize({
            rawToken:
              rawToken(),
            requiredState:
              "STARTED"
          })
        ).resolves.toMatchObject({
          issuedState:
            "STARTED"
        });
      }
    );

    it(
      "maps missing server session to unauthorized and does not record activity",
      async () => {
        const harness =
          createHarness(null);

        await expect(
          harness.orchestrator.authorize({
            rawToken:
              rawToken(),
            requiredState:
              "STARTED"
          })
        ).rejects.toMatchObject({
          code:
            "UNAUTHORIZED"
        });

        expect(
          harness.recordActivity
        ).not.toHaveBeenCalled();
      }
    );

    it.each([
      {
        rotated: true
      },
      {
        revoked: true
      },
      {
        expiredEvent: true
      }
    ])(
      "maps terminal server state to unauthorized",
      async (state) => {
        const harness =
          createHarness(
            buildTrustState(
              state
            )
          );

        await expect(
          harness.orchestrator.authorize({
            rawToken:
              rawToken(),
            requiredState:
              "STARTED"
          })
        ).rejects.toMatchObject({
          code:
            "UNAUTHORIZED"
        });

        expect(
          harness.recordActivity
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "maps insufficient trust to forbidden",
      async () => {
        const harness =
          createHarness(
            buildTrustState()
          );

        await expect(
          harness.orchestrator.authorize({
            rawToken:
              rawToken(),
            requiredState:
              "CONTACT_VERIFIED"
          })
        ).rejects.toMatchObject({
          code:
            "FORBIDDEN"
        });

        expect(
          harness.recordActivity
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "authorizes a CONTACT_VERIFIED session from server-derived state",
      async () => {
        const harness =
          createHarness(
            buildTrustState({
              issuedState:
                "CONTACT_VERIFIED",
              emailVerified: true,
              phoneVerified: true,
              contactVerified: true
            })
          );

        await expect(
          harness.orchestrator.authorize({
            rawToken:
              rawToken(),
            requiredState:
              "CONTACT_VERIFIED"
          })
        ).resolves.toEqual({
          sessionId:
            "session_server_001",
          onboardingId:
            "onb_server_001",
          subjectId:
            "sub_server_001",
          issuedState:
            "CONTACT_VERIFIED"
        });
      }
    );

    it(
      "fails closed on repository dependency failure",
      async () => {
        const harness =
          createHarness();

        harness.getByTokenSha256.mockRejectedValue(
          new Error(
            "database unavailable"
          )
        );

        await expect(
          harness.orchestrator.authorize({
            rawToken:
              rawToken(),
            requiredState:
              "STARTED"
          })
        ).rejects.toMatchObject({
          code:
            "DEPENDENCY_FAILURE"
        });

        expect(
          harness.recordActivity
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "fails closed on authenticated activity failure",
      async () => {
        const harness =
          createHarness();

        harness.recordActivity.mockRejectedValue(
          new Error(
            "activity append failed"
          )
        );

        await expect(
          harness.orchestrator.authorize({
            rawToken:
              rawToken(),
            requiredState:
              "STARTED"
          })
        ).rejects.toMatchObject({
          code:
            "DEPENDENCY_FAILURE"
        });
      }
    );

    it(
      "fails closed on an invalid runtime clock before repository access",
      async () => {
        const harness =
          createHarness();

        const orchestrator =
          new OnboardingSessionRuntimeOrchestrator(
            harness.repository,
            harness.lifecycle,
            () =>
              new Date(
                Number.NaN
              )
          );

        await expect(
          orchestrator.authorize({
            rawToken:
              rawToken(),
            requiredState:
              "STARTED"
          })
        ).rejects.toBeInstanceOf(
          OnboardingSessionRuntimeError
        );

        await expect(
          orchestrator.authorize({
            rawToken:
              rawToken(),
            requiredState:
              "STARTED"
          })
        ).rejects.toMatchObject({
          code:
            "DEPENDENCY_FAILURE"
        });

        expect(
          harness.getByTokenSha256
        ).not.toHaveBeenCalled();
      }
    );
  }
);
