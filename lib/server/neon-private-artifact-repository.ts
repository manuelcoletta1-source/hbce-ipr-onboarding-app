import "server-only";

import { neon } from "@neondatabase/serverless";

import {
  PRIVATE_ARTIFACT_KINDS,
  type PrivateArtifactKind,
  type PrivateArtifactMetadata
} from "@/lib/server/private-blob-artifact-store";

export type PrivateArtifactMetadataRepositoryErrorCode =
  | "DATABASE_URL_MISSING"
  | "INVALID_METADATA"
  | "ARTIFACT_CONFLICT"
  | "SUBJECT_ONBOARDING_BINDING_NOT_FOUND"
  | "INVALID_DATABASE_RESULT";

export class PrivateArtifactMetadataRepositoryError extends Error {
  readonly code: PrivateArtifactMetadataRepositoryErrorCode;

  constructor(
    code: PrivateArtifactMetadataRepositoryErrorCode,
    message: string
  ) {
    super(message);
    this.name = "PrivateArtifactMetadataRepositoryError";
    this.code = code;
  }
}

export type PrivateArtifactQueryRow = Record<string, unknown>;

export type PrivateArtifactQueryExecutor = (
  query: string,
  parameters: readonly unknown[]
) => Promise<readonly PrivateArtifactQueryRow[]>;

export interface PrivateArtifactMetadataRepository {
  insert(
    metadata: PrivateArtifactMetadata
  ): Promise<PrivateArtifactMetadata>;

  getAuthorized(
    blobReference: string,
    subjectId: string,
    onboardingId: string
  ): Promise<PrivateArtifactMetadata | null>;
}

const INSERT_PRIVATE_ARTIFACT_SQL = `
INSERT INTO hbce_private_artifacts (
  artifact_id,
  onboarding_id,
  subject_id,
  artifact_kind,
  blob_reference,
  sha256,
  mime_type,
  size_bytes,
  created_at
)
VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7,
  $8::bigint,
  $9::timestamptz
)
RETURNING
  artifact_id,
  onboarding_id,
  subject_id,
  artifact_kind,
  blob_reference,
  sha256,
  mime_type,
  size_bytes,
  created_at
`;

const GET_AUTHORIZED_PRIVATE_ARTIFACT_SQL = `
SELECT
  artifact_id,
  onboarding_id,
  subject_id,
  artifact_kind,
  blob_reference,
  sha256,
  mime_type,
  size_bytes,
  created_at
FROM hbce_private_artifacts
WHERE blob_reference = $1
  AND subject_id = $2
  AND onboarding_id = $3
LIMIT 1
`;

let defaultExecutor: PrivateArtifactQueryExecutor | null = null;

function getDefaultExecutor(): PrivateArtifactQueryExecutor {
  if (defaultExecutor) {
    return defaultExecutor;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new PrivateArtifactMetadataRepositoryError(
      "DATABASE_URL_MISSING",
      "DATABASE_URL is required when the artifact repository is first used."
    );
  }

  const sql = neon(connectionString);

  defaultExecutor = async (query, parameters) => {
    const rows = await sql.query(query, [...parameters]);

    return rows as readonly PrivateArtifactQueryRow[];
  };

  return defaultExecutor;
}

function isNonEmptyString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function isArtifactKind(
  value: unknown
): value is PrivateArtifactKind {
  return (
    typeof value === "string" &&
    PRIVATE_ARTIFACT_KINDS.includes(
      value as PrivateArtifactKind
    )
  );
}

function isNormalizedIsoDateTime(value: string): boolean {
  const parsed = new Date(value);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString() === value
  );
}

function validateMetadata(
  metadata: PrivateArtifactMetadata
): void {
  const requiredStrings = [
    metadata.artifactId,
    metadata.onboardingId,
    metadata.subjectId,
    metadata.blobReference,
    metadata.sha256,
    metadata.mimeType
  ];

  if (requiredStrings.some((value) => !isNonEmptyString(value))) {
    throw new PrivateArtifactMetadataRepositoryError(
      "INVALID_METADATA",
      "Private artifact metadata contains an empty required field."
    );
  }

  if (!isArtifactKind(metadata.artifactKind)) {
    throw new PrivateArtifactMetadataRepositoryError(
      "INVALID_METADATA",
      "Private artifact kind is not supported."
    );
  }

  if (
    !Number.isSafeInteger(metadata.sizeBytes) ||
    metadata.sizeBytes < 0
  ) {
    throw new PrivateArtifactMetadataRepositoryError(
      "INVALID_METADATA",
      "Private artifact sizeBytes must be a non-negative safe integer."
    );
  }

  if (!isNormalizedIsoDateTime(metadata.createdAt)) {
    throw new PrivateArtifactMetadataRepositoryError(
      "INVALID_METADATA",
      "Private artifact createdAt must be a normalized ISO date-time."
    );
  }
}

