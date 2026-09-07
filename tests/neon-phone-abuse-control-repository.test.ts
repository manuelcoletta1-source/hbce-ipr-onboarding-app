import {
  describe,
  expect,
  it,
  vi
} from "vitest";
import {
  PHONE_ABUSE_CONTROL_DURABLE_PERSISTENCE_DESIGN_SHA256,
  PHONE_ABUSE_CONTROL_WINDOW_SECONDS,
  PHONE_CHALLENGE_ATTEMPT_LIMIT,
  NeonPhoneAbuseControlRepository,
  NeonPhoneAbuseControlRepositoryError,
  type PhoneAbuseControlQueryExecutor
} from "../lib/server/neon-phone-abuse-control-repository";

const NOW =
  "2026-09-05T17:40:00.000Z";

const WINDOW_EXPIRES =
  "2026-09-05T17:50:00.000Z";

const HALF_WINDOW_EXPIRES =
  "2026-09-05T17:45:00.000Z";

const SESSION_DIGEST =
  "11".repeat(32);

const PHONE_DIGEST =
  "22".repeat(32);

const CHALLENGE_DIGEST =
  "33".repeat(32);

const SESSION_ID =
  "session-phone-abuse-control-001";

function createHarness() {
  const query =
    vi.fn<PhoneAbuseControlQueryExecutor>();

  return {
    query,
    repository:
      new NeonPhoneAbuseControlRepository(
        query
      )
  };
}

