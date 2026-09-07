import "server-only";

import { neon } from "@neondatabase/serverless";

import {
  OnboardingSessionEventCryptoError,
  createOnboardingSessionEventHash,
  createOnboardingSessionEventPayloadSha256,
  generateOnboardingSessionEventId,
  type OnboardingSessionEventPayload
} from "@/lib/server/onboarding-session-event-crypto";

export const ONBOARDING_SESSION_ABSOLUTE_TTL_SECONDS =
  28_800 as const;

export const ONBOARDING_SESSION_IDLE_TTL_SECONDS =
  1_800 as const;

export type OnboardingSessionIssuedState =
  | "STARTED"
  | "CONTACT_VERIFIED";

export type OnboardingSessionRecord = {
  readonly sessionId: string;
  readonly onboardingId: string;
  readonly subjectId: string;
  readonly tokenSha256: string;
  readonly issuedState: OnboardingSessionIssuedState;
  readonly issuedAt: string;
  readonly absoluteExpiresAt: string;
  readonly rotatedFromSessionId: string | null;
  readonly createdAt: string;
};

export type OnboardingSessionTrustState = {
  readonly session: OnboardingSessionRecord;
  readonly emailVerified: boolean;
  readonly phoneVerified: boolean;
  readonly contactVerified: boolean;
  readonly rotated: boolean;
  readonly revoked: boolean;
  readonly expiredEvent: boolean;
  readonly lastActivityAt: string;
};

export type CreateStartedOnboardingSessionInput = {
  readonly sessionId: string;
  readonly onboardingId: string;
  readonly subjectId: string;
  readonly tokenSha256: string;
  readonly issuedAt: string;
  readonly absoluteExpiresAt: string;
  readonly createdAt: string;
  readonly eventPayload:
    OnboardingSessionEventPayload;
};

export type OnboardingSessionQueryRow =
  Record<string, unknown>;

export type OnboardingSessionTransactionStatement = {
  readonly query: string;
  readonly parameters: readonly unknown[];
};

export type OnboardingSessionTransactionOptions = {
  readonly isolationLevel: "ReadCommitted";
  readonly readOnly: false;
};

export interface OnboardingSessionDatabaseExecutor {
  query(
    query: string,
    parameters: readonly unknown[]
  ): Promise<readonly OnboardingSessionQueryRow[]>;

  transaction(
    statements:
      readonly OnboardingSessionTransactionStatement[],
    options: OnboardingSessionTransactionOptions
  ): Promise<
    readonly (
      readonly OnboardingSessionQueryRow[]
    )[]
  >;
}

export interface OnboardingSessionRepository {
  createStartedSession(
    input: CreateStartedOnboardingSessionInput
  ): Promise<OnboardingSessionRecord>;

  getByTokenSha256(
    tokenSha256: string
  ): Promise<OnboardingSessionTrustState | null>;

  getBySessionId(
    sessionId: string
  ): Promise<OnboardingSessionTrustState | null>;
}

export type NeonOnboardingSessionRepositoryErrorCode =
  | "DATABASE_URL_MISSING"
  | "INVALID_INPUT"
  | "SESSION_CREATION_DENIED"
  | "SESSION_CONFLICT"
  | "INVALID_DATABASE_RESULT";

export class NeonOnboardingSessionRepositoryError
  extends Error
{
  readonly code:
    NeonOnboardingSessionRepositoryErrorCode;

  constructor(
    code: NeonOnboardingSessionRepositoryErrorCode,
    message: string
  ) {
    super(message);
    this.name =
      "NeonOnboardingSessionRepositoryError";
    this.code = code;
  }
}

const LOCK_CANONICAL_ONBOARDING_SQL = `
SELECT
  onboarding_id,
  subject_id
FROM hbce_onboardings
WHERE onboarding_id = $1
  AND subject_id = $2
FOR UPDATE
`;

