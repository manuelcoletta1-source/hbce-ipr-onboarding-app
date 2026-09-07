import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  createCanonicalAuditEventHash,
  createCanonicalAuditEventPayloadSha256,
  createOnboardingStartCanonicalAuditPayload
} from "../lib/server/onboarding-canonical-audit-crypto";

import {
  NeonOnboardingStartRepository,
  NeonOnboardingStartRepositoryError,
  type CreateAtomicOnboardingStartInput,
  type NeonOnboardingStartQueryExecutor
} from "../lib/server/neon-onboarding-start-repository";

import {
  createOnboardingSessionEventHash,
  createOnboardingSessionEventPayloadSha256
} from "../lib/server/onboarding-session-event-crypto";

function buildInput(
  overrides:
    Partial<CreateAtomicOnboardingStartInput> = {}
): CreateAtomicOnboardingStartInput {
  return {
    idempotencySha256:
      "a".repeat(64),
    tokenSha256:
      "b".repeat(64),
    subjectId:
      "sub_11111111-1111-4111-8111-111111111111",
    onboardingId:
      "onb_22222222-2222-4222-8222-222222222222",
    sessionId:
      "session_33333333-3333-4333-8333-333333333333",
    now:
      "2026-09-04T12:00:00.000Z",
    ...overrides
  };
}

function buildSuccessResult(
  input:
    CreateAtomicOnboardingStartInput
) {
  return {
    start_result: {
      subjectId:
        input.subjectId,
      onboardingId:
        input.onboardingId,
      sessionId:
        input.sessionId,
      issuedState:
        "STARTED",
      issuedAt:
        input.now,
      absoluteExpiresAt:
        "2026-09-04T20:00:00.000Z"
    }
  };
}

