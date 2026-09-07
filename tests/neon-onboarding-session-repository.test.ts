import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  NeonOnboardingSessionRepository,
  NeonOnboardingSessionRepositoryError,
  ONBOARDING_SESSION_ABSOLUTE_TTL_SECONDS,
  type CreateStartedOnboardingSessionInput,
  type OnboardingSessionDatabaseExecutor
} from "../lib/server/neon-onboarding-session-repository";

const TOKEN_SHA256 =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function buildInput(
  overrides:
    Partial<CreateStartedOnboardingSessionInput> = {}
): CreateStartedOnboardingSessionInput {
  return {
    sessionId: "session_server_001",
    onboardingId: "onb_server_001",
    subjectId: "sub_server_001",
    tokenSha256: TOKEN_SHA256,
    issuedAt: "2026-09-04T16:00:00.000Z",
    absoluteExpiresAt:
      "2026-09-05T00:00:00.000Z",
    createdAt: "2026-09-04T16:00:00.000Z",
    eventPayload: {
      kind: "STARTED"
    },
    ...overrides
  };
}

function buildLockedBindingRow() {
  return {
    onboarding_id: "onb_server_001",
    subject_id: "sub_server_001"
  };
}

function buildSessionRow() {
  return {
    session_id: "session_server_001",
    onboarding_id: "onb_server_001",
    subject_id: "sub_server_001",
    token_sha256: TOKEN_SHA256,
    issued_state: "STARTED",
    issued_at:
      new Date("2026-09-04T16:00:00.000Z"),
    absolute_expires_at:
      new Date("2026-09-05T00:00:00.000Z"),
    rotated_from_session_id: null,
    created_at:
      new Date("2026-09-04T16:00:00.000Z")
  };
}