const CREATE_STARTED_SESSION_SQL = `
WITH canonical_onboarding AS (
  SELECT
    onboarding_id,
    subject_id
  FROM hbce_onboardings
  WHERE onboarding_id = $2
    AND subject_id = $3
),
active_started_session AS (
  SELECT sessions.session_id
  FROM hbce_onboarding_sessions AS sessions
  JOIN canonical_onboarding AS onboarding
    ON onboarding.onboarding_id =
       sessions.onboarding_id
   AND onboarding.subject_id =
       sessions.subject_id
  WHERE sessions.issued_state = 'STARTED'
    AND sessions.absolute_expires_at >
        $5::timestamptz
    AND (
      COALESCE(
        (
          SELECT max(activity.occurred_at)
          FROM hbce_onboarding_session_events
            AS activity
          WHERE activity.session_id =
                sessions.session_id
            AND activity.event_type =
                'SESSION_ACTIVITY'
        ),
        sessions.issued_at
      )
      + interval '1800 seconds'
    ) > $5::timestamptz
    AND NOT EXISTS (
      SELECT 1
      FROM hbce_onboarding_session_events
        AS terminal
      WHERE terminal.session_id =
            sessions.session_id
        AND terminal.event_type IN (
          'SESSION_ROTATED',
          'SESSION_REVOKED',
          'SESSION_EXPIRED'
        )
    )
  LIMIT 1
),
inserted_session AS (
  INSERT INTO hbce_onboarding_sessions (
    session_id,
    onboarding_id,
    subject_id,
    token_sha256,
    issued_state,
    issued_at,
    absolute_expires_at,
    rotated_from_session_id,
    created_at
  )
  SELECT
    $1,
    onboarding.onboarding_id,
    onboarding.subject_id,
    $4,
    'STARTED',
    $5::timestamptz,
    $6::timestamptz,
    NULL,
    $7::timestamptz
  FROM canonical_onboarding AS onboarding
  WHERE NOT EXISTS (
    SELECT 1
    FROM active_started_session
  )
  RETURNING
    session_id,
    onboarding_id,
    subject_id,
    token_sha256,
    issued_state,
    issued_at,
    absolute_expires_at,
    rotated_from_session_id,
    created_at
),
inserted_event AS (
  INSERT INTO hbce_onboarding_session_events (
    event_id,
    session_id,
    event_seq,
    event_type,
    previous_event_hash,
    event_hash,
    event_payload_sha256,
    occurred_at,
    created_at
  )
  SELECT
    $8,
    session_id,
    0,
    'SESSION_CREATED',
    NULL,
    $9,
    $10,
    $5::timestamptz,
    $7::timestamptz
  FROM inserted_session
  RETURNING session_id
)
SELECT
  session.session_id,
  session.onboarding_id,
  session.subject_id,
  session.token_sha256,
  session.issued_state,
  session.issued_at,
  session.absolute_expires_at,
  session.rotated_from_session_id,
  session.created_at
FROM inserted_session AS session
JOIN inserted_event AS event
  ON event.session_id = session.session_id
`;

const GET_BY_TOKEN_SHA256_SQL = `
SELECT
  sessions.session_id,
  sessions.onboarding_id,
  sessions.subject_id,
  sessions.token_sha256,
  sessions.issued_state,
  sessions.issued_at,
  sessions.absolute_expires_at,
  sessions.rotated_from_session_id,
  sessions.created_at,

  EXISTS (
    SELECT 1
    FROM hbce_onboarding_session_events AS events
    WHERE events.session_id =
          sessions.session_id
      AND events.event_type = 'EMAIL_VERIFIED'
  ) AS email_verified,

  EXISTS (
    SELECT 1
    FROM hbce_onboarding_session_events AS events
    WHERE events.session_id =
          sessions.session_id
      AND events.event_type = 'PHONE_VERIFIED'
  ) AS phone_verified,

  (
    sessions.issued_state = 'CONTACT_VERIFIED'
    OR EXISTS (
      SELECT 1
      FROM hbce_onboarding_session_events AS events
      WHERE events.session_id =
            sessions.session_id
        AND events.event_type =
            'CONTACT_VERIFIED'
    )
  ) AS contact_verified,

  EXISTS (
    SELECT 1
    FROM hbce_onboarding_session_events AS events
    WHERE events.session_id =
          sessions.session_id
      AND events.event_type = 'SESSION_ROTATED'
  ) AS rotated,

  EXISTS (
    SELECT 1
    FROM hbce_onboarding_session_events AS events
    WHERE events.session_id =
          sessions.session_id
      AND events.event_type = 'SESSION_REVOKED'
  ) AS revoked,

  EXISTS (
    SELECT 1
    FROM hbce_onboarding_session_events AS events
    WHERE events.session_id =
          sessions.session_id
      AND events.event_type = 'SESSION_EXPIRED'
  ) AS expired_event,

  COALESCE(
    (
      SELECT max(activity.occurred_at)
      FROM hbce_onboarding_session_events
        AS activity
      WHERE activity.session_id =
            sessions.session_id
        AND activity.event_type =
            'SESSION_ACTIVITY'
    ),
    sessions.issued_at
  ) AS last_activity_at

FROM hbce_onboarding_sessions AS sessions
WHERE sessions.token_sha256 = $1
LIMIT 1
`;

