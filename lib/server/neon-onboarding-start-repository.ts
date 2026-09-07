import "server-only";

import {
  neon
} from "@neondatabase/serverless";

import {
  ONBOARDING_CANONICAL_SUBJECT_STATE_VERSION,
  type OnboardingCanonicalSubjectState
} from "@/lib/onboarding-canonical-subject-state";

import {
  sha256Canonical,
  stableStringify
} from "@/lib/ipr-certificate-chain";

import {
  OnboardingCanonicalAuditCryptoError,
  createCanonicalAuditEventHash,
  createCanonicalAuditEventPayloadSha256,
  createOnboardingStartCanonicalAuditPayload,
  generateCanonicalAuditEventId
} from "@/lib/server/onboarding-canonical-audit-crypto";

import {
  ONBOARDING_SESSION_ABSOLUTE_TTL_SECONDS
} from "@/lib/server/neon-onboarding-session-repository";

import {
  OnboardingSessionEventCryptoError,
  createOnboardingSessionEventHash,
  createOnboardingSessionEventPayloadSha256,
  generateOnboardingSessionEventId
} from "@/lib/server/onboarding-session-event-crypto";

export type CreateAtomicOnboardingStartInput = {
  readonly idempotencySha256: string;
  readonly tokenSha256: string;
  readonly subjectId: string;
  readonly onboardingId: string;
  readonly sessionId: string;
  readonly now: string;
};

export type AtomicOnboardingStartRecord = {
  readonly subjectId: string;
  readonly onboardingId: string;
  readonly sessionId: string;
  readonly issuedState: "STARTED";
  readonly issuedAt: string;
  readonly absoluteExpiresAt: string;
};

export type NeonOnboardingStartQueryRow =
  Record<string, unknown>;

export type NeonOnboardingStartQueryExecutor = (
  query: string,
  parameters: readonly unknown[]
) => Promise<
  readonly NeonOnboardingStartQueryRow[]
>;

export type NeonOnboardingStartRepositoryErrorCode =
  | "DATABASE_URL_MISSING"
  | "INVALID_INPUT"
  | "IDEMPOTENCY_CONFLICT"
  | "DATABASE_FAILURE"
  | "INVALID_DATABASE_RESULT";

export class NeonOnboardingStartRepositoryError
  extends Error
{
  readonly code:
    NeonOnboardingStartRepositoryErrorCode;

  constructor(
    code: NeonOnboardingStartRepositoryErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "NeonOnboardingStartRepositoryError";

    this.code = code;
  }
}

export interface OnboardingStartRepository {
  createAtomicStart(
    input: CreateAtomicOnboardingStartInput
  ): Promise<AtomicOnboardingStartRecord>;
}

const SHA256_LOWERHEX_PATTERN =
  /^[0-9a-f]{64}$/;

const SUBJECT_ID_PATTERN =
  /^sub_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const ONBOARDING_ID_PATTERN =
  /^onb_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const SESSION_ID_PATTERN =
  /^session_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const SESSION_CREATED_PAYLOAD = {
  kind: "HBCE_ONBOARDING_START_SESSION_V1"
} as const;

