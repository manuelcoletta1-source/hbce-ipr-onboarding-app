import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  NeonOnboardingSessionRepository
} from "../lib/server/neon-onboarding-session-repository";

import type {
  OnboardingSessionDatabaseExecutor
} from "../lib/server/neon-onboarding-session-repository";

const TOKEN_SHA256 =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function createHarness() {
  const query =
    vi.fn<
      OnboardingSessionDatabaseExecutor["query"]
    >();

  const transaction =
    vi.fn<
      OnboardingSessionDatabaseExecutor["transaction"]
    >();

  const executor = {
    query,
    transaction
  } satisfies OnboardingSessionDatabaseExecutor;

  return {
    executor,
    query,
    transaction
  };
}

function buildTrustRow() {
  return {
    session_id:
      "session_started_001",
    onboarding_id:
      "onb_001",
    subject_id:
      "sub_001",
    token_sha256:
      TOKEN_SHA256,
    issued_state:
      "STARTED",
    issued_at:
      new Date(
        "2026-09-05T10:00:00.000Z"
      ),
    absolute_expires_at:
      new Date(
        "2026-09-05T18:00:00.000Z"
      ),
    rotated_from_session_id:
      null,
    created_at:
      new Date(
        "2026-09-05T10:00:00.000Z"
      ),
    email_verified:
      true,
    phone_verified:
      false,
    contact_verified:
      false,
    rotated:
      false,
    revoked:
      false,
    expired_event:
      false,
    last_activity_at:
      new Date(
        "2026-09-05T10:05:00.000Z"
      )
  };
}

describe(
  "P003-D083R3R2 session-id trust-state reader",
  () => {
    it(
      "reads canonical factor readiness by exact server session identifier",
      async () => {
        const harness =
          createHarness();

        harness.query.mockResolvedValue([
          buildTrustRow()
        ]);

        const repository =
          new NeonOnboardingSessionRepository(
            harness.executor
          );

        await expect(
          repository.getBySessionId(
            "session_started_001"
          )
        ).resolves.toMatchObject({
          session: {
            sessionId:
              "session_started_001",
            onboardingId:
              "onb_001",
            subjectId:
              "sub_001",
            tokenSha256:
              TOKEN_SHA256,
            issuedState:
              "STARTED",
            rotatedFromSessionId:
              null
          },
          emailVerified:
            true,
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
          lastActivityAt:
            "2026-09-05T10:05:00.000Z"
        });

        expect(
          harness.query
        ).toHaveBeenCalledTimes(
          1
        );

        const [
          query,
          parameters
        ] =
          harness.query.mock.calls[0]!;

        expect(
          query
        ).toContain(
          "WHERE sessions.session_id = $1"
        );

        expect(
          query
        ).toContain(
          "event_type = 'EMAIL_VERIFIED'"
        );

        expect(
          query
        ).toContain(
          "event_type = 'PHONE_VERIFIED'"
        );

        expect(
          parameters
        ).toEqual([
          "session_started_001"
        ]);

        expect(
          harness.transaction
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns null when no canonical session exists",
      async () => {
        const harness =
          createHarness();

        harness.query.mockResolvedValue(
          []
        );

        const repository =
          new NeonOnboardingSessionRepository(
            harness.executor
          );

        await expect(
          repository.getBySessionId(
            "session_missing_001"
          )
        ).resolves.toBeNull();

        expect(
          harness.query
        ).toHaveBeenCalledWith(
          expect.stringContaining(
            "WHERE sessions.session_id = $1"
          ),
          [
            "session_missing_001"
          ]
        );
      }
    );

    it(
      "rejects empty or noncanonical session identifiers before database access",
      async () => {
        const harness =
          createHarness();

        const repository =
          new NeonOnboardingSessionRepository(
            harness.executor
          );

        await expect(
          repository.getBySessionId("")
        ).resolves.toBeNull();

        await expect(
          repository.getBySessionId(
            " session_started_001 "
          )
        ).resolves.toBeNull();

        expect(
          harness.query
        ).not.toHaveBeenCalled();

        expect(
          harness.transaction
        ).not.toHaveBeenCalled();
      }
    );
  }
);