const GET_BY_SESSION_ID_SQL =
  GET_BY_TOKEN_SHA256_SQL.replace(
    "WHERE sessions.token_sha256 = $1",
    "WHERE sessions.session_id = $1"
  );

if (
  GET_BY_SESSION_ID_SQL ===
  GET_BY_TOKEN_SHA256_SQL
) {
  throw new Error(
    "Onboarding session trust query could not be specialized for session_id."
  );
}

let defaultExecutor:
  OnboardingSessionDatabaseExecutor | null = null;

function getDefaultExecutor():
  OnboardingSessionDatabaseExecutor
{
  if (defaultExecutor) {
    return defaultExecutor;
  }

  const connectionString =
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new NeonOnboardingSessionRepositoryError(
      "DATABASE_URL_MISSING",
      "DATABASE_URL is required when the onboarding session repository is first used."
    );
  }

  const sql = neon(connectionString);

  defaultExecutor = {
    query: async (
      query,
      parameters
    ) => {
      const rows = await sql.query(
        query,
        [...parameters]
      );

      return rows as readonly OnboardingSessionQueryRow[];
    },

    transaction: async (
      statements,
      options
    ) => {
      const results = await sql.transaction(
        (txn) =>
          statements.map((statement) =>
            txn.query(
              statement.query,
              [...statement.parameters]
            )
          ),
        {
          isolationLevel:
            options.isolationLevel,
          readOnly:
            options.readOnly
        }
      );

      return results as unknown as readonly (
        readonly OnboardingSessionQueryRow[]
      )[];
    }
  };

  return defaultExecutor;
}

function isNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function isSha256Hex(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{64}$/.test(value)
  );
}

function isIssuedState(
  value: unknown
): value is OnboardingSessionIssuedState {
  return (
    value === "STARTED" ||
    value === "CONTACT_VERIFIED"
  );
}

function readIsoDateTime(
  value: unknown
): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (!isNonEmptyString(value)) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function assertNormalizedIsoDateTime(
  value: string,
  field: string
): void {
  const parsed = new Date(value);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString() !== value
  ) {
    throw new NeonOnboardingSessionRepositoryError(
      "INVALID_INPUT",
      `${field} must be a normalized ISO date-time.`
    );
  }
}

function validateCreateInput(
  input: CreateStartedOnboardingSessionInput
): void {
  for (const [field, value] of [
    ["sessionId", input.sessionId],
    ["onboardingId", input.onboardingId],
    ["subjectId", input.subjectId]
  ] as const) {
    if (!isNonEmptyString(value)) {
      throw new NeonOnboardingSessionRepositoryError(
        "INVALID_INPUT",
        `${field} must be a non-empty string.`
      );
    }
  }

  if (!isSha256Hex(input.tokenSha256)) {
    throw new NeonOnboardingSessionRepositoryError(
      "INVALID_INPUT",
      "tokenSha256 must be a lowercase SHA-256 hexadecimal digest."
    );
  }

  assertNormalizedIsoDateTime(
    input.issuedAt,
    "issuedAt"
  );

  assertNormalizedIsoDateTime(
    input.absoluteExpiresAt,
    "absoluteExpiresAt"
  );

  assertNormalizedIsoDateTime(
    input.createdAt,
    "createdAt"
  );

  const issuedAtMs =
    new Date(input.issuedAt).getTime();

  const absoluteExpiresAtMs =
    new Date(input.absoluteExpiresAt).getTime();

  const createdAtMs =
    new Date(input.createdAt).getTime();

  const requiredAbsoluteTtlMs =
    ONBOARDING_SESSION_ABSOLUTE_TTL_SECONDS *
    1000;

  if (
    absoluteExpiresAtMs - issuedAtMs !==
    requiredAbsoluteTtlMs
  ) {
    throw new NeonOnboardingSessionRepositoryError(
      "INVALID_INPUT",
      "absoluteExpiresAt must equal issuedAt plus exactly 28800 seconds."
    );
  }

  if (createdAtMs < issuedAtMs) {
    throw new NeonOnboardingSessionRepositoryError(
      "INVALID_INPUT",
      "createdAt must not precede issuedAt."
    );
  }
}

