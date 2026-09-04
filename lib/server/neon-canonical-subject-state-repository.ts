import "server-only";

import { neon } from "@neondatabase/serverless";

import type {
  OnboardingCanonicalSubjectState,
  OnboardingCanonicalSubjectStateRepository,
  SaveOnboardingCanonicalSubjectStateCommand
} from "@/lib/onboarding-canonical-subject-state";
import { prepareCanonicalSaveCommand } from "@/lib/server/canonical-save-command";

export type NeonCanonicalRepositoryErrorCode =
  | "DATABASE_URL_MISSING"
  | "REVISION_CONFLICT"
  | "INVALID_DATABASE_RESULT";

export class NeonCanonicalRepositoryError extends Error {
  readonly code: NeonCanonicalRepositoryErrorCode;

  constructor(code: NeonCanonicalRepositoryErrorCode, message: string) {
    super(message);
    this.name = "NeonCanonicalRepositoryError";
    this.code = code;
  }
}

export type NeonQueryRow = Record<string, unknown>;

export type NeonQueryExecutor = (
  query: string,
  parameters: readonly unknown[]
) => Promise<readonly NeonQueryRow[]>;

const GET_BY_SUBJECT_ID_SQL = `
SELECT revisions.canonical_state
FROM hbce_onboardings AS onboardings
JOIN hbce_subject_state_revisions AS revisions
  ON revisions.onboarding_id = onboardings.onboarding_id
 AND revisions.revision = onboardings.current_revision
WHERE onboardings.subject_id = $1
LIMIT 1
`;

const GET_BY_ONBOARDING_ID_SQL = `
SELECT revisions.canonical_state
FROM hbce_onboardings AS onboardings
JOIN hbce_subject_state_revisions AS revisions
  ON revisions.onboarding_id = onboardings.onboarding_id
 AND revisions.revision = onboardings.current_revision
WHERE onboardings.onboarding_id = $1
LIMIT 1
`;

/*
 * The complete canonical transition is one PostgreSQL statement.
 *
 * An initial save is authorized only when expectedRevision is -1 and no
 * onboarding row exists. A subsequent save is authorized only when the
 * stored current_revision equals expectedRevision.
 *
 * State revision and audit insertion depend on the authorized onboarding
 * CTE. If authorization produces no row, the final guarded expression
 * raises a PostgreSQL division-by-zero error. That aborts the statement,
 * including any preceding data-modifying CTE, instead of committing a
 * partial subject or onboarding mutation.
 */
const SAVE_SQL = `
WITH subject_candidate AS (
  INSERT INTO hbce_subjects (
    subject_id,
    created_at,
    updated_at
  )
  VALUES ($1, $7::timestamptz, $8::timestamptz)
  ON CONFLICT (subject_id) DO NOTHING
  RETURNING subject_id
),
initial_onboarding AS (
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
    $2,
    $1,
    $3,
    $4,
    $5::bigint,
    $7::timestamptz,
    $8::timestamptz
  FROM (
    SELECT subject_id FROM subject_candidate
    UNION ALL
    SELECT subject_id
    FROM hbce_subjects
    WHERE subject_id = $1
    LIMIT 1
  ) AS available_subject
  WHERE $6::bigint IS NULL
  ON CONFLICT DO NOTHING
  RETURNING onboarding_id, subject_id
),
advanced_onboarding AS (
  UPDATE hbce_onboardings
  SET
    state_version = $3,
    revocation_state = $4,
    current_revision = $5::bigint,
    updated_at = $8::timestamptz
  WHERE onboarding_id = $2
    AND subject_id = $1
    AND $6::bigint IS NOT NULL
    AND current_revision = $6::bigint
  RETURNING onboarding_id, subject_id
),
authorized_onboarding AS (
  SELECT onboarding_id, subject_id FROM initial_onboarding
  UNION ALL
  SELECT onboarding_id, subject_id FROM advanced_onboarding
),
inserted_revision AS (
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
    $5::bigint,
    $3,
    $9::jsonb,
    $10,
    $8::timestamptz
  FROM authorized_onboarding
  RETURNING onboarding_id, subject_id, revision, canonical_state
),
inserted_audit_event AS (
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
    $11,
    onboarding_id,
    subject_id,
    revision,
    $12,
    $13,
    $14,
    $15,
    $16,
    $17::timestamptz,
    $8::timestamptz
  FROM inserted_revision
  RETURNING event_id
),
transition_result AS (
  SELECT revision.canonical_state
  FROM inserted_revision AS revision
  CROSS JOIN inserted_audit_event AS audit
)
SELECT CASE
  WHEN EXISTS (SELECT 1 FROM transition_result)
  THEN (SELECT canonical_state FROM transition_result LIMIT 1)
  ELSE to_jsonb(
    1 / (
      SELECT count(*)::integer
      FROM authorized_onboarding
    )
  )
END AS canonical_state
`;

