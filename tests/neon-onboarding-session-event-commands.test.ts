import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  NeonOnboardingSessionEventCommands,
  OnboardingSessionEventCommandError,
  type RecordContactVerificationEventInput,
  type RotateContactVerifiedSessionInput,
  type RotateStartedSessionInput
} from "../lib/server/neon-onboarding-session-event-commands";

import {
  createOnboardingSessionEventPayloadSha256
} from "../lib/server/onboarding-session-event-crypto";

import type {
  OnboardingSessionDatabaseExecutor
} from "../lib/server/neon-onboarding-session-repository";

const TOKEN_SHA256 =
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

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

function buildVerificationInput(
  overrides:
    Partial<RecordContactVerificationEventInput> = {}
): RecordContactVerificationEventInput {
  return {
    sessionId: "session_started_001",
    eventType: "EMAIL_VERIFIED",
    payload: {
      channel: "email"
    },
    occurredAt:
      "2026-09-04T16:10:00.000Z",
    createdAt:
      "2026-09-04T16:10:00.000Z",
    ...overrides
  };
}

function buildRotationInput(
  overrides:
    Partial<RotateContactVerifiedSessionInput> = {}
): RotateContactVerifiedSessionInput {
  return {
    sourceSessionId:
      "session_started_001",
    newSessionId:
      "session_contact_002",
    newTokenSha256: TOKEN_SHA256,
    issuedAt:
      "2026-09-04T16:20:00.000Z",
    absoluteExpiresAt:
      "2026-09-05T00:20:00.000Z",
    createdAt:
      "2026-09-04T16:20:00.000Z",

    contactVerifiedPayload: {
      contactVerified: true
    },

    rotatedPayload: {
      reason: "contact-verification"
    },

    newSessionCreatedPayload: {
      issuedState: "CONTACT_VERIFIED"
    },

    ...overrides
  };
}

function buildStartedRotationInput(
  overrides:
    Partial<RotateStartedSessionInput> = {}
): RotateStartedSessionInput {
  return {
    sourceSessionId:
      "session_started_001",
    newSessionId:
      "session_started_002",
    newTokenSha256:
      TOKEN_SHA256,
    issuedAt:
      "2026-09-04T16:20:00.000Z",
    absoluteExpiresAt:
      "2026-09-05T00:20:00.000Z",
    createdAt:
      "2026-09-04T16:20:00.000Z",

    rotatedPayload: {
      reason:
        "session-idle-recovery"
    },

    newSessionCreatedPayload: {
      issuedState:
        "STARTED",
      reason:
        "session-idle-recovery"
    },

    ...overrides
  };
}

