import "server-only";

import { neon } from "@neondatabase/serverless";

import {
  OnboardingSessionEventCryptoError,
  createOnboardingSessionEventHash,
  createOnboardingSessionEventPayloadSha256,
  generateOnboardingSessionEventId,
  isSha256LowerHex,
  type OnboardingSessionEventPayload
} from "@/lib/server/onboarding-session-event-crypto";

import {
  ONBOARDING_SESSION_ABSOLUTE_TTL_SECONDS,
  type OnboardingSessionDatabaseExecutor,
  type OnboardingSessionQueryRow,
  type OnboardingSessionRecord
} from "@/lib/server/neon-onboarding-session-repository";

export type ContactVerificationEventType =
  | "EMAIL_VERIFIED"
  | "PHONE_VERIFIED";

export type OnboardingSessionEventRecord = {
  readonly eventId: string;
  readonly sessionId: string;
  readonly eventSeq: number;
  readonly eventType: ContactVerificationEventType;
  readonly previousEventHash: string;
  readonly eventHash: string;
  readonly eventPayloadSha256: string;
  readonly occurredAt: string;
  readonly createdAt: string;
};

export type RecordContactVerificationEventInput = {
  readonly sessionId: string;
  readonly eventType:
    ContactVerificationEventType;
  readonly occurredAt: string;
  readonly createdAt: string;
  readonly payload:
    OnboardingSessionEventPayload;
};

export type RotateStartedSessionInput = {
  readonly sourceSessionId: string;

  readonly newSessionId: string;
  readonly newTokenSha256: string;
  readonly issuedAt: string;
  readonly absoluteExpiresAt: string;
  readonly createdAt: string;

  readonly rotatedPayload:
    OnboardingSessionEventPayload;

  readonly newSessionCreatedPayload:
    OnboardingSessionEventPayload;
};

export type RotateContactVerifiedSessionInput = {
  readonly sourceSessionId: string;

  readonly newSessionId: string;
  readonly newTokenSha256: string;
  readonly issuedAt: string;
  readonly absoluteExpiresAt: string;
  readonly createdAt: string;

  readonly contactVerifiedPayload:
    OnboardingSessionEventPayload;

  readonly rotatedPayload:
    OnboardingSessionEventPayload;

  readonly newSessionCreatedPayload:
    OnboardingSessionEventPayload;
};

export interface OnboardingSessionEventCommands {
  recordContactVerificationEvent(
    input: RecordContactVerificationEventInput
  ): Promise<OnboardingSessionEventRecord>;

  rotateToContactVerified(
    input: RotateContactVerifiedSessionInput
  ): Promise<OnboardingSessionRecord>;
}

export type OnboardingSessionEventCommandErrorCode =
  | "DATABASE_URL_MISSING"
  | "INVALID_INPUT"
  | "SESSION_NOT_FOUND"
  | "EVENT_COMMAND_DENIED"
  | "ROTATION_DENIED"
  | "EVENT_CONFLICT"
  | "INVALID_DATABASE_RESULT";

export class OnboardingSessionEventCommandError
  extends Error
{
  readonly code:
    OnboardingSessionEventCommandErrorCode;

  constructor(
    code: OnboardingSessionEventCommandErrorCode,
    message: string
  ) {
    super(message);
    this.name =
      "OnboardingSessionEventCommandError";
    this.code = code;
  }
}

/*
 * Every append/rotation operation first locks the
 * immutable session row in statement 1.
 *
 * Statement 2 therefore starts with a fresh
 * READ COMMITTED statement snapshot after any
 * concurrent operation holding the same session
 * lock has completed.
 */
const LOCK_SESSION_SQL = `
SELECT
  session_id
FROM hbce_onboarding_sessions
WHERE session_id = $1
FOR UPDATE
`;

