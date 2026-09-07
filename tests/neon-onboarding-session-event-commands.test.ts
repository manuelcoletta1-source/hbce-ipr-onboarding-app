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
  type RotateContactVerifiedSessionInput
} from "../lib/server/neon-onboarding-session-event-commands";

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

  it("rotates an idle-expired STARTED session into a new STARTED session while preserving subject and onboarding genealogy", async () => {
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
      buildRotationInput({
        newSessionId:
          "session_started_002"
      });

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
        "Expected exactly two STARTED rotation transaction statements."
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
    ).not.toContain(
      "'CONTACT_VERIFIED'"
    );

    expect(
      rotateStatement.query
    ).not.toContain(
      "'EMAIL_VERIFIED'"
    );

    expect(
      rotateStatement.query
    ).not.toContain(
      "'PHONE_VERIFIED'"
    );

    expect(
      rotateStatement.parameters
    ).toEqual([
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
        /^[0-9a-f]{64}$/
      )
    ]);
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
        buildRotationInput({
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
        buildRotationInput({
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
        buildRotationInput({
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
        buildRotationInput({
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
        buildRotationInput({
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