describe(
  "Neon PHONE abuse-control repository",
  () => {
    it(
      "freezes the canonical design and numeric constants",
      () => {
        expect(
          PHONE_ABUSE_CONTROL_DURABLE_PERSISTENCE_DESIGN_SHA256
        ).toBe(
          "4b16b5bd1df0f9bf7382ada75ff40b233cc2b2e23ef80a6ffc6f05eab8c3041b"
        );

        expect(
          PHONE_ABUSE_CONTROL_WINDOW_SECONDS
        ).toBe(600);

        expect(
          PHONE_CHALLENGE_ATTEMPT_LIMIT
        ).toBe(5);
      }
    );

    it(
      "consumes an allowed fixed rate window through one atomic upsert",
      async () => {
        const harness =
          createHarness();

        harness.query.mockResolvedValue([
          {
            scope: "SEND_SESSION",
            key_digest:
              SESSION_DIGEST,
            window_started_at:
              new Date(NOW),
            expires_at:
              new Date(
                WINDOW_EXPIRES
              ),
            request_count: 1
          }
        ]);

        await expect(
          harness.repository.consumeRateWindow({
            scope: "SEND_SESSION",
            keyDigest:
              SESSION_DIGEST,
            now: NOW,
            limit: 3
          })
        ).resolves.toEqual({
          status: "ALLOWED",
          requestCount: 1,
          windowStartedAt: NOW,
          expiresAt:
            WINDOW_EXPIRES
        });

        expect(
          harness.query
        ).toHaveBeenCalledTimes(1);

        const [
          sql,
          parameters
        ] =
          harness.query.mock.calls[0]!;

        expect(sql).toContain(
          "INSERT INTO hbce_phone_rate_limit_windows"
        );

        expect(sql).toContain(
          "ON CONFLICT (scope, key_digest)"
        );

        expect(sql).toContain(
          "DO UPDATE SET"
        );

        expect(sql).toContain(
          "request_count"
        );

        expect(sql).toContain(
          "< $5"
        );

        expect(parameters).toEqual([
          "SEND_SESSION",
          SESSION_DIGEST,
          NOW,
          WINDOW_EXPIRES,
          3
        ]);
      }
    );

    it(
      "returns a positive retry boundary without incrementing an exhausted rate window",
      async () => {
        const harness =
          createHarness();

        harness.query
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            {
              scope:
                "SEND_SESSION",
              key_digest:
                SESSION_DIGEST,
              window_started_at:
                new Date(NOW),
              expires_at:
                new Date(
                  HALF_WINDOW_EXPIRES
                ),
              request_count: 3
            }
          ]);

        await expect(
          harness.repository.consumeRateWindow({
            scope: "SEND_SESSION",
            keyDigest:
              SESSION_DIGEST,
            now: NOW,
            limit: 3
          })
        ).resolves.toEqual({
          status: "RATE_LIMITED",
          retryAfterSeconds: 300
        });

        expect(
          harness.query
        ).toHaveBeenCalledTimes(2);

        expect(
          harness.query.mock.calls[1]![0]
        ).toContain(
          "FROM hbce_phone_rate_limit_windows"
        );
      }
    );

    it(
      "rejects malformed rate-limit digests before database access",
      async () => {
        const harness =
          createHarness();

        await expect(
          harness.repository.consumeRateWindow({
            scope: "SEND_PHONE",
            keyDigest:
              "not-a-digest",
            now: NOW,
            limit: 3
          })
        ).rejects.toMatchObject({
          name:
            "NeonPhoneAbuseControlRepositoryError",
          code: "INVALID_INPUT"
        });

        expect(
          harness.query
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "records the first valid challenge attempt through the frozen atomic upsert",
      async () => {
        const harness =
          createHarness();

        harness.query.mockResolvedValue([
          {
            challenge_digest:
              CHALLENGE_DIGEST,
            session_id:
              SESSION_ID,
            phone_key_digest:
              PHONE_DIGEST,
            expires_at:
              new Date(
                WINDOW_EXPIRES
              ),
            attempt_count: 1,
            consumed_at: null
          }
        ]);

        await expect(
          harness.repository.recordChallengeAttempt({
            challengeDigest:
              CHALLENGE_DIGEST,
            sessionId:
              SESSION_ID,
            phoneKeyDigest:
              PHONE_DIGEST,
            expiresAt:
              WINDOW_EXPIRES,
            now: NOW
          })
        ).resolves.toEqual({
          status:
            "ATTEMPT_RECORDED",
          attemptCount: 1,
          expiresAt:
            WINDOW_EXPIRES
        });

        const [
          sql,
          parameters
        ] =
          harness.query.mock.calls[0]!;

        expect(sql).toContain(
          "INSERT INTO hbce_phone_challenge_usage"
        );

        expect(sql).toContain(
          "ON CONFLICT (challenge_digest)"
        );

        expect(sql).toContain(
          "attempt_count < 5"
        );

        expect(sql).toContain(
          "consumed_at IS NULL"
        );

        expect(parameters).toEqual([
          CHALLENGE_DIGEST,
          SESSION_ID,
          PHONE_DIGEST,
          WINDOW_EXPIRES,
          NOW
        ]);
      }
    );

    it(
      "classifies the sixth challenge attempt as limited without another increment",
      async () => {
        const harness =
          createHarness();

        harness.query
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            {
              challenge_digest:
                CHALLENGE_DIGEST,
              session_id:
                SESSION_ID,
              phone_key_digest:
                PHONE_DIGEST,
              expires_at:
                new Date(
                  HALF_WINDOW_EXPIRES
                ),
              attempt_count: 5,
              consumed_at: null
            }
          ]);

        await expect(
          harness.repository.recordChallengeAttempt({
            challengeDigest:
              CHALLENGE_DIGEST,
            sessionId:
              SESSION_ID,
            phoneKeyDigest:
              PHONE_DIGEST,
            expiresAt:
              HALF_WINDOW_EXPIRES,
            now: NOW
          })
        ).resolves.toEqual({
          status:
            "ATTEMPT_LIMITED",
          retryAfterSeconds: 300
        });
      }
    );

    it(
      "classifies an already consumed challenge distinctly",
      async () => {
        const harness =
          createHarness();

        harness.query
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            {
              challenge_digest:
                CHALLENGE_DIGEST,
              session_id:
                SESSION_ID,
              phone_key_digest:
                PHONE_DIGEST,
              expires_at:
                new Date(
                  WINDOW_EXPIRES
                ),
              attempt_count: 1,
              consumed_at:
                new Date(
                  "2026-09-05T17:41:00.000Z"
                )
            }
          ]);

        await expect(
          harness.repository.recordChallengeAttempt({
            challengeDigest:
              CHALLENGE_DIGEST,
            sessionId:
              SESSION_ID,
            phoneKeyDigest:
              PHONE_DIGEST,
            expiresAt:
              WINDOW_EXPIRES,
            now: NOW
          })
        ).resolves.toEqual({
          status:
            "CHALLENGE_CONSUMED"
        });
      }
    );

    it(
      "denies challenge binding mismatch without inventing trusted state",
      async () => {
        const harness =
          createHarness();

        harness.query
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            {
              challenge_digest:
                CHALLENGE_DIGEST,
              session_id:
                "different-session",
              phone_key_digest:
                PHONE_DIGEST,
              expires_at:
                new Date(
                  WINDOW_EXPIRES
                ),
              attempt_count: 1,
              consumed_at: null
            }
          ]);

        await expect(
          harness.repository.recordChallengeAttempt({
            challengeDigest:
              CHALLENGE_DIGEST,
            sessionId:
              SESSION_ID,
            phoneKeyDigest:
              PHONE_DIGEST,
            expiresAt:
              WINDOW_EXPIRES,
            now: NOW
          })
        ).resolves.toEqual({
          status:
            "CHALLENGE_BINDING_MISMATCH"
        });
      }
    );

    it(
      "rejects an already expired challenge before database access",
      async () => {
        const harness =
          createHarness();

        await expect(
          harness.repository.recordChallengeAttempt({
            challengeDigest:
              CHALLENGE_DIGEST,
            sessionId:
              SESSION_ID,
            phoneKeyDigest:
              PHONE_DIGEST,
            expiresAt: NOW,
            now: NOW
          })
        ).resolves.toEqual({
          status:
            "CHALLENGE_EXPIRED"
        });

        expect(
          harness.query
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "consumes challenge success with one conditional update",
      async () => {
        const harness =
          createHarness();

        harness.query.mockResolvedValue([
          {
            challenge_digest:
              CHALLENGE_DIGEST,
            consumed_at:
              new Date(
                "2026-09-05T17:42:00.000Z"
              )
          }
        ]);

        await expect(
          harness.repository.consumeChallengeSuccess({
            challengeDigest:
              CHALLENGE_DIGEST,
            sessionId:
              SESSION_ID,
            phoneKeyDigest:
              PHONE_DIGEST,
            expiresAt:
              WINDOW_EXPIRES,
            now:
              "2026-09-05T17:42:00.000Z"
          })
        ).resolves.toEqual({
          status: "CONSUMED",
          consumedAt:
            "2026-09-05T17:42:00.000Z"
        });

        const [
          sql
        ] =
          harness.query.mock.calls[0]!;

        expect(sql).toContain(
          "UPDATE hbce_phone_challenge_usage"
        );

        expect(sql).toContain(
          "consumed_at IS NULL"
        );

        expect(sql).toContain(
          "attempt_count BETWEEN 1 AND 5"
        );

        expect(sql).toContain(
          "RETURNING"
        );
      }
    );

    it(
      "allows exactly one challenge-consumption winner by treating a zero-row conditional update as denied",
      async () => {
        const harness =
          createHarness();

        harness.query.mockResolvedValue(
          []
        );

        await expect(
          harness.repository.consumeChallengeSuccess({
            challengeDigest:
              CHALLENGE_DIGEST,
            sessionId:
              SESSION_ID,
            phoneKeyDigest:
              PHONE_DIGEST,
            expiresAt:
              WINDOW_EXPIRES,
            now:
              "2026-09-05T17:42:00.000Z"
          })
        ).resolves.toEqual({
          status: "DENIED"
        });

        expect(
          harness.query
        ).toHaveBeenCalledTimes(1);
      }
    );

    it(
      "fails closed on malformed database result state",
      async () => {
        const harness =
          createHarness();

        harness.query.mockResolvedValue([
          {
            scope: "SEND_SESSION",
            key_digest:
              SESSION_DIGEST,
            window_started_at:
              new Date(NOW),
            expires_at:
              new Date(
                WINDOW_EXPIRES
              ),
            request_count:
              "invalid"
          }
        ]);

        await expect(
          harness.repository.consumeRateWindow({
            scope: "SEND_SESSION",
            keyDigest:
              SESSION_DIGEST,
            now: NOW,
            limit: 3
          })
        ).rejects.toBeInstanceOf(
          NeonPhoneAbuseControlRepositoryError
        );
      }
    );

    it(
      "maps database failures to an explicit fail-closed dependency error",
      async () => {
        const harness =
          createHarness();

        harness.query.mockRejectedValue(
          new Error(
            "database unavailable"
          )
        );

        await expect(
          harness.repository.consumeRateWindow({
            scope:
              "VERIFY_SESSION",
            keyDigest:
              SESSION_DIGEST,
            now: NOW,
            limit: 10
          })
        ).rejects.toMatchObject({
          name:
            "NeonPhoneAbuseControlRepositoryError",
          code:
            "DATABASE_FAILURE"
        });
      }
    );
  }
);