function assertCanonicalLockResult(
  row: OnboardingSessionQueryRow | undefined,
  input: CreateStartedOnboardingSessionInput
): void {
  if (!row) {
    throw new NeonOnboardingSessionRepositoryError(
      "SESSION_CREATION_DENIED",
      "The canonical subject and onboarding binding does not exist."
    );
  }

  if (
    row.onboarding_id !== input.onboardingId ||
    row.subject_id !== input.subjectId
  ) {
    throw new NeonOnboardingSessionRepositoryError(
      "INVALID_DATABASE_RESULT",
      "The locked canonical onboarding binding does not match the requested identifiers."
    );
  }
}

function mapSessionRecord(
  row: OnboardingSessionQueryRow | undefined
): OnboardingSessionRecord | null {
  if (!row) {
    return null;
  }

  const sessionId = row.session_id;
  const onboardingId = row.onboarding_id;
  const subjectId = row.subject_id;
  const tokenSha256 = row.token_sha256;
  const issuedState = row.issued_state;
  const issuedAt = readIsoDateTime(
    row.issued_at
  );
  const absoluteExpiresAt = readIsoDateTime(
    row.absolute_expires_at
  );
  const rotatedFromSessionId =
    row.rotated_from_session_id;
  const createdAt = readIsoDateTime(
    row.created_at
  );

  if (
    !isNonEmptyString(sessionId) ||
    !isNonEmptyString(onboardingId) ||
    !isNonEmptyString(subjectId) ||
    !isSha256Hex(tokenSha256) ||
    !isIssuedState(issuedState) ||
    !issuedAt ||
    !absoluteExpiresAt ||
    !createdAt ||
    !(
      rotatedFromSessionId === null ||
      isNonEmptyString(rotatedFromSessionId)
    )
  ) {
    throw new NeonOnboardingSessionRepositoryError(
      "INVALID_DATABASE_RESULT",
      "Neon returned invalid onboarding session data."
    );
  }

  return {
    sessionId,
    onboardingId,
    subjectId,
    tokenSha256,
    issuedState,
    issuedAt,
    absoluteExpiresAt,
    rotatedFromSessionId,
    createdAt
  };
}

function readDatabaseBoolean(
  value: unknown
): boolean {
  if (value === true) {
    return true;
  }

  if (value === false) {
    return false;
  }

  throw new NeonOnboardingSessionRepositoryError(
    "INVALID_DATABASE_RESULT",
    "Neon returned an invalid derived session boolean."
  );
}

function mapTrustState(
  row: OnboardingSessionQueryRow | undefined
): OnboardingSessionTrustState | null {
  if (!row) {
    return null;
  }

  const session = mapSessionRecord(row);

  if (!session) {
    return null;
  }

  const lastActivityAt = readIsoDateTime(
    row.last_activity_at
  );

  if (!lastActivityAt) {
    throw new NeonOnboardingSessionRepositoryError(
      "INVALID_DATABASE_RESULT",
      "Neon returned an invalid session activity time."
    );
  }

  return {
    session,
    emailVerified:
      readDatabaseBoolean(row.email_verified),
    phoneVerified:
      readDatabaseBoolean(row.phone_verified),
    contactVerified:
      readDatabaseBoolean(row.contact_verified),
    rotated:
      readDatabaseBoolean(row.rotated),
    revoked:
      readDatabaseBoolean(row.revoked),
    expiredEvent:
      readDatabaseBoolean(row.expired_event),
    lastActivityAt
  };
}

