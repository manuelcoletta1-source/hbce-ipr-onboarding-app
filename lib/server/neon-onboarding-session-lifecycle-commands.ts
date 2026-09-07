import "server-only";

import { neon } from "@neondatabase/serverless";

import {
  OnboardingSessionEventCryptoError,
  createOnboardingSessionEventPayloadSha256,
  generateOnboardingSessionEventId,
  isSha256LowerHex,
  type OnboardingSessionEventPayload
} from "@/lib/server/onboarding-session-event-crypto";

import type {
  OnboardingSessionDatabaseExecutor,
  OnboardingSessionQueryRow
} from "@/lib/server/neon-onboarding-session-repository";

export const ONBOARDING_SESSION_ACTIVITY_MIN_INTERVAL_SECONDS =
  300 as const;

export type OnboardingSessionLifecycleEventType =
  | "SESSION_ACTIVITY"
  | "SESSION_REVOKED"
  | "SESSION_EXPIRED";

export type OnboardingSessionLifecycleEvent = {
  readonly eventId: string;
  readonly sessionId: string;
  readonly eventSeq: number;
  readonly eventType:
    OnboardingSessionLifecycleEventType;
  readonly previousEventHash: string;
  readonly eventHash: string;
  readonly eventPayloadSha256: string;
  readonly occurredAt: string;
  readonly createdAt: string;
};

export type AppendLifecycleEventInput = {
  readonly sessionId: string;
  readonly occurredAt: string;
  readonly createdAt: string;
  readonly payload:
    OnboardingSessionEventPayload;
};

export type SessionActivityResult =
  | {
      readonly status: "APPENDED";
      readonly event:
        OnboardingSessionLifecycleEvent;
    }
  | {
      readonly status:
        "SKIPPED_THROTTLE";
      readonly event: null;
    };

export interface OnboardingSessionLifecycleCommands {
  recordActivity(
    input: AppendLifecycleEventInput
  ): Promise<SessionActivityResult>;

  revokeSession(
    input: AppendLifecycleEventInput
  ): Promise<OnboardingSessionLifecycleEvent>;

  expireSession(
    input: AppendLifecycleEventInput
  ): Promise<OnboardingSessionLifecycleEvent>;
}

export type OnboardingSessionLifecycleCommandErrorCode =
  | "DATABASE_URL_MISSING"
  | "INVALID_INPUT"
  | "SESSION_NOT_FOUND"
  | "ACTIVITY_DENIED"
  | "REVOCATION_DENIED"
  | "EXPIRY_DENIED"
  | "EVENT_CONFLICT"
  | "INVALID_DATABASE_RESULT";

export class OnboardingSessionLifecycleCommandError
  extends Error
{
  readonly code:
    OnboardingSessionLifecycleCommandErrorCode;

  constructor(
    code:
      OnboardingSessionLifecycleCommandErrorCode,
    message: string
  ) {
    super(message);
    this.name =
      "OnboardingSessionLifecycleCommandError";
    this.code = code;
  }
}

const LOCK_SESSION_SQL = `
SELECT session_id
FROM hbce_onboarding_sessions
WHERE session_id = $1
FOR UPDATE
`;