describe(
  "Neon PHONE SEND multi-scope atomicity",
  () => {
    const SESSION_DIGEST =
      "1111111111111111111111111111111111111111111111111111111111111111";

    const PHONE_DIGEST =
      "2222222222222222222222222222222222222222222222222222222222222222";

    const NOW =
      "2026-09-05T18:00:00.000Z";

    const SESSION_LOCK_ROW = {
      scope: "SEND_SESSION",
      key_digest: SESSION_DIGEST
    };

    const PHONE_LOCK_ROW = {
      scope: "SEND_PHONE",
      key_digest: PHONE_DIGEST
    };

    function queryExecutor() {
      return vi.fn(
        async (
          _query: string,
          _parameters:
            readonly unknown[]
        ) => []
      );
    }

    function transactionExecutor(
      results:
        readonly (
          readonly Record<
            string,
            unknown
          >[]
        )[]
    ) {
      return vi.fn(
        async (
          _statements:
            readonly {
              readonly query: string;
              readonly parameters:
                readonly unknown[];
            }[],
          _options: {
            readonly isolationLevel:
              "ReadCommitted";
            readonly readOnly: false;
          }
        ) => results
      );
    }

    it(
      "allows exactly one atomic SEND pair transaction",
      async () => {
        const transaction =
          transactionExecutor([
            [],
            [],
            [SESSION_LOCK_ROW],
            [PHONE_LOCK_ROW],
            [
              {
                scope: "SEND_SESSION",
                key_digest: SESSION_DIGEST,
                expires_at:
                  "2026-09-05T18:10:00.000Z",
                request_count: 1
              },
              {
                scope: "SEND_PHONE",
                key_digest: PHONE_DIGEST,
                expires_at:
                  "2026-09-05T18:10:00.000Z",
                request_count: 1
              }
            ],
            [
              {
                scope: "SEND_SESSION",
                key_digest: SESSION_DIGEST,
                expires_at:
                  "2026-09-05T18:10:00.000Z",
                request_count: 1
              },
              {
                scope: "SEND_PHONE",
                key_digest: PHONE_DIGEST,
                expires_at:
                  "2026-09-05T18:10:00.000Z",
                request_count: 1
              }
            ]
          ]);

        const repository =
          new NeonPhoneAbuseControlRepository(
            queryExecutor(),
            transaction
          );

        await expect(
          repository.consumeSendRateWindows({
            sessionKeyDigest:
              SESSION_DIGEST,
            phoneKeyDigest:
              PHONE_DIGEST,
            now: NOW
          })
        ).resolves.toEqual({
          status: "ALLOWED"
        });

        const call =
          transaction.mock.calls[0];

        expect(call).toBeDefined();

        expect(
          call![0]
        ).toHaveLength(6);

        expect(
          call![0][2]?.query
        ).toContain(
          "'SEND_SESSION'"
        );

        expect(
          call![0][3]?.query
        ).toContain(
          "'SEND_PHONE'"
        );
      }
    );

    it(
      "uses max Retry-After across exhausted scopes",
      async () => {
        const transaction =
          transactionExecutor([
            [],
            [],
            [SESSION_LOCK_ROW],
            [PHONE_LOCK_ROW],
            [],
            [
              {
                scope: "SEND_SESSION",
                key_digest: SESSION_DIGEST,
                expires_at:
                  "2026-09-05T18:00:20.000Z",
                request_count: 3
              },
              {
                scope: "SEND_PHONE",
                key_digest: PHONE_DIGEST,
                expires_at:
                  "2026-09-05T18:05:00.000Z",
                request_count: 3
              }
            ]
          ]);

        const repository =
          new NeonPhoneAbuseControlRepository(
            queryExecutor(),
            transaction
          );

        await expect(
          repository.consumeSendRateWindows({
            sessionKeyDigest:
              SESSION_DIGEST,
            phoneKeyDigest:
              PHONE_DIGEST,
            now: NOW
          })
        ).resolves.toEqual({
          status:
            "RATE_LIMITED",
          retryAfterSeconds:
            300
        });
      }
    );

    it(
      "fails closed on incomplete transaction result shape",
      async () => {
        const transaction =
          transactionExecutor([
            [],
            [],
            [SESSION_LOCK_ROW],
            [PHONE_LOCK_ROW]
          ]);

        const repository =
          new NeonPhoneAbuseControlRepository(
            queryExecutor(),
            transaction
          );

        await expect(
          repository.consumeSendRateWindows({
            sessionKeyDigest:
              SESSION_DIGEST,
            phoneKeyDigest:
              PHONE_DIGEST,
            now: NOW
          })
        ).rejects.toMatchObject({
          code:
            "INVALID_DATABASE_RESULT"
        });
      }
    );

    it(
      "fails closed on one-row partial update",
      async () => {
        const transaction =
          transactionExecutor([
            [],
            [],
            [SESSION_LOCK_ROW],
            [PHONE_LOCK_ROW],
            [
              {
                scope: "SEND_SESSION",
                key_digest:
                  SESSION_DIGEST
              }
            ],
            []
          ]);

        const repository =
          new NeonPhoneAbuseControlRepository(
            queryExecutor(),
            transaction
          );

        await expect(
          repository.consumeSendRateWindows({
            sessionKeyDigest:
              SESSION_DIGEST,
            phoneKeyDigest:
              PHONE_DIGEST,
            now: NOW
          })
        ).rejects.toMatchObject({
          code:
            "INVALID_DATABASE_RESULT"
        });
      }
    );

    it(
      "fails closed on mismatching lock binding",
      async () => {
        const transaction =
          transactionExecutor([
            [],
            [],
            [
              {
                scope: "SEND_SESSION",
                key_digest:
                  PHONE_DIGEST
              }
            ],
            [PHONE_LOCK_ROW],
            [],
            []
          ]);

        const repository =
          new NeonPhoneAbuseControlRepository(
            queryExecutor(),
            transaction
          );

        await expect(
          repository.consumeSendRateWindows({
            sessionKeyDigest:
              SESSION_DIGEST,
            phoneKeyDigest:
              PHONE_DIGEST,
            now: NOW
          })
        ).rejects.toMatchObject({
          code:
            "INVALID_DATABASE_RESULT"
        });
      }
    );

    it(
      "rejects malformed inputs before transaction access",
      async () => {
        const transaction =
          transactionExecutor([]);

        const repository =
          new NeonPhoneAbuseControlRepository(
            queryExecutor(),
            transaction
          );

        await expect(
          repository.consumeSendRateWindows({
            sessionKeyDigest:
              "bad",
            phoneKeyDigest:
              PHONE_DIGEST,
            now: NOW
          })
        ).rejects.toMatchObject({
          code:
            "INVALID_INPUT"
        });

        expect(
          transaction
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "maps transaction dependency failure",
      async () => {
        const transaction =
          vi.fn(
            async () => {
              throw new Error(
                "database unavailable"
              );
            }
          );

        const repository =
          new NeonPhoneAbuseControlRepository(
            queryExecutor(),
            transaction
          );

        await expect(
          repository.consumeSendRateWindows({
            sessionKeyDigest:
              SESSION_DIGEST,
            phoneKeyDigest:
              PHONE_DIGEST,
            now: NOW
          })
        ).rejects.toMatchObject({
          code:
            "DATABASE_FAILURE"
        });
      }
    );
  }
);