function mapMetadata(
  row: PrivateArtifactQueryRow | undefined
): PrivateArtifactMetadata | null {
  if (!row) {
    return null;
  }

  const artifactId = row.artifact_id;
  const onboardingId = row.onboarding_id;
  const subjectId = row.subject_id;
  const artifactKind = row.artifact_kind;
  const blobReference = row.blob_reference;
  const sha256 = row.sha256;
  const mimeType = row.mime_type;
  const sizeValue = row.size_bytes;
  const createdValue = row.created_at;

  const sizeBytes =
    typeof sizeValue === "bigint"
      ? Number(sizeValue)
      : typeof sizeValue === "string"
        ? Number(sizeValue)
        : sizeValue;

  const createdAt =
    createdValue instanceof Date
      ? createdValue.toISOString()
      : createdValue;

  if (
    !isNonEmptyString(artifactId) ||
    !isNonEmptyString(onboardingId) ||
    !isNonEmptyString(subjectId) ||
    !isArtifactKind(artifactKind) ||
    !isNonEmptyString(blobReference) ||
    !isNonEmptyString(sha256) ||
    !isNonEmptyString(mimeType) ||
    typeof sizeBytes !== "number" ||
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes < 0 ||
    !isNonEmptyString(createdAt) ||
    !isNormalizedIsoDateTime(createdAt)
  ) {
    throw new PrivateArtifactMetadataRepositoryError(
      "INVALID_DATABASE_RESULT",
      "Neon returned invalid private artifact metadata."
    );
  }

  return {
    artifactId,
    onboardingId,
    subjectId,
    artifactKind,
    blobReference,
    sha256,
    mimeType,
    sizeBytes,
    createdAt
  };
}

function mapDatabaseError(error: unknown): never {
  if (
    error instanceof
    PrivateArtifactMetadataRepositoryError
  ) {
    throw error;
  }

  if (error instanceof Error) {
    const databaseError = error as Error & {
      code?: string;
    };

    if (databaseError.code === "23505") {
      throw new PrivateArtifactMetadataRepositoryError(
        "ARTIFACT_CONFLICT",
        "The artifact identifier or Blob reference already exists."
      );
    }

    if (databaseError.code === "23503") {
      throw new PrivateArtifactMetadataRepositoryError(
        "SUBJECT_ONBOARDING_BINDING_NOT_FOUND",
        "The subject and onboarding binding does not exist."
      );
    }
  }

  throw error;
}

export class NeonPrivateArtifactMetadataRepository
  implements PrivateArtifactMetadataRepository
{
  private readonly executor: PrivateArtifactQueryExecutor;

  constructor(
    executor: PrivateArtifactQueryExecutor = (...args) =>
      getDefaultExecutor()(...args)
  ) {
    this.executor = executor;
  }

  async insert(
    metadata: PrivateArtifactMetadata
  ): Promise<PrivateArtifactMetadata> {
    validateMetadata(metadata);

    try {
      const rows = await this.executor(
        INSERT_PRIVATE_ARTIFACT_SQL,
        [
          metadata.artifactId,
          metadata.onboardingId,
          metadata.subjectId,
          metadata.artifactKind,
          metadata.blobReference,
          metadata.sha256,
          metadata.mimeType,
          metadata.sizeBytes,
          metadata.createdAt
        ]
      );

      const inserted = mapMetadata(rows[0]);

      if (!inserted) {
        throw new PrivateArtifactMetadataRepositoryError(
          "INVALID_DATABASE_RESULT",
          "Neon did not return the inserted artifact metadata."
        );
      }

      return inserted;
    } catch (error) {
      return mapDatabaseError(error);
    }
  }

  async getAuthorized(
    blobReference: string,
    subjectId: string,
    onboardingId: string
  ): Promise<PrivateArtifactMetadata | null> {
    if (
      !isNonEmptyString(blobReference) ||
      !isNonEmptyString(subjectId) ||
      !isNonEmptyString(onboardingId)
    ) {
      return null;
    }

    const rows = await this.executor(
      GET_AUTHORIZED_PRIVATE_ARTIFACT_SQL,
      [blobReference, subjectId, onboardingId]
    );

    return mapMetadata(rows[0]);
  }
}

export function createNeonPrivateArtifactMetadataRepository(
  executor?: PrivateArtifactQueryExecutor
): PrivateArtifactMetadataRepository {
  return new NeonPrivateArtifactMetadataRepository(executor);
}