function createExecutorHarness() {
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

describe("Neon onboarding session repository", () => {
  it("freezes the exact eight-hour absolute TTL", () => {
    expect(
      ONBOARDING_SESSION_ABSOLUTE_TTL_SECONDS
    ).toBe(28_800);
  });

  it("creates STARTED session through two ordered ReadCommitted transaction statements", async () => {
    const harness = createExecutorHarness();

    harness.transaction.mockResolvedValue([
      [buildLockedBindingRow()],
      [buildSessionRow()]
    ]);

    const repository =
      new NeonOnboardingSessionRepository(
        harness.executor
      );

    const input = buildInput();

    await expect(
      repository.createStartedSession(input)
    ).resolves.toMatchObject({
      sessionId: input.sessionId,
      onboardingId: input.onboardingId,
      subjectId: input.subjectId,
      tokenSha256: input.tokenSha256,
      issuedState: "STARTED"
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
    const createStatement = statements[1];

    if (!lockStatement || !createStatement) {
      throw new Error(
        "Expected exactly two transaction statements."
      );
    }

    expect(lockStatement.query).toContain(
      "FROM hbce_onboardings"
    );

    expect(lockStatement.query).toContain(
      "FOR UPDATE"
    );

    expect(lockStatement.parameters).toEqual([
      input.onboardingId,
      input.subjectId
    ]);

    expect(createStatement.query).not.toContain(
      "FOR UPDATE"
    );

    expect(createStatement.query).toContain(
      "INSERT INTO hbce_onboarding_sessions"
    );

    expect(createStatement.query).toContain(
      "INSERT INTO hbce_onboarding_session_events"
    );

    expect(createStatement.query).toContain(
      "'SESSION_CREATED'"
    );

    expect(createStatement.query).toContain(
      "interval '1800 seconds'"
    );

    expect(createStatement.query).toContain(
      "'SESSION_ROTATED'"
    );

    expect(createStatement.query).toContain(
      "'SESSION_REVOKED'"
    );

    expect(createStatement.query).toContain(
      "'SESSION_EXPIRED'"
    );

    expect(createStatement.parameters).toEqual([
      input.sessionId,
      input.onboardingId,
      input.subjectId,
      input.tokenSha256,
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
        /^[0-9a-f]{64}$/
      )
    ]);

    expect(createStatement.query).not.toContain(
      input.tokenSha256
    );

    expect(createStatement.query).not.toContain(
      input.subjectId
    );

    expect(harness.query).not.toHaveBeenCalled();
  });

  it("does not use a single-statement lock-and-scan concurrency model", async () => {
    const harness = createExecutorHarness();

    harness.transaction.mockResolvedValue([
      [buildLockedBindingRow()],
      [buildSessionRow()]
    ]);

    const repository =
      new NeonOnboardingSessionRepository(
        harness.executor
      );

    await repository.createStartedSession(
      buildInput()
    );

    const [statements] =
      harness.transaction.mock.calls.at(0)!;

    expect(statements).toHaveLength(2);

    const lockStatement = statements[0];
    const createStatement = statements[1];

    if (!lockStatement || !createStatement) {
      throw new Error(
        "Expected exactly two transaction statements."
      );
    }

    expect(lockStatement.query).toContain(
      "FOR UPDATE"
    );

    expect(createStatement.query).toContain(
      "active_started_session"
    );

    expect(createStatement.query).not.toContain(
      "FOR UPDATE"
    );
  });

  it("fails closed when the canonical binding cannot be locked", async () => {
    const harness = createExecutorHarness();

    harness.transaction.mockResolvedValue([
      [],
      []
    ]);

    const repository =
      new NeonOnboardingSessionRepository(
        harness.executor
      );

    await expect(
      repository.createStartedSession(
        buildInput()
      )
    ).rejects.toMatchObject({
      code: "SESSION_CREATION_DENIED"
    });
  });

  it("rejects a mismatching canonical lock result", async () => {
    const harness = createExecutorHarness();

    harness.transaction.mockResolvedValue([
      [
        {
          onboarding_id: "onb_other",
          subject_id: "sub_other"
        }
      ],
      [buildSessionRow()]
    ]);

    const repository =
      new NeonOnboardingSessionRepository(
        harness.executor
      );

    await expect(
      repository.createStartedSession(
        buildInput()
      )
    ).rejects.toMatchObject({
      code: "INVALID_DATABASE_RESULT"
    });
  });

  it("fails closed when active-session policy produces no created row", async () => {
    const harness = createExecutorHarness();

    harness.transaction.mockResolvedValue([
      [buildLockedBindingRow()],
      []
    ]);

    const repository =
      new NeonOnboardingSessionRepository(
        harness.executor
      );

    await expect(
      repository.createStartedSession(
        buildInput()
      )
    ).rejects.toMatchObject({
      code: "SESSION_CREATION_DENIED"
    });
  });

  it("rejects malformed token digest before transaction access", async () => {
    const harness = createExecutorHarness();

    const repository =
      new NeonOnboardingSessionRepository(
        harness.executor
      );

    await expect(
      repository.createStartedSession(
        buildInput({
          tokenSha256: "not-a-sha256"
        })
      )
    ).rejects.toBeInstanceOf(
      NeonOnboardingSessionRepositoryError
    );

    expect(
      harness.transaction
    ).not.toHaveBeenCalled();

    expect(
      harness.query
    ).not.toHaveBeenCalled();
  });

  it("rejects non-normalized timestamps before database access", async () => {
    const harness = createExecutorHarness();

    const repository =
      new NeonOnboardingSessionRepository(
        harness.executor
      );

    await expect(
      repository.createStartedSession(
        buildInput({
          issuedAt: "2026-09-04 16:00:00"
        })
      )
    ).rejects.toMatchObject({
      code: "INVALID_INPUT"
    });

    expect(
      harness.transaction
    ).not.toHaveBeenCalled();
  });

  it("rejects absolute expiry shorter than eight hours", async () => {
    const harness = createExecutorHarness();

    const repository =
      new NeonOnboardingSessionRepository(
        harness.executor
      );

    await expect(
      repository.createStartedSession(
        buildInput({
          absoluteExpiresAt:
            "2026-09-04T23:59:59.999Z"
        })
      )
    ).rejects.toMatchObject({
      code: "INVALID_INPUT"
    });

    expect(
      harness.transaction
    ).not.toHaveBeenCalled();
  });

  it("rejects absolute expiry longer than eight hours", async () => {
    const harness = createExecutorHarness();

    const repository =
      new NeonOnboardingSessionRepository(
        harness.executor
      );

    await expect(
      repository.createStartedSession(
        buildInput({
          absoluteExpiresAt:
            "2026-09-05T00:00:00.001Z"
        })
      )
    ).rejects.toMatchObject({
      code: "INVALID_INPUT"
    });

    expect(
      harness.transaction
    ).not.toHaveBeenCalled();
  });

  it("looks up a session only by token SHA-256 and derives event state", async () => {
    const harness = createExecutorHarness();

    harness.query.mockResolvedValue([
      {
        ...buildSessionRow(),
        email_verified: true,
        phone_verified: true,
        contact_verified: false,
        rotated: false,
        revoked: false,
        expired_event: false,
        last_activity_at:
          new Date(
            "2026-09-04T16:05:00.000Z"
          )
      }
    ]);

    const repository =
      new NeonOnboardingSessionRepository(
        harness.executor
      );

    await expect(
      repository.getByTokenSha256(
        TOKEN_SHA256
      )
    ).resolves.toEqual({
      session: {
        sessionId: "session_server_001",
        onboardingId: "onb_server_001",
        subjectId: "sub_server_001",
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
      emailVerified: true,
      phoneVerified: true,
      contactVerified: false,
      rotated: false,
      revoked: false,
      expiredEvent: false,
      lastActivityAt:
        "2026-09-04T16:05:00.000Z"
    });

    expect(
      harness.query
    ).toHaveBeenCalledTimes(1);

    expect(
      harness.transaction
    ).not.toHaveBeenCalled();

    const [query, parameters] =
      harness.query.mock.calls.at(0)!;

    expect(parameters).toEqual([
      TOKEN_SHA256
    ]);

    expect(query).toContain(
      "WHERE sessions.token_sha256 = $1"
    );

    expect(query).toContain(
      "'EMAIL_VERIFIED'"
    );

    expect(query).toContain(
      "'PHONE_VERIFIED'"
    );

    expect(query).toContain(
      "'CONTACT_VERIFIED'"
    );

    expect(query).toContain(
      "'SESSION_ACTIVITY'"
    );
  });

  it("treats CONTACT_VERIFIED issuance as contact verified without client claims", async () => {
    const harness = createExecutorHarness();

    harness.query.mockResolvedValue([
      {
        ...buildSessionRow(),
        issued_state: "CONTACT_VERIFIED",
        rotated_from_session_id:
          "session_server_prior",
        email_verified: false,
        phone_verified: false,
        contact_verified: true,
        rotated: false,
        revoked: false,
        expired_event: false,
        last_activity_at:
          new Date(
            "2026-09-04T16:10:00.000Z"
          )
      }
    ]);

    const repository =
      new NeonOnboardingSessionRepository(
        harness.executor
      );

    const result =
      await repository.getByTokenSha256(
        TOKEN_SHA256
      );

    expect(result?.contactVerified).toBe(
      true
    );

    expect(
      result?.session.issuedState
    ).toBe("CONTACT_VERIFIED");
  });

  it("does not query the database for a malformed lookup digest", async () => {
    const harness = createExecutorHarness();

    const repository =
      new NeonOnboardingSessionRepository(
        harness.executor
      );

    await expect(
      repository.getByTokenSha256(
        "client-controlled-garbage"
      )
    ).resolves.toBeNull();

    expect(
      harness.query
    ).not.toHaveBeenCalled();

    expect(
      harness.transaction
    ).not.toHaveBeenCalled();
  });

  it("maps transaction unique violations to an explicit session conflict", async () => {
    const databaseError =
      Object.assign(
        new Error("unique violation"),
        { code: "23505" }
      );

    const harness = createExecutorHarness();

    harness.transaction.mockRejectedValue(
      databaseError
    );

    const repository =
      new NeonOnboardingSessionRepository(
        harness.executor
      );

    await expect(
      repository.createStartedSession(
        buildInput()
      )
    ).rejects.toMatchObject({
      code: "SESSION_CONFLICT"
    });
  });
});
