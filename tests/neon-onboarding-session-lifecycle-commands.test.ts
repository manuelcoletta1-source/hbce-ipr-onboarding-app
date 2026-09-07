import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  NeonOnboardingSessionLifecycleCommands,
  ONBOARDING_SESSION_ACTIVITY_MIN_INTERVAL_SECONDS,
  OnboardingSessionLifecycleCommandError,
  type AppendLifecycleEventInput
} from "../lib/server/neon-onboarding-session-lifecycle-commands";

import type {
  OnboardingSessionDatabaseExecutor
} from "../lib/server/neon-onboarding-session-repository";

const PREVIOUS_HASH =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const EVENT_HASH =
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const PAYLOAD_HASH =
  "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

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

function buildInput(
  overrides:
    Partial<AppendLifecycleEventInput> = {}
): AppendLifecycleEventInput {
  return {
    sessionId:
      "session_001",
    occurredAt:
      "2026-09-04T16:10:00.000Z",
    createdAt:
      "2026-09-04T16:10:00.000Z",
    payload: {
      source:
        "authenticated-session-runtime"
    },
    ...overrides
  };
}

function buildEventRow(
  eventType:
    | "SESSION_ACTIVITY"
    | "SESSION_REVOKED"
    | "SESSION_EXPIRED"
) {
  return {
    event_id:
      "evt_session_server_generated",
    session_id:
      "session_001",
    event_seq: "3",
    event_type:
      eventType,
    previous_event_hash:
      PREVIOUS_HASH,
    event_hash:
      EVENT_HASH,
    event_payload_sha256:
      PAYLOAD_HASH,
    occurred_at:
      new Date(
        "2026-09-04T16:10:00.000Z"
      ),
    created_at:
      new Date(
        "2026-09-04T16:10:00.000Z"
      )
  };
}