const APPEND_CONTACT_VERIFICATION_EVENT_SQL = `
WITH session_state AS (
  SELECT
    session_id,
    issued_state,
    issued_at,
    absolute_expires_at
  FROM hbce_onboarding_sessions
  WHERE session_id = $1
    AND issued_state = 'STARTED'
),
latest_event AS (
  SELECT
    event_seq,
    event_hash
  FROM hbce_onboarding_session_events
  WHERE session_id = $1
  ORDER BY event_seq DESC
  LIMIT 1
),
eligible AS (
  SELECT
    session_state.session_id,
    latest_event.event_seq,
    latest_event.event_hash
      AS previous_event_hash
  FROM session_state
  CROSS JOIN latest_event
  WHERE
    session_state.absolute_expires_at >
      $5::timestamptz
    AND (
      COALESCE(
        (
          SELECT max(activity.occurred_at)
          FROM hbce_onboarding_session_events
            AS activity
          WHERE activity.session_id =
                session_state.session_id
            AND activity.event_type =
                'SESSION_ACTIVITY'
        ),
        session_state.issued_at
      )
      + interval '1800 seconds'
    ) > $5::timestamptz
    AND NOT EXISTS (
      SELECT 1
      FROM hbce_onboarding_session_events
        AS terminal
      WHERE terminal.session_id =
            session_state.session_id
        AND terminal.event_type IN (
          'SESSION_ROTATED',
          'SESSION_REVOKED',
          'SESSION_EXPIRED'
        )
    )
    AND NOT EXISTS (
      SELECT 1
      FROM hbce_onboarding_session_events
        AS duplicate
      WHERE duplicate.session_id =
            session_state.session_id
        AND duplicate.event_type = $3
    )
),
derived AS (
  SELECT
    session_id,
    event_seq + 1 AS next_event_seq,
    previous_event_hash,
    encode(
      sha256(
        convert_to(
          'HBCE_SESSION_EVENT_HASH_V1'
          || E'\n'
          || (event_seq + 1)::text
          || E'\n'
          || previous_event_hash
          || E'\n'
          || $4,
          'UTF8'
        )
      ),
      'hex'
    ) AS event_hash
  FROM eligible
)
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
  $2,
  session_id,
  next_event_seq,
  $3,
  previous_event_hash,
  event_hash,
  $4,
  $5::timestamptz,
  $6::timestamptz
FROM derived
RETURNING
  event_id,
  session_id,
  event_seq,
  event_type,
  previous_event_hash,
  event_hash,
  event_payload_sha256,
  occurred_at,
  created_at
`