const ATOMIC_START_SQL = `
WITH inserted_subject AS (
  INSERT INTO hbce_subjects (
    subject_id,
    created_at,
    updated_at
  )
  VALUES (
    $3,
    $6::timestamptz,
    $6::timestamptz
  )
  RETURNING
    subject_id
),
inserted_onboarding AS (
  INSERT INTO hbce_onboardings (
    onboarding_id,
    subject_id,
    state_version,
    revocation_state,
    current_revision,
    created_at,
    updated_at
  )
  SELECT
    $4,
    subject_id,
    'HBCE-IPR-ONBOARDING-CANONICAL-SUBJECT-STATE-v1.0',
    'clear',
    0,
    $6::timestamptz,
    $6::timestamptz
  FROM inserted_subject
  RETURNING
    onboarding_id,
    subject_id
),
inserted_canonical_revision AS (
  INSERT INTO hbce_subject_state_revisions (
    onboarding_id,
    subject_id,
    revision,
    state_version,
    canonical_state,
    canonical_state_sha256,
    created_at
  )
  SELECT
    onboarding_id,
    subject_id,
    0,
    'HBCE-IPR-ONBOARDING-CANONICAL-SUBJECT-STATE-v1.0',
    $7::jsonb,
    $8,
    $6::timestamptz
  FROM inserted_onboarding
  RETURNING
    onboarding_id,
    subject_id,
    revision
),
inserted_canonical_audit AS (
  INSERT INTO hbce_audit_events (
    event_id,
    onboarding_id,
    subject_id,
    revision,
    event_type,
    decision_state,
    previous_event_hash,
    event_hash,
    event_payload_sha256,
    occurred_at,
    created_at
  )
  SELECT
    $9,
    onboarding_id,
    subject_id,
    revision,
    'ONBOARDING_STARTED',
    'accepted',
    NULL,
    $10,
    $11,
    $6::timestamptz,
    $6::timestamptz
  FROM inserted_canonical_revision
  RETURNING
    onboarding_id,
    subject_id
),
inserted_started_session AS (
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
    $5,
    onboarding_id,
    subject_id,
    $2,
    'STARTED',
    $6::timestamptz,
    $15::timestamptz,
    NULL,
    $6::timestamptz
  FROM inserted_canonical_audit
  RETURNING
    session_id,
    onboarding_id,
    subject_id,
    issued_state,
    issued_at,
    absolute_expires_at
),
inserted_session_created_event AS (
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
    0,
    'SESSION_CREATED',
    NULL,
    $13,
    $14,
    $6::timestamptz,
    $6::timestamptz
  FROM inserted_started_session
  RETURNING
    session_id
),
inserted_start_request AS (
  INSERT INTO hbce_onboarding_start_requests (
    idempotency_sha256,
    onboarding_id,
    subject_id,
    session_id,
    created_at
  )
  SELECT
    $1,
    session.onboarding_id,
    session.subject_id,
    session.session_id,
    $6::timestamptz
  FROM inserted_started_session AS session
  JOIN inserted_session_created_event AS event
    ON event.session_id = session.session_id
  RETURNING
    onboarding_id,
    subject_id,
    session_id
),
start_result AS (
  SELECT
    request.subject_id,
    request.onboarding_id,
    request.session_id,
    session.issued_state,
    session.issued_at,
    session.absolute_expires_at
  FROM inserted_start_request AS request
  JOIN inserted_started_session AS session
    ON session.session_id =
       request.session_id
   AND session.onboarding_id =
       request.onboarding_id
   AND session.subject_id =
       request.subject_id
)
SELECT CASE
  WHEN
    (SELECT count(*) FROM inserted_subject) = 1
    AND
    (SELECT count(*) FROM inserted_onboarding) = 1
    AND
    (SELECT count(*) FROM inserted_canonical_revision) = 1
    AND
    (SELECT count(*) FROM inserted_canonical_audit) = 1
    AND
    (SELECT count(*) FROM inserted_started_session) = 1
    AND
    (SELECT count(*) FROM inserted_session_created_event) = 1
    AND
    (SELECT count(*) FROM inserted_start_request) = 1
  THEN (
    SELECT jsonb_build_object(
      'subjectId',
      subject_id,
      'onboardingId',
      onboarding_id,
      'sessionId',
      session_id,
      'issuedState',
      issued_state,
      'issuedAt',
      issued_at,
      'absoluteExpiresAt',
      absolute_expires_at
    )
    FROM start_result
    LIMIT 1
  )
  ELSE to_jsonb(
    1 / (
      SELECT count(*)::integer
      FROM inserted_start_request
      WHERE false
    )
  )
END AS start_result
`;

let defaultExecutor:
  NeonOnboardingStartQueryExecutor | null =
    null;

function getDefaultExecutor():
  NeonOnboardingStartQueryExecutor
{
  if (defaultExecutor) {
    return defaultExecutor;
  }

  const connectionString =
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new NeonOnboardingStartRepositoryError(
      "DATABASE_URL_MISSING",
      "DATABASE_URL is required when the atomic onboarding start repository is first used."
    );
  }

  const sql =
    neon(connectionString);

  defaultExecutor = async (
    query,
    parameters
  ) => {
    const rows =
      await sql.query(
        query,
        [...parameters]
      );

    return rows as readonly NeonOnboardingStartQueryRow[];
  };

  return defaultExecutor;
}

function isNormalizedIsoDateTime(
  value: string
): boolean {
  if (
    value.length === 0 ||
    value.trim() !== value
  ) {
    return false;
  }

  const parsed =
    new Date(value);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString() === value
  );
}