describe(
  "Neon onboarding session lifecycle commands",
  () => {
    it(
      "freezes the five-minute activity write throttle",
      () => {
        expect(
          ONBOARDING_SESSION_ACTIVITY_MIN_INTERVAL_SECONDS
        ).toBe(300);
      }
    );

    it(
      "appends cryptographically-derived SESSION_ACTIVITY under a session lock",
      async () => {
        const harness =
          createHarness();

        harness.transaction.mockResolvedValue([
          [
            {
              session_id:
                "session_001"
            }
          ],
          [
            {
              command_status:
                "APPENDED",
              ...buildEventRow(
                "SESSION_ACTIVITY"
              )
            }
          ]
        ]);

        const commands =
          new NeonOnboardingSessionLifecycleCommands(
            harness.executor
          );

        const result =
          await commands.recordActivity(
            buildInput()
          );

        expect(
          result.status
        ).toBe(
          "APPENDED"
        );

        expect(
          result.event?.eventType
        ).toBe(
          "SESSION_ACTIVITY"
        );

        const [
          statements,
          options
        ] =
          harness.transaction.mock.calls.at(
            0
          )!;

        expect(options).toEqual({
          isolationLevel:
            "ReadCommitted",
          readOnly: false
        });

        expect(
          statements
        ).toHaveLength(2);

        const lockStatement =
          statements[0];

        const activityStatement =
          statements[1];

        if (
          !lockStatement ||
          !activityStatement
        ) {
          throw new Error(
            "Expected two activity statements."
          );
        }

        expect(
          lockStatement.query
        ).toContain(
          "FOR UPDATE"
        );

        expect(
          activityStatement.query
        ).toContain(
          "HBCE_SESSION_EVENT_HASH_V1"
        );

        expect(
          activityStatement.query
        ).toContain(
          "sha256"
        );

        expect(
          activityStatement.query
        ).toContain(
          "convert_to"
        );

        expect(
          activityStatement.query
        ).toContain(
          "event_seq + 1"
        );

        expect(
          activityStatement.query
        ).toContain(
          "interval '1800 seconds'"
        );

        expect(
          activityStatement.query
        ).toContain(
          "interval '300 seconds'"
        );

        expect(
          activityStatement.query
        ).toContain(
          "'SESSION_ACTIVITY'"
        );

        expect(
          activityStatement.query
        ).toContain(
          "'SESSION_ROTATED'"
        );

        expect(
          activityStatement.query
        ).toContain(
          "'SESSION_REVOKED'"
        );

        expect(
          activityStatement.query
        ).toContain(
          "'SESSION_EXPIRED'"
        );

        expect(
          activityStatement.parameters
        ).toEqual([
          "session_001",
          expect.stringMatching(
            /^evt_session_/
          ),
          expect.stringMatching(
            /^[0-9a-f]{64}$/
          ),
          "2026-09-04T16:10:00.000Z",
          "2026-09-04T16:10:00.000Z"
        ]);

        expect(
          activityStatement.parameters
        ).not.toContain(
          buildInput().payload
        );

        expect(
          harness.query
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns SKIPPED_THROTTLE without appending another event",
      async () => {
        const harness =
          createHarness();

        harness.transaction.mockResolvedValue([
          [
            {
              session_id:
                "session_001"
            }
          ],
          [
            {
              command_status:
                "SKIPPED_THROTTLE",
              event_id: null
            }
          ]
        ]);

        const commands =
          new NeonOnboardingSessionLifecycleCommands(
            harness.executor
          );

        await expect(
          commands.recordActivity(
            buildInput()
          )
        ).resolves.toEqual({
          status:
            "SKIPPED_THROTTLE",
          event: null
        });
      }
    );

    it(
      "fails closed when activity targets an inactive or terminal session",
      async () => {
        const harness =
          createHarness();

        harness.transaction.mockResolvedValue([
          [
            {
              session_id:
                "session_001"
            }
          ],
          [
            {
              command_status:
                "DENIED"
            }
          ]
        ]);

        const commands =
          new NeonOnboardingSessionLifecycleCommands(
            harness.executor
          );

        await expect(
          commands.recordActivity(
            buildInput()
          )
        ).rejects.toMatchObject({
          code:
            "ACTIVITY_DENIED"
        });
      }
    );

    it(
      "derives SESSION_REVOKED hash inside the serialized SQL statement",
      async () => {
        const harness =
          createHarness();

        harness.transaction.mockResolvedValue([
          [
            {
              session_id:
                "session_001"
            }
          ],
          [
            buildEventRow(
              "SESSION_REVOKED"
            )
          ]
        ]);

        const commands =
          new NeonOnboardingSessionLifecycleCommands(
            harness.executor
          );

        await expect(
          commands.revokeSession(
            buildInput({
              payload: {
                reason:
                  "server-revocation"
              }
            })
          )
        ).resolves.toMatchObject({
          eventType:
            "SESSION_REVOKED"
        });

        const [statements] =
          harness.transaction.mock.calls.at(
            0
          )!;

        const revokeStatement =
          statements[1];

        if (!revokeStatement) {
          throw new Error(
            "Expected revocation statement."
          );
        }

        expect(
          revokeStatement.query
        ).toContain(
          "HBCE_SESSION_EVENT_HASH_V1"
        );

        expect(
          revokeStatement.query
        ).toContain(
          "sha256"
        );

        expect(
          revokeStatement.query
        ).toContain(
          "convert_to"
        );

        expect(
          revokeStatement.query
        ).toContain(
          "event_seq + 1"
        );

        expect(
          revokeStatement.query
        ).toContain(
          "'SESSION_REVOKED'"
        );

        expect(
          revokeStatement.query
        ).toContain(
          "'SESSION_ROTATED'"
        );

        expect(
          revokeStatement.query
        ).toContain(
          "'SESSION_EXPIRED'"
        );

        expect(
          revokeStatement.parameters
        ).toEqual([
          "session_001",
          expect.stringMatching(
            /^evt_session_/
          ),
          expect.stringMatching(
            /^[0-9a-f]{64}$/
          ),
          "2026-09-04T16:10:00.000Z",
          "2026-09-04T16:10:00.000Z"
        ]);
      }
    );

    it(
      "denies duplicate or post-terminal revocation",
      async () => {
        const harness =
          createHarness();

        harness.transaction.mockResolvedValue([
          [
            {
              session_id:
                "session_001"
            }
          ],
          []
        ]);

        const commands =
          new NeonOnboardingSessionLifecycleCommands(
            harness.executor
          );

        await expect(
          commands.revokeSession(
            buildInput()
          )
        ).rejects.toMatchObject({
          code:
            "REVOCATION_DENIED"
        });
      }
    );

    it(
      "derives SESSION_EXPIRED hash inside the serialized SQL statement",
      async () => {
        const harness =
          createHarness();

        harness.transaction.mockResolvedValue([
          [
            {
              session_id:
                "session_001"
            }
          ],
          [
            buildEventRow(
              "SESSION_EXPIRED"
            )
          ]
        ]);

        const commands =
          new NeonOnboardingSessionLifecycleCommands(
            harness.executor
          );

        await expect(
          commands.expireSession(
            buildInput({
              payload: {
                reason:
                  "idle-expiry"
              }
            })
          )
        ).resolves.toMatchObject({
          eventType:
            "SESSION_EXPIRED"
        });

        const [statements] =
          harness.transaction.mock.calls.at(
            0
          )!;

        const expiryStatement =
          statements[1];

        if (!expiryStatement) {
          throw new Error(
            "Expected expiry statement."
          );
        }

        expect(
          expiryStatement.query
        ).toContain(
          "HBCE_SESSION_EVENT_HASH_V1"
        );

        expect(
          expiryStatement.query
        ).toContain(
          "sha256"
        );

        expect(
          expiryStatement.query
        ).toContain(
          "convert_to"
        );

        expect(
          expiryStatement.query
        ).toContain(
          "event_seq + 1"
        );

        expect(
          expiryStatement.query
        ).toContain(
          "absolute_expires_at"
        );

        expect(
          expiryStatement.query
        ).toContain(
          "interval '1800 seconds'"
        );

        expect(
          expiryStatement.query
        ).toContain(
          "'SESSION_EXPIRED'"
        );

        expect(
          expiryStatement.parameters
        ).toEqual([
          "session_001",
          expect.stringMatching(
            /^evt_session_/
          ),
          expect.stringMatching(
            /^[0-9a-f]{64}$/
          ),
          "2026-09-04T16:10:00.000Z",
          "2026-09-04T16:10:00.000Z"
        ]);
      }
    );

    it(
      "denies explicit expiry while the session is still temporally active",
      async () => {
        const harness =
          createHarness();

        harness.transaction.mockResolvedValue([
          [
            {
              session_id:
                "session_001"
            }
          ],
          []
        ]);

        const commands =
          new NeonOnboardingSessionLifecycleCommands(
            harness.executor
          );

        await expect(
          commands.expireSession(
            buildInput()
          )
        ).rejects.toMatchObject({
          code:
            "EXPIRY_DENIED"
        });
      }
    );

    it(
      "rejects malformed timestamps before database access",
      async () => {
        const harness =
          createHarness();

        const commands =
          new NeonOnboardingSessionLifecycleCommands(
            harness.executor
          );

        await expect(
          commands.recordActivity(
            buildInput({
              occurredAt:
                "2026-09-04 16:10:00"
            })
          )
        ).rejects.toBeInstanceOf(
          OnboardingSessionLifecycleCommandError
        );

        expect(
          harness.transaction
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects non-JSON event payloads before database access",
      async () => {
        const harness =
          createHarness();

        const commands =
          new NeonOnboardingSessionLifecycleCommands(
            harness.executor
          );

        const cyclic:
          Record<string, unknown> = {};

        cyclic.self =
          cyclic;

        await expect(
          commands.recordActivity(
            buildInput({
              payload:
                cyclic as never
            })
          )
        ).rejects.toMatchObject({
          code:
            "INVALID_INPUT"
        });

        expect(
          harness.transaction
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "fails closed if the session cannot be locked",
      async () => {
        const harness =
          createHarness();

        harness.transaction.mockResolvedValue([
          [],
          []
        ]);

        const commands =
          new NeonOnboardingSessionLifecycleCommands(
            harness.executor
          );

        await expect(
          commands.revokeSession(
            buildInput()
          )
        ).rejects.toMatchObject({
          code:
            "SESSION_NOT_FOUND"
        });
      }
    );

    it(
      "rejects malformed database cryptographic evidence",
      async () => {
        const harness =
          createHarness();

        harness.transaction.mockResolvedValue([
          [
            {
              session_id:
                "session_001"
            }
          ],
          [
            {
              command_status:
                "APPENDED",
              ...buildEventRow(
                "SESSION_ACTIVITY"
              ),
              event_hash:
                "not-a-sha256"
            }
          ]
        ]);

        const commands =
          new NeonOnboardingSessionLifecycleCommands(
            harness.executor
          );

        await expect(
          commands.recordActivity(
            buildInput()
          )
        ).rejects.toMatchObject({
          code:
            "INVALID_DATABASE_RESULT"
        });
      }
    );

    it(
      "maps append-only uniqueness conflicts explicitly",
      async () => {
        const harness =
          createHarness();

        harness.transaction.mockRejectedValue(
          Object.assign(
            new Error(
              "unique violation"
            ),
            {
              code: "23505"
            }
          )
        );

        const commands =
          new NeonOnboardingSessionLifecycleCommands(
            harness.executor
          );

        await expect(
          commands.expireSession(
            buildInput()
          )
        ).rejects.toMatchObject({
          code:
            "EVENT_CONFLICT"
        });
      }
    );
  }
);