const APPEND_ACTIVITY_SQL = `
WITH session_state AS (
  SELECT
    session_id,
    issued_at,
    absolute_expires_at
  FROM hbce_onboarding_sessions
  WHERE session_id = $1
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
latest_activity AS (
  SELECT max(occurred_at) AS occurred_at
  FROM hbce_onboarding_session_events
  WHERE session_id = $1
    AND event_type = 'SESSION_ACTIVITY'
),
evaluated AS (
  SELECT
    session_state.session_id,
    latest_event.event_seq,
    latest_event.event_hash
      AS previous_event_hash,

    (
      $4::timestamptz >=
        session_state.issued_at
      AND
      session_state.absolute_expires_at >
        $4::timestamptz
      AND
      COALESCE(
        latest_activity.occurred_at,
        session_state.issued_at
      ) <= $4::timestamptz
      AND
      (
        COALESCE(
          latest_activity.occurred_at,
          session_state.issued_at
        )
        + interval '1800 seconds'
      ) > $4::timestamptz
      AND
      NOT EXISTS (
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
    ) AS active,

    (
      latest_activity.occurred_at
        IS NOT NULL
      AND
      latest_activity.occurred_at
        + interval '300 seconds'
        > $4::timestamptz
    ) AS throttled

  FROM session_state
  CROSS JOIN latest_event
  CROSS JOIN latest_activity
),
derived AS (
  SELECT
    session_id,
    event_seq + 1
      AS next_event_seq,
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
          || $3,
          'UTF8'
        )
      ),
      'hex'
    ) AS event_hash
  FROM evaluated
  WHERE active
    AND NOT throttled
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
    $2,
    session_id,
    next_event_seq,
    'SESSION_ACTIVITY',
    previous_event_hash,
    event_hash,
    $3,
    $4::timestamptz,
    $5::timestamptz
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
)
SELECT
  'APPENDED'::text
    AS command_status,
  event_id,
  session_id,
  event_seq,
  event_type,
  previous_event_hash,
  event_hash,
  event_payload_sha256,
  occurred_at,
  created_at
FROM inserted_event

UNION ALL

SELECT
  'SKIPPED_THROTTLE'::text
    AS command_status,
  NULL::text,
  NULL::text,
  NULL::bigint,
  NULL::text,
  NULL::text,
  NULL::text,
  NULL::text,
  NULL::timestamptz,
  NULL::timestamptz
WHERE NOT EXISTS (
  SELECT 1
  FROM inserted_event
)
AND EXISTS (
  SELECT 1
  FROM evaluated
  WHERE active
    AND throttled
)

UNION ALL

SELECT
  'DENIED'::text
    AS command_status,
  NULL::text,
  NULL::text,
  NULL::bigint,
  NULL::text,
  NULL::text,
  NULL::text,
  NULL::text,
  NULL::timestamptz,
  NULL::timestamptz
WHERE NOT EXISTS (
  SELECT 1
  FROM inserted_event
)
AND NOT EXISTS (
  SELECT 1
  FROM evaluated
  WHERE active
    AND throttled
)
`;

const APPEND_REVOCATION_SQL = `
WITH session_state AS (
  SELECT
    session_id,
    issued_at
  FROM hbce_onboarding_sessions
  WHERE session_id = $1
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
    $4::timestamptz >=
      session_state.issued_at
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
),
derived AS (
  SELECT
    session_id,
    event_seq + 1
      AS next_event_seq,
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
          || $3,
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
  'SESSION_REVOKED',
  previous_event_hash,
  event_hash,
  $3,
  $4::timestamptz,
  $5::timestamptz
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
`;

const APPEND_EXPIRY_SQL = `
WITH session_state AS (
  SELECT
    session_id,
    issued_at,
    absolute_expires_at
  FROM hbce_onboarding_sessions
  WHERE session_id = $1
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
latest_activity AS (
  SELECT max(occurred_at) AS occurred_at
  FROM hbce_onboarding_session_events
  WHERE session_id = $1
    AND event_type = 'SESSION_ACTIVITY'
),
eligible AS (
  SELECT
    session_state.session_id,
    latest_event.event_seq,
    latest_event.event_hash
      AS previous_event_hash
  FROM session_state
  CROSS JOIN latest_event
  CROSS JOIN latest_activity
  WHERE
    $4::timestamptz >=
      session_state.issued_at
    AND (
      session_state.absolute_expires_at
        <= $4::timestamptz
      OR
      (
        COALESCE(
          latest_activity.occurred_at,
          session_state.issued_at
        )
        + interval '1800 seconds'
      ) <= $4::timestamptz
    )
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
),
derived AS (
  SELECT
    session_id,
    event_seq + 1
      AS next_event_seq,
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
          || $3,
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
  'SESSION_EXPIRED',
  previous_event_hash,
  event_hash,
  $3,
  $4::timestamptz,
  $5::timestamptz
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
`;

let defaultExecutor:
  OnboardingSessionDatabaseExecutor | null =
    null;

