import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  OnboardingSessionEventCommandError,
  type RotateStartedSessionInput
} from "../lib/server/neon-onboarding-session-event-commands";

import type {
  OnboardingSessionRecord,
  OnboardingSessionTrustState
} from "../lib/server/neon-onboarding-session-repository";

import {
  ONBOARDING_SESSION_IDLE_RECOVERY_REASON,
  OnboardingSessionRecoveryService,
  type OnboardingSessionRecoveryRepositoryDependency,
  type OnboardingSessionStartedRotationDependency
} from "../lib/server/onboarding-session-recovery-service";

import {
  sha256OnboardingSessionToken
} from "../lib/server/onboarding-session-token";

const NOW =
  "2026-09-07T12:00:00.000Z";

const SOURCE_SESSION_ID =
  "session_started_source_001";

const SUCCESSOR_SESSION_ID =
  "session_started_successor_002";

const ONBOARDING_ID =
  "onb_recovery_001";

const SUBJECT_ID =
  "sub_recovery_001";

const SOURCE_RAW_TOKEN =
  Buffer.alloc(
    32,
    17
  ).toString(
    "base64url"
  );

const SUCCESSOR_RAW_TOKEN =
  Buffer.alloc(
    32,
    29
  ).toString(
    "base64url"
  );

const SOURCE_TOKEN_SHA256 =
  sha256OnboardingSessionToken(
    SOURCE_RAW_TOKEN
  );

const SUCCESSOR_TOKEN_SHA256 =
  sha256OnboardingSessionToken(
    SUCCESSOR_RAW_TOKEN
  );

const SUCCESSOR_ABSOLUTE_EXPIRES_AT =
  "2026-09-07T20:00:00.000Z";

type TrustOverrides =
  Partial<
    Omit<
      OnboardingSessionTrustState,
      "session"
    >
  >;

function buildTrustState(
  trustOverrides:
    TrustOverrides = {},
  sessionOverrides:
    Partial<OnboardingSessionRecord> = {}
): OnboardingSessionTrustState {
  return {
    session: {
      sessionId:
        SOURCE_SESSION_ID,
      onboardingId:
        ONBOARDING_ID,
      subjectId:
        SUBJECT_ID,
      tokenSha256:
        SOURCE_TOKEN_SHA256,
      issuedState:
        "STARTED",
      issuedAt:
        "2026-09-07T10:00:00.000Z",
      absoluteExpiresAt:
        "2026-09-07T18:00:00.000Z",
      rotatedFromSessionId:
        null,
      createdAt:
        "2026-09-07T10:00:00.000Z",
      ...sessionOverrides
    },

    emailVerified:
      false,

    phoneVerified:
      false,

    contactVerified:
      false,

    rotated:
      false,

    revoked:
      false,

    expiredEvent:
      false,

    /*
     * Exact idle boundary:
     * 11:30 + 1800 seconds = 12:00.
     * Recovery is therefore eligible at NOW.
     */
    lastActivityAt:
      "2026-09-07T11:30:00.000Z",

    ...trustOverrides
  };
}

function buildSuccessor(
  input:
    RotateStartedSessionInput
): OnboardingSessionRecord {
  return {
    sessionId:
      input.newSessionId,

    onboardingId:
      ONBOARDING_ID,

    subjectId:
      SUBJECT_ID,

    tokenSha256:
      input.newTokenSha256,

    issuedState:
      "STARTED",

    issuedAt:
      input.issuedAt,

    absoluteExpiresAt:
      input.absoluteExpiresAt,

    rotatedFromSessionId:
      input.sourceSessionId,

    createdAt:
      input.createdAt
  };
}

function createHarness(
  trustState:
    OnboardingSessionTrustState | null =
      buildTrustState()
) {
  const getByTokenSha256 =
    vi.fn<
      OnboardingSessionRecoveryRepositoryDependency[
        "getByTokenSha256"
      ]
    >();

  getByTokenSha256.mockResolvedValue(
    trustState
  );

  const repository = {
    getByTokenSha256
  } satisfies
    OnboardingSessionRecoveryRepositoryDependency;

  const rotateStartedSession =
    vi.fn<
      OnboardingSessionStartedRotationDependency[
        "rotateStartedSession"
      ]
    >();

  rotateStartedSession.mockImplementation(
    async (
      input:
        RotateStartedSessionInput
    ) =>
      buildSuccessor(
        input
      )
  );

  const rotations = {
    rotateStartedSession
  } satisfies
    OnboardingSessionStartedRotationDependency;

  const clock =
    vi.fn(
      () =>
        new Date(
          NOW
        )
    );

  const idFactory =
    vi.fn(
      () =>
        SUCCESSOR_SESSION_ID
    );

  const tokenFactory =
    vi.fn(
      () => ({
        rawToken:
          SUCCESSOR_RAW_TOKEN,

        tokenSha256:
          SUCCESSOR_TOKEN_SHA256
      })
    );

  const service =
    new OnboardingSessionRecoveryService(
      repository,
      rotations,
      clock,
      idFactory,
      tokenFactory
    );

  return {
    service,
    getByTokenSha256,
    rotateStartedSession,
    clock,
    idFactory,
    tokenFactory
  };
}

