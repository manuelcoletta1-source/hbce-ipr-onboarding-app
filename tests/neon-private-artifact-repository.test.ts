import { describe, expect, it, vi } from "vitest";

import {
  NeonPrivateArtifactMetadataRepository,
  type PrivateArtifactQueryExecutor
} from "../lib/server/neon-private-artifact-repository";
import type {
  PrivateArtifactMetadata
} from "../lib/server/private-blob-artifact-store";

function buildMetadata(
  overrides: Partial<PrivateArtifactMetadata> = {}
): PrivateArtifactMetadata {
  return {
    artifactId: "artifact_server_001",
    onboardingId: "onb_server_001",
    subjectId: "sub_server_001",
    artifactKind: "IDENTITY_DOCUMENT",
    blobReference:
      "hbce-private/identity-document/blob_server_001",
    sha256: "sha256_artifact_001",
    mimeType: "application/pdf",
    sizeBytes: 4,
    createdAt: "2026-09-04T15:30:00.000Z",
    ...overrides
  };
}

function buildDatabaseRow(
  metadata: PrivateArtifactMetadata
) {
  return {
    artifact_id: metadata.artifactId,
    onboarding_id: metadata.onboardingId,
    subject_id: metadata.subjectId,
    artifact_kind: metadata.artifactKind,
    blob_reference: metadata.blobReference,
    sha256: metadata.sha256,
    mime_type: metadata.mimeType,
    size_bytes: metadata.sizeBytes.toString(),
    created_at: new Date(metadata.createdAt)
  };
}

describe("Neon private artifact metadata repository", () => {
  it("inserts metadata with nine SQL parameters", async () => {
    const metadata = buildMetadata();
    const executor =
      vi.fn<PrivateArtifactQueryExecutor>().mockResolvedValue([
        buildDatabaseRow(metadata)
      ]);
    const repository =
      new NeonPrivateArtifactMetadataRepository(executor);

    await expect(
      repository.insert(metadata)
    ).resolves.toEqual(metadata);

    expect(executor).toHaveBeenCalledTimes(1);

    const [query, parameters] =
      executor.mock.calls.at(0)!;

    expect(query).toContain(
      "INSERT INTO hbce_private_artifacts"
    );
    expect(query).toContain("$8::bigint");
    expect(query).toContain("$9::timestamptz");
    expect(query).not.toContain(metadata.subjectId);
    expect(query).not.toContain(metadata.blobReference);
    expect(parameters).toEqual([
      metadata.artifactId,
      metadata.onboardingId,
      metadata.subjectId,
      metadata.artifactKind,
      metadata.blobReference,
      metadata.sha256,
      metadata.mimeType,
      metadata.sizeBytes,
      metadata.createdAt
    ]);
  });

  it("reads only by exact Blob, subject and onboarding binding", async () => {
    const metadata = buildMetadata();
    const executor =
      vi.fn<PrivateArtifactQueryExecutor>().mockResolvedValue([
        buildDatabaseRow(metadata)
      ]);
    const repository =
      new NeonPrivateArtifactMetadataRepository(executor);

    await expect(
      repository.getAuthorized(
        metadata.blobReference,
        metadata.subjectId,
        metadata.onboardingId
      )
    ).resolves.toEqual(metadata);

    const [query, parameters] =
      executor.mock.calls.at(0)!;

    expect(query).toContain("WHERE blob_reference = $1");
    expect(query).toContain("AND subject_id = $2");
    expect(query).toContain("AND onboarding_id = $3");
    expect(parameters).toEqual([
      metadata.blobReference,
      metadata.subjectId,
      metadata.onboardingId
    ]);
  });

  it("does not query Neon for incomplete authorization binding", async () => {
    const executor = vi.fn<PrivateArtifactQueryExecutor>();
    const repository =
      new NeonPrivateArtifactMetadataRepository(executor);

    await expect(
      repository.getAuthorized(
        "blob-reference",
        "",
        "onb_server_001"
      )
    ).resolves.toBeNull();

    expect(executor).not.toHaveBeenCalled();
  });

  it("fails before Neon when metadata is invalid", async () => {
    const executor = vi.fn<PrivateArtifactQueryExecutor>();
    const repository =
      new NeonPrivateArtifactMetadataRepository(executor);

    await expect(
      repository.insert(
        buildMetadata({ sizeBytes: -1 })
      )
    ).rejects.toEqual(
      expect.objectContaining({
        code: "INVALID_METADATA"
      })
    );

    expect(executor).not.toHaveBeenCalled();
  });

  it("maps unique violations to artifact conflict", async () => {
    const databaseError = Object.assign(
      new Error("unique violation"),
      { code: "23505" }
    );
    const executor =
      vi.fn<PrivateArtifactQueryExecutor>().mockRejectedValue(
        databaseError
      );
    const repository =
      new NeonPrivateArtifactMetadataRepository(executor);

    await expect(
      repository.insert(buildMetadata())
    ).rejects.toEqual(
      expect.objectContaining({
        code: "ARTIFACT_CONFLICT"
      })
    );
  });

  it("maps missing subject binding to a closed failure", async () => {
    const databaseError = Object.assign(
      new Error("foreign key violation"),
      { code: "23503" }
    );
    const executor =
      vi.fn<PrivateArtifactQueryExecutor>().mockRejectedValue(
        databaseError
      );
    const repository =
      new NeonPrivateArtifactMetadataRepository(executor);

    await expect(
      repository.insert(buildMetadata())
    ).rejects.toEqual(
      expect.objectContaining({
        code: "SUBJECT_ONBOARDING_BINDING_NOT_FOUND"
      })
    );
  });

  it("contains no metadata update or delete operation", async () => {
    const metadata = buildMetadata();
    const executor =
      vi.fn<PrivateArtifactQueryExecutor>().mockResolvedValue([
        buildDatabaseRow(metadata)
      ]);
    const repository =
      new NeonPrivateArtifactMetadataRepository(executor);

    await repository.insert(metadata);

    const [query] = executor.mock.calls.at(0)!;

    expect(query).not.toMatch(/\bUPDATE\b/);
    expect(query).not.toMatch(/\bDELETE\b/);
  });
});