let defaultExecutor: NeonQueryExecutor | null = null;

function getDefaultExecutor(): NeonQueryExecutor {
  if (defaultExecutor) {
    return defaultExecutor;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new NeonCanonicalRepositoryError(
      "DATABASE_URL_MISSING",
      "DATABASE_URL is required when the Neon repository is first used."
    );
  }

  const sql = neon(connectionString);

  defaultExecutor = async (query, parameters) => {
    const rows = await sql.query(query, [...parameters]);

    return rows as readonly NeonQueryRow[];
  };

  return defaultExecutor;
}

function readCanonicalState(
  row: NeonQueryRow | undefined
): OnboardingCanonicalSubjectState | null {
  if (!row) {
    return null;
  }

  const value = row.canonical_state;

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as OnboardingCanonicalSubjectState;
    } catch {
      throw new NeonCanonicalRepositoryError(
        "INVALID_DATABASE_RESULT",
        "Neon returned canonical_state as invalid JSON."
      );
    }
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new NeonCanonicalRepositoryError(
      "INVALID_DATABASE_RESULT",
      "Neon returned an invalid canonical_state value."
    );
  }

  return value as OnboardingCanonicalSubjectState;
}

function isRevisionConflict(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const candidate = error as Error & {
    code?: string;
    constraint?: string;
  };

  return (
    candidate.code === "23505" ||
    candidate.code === "23503" ||
    candidate.code === "22012" ||
    candidate.constraint ===
      "hbce_subject_state_revisions_pkey" ||
    candidate.constraint ===
      "hbce_audit_events_pkey" ||
    candidate.constraint ===
      "hbce_audit_events_event_hash_key"
  );
}

export class NeonCanonicalSubjectStateRepository
  implements OnboardingCanonicalSubjectStateRepository
{
  private readonly executor: NeonQueryExecutor;

  constructor(executor: NeonQueryExecutor = (...args) =>
    getDefaultExecutor()(...args)) {
    this.executor = executor;
  }

  async getBySubjectId(
    subjectId: string
  ): Promise<OnboardingCanonicalSubjectState | null> {
    if (subjectId.trim().length === 0) {
      return null;
    }

    const rows = await this.executor(
      GET_BY_SUBJECT_ID_SQL,
      [subjectId]
    );

    return readCanonicalState(rows[0]);
  }

  async getByOnboardingId(
    onboardingId: string
  ): Promise<OnboardingCanonicalSubjectState | null> {
    if (onboardingId.trim().length === 0) {
      return null;
    }

    const rows = await this.executor(
      GET_BY_ONBOARDING_ID_SQL,
      [onboardingId]
    );

    return readCanonicalState(rows[0]);
  }

  async save(
    command: SaveOnboardingCanonicalSubjectStateCommand
  ): Promise<OnboardingCanonicalSubjectState> {
    const prepared = await prepareCanonicalSaveCommand(command);
    const expectedDatabaseRevision =
      command.expectedRevision === -1
        ? null
        : command.expectedRevision;

    const parameters = [
      command.state.subjectId,
      command.state.onboardingId,
      command.state.version,
      command.state.revocationState,
      command.state.revision,
      expectedDatabaseRevision,
      command.state.createdAt,
      command.state.updatedAt,
      prepared.canonicalStateJson,
      prepared.canonicalStateSha256,
      command.audit.eventId,
      command.audit.eventType,
      command.audit.decisionState,
      command.audit.previousEventHash,
      command.audit.eventHash,
      command.audit.eventPayloadSha256,
      command.audit.occurredAt
    ] as const;

    try {
      const rows = await this.executor(SAVE_SQL, parameters);
      const savedState = readCanonicalState(rows[0]);

      if (!savedState) {
        throw new NeonCanonicalRepositoryError(
          "REVISION_CONFLICT",
          "The canonical transition was not committed."
        );
      }

      return savedState;
    } catch (error) {
      if (error instanceof NeonCanonicalRepositoryError) {
        throw error;
      }

      if (isRevisionConflict(error)) {
        throw new NeonCanonicalRepositoryError(
          "REVISION_CONFLICT",
          "The expected canonical revision no longer matches."
        );
      }

      throw error;
    }
  }
}

export function createNeonCanonicalSubjectStateRepository(
  executor?: NeonQueryExecutor
): OnboardingCanonicalSubjectStateRepository {
  return new NeonCanonicalSubjectStateRepository(executor);
}