const ROTATE_CONTACT_VERIFIED_SQL = `
WITH source_session AS (
  SELECT
    session_id,
    onboarding_id,
    subject_id,
    issued_state,
    issued_at,
    absolute_expires_at
  FROM hbce_onboarding_sessions
  WHERE session_id = $1
    AND issued_state = 'STARTED'
),
latest_event AS (
  SELECT
    event_seq,
    event_hash
  FROM hbce_onboarding_session_events
  WHERE session_id = $1
  ORDER BY event_seq DESC
  LIMIT 1
),
eligible AS (
  SELECT
    source_session.session_id,
    source_session.onboarding_id,
    source_session.subject_id,
    latest_event.event_seq,
    latest_event.event_hash
      AS previous_event_hash
  FROM source_session
  CROSS JOIN latest_event
  WHERE
    source_session.absolute_expires_at >
      $4::timestamptz
    AND (
      COALESCE(
        (
          SELECT max(activity.occurred_at)
          FROM hbce_onboarding_session_events
            AS activity
          WHERE activity.session_id =
                source_session.session_id
            AND activity.event_type =
                'SESSION_ACTIVITY'
        ),
        source_session.issued_at
      )
      + interval '1800 seconds'
    ) > $4::timestamptz
    AND NOT EXISTS (
      SELECT 1
      FROM hbce_onboarding_session_events
        AS terminal
      WHERE terminal.session_id =
            source_session.session_id
        AND terminal.event_type IN (
          'SESSION_ROTATED',
          'SESSION_REVOKED',
          'SESSION_EXPIRED'
        )
    )
    AND EXISTS (
      SELECT 1
      FROM hbce_onboarding_session_events
        AS email_event
      WHERE email_event.session_id =
            source_session.session_id
        AND email_event.event_type =
            'EMAIL_VERIFIED'
    )
    AND EXISTS (
      SELECT 1
      FROM hbce_onboarding_session_events
        AS phone_event
      WHERE phone_event.session_id =
            source_session.session_id
        AND phone_event.event_type =
            'PHONE_VERIFIED'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM hbce_onboarding_session_events
        AS contact_event
      WHERE contact_event.session_id =
            source_session.session_id
        AND contact_event.event_type =
            'CONTACT_VERIFIED'
    )
),
contact_derived AS (
  SELECT
    session_id,
    onboarding_id,
    subject_id,
    event_seq + 1 AS next_event_seq,
    previous_event_hash,
    encode(
      sha256(
        convert_to(
          'HBCE_SESSION_EVENT_HASH_V1'
          || E'\n'
          || (event_seq + 1)::text
          || E'\n'
          || previous_event_hash
          || E'\n'
          || $8,
          'UTF8'
        )
      ),
      'hex'
    ) AS event_hash
  FROM eligible
),
inserted_contact_verified AS (
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
    $7,
    session_id,
    next_event_seq,
    'CONTACT_VERIFIED',
    previous_event_hash,
    event_hash,
    $8,
    $4::timestamptz,
    $6::timestamptz
  FROM contact_derived
  RETURNING
    session_id,
    event_seq,
    event_hash
),
rotated_derived AS (
  SELECT
    contact.session_id,
    contact.event_seq + 1
      AS next_event_seq,
    contact.event_hash
      AS previous_event_hash,
    encode(
      sha256(
        convert_to(
          'HBCE_SESSION_EVENT_HASH_V1'
          || E'\n'
          || (contact.event_seq + 1)::text
          || E'\n'
          || contact.event_hash
          || E'\n'
          || $10,
          'UTF8'
        )
      ),
      'hex'
    ) AS event_hash
  FROM inserted_contact_verified
    AS contact
),
inserted_rotated AS (
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
    $9,
    session_id,
    next_event_seq,
    'SESSION_ROTATED',
    previous_event_hash,
    event_hash,
    $10,
    $4::timestamptz,
    $6::timestamptz
  FROM rotated_derived
  RETURNING session_id
),
inserted_new_session AS (
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
    $2,
    eligible.onboarding_id,
    eligible.subject_id,
    $3,
    'CONTACT_VERIFIED',
    $4::timestamptz,
    $5::timestamptz,
    eligible.session_id,
    $6::timestamptz
  FROM eligible
  JOIN inserted_rotated AS rotated
    ON rotated.session_id =
       eligible.session_id
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
inserted_new_session_created AS (
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
    $11,
    session_id,
    0,
    'SESSION_CREATED',
    NULL,
    $13,
    $12,
    $4::timestamptz,
    $6::timestamptz
  FROM inserted_new_session
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
FROM inserted_new_session AS session
JOIN inserted_new_session_created AS created
  ON created.session_id =
     session.session_id
`

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
    throw new OnboardingSessionEventCommandError(
      "DATABASE_URL_MISSING",
      "DATABASE_URL is required when onboarding session event commands are first used."
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

function assertNormalizedIso(
  value: string,
  field: string
): void {
  const parsed = new Date(value);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString() !== value
  ) {
    throw new OnboardingSessionEventCommandError(
      "INVALID_INPUT",
      `${field} must be a normalized ISO date-time.`
    );
  }
}