function getDefaultExecutor():
  OnboardingSessionDatabaseExecutor
{
  if (defaultExecutor) {
    return defaultExecutor;
  }

  const connectionString =
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new OnboardingSessionLifecycleCommandError(
      "DATABASE_URL_MISSING",
      "DATABASE_URL is required when onboarding session lifecycle commands are first used."
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

function readIso(
  value: unknown
): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (!isNonEmptyString(value)) {
    return null;
  }

  const parsed =
    new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function assertNormalizedIso(
  value: string,
  field: string
): void {
  const parsed =
    new Date(value);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString() !== value
  ) {
    throw new OnboardingSessionLifecycleCommandError(
      "INVALID_INPUT",
      `${field} must be a normalized ISO date-time.`
    );
  }
}

function validateInput(
  input: AppendLifecycleEventInput
): void {
  if (!isNonEmptyString(
    input.sessionId
  )) {
    throw new OnboardingSessionLifecycleCommandError(
      "INVALID_INPUT",
      "sessionId must be a non-empty string."
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
    throw new OnboardingSessionLifecycleCommandError(
      "INVALID_INPUT",
      "createdAt must not precede occurredAt."
    );
  }
}

function assertLockedSession(
  row:
    OnboardingSessionQueryRow | undefined,
  sessionId: string
): void {
  if (!row) {
    throw new OnboardingSessionLifecycleCommandError(
      "SESSION_NOT_FOUND",
      "The onboarding session does not exist."
    );
  }

  if (row.session_id !== sessionId) {
    throw new OnboardingSessionLifecycleCommandError(
      "INVALID_DATABASE_RESULT",
      "The locked onboarding session does not match the requested session."
    );
  }
}

function readEventSeq(
  value: unknown
): number | null {
  const converted =
    typeof value === "bigint"
      ? Number(value)
      : typeof value === "string"
        ? Number(value)
        : value;

  if (
    typeof converted !== "number" ||
    !Number.isSafeInteger(converted) ||
    converted < 1
  ) {
    return null;
  }

  return converted;
}

function mapLifecycleEvent(
  row:
    OnboardingSessionQueryRow | undefined
): OnboardingSessionLifecycleEvent | null {
  if (!row) {
    return null;
  }

  const eventId =
    row.event_id;

  const sessionId =
    row.session_id;

  const eventSeq =
    readEventSeq(row.event_seq);

  const eventType =
    row.event_type;

  const previousEventHash =
    row.previous_event_hash;

  const eventHash =
    row.event_hash;

  const eventPayloadSha256 =
    row.event_payload_sha256;

  const occurredAt =
    readIso(row.occurred_at);

  const createdAt =
    readIso(row.created_at);

  if (
    !isNonEmptyString(eventId) ||
    !isNonEmptyString(sessionId) ||
    eventSeq === null ||
    !(
      eventType === "SESSION_ACTIVITY" ||
      eventType === "SESSION_REVOKED" ||
      eventType === "SESSION_EXPIRED"
    ) ||
    !isSha256LowerHex(
      previousEventHash
    ) ||
    !isSha256LowerHex(
      eventHash
    ) ||
    !isSha256LowerHex(
      eventPayloadSha256
    ) ||
    !occurredAt ||
    !createdAt
  ) {
    throw new OnboardingSessionLifecycleCommandError(
      "INVALID_DATABASE_RESULT",
      "Neon returned invalid session lifecycle evidence."
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

function mapDatabaseError(
  error: unknown
): never {
  if (
    error instanceof
    OnboardingSessionLifecycleCommandError
  ) {
    throw error;
  }

  if (
    error instanceof
    OnboardingSessionEventCryptoError
  ) {
    throw new OnboardingSessionLifecycleCommandError(
      "INVALID_INPUT",
      error.message
    );
  }

  if (error instanceof Error) {
    const databaseError =
      error as Error & {
        code?: string;
      };

    if (databaseError.code === "23505") {
      throw new OnboardingSessionLifecycleCommandError(
        "EVENT_CONFLICT",
        "Session lifecycle evidence conflicts with an existing append-only event."
      );
    }
  }

  throw error;
}

export class NeonOnboardingSessionLifecycleCommands
  implements OnboardingSessionLifecycleCommands
{
  private readonly executor:
    OnboardingSessionDatabaseExecutor;

  constructor(
    executor?:
      OnboardingSessionDatabaseExecutor
  ) {
    this.executor =
      executor ?? {
        query: (...args) =>
          getDefaultExecutor().query(
            ...args
          ),

        transaction: (...args) =>
          getDefaultExecutor().transaction(
            ...args
          )
      };
  }

  async recordActivity(
    input: AppendLifecycleEventInput
  ): Promise<SessionActivityResult> {
    validateInput(input);

    try {
      const eventId =
        generateOnboardingSessionEventId();

      const eventPayloadSha256 =
        await createOnboardingSessionEventPayloadSha256({
          eventId,
          sessionId: input.sessionId,
          eventType:
            "SESSION_ACTIVITY",
          occurredAt:
            input.occurredAt,
          payload:
            input.payload
        });

      const results =
        await this.executor.transaction(
          [
            {
              query: LOCK_SESSION_SQL,
              parameters: [
                input.sessionId
              ]
            },
            {
              query:
                APPEND_ACTIVITY_SQL,
              parameters: [
                input.sessionId,
                eventId,
                eventPayloadSha256,
                input.occurredAt,
                input.createdAt
              ]
            }
          ],
          {
            isolationLevel:
              "ReadCommitted",
            readOnly: false
          }
        );

      assertLockedSession(
        results[0]?.[0],
        input.sessionId
      );

      const resultRow =
        results[1]?.[0];

      if (!resultRow) {
        throw new OnboardingSessionLifecycleCommandError(
          "ACTIVITY_DENIED",
          "Session activity command returned no decision."
        );
      }

      if (
        resultRow.command_status ===
        "SKIPPED_THROTTLE"
      ) {
        return {
          status:
            "SKIPPED_THROTTLE",
          event: null
        };
      }

      if (
        resultRow.command_status !==
        "APPENDED"
      ) {
        throw new OnboardingSessionLifecycleCommandError(
          "ACTIVITY_DENIED",
          "Session activity was denied because the session is inactive, expired or terminal."
        );
      }

      const event =
        mapLifecycleEvent(
          resultRow
        );

      if (
        !event ||
        event.eventType !==
          "SESSION_ACTIVITY"
      ) {
        throw new OnboardingSessionLifecycleCommandError(
          "INVALID_DATABASE_RESULT",
          "Session activity append returned invalid evidence."
        );
      }

      return {
        status: "APPENDED",
        event
      };
    } catch (error) {
      return mapDatabaseError(error);
    }
  }

  async revokeSession(
    input: AppendLifecycleEventInput
  ): Promise<OnboardingSessionLifecycleEvent> {
    return this.appendTerminal(
      input,
      APPEND_REVOCATION_SQL,
      "SESSION_REVOKED",
      "REVOCATION_DENIED"
    );
  }

  async expireSession(
    input: AppendLifecycleEventInput
  ): Promise<OnboardingSessionLifecycleEvent> {
    return this.appendTerminal(
      input,
      APPEND_EXPIRY_SQL,
      "SESSION_EXPIRED",
      "EXPIRY_DENIED"
    );
  }

  private async appendTerminal(
    input:
      AppendLifecycleEventInput,
    query: string,
    expectedEventType:
      | "SESSION_REVOKED"
      | "SESSION_EXPIRED",
    denialCode:
      | "REVOCATION_DENIED"
      | "EXPIRY_DENIED"
  ): Promise<OnboardingSessionLifecycleEvent> {
    validateInput(input);

    try {
      const eventId =
        generateOnboardingSessionEventId();

      const eventPayloadSha256 =
        await createOnboardingSessionEventPayloadSha256({
          eventId,
          sessionId:
            input.sessionId,
          eventType:
            expectedEventType,
          occurredAt:
            input.occurredAt,
          payload:
            input.payload
        });

      const results =
        await this.executor.transaction(
          [
            {
              query: LOCK_SESSION_SQL,
              parameters: [
                input.sessionId
              ]
            },
            {
              query,
              parameters: [
                input.sessionId,
                eventId,
                eventPayloadSha256,
                input.occurredAt,
                input.createdAt
              ]
            }
          ],
          {
            isolationLevel:
              "ReadCommitted",
            readOnly: false
          }
        );

      assertLockedSession(
        results[0]?.[0],
        input.sessionId
      );

      const event =
        mapLifecycleEvent(
          results[1]?.[0]
        );

      if (!event) {
        throw new OnboardingSessionLifecycleCommandError(
          denialCode,
          `${expectedEventType} was denied by session state policy.`
        );
      }

      if (
        event.eventType !==
        expectedEventType
      ) {
        throw new OnboardingSessionLifecycleCommandError(
          "INVALID_DATABASE_RESULT",
          "Session terminal command returned the wrong event type."
        );
      }

      return event;
    } catch (error) {
      return mapDatabaseError(error);
    }
  }
}

export function createNeonOnboardingSessionLifecycleCommands(
  executor?:
    OnboardingSessionDatabaseExecutor
): OnboardingSessionLifecycleCommands {
  return new NeonOnboardingSessionLifecycleCommands(
    executor
  );
}