function validateInput(
  input: CreateAtomicOnboardingStartInput
): void {
  if (
    !SHA256_LOWERHEX_PATTERN.test(
      input.idempotencySha256
    )
  ) {
    throw new NeonOnboardingStartRepositoryError(
      "INVALID_INPUT",
      "idempotencySha256 must be a lowercase SHA-256 hexadecimal digest."
    );
  }

  if (
    !SHA256_LOWERHEX_PATTERN.test(
      input.tokenSha256
    )
  ) {
    throw new NeonOnboardingStartRepositoryError(
      "INVALID_INPUT",
      "tokenSha256 must be a lowercase SHA-256 hexadecimal digest."
    );
  }

  if (
    !SUBJECT_ID_PATTERN.test(
      input.subjectId
    )
  ) {
    throw new NeonOnboardingStartRepositoryError(
      "INVALID_INPUT",
      "subjectId must be a server-generated sub_ UUID."
    );
  }

  if (
    !ONBOARDING_ID_PATTERN.test(
      input.onboardingId
    )
  ) {
    throw new NeonOnboardingStartRepositoryError(
      "INVALID_INPUT",
      "onboardingId must be a server-generated onb_ UUID."
    );
  }

  if (
    !SESSION_ID_PATTERN.test(
      input.sessionId
    )
  ) {
    throw new NeonOnboardingStartRepositoryError(
      "INVALID_INPUT",
      "sessionId must be a server-generated session_ UUID."
    );
  }

  if (
    !isNormalizedIsoDateTime(
      input.now
    )
  ) {
    throw new NeonOnboardingStartRepositoryError(
      "INVALID_INPUT",
      "now must be a normalized UTC ISO date-time string."
    );
  }
}

function normalizeIsoDateTime(
  value: unknown
): string | null {
  if (
    typeof value !== "string" &&
    !(value instanceof Date)
  ) {
    return null;
  }

  const parsed =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return null;
  }

  return parsed.toISOString();
}

function readStartResult(
  row:
    NeonOnboardingStartQueryRow | undefined,
  expected:
    {
      readonly subjectId: string;
      readonly onboardingId: string;
      readonly sessionId: string;
      readonly issuedAt: string;
      readonly absoluteExpiresAt: string;
    }
): AtomicOnboardingStartRecord {
  if (!row) {
    throw new NeonOnboardingStartRepositoryError(
      "INVALID_DATABASE_RESULT",
      "Atomic onboarding start returned no result row."
    );
  }

  let value =
    row.start_result;

  if (
    typeof value === "string"
  ) {
    try {
      value =
        JSON.parse(value) as unknown;
    } catch {
      throw new NeonOnboardingStartRepositoryError(
        "INVALID_DATABASE_RESULT",
        "Atomic onboarding start returned invalid JSON."
      );
    }
  }

  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new NeonOnboardingStartRepositoryError(
      "INVALID_DATABASE_RESULT",
      "Atomic onboarding start returned an invalid result object."
    );
  }

  const result =
    value as Record<string, unknown>;

  const subjectId =
    result.subjectId;

  const onboardingId =
    result.onboardingId;

  const sessionId =
    result.sessionId;

  const issuedState =
    result.issuedState;

  const issuedAt =
    normalizeIsoDateTime(
      result.issuedAt
    );

  const absoluteExpiresAt =
    normalizeIsoDateTime(
      result.absoluteExpiresAt
    );

  if (
    subjectId !== expected.subjectId ||
    onboardingId !==
      expected.onboardingId ||
    sessionId !== expected.sessionId ||
    issuedState !== "STARTED" ||
    issuedAt !== expected.issuedAt ||
    absoluteExpiresAt !==
      expected.absoluteExpiresAt
  ) {
    throw new NeonOnboardingStartRepositoryError(
      "INVALID_DATABASE_RESULT",
      "Atomic onboarding start returned data that does not match server authority."
    );
  }

  return {
    subjectId,
    onboardingId,
    sessionId,
    issuedState,
    issuedAt,
    absoluteExpiresAt
  };
}