function mapDatabaseError(
  error: unknown
): never {
  if (
    error instanceof
    NeonOnboardingSessionRepositoryError
  ) {
    throw error;
  }

  if (
    error instanceof
    OnboardingSessionEventCryptoError
  ) {
    throw new NeonOnboardingSessionRepositoryError(
      "INVALID_INPUT",
      error.message
    );
  }

  if (error instanceof Error) {
    const databaseError = error as Error & {
      code?: string;
    };

    if (databaseError.code === "23505") {
      throw new NeonOnboardingSessionRepositoryError(
        "SESSION_CONFLICT",
        "Onboarding session or token digest conflicts with an existing record."
      );
    }
  }

  throw error;
}

export class NeonOnboardingSessionRepository
  implements OnboardingSessionRepository
{
  private readonly executor:
    OnboardingSessionDatabaseExecutor;

  constructor(
    executor?: OnboardingSessionDatabaseExecutor
  ) {
    this.executor =
      executor ?? {
        query: (...args) =>
          getDefaultExecutor().query(...args),

        transaction: (...args) =>
          getDefaultExecutor().transaction(
            ...args
          )
      };
  }

  async createStartedSession(
    input: CreateStartedOnboardingSessionInput
  ): Promise<OnboardingSessionRecord> {
    validateCreateInput(input);

    try {
      const eventId =
        generateOnboardingSessionEventId();

      const eventPayloadSha256 =
        await createOnboardingSessionEventPayloadSha256({
          eventId,
          sessionId: input.sessionId,
          eventType: "SESSION_CREATED",
          occurredAt: input.issuedAt,
          payload: input.eventPayload
        });

      const eventHash =
        await createOnboardingSessionEventHash({
          eventSeq: 0,
          previousEventHash: null,
          eventPayloadSha256
        });

      const [
        lockedBindingRows,
        createdRows
      ] = await this.executor.transaction(
        [
          {
            query:
              LOCK_CANONICAL_ONBOARDING_SQL,
            parameters: [
              input.onboardingId,
              input.subjectId
            ]
          },
          {
            query:
              CREATE_STARTED_SESSION_SQL,
            parameters: [
              input.sessionId,
              input.onboardingId,
              input.subjectId,
              input.tokenSha256,
              input.issuedAt,
              input.absoluteExpiresAt,
              input.createdAt,
              eventId,
              eventHash,
              eventPayloadSha256
            ]
          }
        ],
        {
          isolationLevel: "ReadCommitted",
          readOnly: false
        }
      );

      assertCanonicalLockResult(
        lockedBindingRows?.[0],
        input
      );

      const created = mapSessionRecord(
        createdRows?.[0]
      );

      if (!created) {
        throw new NeonOnboardingSessionRepositoryError(
          "SESSION_CREATION_DENIED",
          "STARTED session creation was denied by the active-session policy."
        );
      }

      return created;
    } catch (error) {
      return mapDatabaseError(error);
    }
  }

  async getByTokenSha256(
    tokenSha256: string
  ): Promise<OnboardingSessionTrustState | null> {
    if (!isSha256Hex(tokenSha256)) {
      return null;
    }

    const rows = await this.executor.query(
      GET_BY_TOKEN_SHA256_SQL,
      [tokenSha256]
    );

    return mapTrustState(rows[0]);
  }

  async getBySessionId(
    sessionId: string
  ): Promise<OnboardingSessionTrustState | null> {
    if (
      !isNonEmptyString(sessionId) ||
      sessionId !== sessionId.trim()
    ) {
      return null;
    }

    const rows = await this.executor.query(
      GET_BY_SESSION_ID_SQL,
      [sessionId]
    );

    return mapTrustState(rows[0]);
  }
}

export function createNeonOnboardingSessionRepository(
  executor?: OnboardingSessionDatabaseExecutor
): OnboardingSessionRepository {
  return new NeonOnboardingSessionRepository(
    executor
  );
}