describe(
  "P003-D082R7 atomic onboarding start repository",
  () => {
    it(
      "executes exactly one PostgreSQL statement",
      async () => {
        const input =
          buildInput();

        const executor =
          vi.fn<
            NeonOnboardingStartQueryExecutor
          >(
            async () => [
              buildSuccessResult(
                input
              )
            ]
          );

        const repository =
          new NeonOnboardingStartRepository(
            executor
          );

        const result =
          await repository.createAtomicStart(
            input
          );

        expect(
          executor
        ).toHaveBeenCalledTimes(1);

        expect(
          result
        ).toEqual({
          subjectId:
            input.subjectId,
          onboardingId:
            input.onboardingId,
          sessionId:
            input.sessionId,
          issuedState:
            "STARTED",
          issuedAt:
            input.now,
          absoluteExpiresAt:
            "2026-09-04T20:00:00.000Z"
        });
      }
    );

    it(
      "freezes the seven insert CTEs and result CTE in order",
      async () => {
        const input =
          buildInput();

        let query = "";

        const executor:
          NeonOnboardingStartQueryExecutor =
          async (
            sql
          ) => {
            query = sql;

            return [
              buildSuccessResult(
                input
              )
            ];
          };

        await new NeonOnboardingStartRepository(
          executor
        ).createAtomicStart(
          input
        );

        const ctes = [
          "inserted_subject AS",
          "inserted_onboarding AS",
          "inserted_canonical_revision AS",
          "inserted_canonical_audit AS",
          "inserted_started_session AS",
          "inserted_session_created_event AS",
          "inserted_start_request AS",
          "start_result AS"
        ];

        let previous = -1;

        for (const cte of ctes) {
          const current =
            query.indexOf(
              cte
            );

          expect(
            current
          ).toBeGreaterThan(
            previous
          );

          previous =
            current;
        }
      }
    );

    it(
      "uses insert-only SQL with no conflict suppression or data rewrite",
      async () => {
        const input =
          buildInput();

        let query = "";

        const executor:
          NeonOnboardingStartQueryExecutor =
          async (
            sql
          ) => {
            query = sql;

            return [
              buildSuccessResult(
                input
              )
            ];
          };

        await new NeonOnboardingStartRepository(
          executor
        ).createAtomicStart(
          input
        );

        expect(
          query
        ).not.toMatch(
          /\bON\s+CONFLICT\b/i
        );

        expect(
          query
        ).not.toMatch(
          /\bUPDATE\b/i
        );

        expect(
          query
        ).not.toMatch(
          /\bDELETE\b/i
        );
      }
    );

    it(
      "places the idempotency insertion after session evidence",
      async () => {
        const input =
          buildInput();

        let query = "";

        const executor:
          NeonOnboardingStartQueryExecutor =
          async (
            sql
          ) => {
            query = sql;

            return [
              buildSuccessResult(
                input
              )
            ];
          };

        await new NeonOnboardingStartRepository(
          executor
        ).createAtomicStart(
          input
        );

        expect(
          query.indexOf(
            "inserted_start_request AS"
          )
        ).toBeGreaterThan(
          query.indexOf(
            "inserted_session_created_event AS"
          )
        );
      }
    );

    it(
      "constructs canonical revision zero internally without fake IPR evidence",
      async () => {
        const input =
          buildInput();

        let parameters:
          readonly unknown[] = [];

        const executor:
          NeonOnboardingStartQueryExecutor =
          async (
            _query,
            values
          ) => {
            parameters =
              values;

            return [
              buildSuccessResult(
                input
              )
            ];
          };

        await new NeonOnboardingStartRepository(
          executor
        ).createAtomicStart(
          input
        );

        const canonicalState =
          JSON.parse(
            parameters[6] as string
          ) as Record<string, unknown>;

        expect(
          canonicalState
        ).toMatchObject({
          subjectId:
            input.subjectId,
          onboardingId:
            input.onboardingId,
          revision:
            0,
          revocationState:
            "clear",
          createdAt:
            input.now,
          updatedAt:
            input.now,
          ipr:
            null,
          iprCard:
            null,
          operationalCertificate:
            null,
          latestPhase:
            null
        });
      }
    );

    it(
      "derives canonical audit payload and event digests server-side",
      async () => {
        const input =
          buildInput();

        let parameters:
          readonly unknown[] = [];

        const executor:
          NeonOnboardingStartQueryExecutor =
          async (
            _query,
            values
          ) => {
            parameters =
              values;

            return [
              buildSuccessResult(
                input
              )
            ];
          };

        await new NeonOnboardingStartRepository(
          executor
        ).createAtomicStart(
          input
        );

        const canonicalStateSha256 =
          parameters[7] as string;

        const eventId =
          parameters[8] as string;

        const eventHash =
          parameters[9] as string;

        const payloadSha256 =
          parameters[10] as string;

        expect(
          canonicalStateSha256
        ).toMatch(
          /^[0-9a-f]{64}$/
        );

        expect(
          eventId
        ).toMatch(
          /^evt_canonical_/
        );

        const expectedPayload =
          await createCanonicalAuditEventPayloadSha256({
            eventId,
            onboardingId:
              input.onboardingId,
            subjectId:
              input.subjectId,
            revision:
              0,
            eventType:
              "ONBOARDING_STARTED",
            decisionState:
              "accepted",
            occurredAt:
              input.now,
            canonicalStateSha256,
            payload:
              createOnboardingStartCanonicalAuditPayload()
          });

        expect(
          payloadSha256
        ).toBe(
          expectedPayload
        );

        expect(
          eventHash
        ).toBe(
          await createCanonicalAuditEventHash({
            revision:
              0,
            previousEventHash:
              null,
            eventPayloadSha256:
              expectedPayload
          })
        );
      }
    );

    it(
      "derives the exact minimized SESSION_CREATED payload server-side",
      async () => {
        const input =
          buildInput();

        let parameters:
          readonly unknown[] = [];

        const executor:
          NeonOnboardingStartQueryExecutor =
          async (
            _query,
            values
          ) => {
            parameters =
              values;

            return [
              buildSuccessResult(
                input
              )
            ];
          };

        await new NeonOnboardingStartRepository(
          executor
        ).createAtomicStart(
          input
        );

        const eventId =
          parameters[11] as string;

        const eventHash =
          parameters[12] as string;

        const payloadSha256 =
          parameters[13] as string;

        expect(
          eventId
        ).toMatch(
          /^evt_session_/
        );

        const expectedPayload =
          await createOnboardingSessionEventPayloadSha256({
            eventId,
            sessionId:
              input.sessionId,
            eventType:
              "SESSION_CREATED",
            occurredAt:
              input.now,
            payload: {
              kind:
                "HBCE_ONBOARDING_START_SESSION_V1"
            }
          });

        expect(
          payloadSha256
        ).toBe(
          expectedPayload
        );

        expect(
          eventHash
        ).toBe(
          await createOnboardingSessionEventHash({
            eventSeq:
              0,
            previousEventHash:
              null,
            eventPayloadSha256:
              expectedPayload
          })
        );
      }
    );

    it(
      "derives the eight-hour absolute expiry from the authoritative start instant",
      async () => {
        const input =
          buildInput();

        let parameters:
          readonly unknown[] = [];

        const executor:
          NeonOnboardingStartQueryExecutor =
          async (
            _query,
            values
          ) => {
            parameters =
              values;

            return [
              buildSuccessResult(
                input
              )
            ];
          };

        await new NeonOnboardingStartRepository(
          executor
        ).createAtomicStart(
          input
        );

        expect(
          parameters[14]
        ).toBe(
          "2026-09-04T20:00:00.000Z"
        );
      }
    );

    it(
      "passes only digests, server identifiers, canonical evidence and timestamps to SQL",
      async () => {
        const input =
          buildInput();

        let parameters:
          readonly unknown[] = [];

        const executor:
          NeonOnboardingStartQueryExecutor =
          async (
            _query,
            values
          ) => {
            parameters =
              values;

            return [
              buildSuccessResult(
                input
              )
            ];
          };

        await new NeonOnboardingStartRepository(
          executor
        ).createAtomicStart(
          input
        );

        expect(
          parameters
        ).toHaveLength(15);

        expect(
          parameters[0]
        ).toBe(
          input.idempotencySha256
        );

        expect(
          parameters[1]
        ).toBe(
          input.tokenSha256
        );

        expect(
          parameters[2]
        ).toBe(
          input.subjectId
        );

        expect(
          parameters[3]
        ).toBe(
          input.onboardingId
        );

        expect(
          parameters[4]
        ).toBe(
          input.sessionId
        );

        expect(
          parameters[5]
        ).toBe(
          input.now
        );
      }
    );

    it(
      "maps only the start-request primary-key conflict to IDEMPOTENCY_CONFLICT",
      async () => {
        const error =
          Object.assign(
            new Error(
              "duplicate"
            ),
            {
              code:
                "23505",
              constraint:
                "hbce_onboarding_start_requests_pkey"
            }
          );

        const executor:
          NeonOnboardingStartQueryExecutor =
          async () => {
            throw error;
          };

        await expect(
          new NeonOnboardingStartRepository(
            executor
          ).createAtomicStart(
            buildInput()
          )
        ).rejects.toMatchObject({
          name:
            "NeonOnboardingStartRepositoryError",
          code:
            "IDEMPOTENCY_CONFLICT"
        });
      }
    );

    it(
      "maps unrelated unique conflicts to DATABASE_FAILURE",
      async () => {
        const error =
          Object.assign(
            new Error(
              "duplicate"
            ),
            {
              code:
                "23505",
              constraint:
                "hbce_onboarding_sessions_pkey"
            }
          );

        const executor:
          NeonOnboardingStartQueryExecutor =
          async () => {
            throw error;
          };

        await expect(
          new NeonOnboardingStartRepository(
            executor
          ).createAtomicStart(
            buildInput()
          )
        ).rejects.toMatchObject({
          code:
            "DATABASE_FAILURE"
        });
      }
    );

    it(
      "maps foreign-key failures to DATABASE_FAILURE",
      async () => {
        const error =
          Object.assign(
            new Error(
              "foreign key"
            ),
            {
              code:
                "23503"
            }
          );

        const executor:
          NeonOnboardingStartQueryExecutor =
          async () => {
            throw error;
          };

        await expect(
          new NeonOnboardingStartRepository(
            executor
          ).createAtomicStart(
            buildInput()
          )
        ).rejects.toMatchObject({
          code:
            "DATABASE_FAILURE"
        });
      }
    );

    it(
      "rejects invalid digest input before database access",
      async () => {
        const executor =
          vi.fn<
            NeonOnboardingStartQueryExecutor
          >(
            async () => []
          );

        await expect(
          new NeonOnboardingStartRepository(
            executor
          ).createAtomicStart(
            buildInput({
              idempotencySha256:
                "not-a-digest"
            })
          )
        ).rejects.toBeInstanceOf(
          NeonOnboardingStartRepositoryError
        );

        expect(
          executor
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects client-shaped or malformed identifiers before database access",
      async () => {
        const executor =
          vi.fn<
            NeonOnboardingStartQueryExecutor
          >(
            async () => []
          );

        await expect(
          new NeonOnboardingStartRepository(
            executor
          ).createAtomicStart(
            buildInput({
              subjectId:
                "sub_demo_client"
            })
          )
        ).rejects.toMatchObject({
          code:
            "INVALID_INPUT"
        });

        expect(
          executor
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects a non-normalized server timestamp before database access",
      async () => {
        const executor =
          vi.fn<
            NeonOnboardingStartQueryExecutor
          >(
            async () => []
          );

        await expect(
          new NeonOnboardingStartRepository(
            executor
          ).createAtomicStart(
            buildInput({
              now:
                "2026-09-04T12:00:00Z"
            })
          )
        ).rejects.toMatchObject({
          code:
            "INVALID_INPUT"
        });

        expect(
          executor
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "fails closed when the database result does not match server authority",
      async () => {
        const input =
          buildInput();

        const executor:
          NeonOnboardingStartQueryExecutor =
          async () => [
            {
              start_result: {
                ...buildSuccessResult(
                  input
                ).start_result,
                subjectId:
                  "sub_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
              }
            }
          ];

        await expect(
          new NeonOnboardingStartRepository(
            executor
          ).createAtomicStart(
            input
          )
        ).rejects.toMatchObject({
          code:
            "INVALID_DATABASE_RESULT"
        });
      }
    );

    it(
      "returns no raw token, token digest, idempotency digest or audit digest",
      async () => {
        const input =
          buildInput();

        const repository =
          new NeonOnboardingStartRepository(
            async () => [
              buildSuccessResult(
                input
              )
            ]
          );

        const result =
          await repository.createAtomicStart(
            input
          );

        expect(
          result
        ).not.toHaveProperty(
          "rawToken"
        );

        expect(
          result
        ).not.toHaveProperty(
          "tokenSha256"
        );

        expect(
          result
        ).not.toHaveProperty(
          "idempotencySha256"
        );

        expect(
          result
        ).not.toHaveProperty(
          "canonicalStateSha256"
        );

        expect(
          result
        ).not.toHaveProperty(
          "eventHash"
        );
      }
    );
  }
);