function mapFailure(
  error: unknown
): never {
  if (
    error instanceof
    NeonOnboardingStartRepositoryError
  ) {
    throw error;
  }

  if (
    error instanceof
      OnboardingCanonicalAuditCryptoError ||
    error instanceof
      OnboardingSessionEventCryptoError
  ) {
    throw new NeonOnboardingStartRepositoryError(
      "INVALID_INPUT",
      error.message
    );
  }

  if (error instanceof Error) {
    const databaseError =
      error as Error & {
        readonly code?: string;
        readonly constraint?: string;
      };

    if (
      databaseError.code === "23505" &&
      databaseError.constraint ===
        "hbce_onboarding_start_requests_pkey"
    ) {
      throw new NeonOnboardingStartRepositoryError(
        "IDEMPOTENCY_CONFLICT",
        "The onboarding start idempotency digest already exists."
      );
    }
  }

  throw new NeonOnboardingStartRepositoryError(
    "DATABASE_FAILURE",
    "Atomic onboarding start failed closed."
  );
}

export class NeonOnboardingStartRepository
  implements OnboardingStartRepository
{
  private readonly executor:
    NeonOnboardingStartQueryExecutor;

  constructor(
    executor:
      NeonOnboardingStartQueryExecutor =
        (...args) =>
          getDefaultExecutor()(...args)
  ) {
    this.executor =
      executor;
  }

  async createAtomicStart(
    input: CreateAtomicOnboardingStartInput
  ): Promise<AtomicOnboardingStartRecord> {
    validateInput(input);

    try {
      const canonicalState:
        OnboardingCanonicalSubjectState = {
          version:
            ONBOARDING_CANONICAL_SUBJECT_STATE_VERSION,
          subjectId:
            input.subjectId,
          onboardingId:
            input.onboardingId,
          ipr:
            null,
          iprCard:
            null,
          operationalCertificate:
            null,
          latestPhase:
            null,
          revocationState:
            "clear",
          revision:
            0,
          createdAt:
            input.now,
          updatedAt:
            input.now
        };

      const canonicalStateJson =
        stableStringify(
          canonicalState
        );

      const canonicalStateSha256 =
        await sha256Canonical(
          canonicalState
        );

      const canonicalAuditEventId =
        generateCanonicalAuditEventId();

      const canonicalAuditPayload =
        createOnboardingStartCanonicalAuditPayload();

      const canonicalAuditPayloadSha256 =
        await createCanonicalAuditEventPayloadSha256({
          eventId:
            canonicalAuditEventId,
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
            canonicalAuditPayload
        });

      const canonicalAuditEventHash =
        await createCanonicalAuditEventHash({
          revision:
            0,
          previousEventHash:
            null,
          eventPayloadSha256:
            canonicalAuditPayloadSha256
        });

      const sessionEventId =
        generateOnboardingSessionEventId();

      const sessionEventPayloadSha256 =
        await createOnboardingSessionEventPayloadSha256({
          eventId:
            sessionEventId,
          sessionId:
            input.sessionId,
          eventType:
            "SESSION_CREATED",
          occurredAt:
            input.now,
          payload:
            SESSION_CREATED_PAYLOAD
        });

      const sessionEventHash =
        await createOnboardingSessionEventHash({
          eventSeq:
            0,
          previousEventHash:
            null,
          eventPayloadSha256:
            sessionEventPayloadSha256
        });

      const absoluteExpiresAt =
        new Date(
          new Date(
            input.now
          ).getTime() +
          ONBOARDING_SESSION_ABSOLUTE_TTL_SECONDS *
            1000
        ).toISOString();

      const parameters = [
        input.idempotencySha256,
        input.tokenSha256,
        input.subjectId,
        input.onboardingId,
        input.sessionId,
        input.now,
        canonicalStateJson,
        canonicalStateSha256,
        canonicalAuditEventId,
        canonicalAuditEventHash,
        canonicalAuditPayloadSha256,
        sessionEventId,
        sessionEventHash,
        sessionEventPayloadSha256,
        absoluteExpiresAt
      ] as const;

      const rows =
        await this.executor(
          ATOMIC_START_SQL,
          parameters
        );

      return readStartResult(
        rows[0],
        {
          subjectId:
            input.subjectId,
          onboardingId:
            input.onboardingId,
          sessionId:
            input.sessionId,
          issuedAt:
            input.now,
          absoluteExpiresAt
        }
      );
    } catch (error) {
      return mapFailure(error);
    }
  }
}

export function createNeonOnboardingStartRepository(
  executor?: NeonOnboardingStartQueryExecutor
): OnboardingStartRepository {
  return new NeonOnboardingStartRepository(
    executor
  );
}