function readIso(
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

function assertCommonEventInput(
  input: RecordContactVerificationEventInput
): void {
  for (const [field, value] of [
    ["sessionId", input.sessionId]
  ] as const) {
    if (!isNonEmptyString(value)) {
      throw new OnboardingSessionEventCommandError(
        "INVALID_INPUT",
        `${field} must be a non-empty string.`
      );
    }
  }

  if (
    input.eventType !== "EMAIL_VERIFIED" &&
    input.eventType !== "PHONE_VERIFIED"
  ) {
    throw new OnboardingSessionEventCommandError(
      "INVALID_INPUT",
      "Only EMAIL_VERIFIED or PHONE_VERIFIED may be recorded by this command."
    );
  }

  assertNormalizedIso(
    input.occurredAt,
    "occurredAt"
  );

  assertNormalizedIso(
    input.createdAt,
    "createdAt"
  );

  if (
    new Date(input.createdAt).getTime() <
    new Date(input.occurredAt).getTime()
  ) {
    throw new OnboardingSessionEventCommandError(
      "INVALID_INPUT",
      "createdAt must not precede occurredAt."
    );
  }
}

const ROTATE_STARTED_SQL = `
WITH source_session AS (
  SELECT
    session_id,
    onboarding_id,
    subject_id,
    issued_state,
    issued_at,
    absolute_expires_at
  FROM hbce_onboarding_sessions
  WHERE session_id = $1
    AND issued_state = 'STARTED'
),
latest_event AS (
  SELECT
    event_seq,
    event_hash
  FROM hbce_onboarding_session_events
  WHERE session_id = $1
  ORDER BY event_seq DESC
  LIMIT 1
),
eligible AS (
  SELECT
    source_session.session_id,
    source_session.onboarding_id,
    source_session.subject_id,
    latest_event.event_seq,
    latest_event.event_hash
      AS previous_event_hash,

    EXISTS (
      SELECT 1
      FROM hbce_onboarding_session_events
        AS factor
      WHERE factor.session_id =
            source_session.session_id
        AND factor.event_type =
            'EMAIL_VERIFIED'
    ) AS has_email_verified,

    EXISTS (
      SELECT 1
      FROM hbce_onboarding_session_events
        AS factor
      WHERE factor.session_id =
            source_session.session_id
        AND factor.event_type =
            'PHONE_VERIFIED'
    ) AS has_phone_verified

  FROM source_session
  CROSS JOIN latest_event
  WHERE
    source_session.absolute_expires_at >
      $4::timestamptz
    AND (
      COALESCE(
        (
          SELECT max(activity.occurred_at)
          FROM hbce_onboarding_session_events
            AS activity
          WHERE activity.session_id =
                source_session.session_id
            AND activity.event_type =
                'SESSION_ACTIVITY'
        ),
        source_session.issued_at
      )
      + interval '1800 seconds'
    ) <= $4::timestamptz
    AND NOT EXISTS (
      SELECT 1
      FROM hbce_onboarding_session_events
        AS terminal
      WHERE terminal.session_id =
            source_session.session_id
        AND terminal.event_type IN (
          'SESSION_ROTATED',
          'SESSION_REVOKED',
          'SESSION_EXPIRED'
        )
    )
),
rotated_derived AS (
  SELECT
    eligible.session_id,
    eligible.event_seq + 1
      AS next_event_seq,
    eligible.previous_event_hash,

    encode(
      sha256(
        convert_to(
          'HBCE_SESSION_EVENT_HASH_V1'
          || E'\n'
          || (
            eligible.event_seq + 1
          )::text
          || E'\n'
          || eligible.previous_event_hash
          || E'\n'
          || $8,
          'UTF8'
        )
      ),
      'hex'
    ) AS event_hash

  FROM eligible
),
inserted_rotated AS (
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
    $7,
    session_id,
    next_event_seq,
    'SESSION_ROTATED',
    previous_event_hash,
    event_hash,
    $8,
    $4::timestamptz,
    $6::timestamptz
  FROM rotated_derived
  RETURNING session_id
),
inserted_new_session AS (
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
    $2,
    eligible.onboarding_id,
    eligible.subject_id,
    $3,
    'STARTED',
    $4::timestamptz,
    $5::timestamptz,
    eligible.session_id,
    $6::timestamptz
  FROM eligible
  JOIN inserted_rotated AS rotated
    ON rotated.session_id =
       eligible.session_id
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
inserted_new_session_created AS (
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
    $9,
    session_id,
    0,
    'SESSION_CREATED',
    NULL,
    $11,
    $10,
    $4::timestamptz,
    $6::timestamptz
  FROM inserted_new_session
  RETURNING
    session_id,
    event_hash
),
email_carry_derived AS (
  SELECT
    session.session_id,
    1::bigint
      AS event_seq,
    created.event_hash
      AS previous_event_hash,

    encode(
      sha256(
        convert_to(
          'HBCE_SESSION_EVENT_HASH_V1'
          || E'\n'
          || '1'
          || E'\n'
          || created.event_hash
          || E'\n'
          || $13,
          'UTF8'
        )
      ),
      'hex'
    ) AS event_hash

  FROM inserted_new_session
    AS session

  JOIN inserted_new_session_created
    AS created
    ON created.session_id =
       session.session_id

  JOIN eligible
    ON eligible.session_id =
       session.rotated_from_session_id

  WHERE eligible.has_email_verified
),
inserted_email_carry AS (
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
    $12,
    session_id,
    event_seq,
    'EMAIL_VERIFIED',
    previous_event_hash,
    event_hash,
    $13,
    $4::timestamptz,
    $6::timestamptz
  FROM email_carry_derived
  RETURNING
    session_id,
    event_hash
),
phone_carry_derived AS (
  SELECT
    session.session_id,

    CASE
      WHEN eligible.has_email_verified
        THEN 2::bigint
      ELSE 1::bigint
    END AS event_seq,

    COALESCE(
      email.event_hash,
      created.event_hash
    ) AS previous_event_hash,

    encode(
      sha256(
        convert_to(
          'HBCE_SESSION_EVENT_HASH_V1'
          || E'\n'
          || (
            CASE
              WHEN eligible.has_email_verified
                THEN 2
              ELSE 1
            END
          )::text
          || E'\n'
          || COALESCE(
            email.event_hash,
            created.event_hash
          )
          || E'\n'
          || $15,
          'UTF8'
        )
      ),
      'hex'
    ) AS event_hash

  FROM inserted_new_session
    AS session

  JOIN inserted_new_session_created
    AS created
    ON created.session_id =
       session.session_id

  JOIN eligible
    ON eligible.session_id =
       session.rotated_from_session_id

  LEFT JOIN inserted_email_carry
    AS email
    ON email.session_id =
       session.session_id

  WHERE eligible.has_phone_verified
),
inserted_phone_carry AS (
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
    $14,
    session_id,
    event_seq,
    'PHONE_VERIFIED',
    previous_event_hash,
    event_hash,
    $15,
    $4::timestamptz,
    $6::timestamptz
  FROM phone_carry_derived
  RETURNING
    session_id
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
FROM inserted_new_session AS session
JOIN inserted_new_session_created AS created
  ON created.session_id =
     session.session_id
LEFT JOIN inserted_email_carry AS email_carry
  ON email_carry.session_id =
     session.session_id
LEFT JOIN inserted_phone_carry AS phone_carry
  ON phone_carry.session_id =
     session.session_id
`;

function assertStartedRotationInput(
  input: RotateStartedSessionInput
): void {
  for (const [field, value] of [
    ["sourceSessionId", input.sourceSessionId],
    ["newSessionId", input.newSessionId]
  ] as const) {
    if (!isNonEmptyString(value)) {
      throw new OnboardingSessionEventCommandError(
        "INVALID_INPUT",
        `${field} must be a non-empty string.`
      );
    }
  }

  if (
    input.sourceSessionId === input.newSessionId
  ) {
    throw new OnboardingSessionEventCommandError(
      "INVALID_INPUT",
      "A rotated session must receive a new session identifier."
    );
  }

  if (!isSha256Hex(input.newTokenSha256)) {
    throw new OnboardingSessionEventCommandError(
      "INVALID_INPUT",
      "newTokenSha256 must be a lowercase SHA-256 hexadecimal digest."
    );
  }

  assertNormalizedIso(
    input.issuedAt,
    "issuedAt"
  );

  assertNormalizedIso(
    input.absoluteExpiresAt,
    "absoluteExpiresAt"
  );

  assertNormalizedIso(
    input.createdAt,
    "createdAt"
  );

  const issuedAtMs =
    new Date(input.issuedAt).getTime();

  const expiresAtMs =
    new Date(
      input.absoluteExpiresAt
    ).getTime();

  if (
    expiresAtMs - issuedAtMs !==
    ONBOARDING_SESSION_ABSOLUTE_TTL_SECONDS *
      1000
  ) {
    throw new OnboardingSessionEventCommandError(
      "INVALID_INPUT",
      "Rotated STARTED session absolute expiry must equal issuance plus exactly 28800 seconds."
    );
  }

  if (
    new Date(input.createdAt).getTime() <
    issuedAtMs
  ) {
    throw new OnboardingSessionEventCommandError(
      "INVALID_INPUT",
      "createdAt must not precede issuedAt."
    );
  }
}

function mapStartedRotationSession(
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
  const issuedAt = readIso(row.issued_at);
  const absoluteExpiresAt =
    readIso(row.absolute_expires_at);
  const rotatedFromSessionId =
    row.rotated_from_session_id;
  const createdAt = readIso(row.created_at);

  if (
    !isNonEmptyString(sessionId) ||
    !isNonEmptyString(onboardingId) ||
    !isNonEmptyString(subjectId) ||
    !isSha256Hex(tokenSha256) ||
    issuedState !== "STARTED" ||
    !issuedAt ||
    !absoluteExpiresAt ||
    !isNonEmptyString(rotatedFromSessionId) ||
    !createdAt
  ) {
    throw new OnboardingSessionEventCommandError(
      "INVALID_DATABASE_RESULT",
      "Neon returned invalid rotated STARTED onboarding session data."
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

function assertRotationInput(
  input: RotateContactVerifiedSessionInput
): void {
  for (const [field, value] of [
    ["sourceSessionId", input.sourceSessionId],
    ["newSessionId", input.newSessionId]
  ] as const) {
    if (!isNonEmptyString(value)) {
      throw new OnboardingSessionEventCommandError(
        "INVALID_INPUT",
        `${field} must be a non-empty string.`
      );
    }
  }

  if (
    input.sourceSessionId === input.newSessionId
  ) {
    throw new OnboardingSessionEventCommandError(
      "INVALID_INPUT",
      "A rotated session must receive a new session identifier."
    );
  }

  if (!isSha256Hex(input.newTokenSha256)) {
    throw new OnboardingSessionEventCommandError(
      "INVALID_INPUT",
      "newTokenSha256 must be a lowercase SHA-256 hexadecimal digest."
    );
  }

  assertNormalizedIso(
    input.issuedAt,
    "issuedAt"
  );

  assertNormalizedIso(
    input.absoluteExpiresAt,
    "absoluteExpiresAt"
  );

  assertNormalizedIso(
    input.createdAt,
    "createdAt"
  );

  const issuedAtMs =
    new Date(input.issuedAt).getTime();

  const expiresAtMs =
    new Date(
      input.absoluteExpiresAt
    ).getTime();

  if (
    expiresAtMs - issuedAtMs !==
    ONBOARDING_SESSION_ABSOLUTE_TTL_SECONDS *
      1000
  ) {
    throw new OnboardingSessionEventCommandError(
      "INVALID_INPUT",
      "Rotated session absolute expiry must equal issuance plus exactly 28800 seconds."
    );
  }

  if (
    new Date(input.createdAt).getTime() <
    issuedAtMs
  ) {
    throw new OnboardingSessionEventCommandError(
      "INVALID_INPUT",
      "createdAt must not precede issuedAt."
    );
  }
}

function assertLockedSession(
  row: OnboardingSessionQueryRow | undefined,
  sessionId: string
): void {
  if (!row) {
    throw new OnboardingSessionEventCommandError(
      "SESSION_NOT_FOUND",
      "The onboarding session does not exist."
    );
  }

  if (row.session_id !== sessionId) {
    throw new OnboardingSessionEventCommandError(
      "INVALID_DATABASE_RESULT",
      "The locked session does not match the requested session identifier."
    );
  }
}

function mapEvent(
  row: OnboardingSessionQueryRow | undefined
): OnboardingSessionEventRecord | null {
  if (!row) {
    return null;
  }

  const eventId = row.event_id;
  const sessionId = row.session_id;
  const eventSeqValue = row.event_seq;
  const eventType = row.event_type;
  const previousEventHash =
    row.previous_event_hash;
  const eventHash = row.event_hash;
  const eventPayloadSha256 =
    row.event_payload_sha256;

  const occurredAt = readIso(
    row.occurred_at
  );

  const createdAt = readIso(
    row.created_at
  );

  const eventSeq =
    typeof eventSeqValue === "bigint"
      ? Number(eventSeqValue)
      : typeof eventSeqValue === "string"
        ? Number(eventSeqValue)
        : eventSeqValue;

  if (
    !isNonEmptyString(eventId) ||
    !isNonEmptyString(sessionId) ||
    !Number.isSafeInteger(eventSeq) ||
    typeof eventSeq !== "number" ||
    eventSeq < 1 ||
    !(
      eventType === "EMAIL_VERIFIED" ||
      eventType === "PHONE_VERIFIED"
    ) ||
    !isSha256LowerHex(previousEventHash) ||
    !isSha256LowerHex(eventHash) ||
    !isSha256LowerHex(eventPayloadSha256) ||
    !occurredAt ||
    !createdAt
  ) {
    throw new OnboardingSessionEventCommandError(
      "INVALID_DATABASE_RESULT",
      "Neon returned invalid onboarding session event data."
    );
  }

  return {
    eventId,
    sessionId,
    eventSeq,
    eventType,
    previousEventHash,
    eventHash,
    eventPayloadSha256,
    occurredAt,
    createdAt
  };
}

function mapSession(
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
  const issuedAt = readIso(row.issued_at);
  const absoluteExpiresAt =
    readIso(row.absolute_expires_at);
  const rotatedFromSessionId =
    row.rotated_from_session_id;
  const createdAt = readIso(row.created_at);

  if (
    !isNonEmptyString(sessionId) ||
    !isNonEmptyString(onboardingId) ||
    !isNonEmptyString(subjectId) ||
    !isSha256Hex(tokenSha256) ||
    issuedState !== "CONTACT_VERIFIED" ||
    !issuedAt ||
    !absoluteExpiresAt ||
    !isNonEmptyString(rotatedFromSessionId) ||
    !createdAt
  ) {
    throw new OnboardingSessionEventCommandError(
      "INVALID_DATABASE_RESULT",
      "Neon returned invalid rotated onboarding session data."
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

function mapDatabaseError(
  error: unknown
): never {
  if (
    error instanceof
    OnboardingSessionEventCommandError
  ) {
    throw error;
  }

  if (
    error instanceof
    OnboardingSessionEventCryptoError
  ) {
    throw new OnboardingSessionEventCommandError(
      "INVALID_INPUT",
      error.message
    );
  }

  if (error instanceof Error) {
    const databaseError = error as Error & {
      code?: string;
    };

    if (databaseError.code === "23505") {
      throw new OnboardingSessionEventCommandError(
        "EVENT_CONFLICT",
        "Session event, session identifier or token digest conflicts with existing evidence."
      );
    }
  }

  throw error;
}

export class NeonOnboardingSessionEventCommands
  implements OnboardingSessionEventCommands
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

  async recordContactVerificationEvent(
    input: RecordContactVerificationEventInput
  ): Promise<OnboardingSessionEventRecord> {
    assertCommonEventInput(input);

    try {
      const eventId =
        generateOnboardingSessionEventId();

      const eventPayloadSha256 =
        await createOnboardingSessionEventPayloadSha256({
          eventId,
          sessionId: input.sessionId,
          eventType: input.eventType,
          occurredAt: input.occurredAt,
          payload: input.payload
        });

      const results =
        await this.executor.transaction(
          [
            {
              query: LOCK_SESSION_SQL,
              parameters: [input.sessionId]
            },
            {
              query:
                APPEND_CONTACT_VERIFICATION_EVENT_SQL,
              parameters: [
                input.sessionId,
                eventId,
                input.eventType,
                eventPayloadSha256,
                input.occurredAt,
                input.createdAt
              ]
            }
          ],
          {
            isolationLevel: "ReadCommitted",
            readOnly: false
          }
        );

      const lockedRows = results[0];
      const eventRows = results[1];

      assertLockedSession(
        lockedRows?.[0],
        input.sessionId
      );

      const event = mapEvent(
        eventRows?.[0]
      );

      if (!event) {
        throw new OnboardingSessionEventCommandError(
          "EVENT_COMMAND_DENIED",
          "Verification evidence event was denied by session state, expiry, duplication or terminal-state policy."
        );
      }

      return event;
    } catch (error) {
      return mapDatabaseError(error);
    }
  }
  async rotateStartedSession(
    input: RotateStartedSessionInput
  ): Promise<OnboardingSessionRecord> {
    assertStartedRotationInput(input);

    try {
      const rotatedEventId =
        generateOnboardingSessionEventId();

      const newSessionCreatedEventId =
        generateOnboardingSessionEventId();

      const carriedEmailEventId =
        generateOnboardingSessionEventId();

      const carriedPhoneEventId =
        generateOnboardingSessionEventId();

      const rotatedPayloadSha256 =
        await createOnboardingSessionEventPayloadSha256({
          eventId:
            rotatedEventId,
          sessionId:
            input.sourceSessionId,
          eventType:
            "SESSION_ROTATED",
          occurredAt:
            input.issuedAt,
          payload:
            input.rotatedPayload
        });

      const newSessionCreatedPayloadSha256 =
        await createOnboardingSessionEventPayloadSha256({
          eventId:
            newSessionCreatedEventId,
          sessionId:
            input.newSessionId,
          eventType:
            "SESSION_CREATED",
          occurredAt:
            input.issuedAt,
          payload:
            input.newSessionCreatedPayload
        });

      const newSessionCreatedEventHash =
        await createOnboardingSessionEventHash({
          eventSeq: 0,
          previousEventHash: null,
          eventPayloadSha256:
            newSessionCreatedPayloadSha256
        });

      const carriedEmailPayloadSha256 =
        await createOnboardingSessionEventPayloadSha256({
          eventId:
            carriedEmailEventId,
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

      const carriedPhonePayloadSha256 =
        await createOnboardingSessionEventPayloadSha256({
          eventId:
            carriedPhoneEventId,
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

      const results =
        await this.executor.transaction(
          [
            {
              query:
                LOCK_SESSION_SQL,
              parameters: [
                input.sourceSessionId
              ]
            },
            {
              query:
                ROTATE_STARTED_SQL,
              parameters: [
                input.sourceSessionId,
                input.newSessionId,
                input.newTokenSha256,
                input.issuedAt,
                input.absoluteExpiresAt,
                input.createdAt,
                rotatedEventId,
                rotatedPayloadSha256,
                newSessionCreatedEventId,
                newSessionCreatedPayloadSha256,
                newSessionCreatedEventHash,
                carriedEmailEventId,
                carriedEmailPayloadSha256,
                carriedPhoneEventId,
                carriedPhonePayloadSha256
              ]
            }
          ],
          {
            isolationLevel:
              "ReadCommitted",
            readOnly: false
          }
        );

      const lockedRows =
        results[0];

      const rotatedRows =
        results[1];

      assertLockedSession(
        lockedRows?.[0],
        input.sourceSessionId
      );

      const session =
        mapStartedRotationSession(
          rotatedRows?.[0]
        );

      if (!session) {
        throw new OnboardingSessionEventCommandError(
          "ROTATION_DENIED",
          "STARTED recovery rotation requires one idle-expired, non-terminal STARTED session before absolute expiry."
        );
      }

      return session;
    } catch (error) {
      return mapDatabaseError(
        error
      );
    }
  }

async rotateToContactVerified(
    input: RotateContactVerifiedSessionInput
  ): Promise<OnboardingSessionRecord> {
    assertRotationInput(input);

    try {
      const contactVerifiedEventId =
        generateOnboardingSessionEventId();

      const rotatedEventId =
        generateOnboardingSessionEventId();

      const newSessionCreatedEventId =
        generateOnboardingSessionEventId();

      const contactVerifiedPayloadSha256 =
        await createOnboardingSessionEventPayloadSha256({
          eventId: contactVerifiedEventId,
          sessionId: input.sourceSessionId,
          eventType: "CONTACT_VERIFIED",
          occurredAt: input.issuedAt,
          payload:
            input.contactVerifiedPayload
        });

      const rotatedPayloadSha256 =
        await createOnboardingSessionEventPayloadSha256({
          eventId: rotatedEventId,
          sessionId: input.sourceSessionId,
          eventType: "SESSION_ROTATED",
          occurredAt: input.issuedAt,
          payload:
            input.rotatedPayload
        });

      const newSessionCreatedPayloadSha256 =
        await createOnboardingSessionEventPayloadSha256({
          eventId:
            newSessionCreatedEventId,
          sessionId: input.newSessionId,
          eventType: "SESSION_CREATED",
          occurredAt: input.issuedAt,
          payload:
            input.newSessionCreatedPayload
        });

      const newSessionCreatedEventHash =
        await createOnboardingSessionEventHash({
          eventSeq: 0,
          previousEventHash: null,
          eventPayloadSha256:
            newSessionCreatedPayloadSha256
        });

      const results =
        await this.executor.transaction(
          [
            {
              query: LOCK_SESSION_SQL,
              parameters: [
                input.sourceSessionId
              ]
            },
            {
              query:
                ROTATE_CONTACT_VERIFIED_SQL,
              parameters: [
                input.sourceSessionId,
                input.newSessionId,
                input.newTokenSha256,
                input.issuedAt,
                input.absoluteExpiresAt,
                input.createdAt,
                contactVerifiedEventId,
                contactVerifiedPayloadSha256,
                rotatedEventId,
                rotatedPayloadSha256,
                newSessionCreatedEventId,
                newSessionCreatedPayloadSha256,
                newSessionCreatedEventHash
              ]
            }
          ],
          {
            isolationLevel: "ReadCommitted",
            readOnly: false
          }
        );

      const lockedRows = results[0];
      const rotatedRows = results[1];

      assertLockedSession(
        lockedRows?.[0],
        input.sourceSessionId
      );

      const session = mapSession(
        rotatedRows?.[0]
      );

      if (!session) {
        throw new OnboardingSessionEventCommandError(
          "ROTATION_DENIED",
          "CONTACT_VERIFIED rotation requires one active STARTED session with both email and phone verification evidence."
        );
      }

      return session;
    } catch (error) {
      return mapDatabaseError(error);
    }
  }
}

export function createNeonOnboardingSessionEventCommands(
  executor?: OnboardingSessionDatabaseExecutor
): OnboardingSessionEventCommands {
  return new NeonOnboardingSessionEventCommands(
    executor
  );
}