describe("Neon onboarding session event commands", () => {
  it("serializes EMAIL_VERIFIED append with a session row lock and fresh second statement", async () => {
    const harness = createHarness();

    harness.transaction.mockResolvedValue([
      [
        {
          session_id:
            "session_started_001"
        }
      ],
      [
        {
          event_id: "evt_email_001",
          session_id:
            "session_started_001",
          event_seq: "1",
          event_type:
            "EMAIL_VERIFIED",
          previous_event_hash:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          event_hash:
            "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          event_payload_sha256:
            "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          occurred_at:
            new Date(
              "2026-09-04T16:10:00.000Z"
            ),
          created_at:
            new Date(
              "2026-09-04T16:10:00.000Z"
            )
        }
      ]
    ]);

    const commands =
      new NeonOnboardingSessionEventCommands(
        harness.executor
      );

    const input = buildVerificationInput();

    await expect(
      commands.recordContactVerificationEvent(
        input
      )
    ).resolves.toMatchObject({
      sessionId:
        "session_started_001",
      eventSeq: 1,
      eventType:
        "EMAIL_VERIFIED"
    });

    expect(
      harness.transaction
    ).toHaveBeenCalledTimes(1);

    const [statements, options] =
      harness.transaction.mock.calls.at(0)!;

    expect(options).toEqual({
      isolationLevel: "ReadCommitted",
      readOnly: false
    });

    expect(statements).toHaveLength(2);

    const lockStatement = statements[0];
    const appendStatement = statements[1];

    if (!lockStatement || !appendStatement) {
      throw new Error(
        "Expected exactly two event transaction statements."
      );
    }

    expect(lockStatement.query).toContain(
      "FOR UPDATE"
    );

    expect(appendStatement.query).toContain(
      "ORDER BY event_seq DESC"
    );

    expect(appendStatement.query).toContain(
      "event_seq + 1"
    );

    expect(appendStatement.query).toContain(
      "HBCE_SESSION_EVENT_HASH_V1"
    );

    expect(appendStatement.query).toContain(
      "sha256"
    );

    expect(appendStatement.query).toContain(
      "convert_to"
    );

    expect(appendStatement.query).toContain(
      "previous_event_hash"
    );

    expect(appendStatement.query).toContain(
      "interval '1800 seconds'"
    );

    expect(appendStatement.query).toContain(
      "'SESSION_ROTATED'"
    );

    expect(appendStatement.query).toContain(
      "'SESSION_REVOKED'"
    );

    expect(appendStatement.query).toContain(
      "'SESSION_EXPIRED'"
    );

    expect(appendStatement.parameters).toEqual([
      input.sessionId,
      expect.stringMatching(
        /^evt_session_/
      ),
      input.eventType,
      expect.stringMatching(
        /^[0-9a-f]{64}$/
      ),
      input.occurredAt,
      input.createdAt
    ]);

    expect(harness.query).not.toHaveBeenCalled();
  });

  it("supports PHONE_VERIFIED through the same controlled command", async () => {
    const harness = createHarness();

    harness.transaction.mockResolvedValue([
      [
        {
          session_id:
            "session_started_001"
        }
      ],
      [
        {
          event_id: "evt_phone_002",
          session_id:
            "session_started_001",
          event_seq: 2,
          event_type:
            "PHONE_VERIFIED",
          previous_event_hash:
            "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          event_hash:
            "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
          event_payload_sha256:
            "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
          occurred_at:
            "2026-09-04T16:15:00.000Z",
          created_at:
            "2026-09-04T16:15:00.000Z"
        }
      ]
    ]);

    const commands =
      new NeonOnboardingSessionEventCommands(
        harness.executor
      );

    await expect(
      commands.recordContactVerificationEvent(
        buildVerificationInput({
          eventType:
            "PHONE_VERIFIED",
          payload: {
            channel: "phone"
          },
          occurredAt:
            "2026-09-04T16:15:00.000Z",
          createdAt:
            "2026-09-04T16:15:00.000Z"
        })
      )
    ).resolves.toMatchObject({
      eventSeq: 2,
      eventType: "PHONE_VERIFIED"
    });
  });

  it("fails closed when event insertion is denied", async () => {
    const harness = createHarness();

    harness.transaction.mockResolvedValue([
      [
        {
          session_id:
            "session_started_001"
        }
      ],
      []
    ]);

    const commands =
      new NeonOnboardingSessionEventCommands(
        harness.executor
      );

    await expect(
      commands.recordContactVerificationEvent(
        buildVerificationInput()
      )
    ).rejects.toMatchObject({
      code: "EVENT_COMMAND_DENIED"
    });
  });

  it("rejects malformed event timestamps before database access", async () => {
    const harness = createHarness();

    const commands =
      new NeonOnboardingSessionEventCommands(
        harness.executor
      );

    await expect(
      commands.recordContactVerificationEvent(
        buildVerificationInput({
          occurredAt:
            "2026-09-04 16:10:00"
        })
      )
    ).rejects.toBeInstanceOf(
      OnboardingSessionEventCommandError
    );

    expect(
      harness.transaction
    ).not.toHaveBeenCalled();
  });

  it("rotates only through email plus phone evidence and writes CONTACT_VERIFIED, SESSION_ROTATED and the new SESSION_CREATED atomically", async () => {
    const harness = createHarness();

    harness.transaction.mockResolvedValue([
      [
        {
          session_id:
            "session_started_001"
        }
      ],
      [
        {
          session_id:
            "session_contact_002",
          onboarding_id: "onb_001",
          subject_id: "sub_001",
          token_sha256:
            TOKEN_SHA256,
          issued_state:
            "CONTACT_VERIFIED",
          issued_at:
            new Date(
              "2026-09-04T16:20:00.000Z"
            ),
          absolute_expires_at:
            new Date(
              "2026-09-05T00:20:00.000Z"
            ),
          rotated_from_session_id:
            "session_started_001",
          created_at:
            new Date(
              "2026-09-04T16:20:00.000Z"
            )
        }
      ]
    ]);

    const commands =
      new NeonOnboardingSessionEventCommands(
        harness.executor
      );

    const input = buildRotationInput();

    await expect(
      commands.rotateToContactVerified(
        input
      )
    ).resolves.toMatchObject({
      sessionId:
        "session_contact_002",
      onboardingId: "onb_001",
      subjectId: "sub_001",
      tokenSha256:
        TOKEN_SHA256,
      issuedState:
        "CONTACT_VERIFIED",
      rotatedFromSessionId:
        "session_started_001"
    });

    const [statements, options] =
      harness.transaction.mock.calls.at(0)!;

    expect(options).toEqual({
      isolationLevel: "ReadCommitted",
      readOnly: false
    });

    expect(statements).toHaveLength(2);

    const lockStatement = statements[0];
    const rotateStatement = statements[1];

    if (!lockStatement || !rotateStatement) {
      throw new Error(
        "Expected exactly two rotation transaction statements."
      );
    }

    expect(lockStatement.query).toContain(
      "FOR UPDATE"
    );

    expect(rotateStatement.query).toContain(
      "'EMAIL_VERIFIED'"
    );

    expect(rotateStatement.query).toContain(
      "'PHONE_VERIFIED'"
    );

    expect(rotateStatement.query).toContain(
      "'CONTACT_VERIFIED'"
    );

    expect(rotateStatement.query).toContain(
      "'SESSION_ROTATED'"
    );

    expect(rotateStatement.query).toContain(
      "'SESSION_CREATED'"
    );

    expect(rotateStatement.query).toContain(
      "INSERT INTO hbce_onboarding_sessions"
    );

    expect(rotateStatement.query).toContain(
      "event_seq + 1"
    );

    expect(rotateStatement.query).toContain(
      "contact.event_seq + 1"
    );

    expect(rotateStatement.query).toContain(
      "HBCE_SESSION_EVENT_HASH_V1"
    );

    expect(rotateStatement.query).toContain(
      "sha256"
    );

    expect(rotateStatement.parameters).toEqual([
      input.sourceSessionId,
      input.newSessionId,
      input.newTokenSha256,
      input.issuedAt,
      input.absoluteExpiresAt,
      input.createdAt,
      expect.stringMatching(
        /^evt_session_/
      ),
      expect.stringMatching(
        /^[0-9a-f]{64}$/
      ),
      expect.stringMatching(
        /^evt_session_/
      ),
      expect.stringMatching(
        /^[0-9a-f]{64}$/
      ),
      expect.stringMatching(
        /^evt_session_/
      ),
      expect.stringMatching(
        /^[0-9a-f]{64}$/
      ),
      expect.stringMatching(
        /^[0-9a-f]{64}$/
      )
    ]);
  });

  it("fails closed when contact rotation prerequisites are absent", async () => {
    const harness = createHarness();

    harness.transaction.mockResolvedValue([
      [
        {
          session_id:
            "session_started_001"
        }
      ],
      []
    ]);

    const commands =
      new NeonOnboardingSessionEventCommands(
        harness.executor
      );

    await expect(
      commands.rotateToContactVerified(
        buildRotationInput()
      )
    ).rejects.toMatchObject({
      code: "ROTATION_DENIED"
    });
  });

  it("enforces a new token digest and exact eight-hour rotated TTL before database access", async () => {
    const harness = createHarness();

    const commands =
      new NeonOnboardingSessionEventCommands(
        harness.executor
      );

    await expect(
      commands.rotateToContactVerified(
        buildRotationInput({
          newTokenSha256: "not-a-sha"
        })
      )
    ).rejects.toMatchObject({
      code: "INVALID_INPUT"
    });

    await expect(
      commands.rotateToContactVerified(
        buildRotationInput({
          absoluteExpiresAt:
            "2026-09-05T00:20:00.001Z"
        })
      )
    ).rejects.toMatchObject({
      code: "INVALID_INPUT"
    });

    expect(
      harness.transaction
    ).not.toHaveBeenCalled();
  });

  it("prohibits self rotation before database access", async () => {
    const harness = createHarness();

    const commands =
      new NeonOnboardingSessionEventCommands(
        harness.executor
      );

    await expect(
      commands.rotateToContactVerified(
        buildRotationInput({
          newSessionId:
            "session_started_001"
        })
      )
    ).rejects.toMatchObject({
      code: "INVALID_INPUT"
    });

    expect(
      harness.transaction
    ).not.toHaveBeenCalled();
  });

  it("maps unique constraint failures to EVENT_CONFLICT", async () => {
    const harness = createHarness();

    harness.transaction.mockRejectedValue(
      Object.assign(
        new Error("unique violation"),
        { code: "23505" }
      )
    );

    const commands =
      new NeonOnboardingSessionEventCommands(
        harness.executor
      );

    await expect(
      commands.rotateToContactVerified(
        buildRotationInput()
      )
    ).rejects.toMatchObject({
      code: "EVENT_CONFLICT"
    });
  });

  // P003-D10D3-R15I STARTED idle-recovery rotation tests

  it("rotates an idle-expired STARTED session while preserving subject, onboarding and successor genealogy", async () => {
    const harness = createHarness();

    harness.transaction.mockResolvedValue([
      [
        {
          session_id:
            "session_started_001"
        }
      ],
      [
        {
          session_id:
            "session_started_002",
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
              "2026-09-04T16:20:00.000Z"
            ),
          absolute_expires_at:
            new Date(
              "2026-09-05T00:20:00.000Z"
            ),
          rotated_from_session_id:
            "session_started_001",
          created_at:
            new Date(
              "2026-09-04T16:20:00.000Z"
            )
        }
      ]
    ]);

    const commands =
      new NeonOnboardingSessionEventCommands(
        harness.executor
      );

    const input =
      buildStartedRotationInput();

    await expect(
      commands.rotateStartedSession(
        input
      )
    ).resolves.toMatchObject({
      sessionId:
        "session_started_002",
      onboardingId:
        "onb_001",
      subjectId:
        "sub_001",
      tokenSha256:
        TOKEN_SHA256,
      issuedState:
        "STARTED",
      rotatedFromSessionId:
        "session_started_001"
    });

    expect(
      harness.transaction
    ).toHaveBeenCalledTimes(1);

    const [statements, options] =
      harness.transaction.mock.calls.at(0)!;

    expect(options).toEqual({
      isolationLevel:
        "ReadCommitted",
      readOnly: false
    });

    expect(statements).toHaveLength(2);

    const lockStatement =
      statements[0];

    const rotateStatement =
      statements[1];

    if (
      !lockStatement ||
      !rotateStatement
    ) {
      throw new Error(
        "Expected exactly two STARTED recovery transaction statements."
      );
    }

    expect(
      lockStatement.query
    ).toContain(
      "FOR UPDATE"
    );

    expect(
      rotateStatement.query
    ).toContain(
      "INSERT INTO hbce_onboarding_sessions"
    );

    expect(
      rotateStatement.query
    ).toContain(
      "'STARTED'"
    );

    expect(
      rotateStatement.query
    ).toContain(
      "rotated_from_session_id"
    );

    expect(
      rotateStatement.query
    ).toContain(
      "'SESSION_ROTATED'"
    );

    expect(
      rotateStatement.query
    ).toContain(
      "'SESSION_CREATED'"
    );

    expect(
      rotateStatement.query
    ).toContain(
      "'EMAIL_VERIFIED'"
    );

    expect(
      rotateStatement.query
    ).toContain(
      "'PHONE_VERIFIED'"
    );

    expect(
      rotateStatement.query
    ).not.toContain(
      "'CONTACT_VERIFIED'"
    );

    expect(
      rotateStatement.parameters
    ).toHaveLength(15);

    expect(
      rotateStatement.parameters.slice(
        0,
        6
      )
    ).toEqual([
      input.sourceSessionId,
      input.newSessionId,
      input.newTokenSha256,
      input.issuedAt,
      input.absoluteExpiresAt,
      input.createdAt
    ]);

    for (const index of [
      6,
      8,
      11,
      13
    ]) {
      expect(
        rotateStatement.parameters[index]
      ).toEqual(
        expect.stringMatching(
          /^evt_session_/
        )
      );
    }

    for (const index of [
      7,
      9,
      10,
      12,
      14
    ]) {
      expect(
        rotateStatement.parameters[index]
      ).toEqual(
        expect.stringMatching(
          /^[0-9a-f]{64}$/
        )
      );
    }
  });

  it("encodes zero, email-only, phone-only and dual-factor carry-forward from canonical source evidence", async () => {
    const harness = createHarness();

    harness.transaction.mockResolvedValue([
      [
        {
          session_id:
            "session_started_001"
        }
      ],
      []
    ]);

    const commands =
      new NeonOnboardingSessionEventCommands(
        harness.executor
      );

    await expect(
      commands.rotateStartedSession(
        buildStartedRotationInput()
      )
    ).rejects.toMatchObject({
      code:
        "ROTATION_DENIED"
    });

    const [statements] =
      harness.transaction.mock.calls.at(0)!;

    const rotateStatement =
      statements[1];

    if (!rotateStatement) {
      throw new Error(
        "Expected STARTED recovery SQL statement."
      );
    }

    expect(
      rotateStatement.query
    ).toContain(
      "AS has_email_verified"
    );

    expect(
      rotateStatement.query
    ).toContain(
      "AS has_phone_verified"
    );

    expect(
      rotateStatement.query
    ).toContain(
      "WHERE eligible.has_email_verified"
    );

    expect(
      rotateStatement.query
    ).toContain(
      "WHERE eligible.has_phone_verified"
    );

    expect(
      rotateStatement.query
    ).toContain(
      "WHEN eligible.has_email_verified"
    );

    expect(
      rotateStatement.query
    ).toContain(
      "THEN 2::bigint"
    );

    expect(
      rotateStatement.query
    ).toContain(
      "ELSE 1::bigint"
    );

    expect(
      rotateStatement.query
    ).toContain(
      "COALESCE("
    );

    expect(
      rotateStatement.query
    ).toContain(
      "email.event_hash"
    );

    expect(
      rotateStatement.query
    ).toContain(
      "created.event_hash"
    );
  });

  it("chains carried factors deterministically after successor SESSION_CREATED", async () => {
    const harness = createHarness();

    harness.transaction.mockResolvedValue([
      [
        {
          session_id:
            "session_started_001"
        }
      ],
      []
    ]);

    const commands =
      new NeonOnboardingSessionEventCommands(
        harness.executor
      );

    await expect(
      commands.rotateStartedSession(
        buildStartedRotationInput()
      )
    ).rejects.toMatchObject({
      code:
        "ROTATION_DENIED"
    });

    const [statements] =
      harness.transaction.mock.calls.at(0)!;

    const rotateStatement =
      statements[1];

    if (!rotateStatement) {
      throw new Error(
        "Expected STARTED recovery SQL statement."
      );
    }

    const sql =
      rotateStatement.query;

    const genesis =
      sql.indexOf(
        "inserted_new_session_created AS"
      );

    const email =
      sql.indexOf(
        "email_carry_derived AS"
      );

    const insertedEmail =
      sql.indexOf(
        "inserted_email_carry AS"
      );

    const phone =
      sql.indexOf(
        "phone_carry_derived AS"
      );

    const insertedPhone =
      sql.indexOf(
        "inserted_phone_carry AS"
      );

    expect(genesis).toBeGreaterThan(-1);
    expect(email).toBeGreaterThan(genesis);
    expect(insertedEmail).toBeGreaterThan(email);
    expect(phone).toBeGreaterThan(insertedEmail);
    expect(insertedPhone).toBeGreaterThan(phone);

    expect(sql).toContain(
      "1::bigint"
    );

    expect(sql).toContain(
      "THEN 2::bigint"
    );

    expect(sql).toContain(
      "ELSE 1::bigint"
    );

    expect(sql).toContain(
      "LEFT JOIN inserted_email_carry"
    );

    expect(sql).toContain(
      "LEFT JOIN inserted_phone_carry"
    );
  });

  it("binds carried EMAIL_VERIFIED and PHONE_VERIFIED payload digests to the successor and source session provenance", async () => {
    const harness = createHarness();

    harness.transaction.mockResolvedValue([
      [
        {
          session_id:
            "session_started_001"
        }
      ],
      [
        {
          session_id:
            "session_started_002",
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
              "2026-09-04T16:20:00.000Z"
            ),
          absolute_expires_at:
            new Date(
              "2026-09-05T00:20:00.000Z"
            ),
          rotated_from_session_id:
            "session_started_001",
          created_at:
            new Date(
              "2026-09-04T16:20:00.000Z"
            )
        }
      ]
    ]);

    const commands =
      new NeonOnboardingSessionEventCommands(
        harness.executor
      );

    const input =
      buildStartedRotationInput();

    await commands.rotateStartedSession(
      input
    );

    const [statements] =
      harness.transaction.mock.calls.at(0)!;

    const rotateStatement =
      statements[1];

    if (!rotateStatement) {
      throw new Error(
        "Expected STARTED recovery SQL statement."
      );
    }

    const emailEventId =
      rotateStatement.parameters[11];

    const emailPayloadSha256 =
      rotateStatement.parameters[12];

    const phoneEventId =
      rotateStatement.parameters[13];

    const phonePayloadSha256 =
      rotateStatement.parameters[14];

    if (
      typeof emailEventId !==
        "string" ||
      typeof emailPayloadSha256 !==
        "string" ||
      typeof phoneEventId !==
        "string" ||
      typeof phonePayloadSha256 !==
        "string"
    ) {
      throw new Error(
        "Expected generated carry-forward event material."
      );
    }

    const expectedEmailPayloadSha256 =
      await createOnboardingSessionEventPayloadSha256({
        eventId:
          emailEventId,
        sessionId:
          input.newSessionId,
        eventType:
          "EMAIL_VERIFIED",
        occurredAt:
          input.issuedAt,
        payload: {
          kind:
            "HBCE_EMAIL_VERIFIED_RECOVERY_V1",
          derivation:
            "session-idle-recovery",
          sourceSessionId:
            input.sourceSessionId
        }
      });

    const expectedPhonePayloadSha256 =
      await createOnboardingSessionEventPayloadSha256({
        eventId:
          phoneEventId,
        sessionId:
          input.newSessionId,
        eventType:
          "PHONE_VERIFIED",
        occurredAt:
          input.issuedAt,
        payload: {
          kind:
            "HBCE_PHONE_VERIFIED_RECOVERY_V1",
          derivation:
            "session-idle-recovery",
          sourceSessionId:
            input.sourceSessionId
        }
      });

    expect(
      emailPayloadSha256
    ).toBe(
      expectedEmailPayloadSha256
    );

    expect(
      phonePayloadSha256
    ).toBe(
      expectedPhonePayloadSha256
    );
  });

  it("encodes idle expiry, absolute expiry and terminal-event guards in STARTED recovery rotation SQL", async () => {
    const harness = createHarness();

    harness.transaction.mockResolvedValue([
      [
        {
          session_id:
            "session_started_001"
        }
      ],
      []
    ]);

    const commands =
      new NeonOnboardingSessionEventCommands(
        harness.executor
      );

    await expect(
      commands.rotateStartedSession(
        buildStartedRotationInput({
          newSessionId:
            "session_started_002"
        })
      )
    ).rejects.toMatchObject({
      code:
        "ROTATION_DENIED"
    });

    const [statements] =
      harness.transaction.mock.calls.at(0)!;

    const rotateStatement =
      statements[1];

    if (!rotateStatement) {
      throw new Error(
        "Expected STARTED rotation SQL statement."
      );
    }

    expect(
      rotateStatement.query
    ).toContain(
      "interval '1800 seconds'"
    );

    expect(
      rotateStatement.query
    ).toContain(
      "<= $4::timestamptz"
    );

    expect(
      rotateStatement.query
    ).toContain(
      "absolute_expires_at >"
    );

    expect(
      rotateStatement.query
    ).toContain(
      "'SESSION_ROTATED'"
    );

    expect(
      rotateStatement.query
    ).toContain(
      "'SESSION_REVOKED'"
    );

    expect(
      rotateStatement.query
    ).toContain(
      "'SESSION_EXPIRED'"
    );

    expect(
      rotateStatement.query
    ).toContain(
      "NOT EXISTS"
    );
  });

  it("fails closed when STARTED recovery has no SQL-eligible source session", async () => {
    const harness = createHarness();

    harness.transaction.mockResolvedValue([
      [
        {
          session_id:
            "session_started_001"
        }
      ],
      []
    ]);

    const commands =
      new NeonOnboardingSessionEventCommands(
        harness.executor
      );

    await expect(
      commands.rotateStartedSession(
        buildStartedRotationInput({
          newSessionId:
            "session_started_002"
        })
      )
    ).rejects.toMatchObject({
      code:
        "ROTATION_DENIED"
    });

    expect(
      harness.transaction
    ).toHaveBeenCalledTimes(1);
  });

  it("validates STARTED recovery token, exact eight-hour TTL and self-rotation before database access", async () => {
    const harness = createHarness();

    const commands =
      new NeonOnboardingSessionEventCommands(
        harness.executor
      );

    await expect(
      commands.rotateStartedSession(
        buildStartedRotationInput({
          newSessionId:
            "session_started_002",
          newTokenSha256:
            "not-a-sha"
        })
      )
    ).rejects.toMatchObject({
      code:
        "INVALID_INPUT"
    });

    await expect(
      commands.rotateStartedSession(
        buildStartedRotationInput({
          newSessionId:
            "session_started_002",
          absoluteExpiresAt:
            "2026-09-05T00:20:00.001Z"
        })
      )
    ).rejects.toMatchObject({
      code:
        "INVALID_INPUT"
    });

    await expect(
      commands.rotateStartedSession(
        buildStartedRotationInput({
          newSessionId:
            "session_started_001"
        })
      )
    ).rejects.toMatchObject({
      code:
        "INVALID_INPUT"
    });

    expect(
      harness.transaction
    ).not.toHaveBeenCalled();
  });

});