describe(
  "OnboardingSessionRecoveryService",
  () => {
    it.each([
      undefined,
      null,
      "",
      "not-a-valid-cookie-token"
    ])(
      "rejects invalid raw cookie %j before repository access",
      async (
        rawToken
      ) => {
        const harness =
          createHarness();

        await expect(
          harness.service.recover({
            rawToken
          })
        ).rejects.toMatchObject({
          code:
            "UNAUTHORIZED"
        });

        expect(
          harness.getByTokenSha256
        ).not.toHaveBeenCalled();

        expect(
          harness.rotateStartedSession
        ).not.toHaveBeenCalled();

        expect(
          harness.idFactory
        ).not.toHaveBeenCalled();

        expect(
          harness.tokenFactory
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "hashes the valid cookie and rejects an unresolved session",
      async () => {
        const harness =
          createHarness(
            null
          );

        await expect(
          harness.service.recover({
            rawToken:
              SOURCE_RAW_TOKEN
          })
        ).rejects.toMatchObject({
          code:
            "UNAUTHORIZED"
        });

        expect(
          harness.getByTokenSha256
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          harness.getByTokenSha256
        ).toHaveBeenCalledWith(
          SOURCE_TOKEN_SHA256
        );

        expect(
          harness.rotateStartedSession
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "maps repository lookup failure to dependency failure",
      async () => {
        const harness =
          createHarness();

        harness.getByTokenSha256
          .mockRejectedValue(
            new Error(
              "database unavailable"
            )
          );

        await expect(
          harness.service.recover({
            rawToken:
              SOURCE_RAW_TOKEN
          })
        ).rejects.toMatchObject({
          code:
            "DEPENDENCY_FAILURE"
        });

        expect(
          harness.rotateStartedSession
        ).not.toHaveBeenCalled();
      }
    );

    const nonRecoverableCases:
      readonly {
        readonly label: string;
        readonly trust:
          TrustOverrides;
        readonly session:
          Partial<
            OnboardingSessionRecord
          >;
      }[] = [
        {
          label:
            "non STARTED source",
          trust: {},
          session: {
            issuedState:
              "CONTACT_VERIFIED"
          }
        },
        {
          label:
            "contact verified source",
          trust: {
            contactVerified:
              true
          },
          session: {}
        },
        {
          label:
            "already rotated source",
          trust: {
            rotated:
              true
          },
          session: {}
        },
        {
          label:
            "revoked source",
          trust: {
            revoked:
              true
          },
          session: {}
        },
        {
          label:
            "explicitly expired source",
          trust: {
            expiredEvent:
              true
          },
          session: {}
        }
      ];

    it.each(
      nonRecoverableCases
    )(
      "rejects $label",
      async (
        testCase
      ) => {
        const harness =
          createHarness(
            buildTrustState(
              testCase.trust,
              testCase.session
            )
          );

        await expect(
          harness.service.recover({
            rawToken:
              SOURCE_RAW_TOKEN
          })
        ).rejects.toMatchObject({
          code:
            "NOT_RECOVERABLE"
        });

        expect(
          harness.rotateStartedSession
        ).not.toHaveBeenCalled();

        expect(
          harness.idFactory
        ).not.toHaveBeenCalled();

        expect(
          harness.tokenFactory
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects a source that has not yet crossed the idle boundary",
      async () => {
        const harness =
          createHarness(
            buildTrustState({
              lastActivityAt:
                "2026-09-07T11:30:00.001Z"
            })
          );

        await expect(
          harness.service.recover({
            rawToken:
              SOURCE_RAW_TOKEN
          })
        ).rejects.toMatchObject({
          code:
            "NOT_RECOVERABLE"
        });

        expect(
          harness.rotateStartedSession
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects a source at the absolute expiry boundary",
      async () => {
        const harness =
          createHarness(
            buildTrustState(
              {},
              {
                absoluteExpiresAt:
                  NOW
              }
            )
          );

        await expect(
          harness.service.recover({
            rawToken:
              SOURCE_RAW_TOKEN
          })
        ).rejects.toMatchObject({
          code:
            "NOT_RECOVERABLE"
        });

        expect(
          harness.rotateStartedSession
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "fails closed on malformed canonical trust time",
      async () => {
        const harness =
          createHarness(
            buildTrustState({
              lastActivityAt:
                "not-an-iso-time"
            })
          );

        await expect(
          harness.service.recover({
            rawToken:
              SOURCE_RAW_TOKEN
          })
        ).rejects.toMatchObject({
          code:
            "DEPENDENCY_FAILURE"
        });

        expect(
          harness.rotateStartedSession
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "recovers an idle-expired STARTED session at the exact idle boundary while preserving subject and onboarding",
      async () => {
        const source =
          buildTrustState({
            /*
             * Partial trust is deliberately present.
             * Carry-forward itself is derived atomically
             * by the rotation primitive.
             */
            emailVerified:
              true,
            phoneVerified:
              false
          });

        const harness =
          createHarness(
            source
          );

        await expect(
          harness.service.recover({
            rawToken:
              SOURCE_RAW_TOKEN
          })
        ).resolves.toEqual({
          rawToken:
            SUCCESSOR_RAW_TOKEN,

          session: {
            sessionId:
              SUCCESSOR_SESSION_ID,
            onboardingId:
              ONBOARDING_ID,
            subjectId:
              SUBJECT_ID,
            tokenSha256:
              SUCCESSOR_TOKEN_SHA256,
            issuedState:
              "STARTED",
            issuedAt:
              NOW,
            absoluteExpiresAt:
              SUCCESSOR_ABSOLUTE_EXPIRES_AT,
            rotatedFromSessionId:
              SOURCE_SESSION_ID,
            createdAt:
              NOW
          }
        });

        expect(
          harness.getByTokenSha256
        ).toHaveBeenCalledWith(
          SOURCE_TOKEN_SHA256
        );

        expect(
          harness.idFactory
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          harness.tokenFactory
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          harness.rotateStartedSession
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          harness.rotateStartedSession
        ).toHaveBeenCalledWith({
          sourceSessionId:
            SOURCE_SESSION_ID,

          newSessionId:
            SUCCESSOR_SESSION_ID,

          newTokenSha256:
            SUCCESSOR_TOKEN_SHA256,

          issuedAt:
            NOW,

          absoluteExpiresAt:
            SUCCESSOR_ABSOLUTE_EXPIRES_AT,

          createdAt:
            NOW,

          rotatedPayload: {
            reason:
              ONBOARDING_SESSION_IDLE_RECOVERY_REASON
          },

          newSessionCreatedPayload: {
            issuedState:
              "STARTED",

            reason:
              ONBOARDING_SESSION_IDLE_RECOVERY_REASON
          }
        });
      }
    );

    it(
      "maps atomic ROTATION_DENIED to NOT_RECOVERABLE without returning successor authority",
      async () => {
        const harness =
          createHarness();

        harness.rotateStartedSession
          .mockRejectedValue(
            new OnboardingSessionEventCommandError(
              "ROTATION_DENIED",
              "source lost eligibility"
            )
          );

        await expect(
          harness.service.recover({
            rawToken:
              SOURCE_RAW_TOKEN
          })
        ).rejects.toMatchObject({
          code:
            "NOT_RECOVERABLE"
        });

        expect(
          harness.rotateStartedSession
        ).toHaveBeenCalledTimes(
          1
        );
      }
    );

    it(
      "maps unexpected rotation failures to dependency failure",
      async () => {
        const harness =
          createHarness();

        harness.rotateStartedSession
          .mockRejectedValue(
            new Error(
              "unexpected rotation failure"
            )
          );

        await expect(
          harness.service.recover({
            rawToken:
              SOURCE_RAW_TOKEN
          })
        ).rejects.toMatchObject({
          code:
            "DEPENDENCY_FAILURE"
        });
      }
    );

    it(
      "rejects an inconsistent successor returned by the rotation dependency",
      async () => {
        const harness =
          createHarness();

        harness.rotateStartedSession
          .mockImplementation(
            async (
              input:
                RotateStartedSessionInput
            ) => ({
              ...buildSuccessor(
                input
              ),

              subjectId:
                "sub_wrong"
            })
          );

        await expect(
          harness.service.recover({
            rawToken:
              SOURCE_RAW_TOKEN
          })
        ).rejects.toMatchObject({
          code:
            "DEPENDENCY_FAILURE"
        });
      }
    );

    it(
      "rejects a self-rotation identifier before invoking the atomic rotation",
      async () => {
        const harness =
          createHarness();

        harness.idFactory
          .mockReturnValue(
            SOURCE_SESSION_ID
          );

        await expect(
          harness.service.recover({
            rawToken:
              SOURCE_RAW_TOKEN
          })
        ).rejects.toMatchObject({
          code:
            "DEPENDENCY_FAILURE"
        });

        expect(
          harness.rotateStartedSession
        ).not.toHaveBeenCalled();

        expect(
          harness.tokenFactory
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects inconsistent generated token digest before rotation",
      async () => {
        const harness =
          createHarness();

        harness.tokenFactory
          .mockReturnValue({
            rawToken:
              SUCCESSOR_RAW_TOKEN,

            tokenSha256:
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
          });

        await expect(
          harness.service.recover({
            rawToken:
              SOURCE_RAW_TOKEN
          })
        ).rejects.toMatchObject({
          code:
            "DEPENDENCY_FAILURE"
        });

        expect(
          harness.rotateStartedSession
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "fails closed when the recovery clock is invalid before repository access",
      async () => {
        const harness =
          createHarness();

        harness.clock
          .mockReturnValue(
            new Date(
              Number.NaN
            )
          );

        await expect(
          harness.service.recover({
            rawToken:
              SOURCE_RAW_TOKEN
          })
        ).rejects.toMatchObject({
          code:
            "DEPENDENCY_FAILURE"
        });

        expect(
          harness.getByTokenSha256
        ).not.toHaveBeenCalled();

        expect(
          harness.rotateStartedSession
        ).not.toHaveBeenCalled();
      }
    );
  }
);
