import { describe, expect, it, vi } from "vitest";

import type {
  PrivateArtifactMetadataRepository
} from "../lib/server/neon-private-artifact-repository";
import {
  PrivateArtifactStorageOrchestrator
} from "../lib/server/private-artifact-storage-orchestrator";
import type {
  PrivateArtifactMetadata,
  PrivateBlobArtifactStore,
  UploadPrivateArtifactInput
} from "../lib/server/private-blob-artifact-store";

function buildInput(): UploadPrivateArtifactInput {
  return {
    onboardingId: "onb_server_001",
    subjectId: "sub_server_001",
    artifactKind: "IDENTITY_DOCUMENT",
    mimeType: "application/pdf",
    body: new Uint8Array([1, 2, 3, 4])
  };
}

function buildMetadata(): PrivateArtifactMetadata {
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
    createdAt: "2026-09-04T15:40:00.000Z"
  };
}

function createHarness() {
  const upload =
    vi.fn<PrivateBlobArtifactStore["upload"]>();
  const downloadAuthorized =
    vi.fn<PrivateBlobArtifactStore["downloadAuthorized"]>();
  const deleteCompensation =
    vi.fn<PrivateBlobArtifactStore["deleteCompensation"]>();

  const insert =
    vi.fn<PrivateArtifactMetadataRepository["insert"]>();
  const getAuthorized =
    vi.fn<
      PrivateArtifactMetadataRepository["getAuthorized"]
    >();

  const blobStore = {
    upload,
    downloadAuthorized,
    deleteCompensation
  } as unknown as PrivateBlobArtifactStore;

  const metadataRepository = {
    insert,
    getAuthorized
  } satisfies PrivateArtifactMetadataRepository;

  const orchestrator =
    new PrivateArtifactStorageOrchestrator(
      blobStore,
      metadataRepository
    );

  return {
    orchestrator,
    upload,
    downloadAuthorized,
    deleteCompensation,
    insert,
    getAuthorized
  };
}

describe("private artifact cross-storage orchestrator", () => {
  it("uploads Blob bytes before registering Neon metadata", async () => {
    const harness = createHarness();
    const input = buildInput();
    const metadata = buildMetadata();
    const order: string[] = [];

    harness.upload.mockImplementation(async () => {
      order.push("blob-upload");
      return metadata;
    });

    harness.insert.mockImplementation(async (value) => {
      order.push("neon-insert");
      return value;
    });

    await expect(
      harness.orchestrator.uploadAndRegister(input)
    ).resolves.toEqual(metadata);

    expect(order).toEqual([
      "blob-upload",
      "neon-insert"
    ]);
    expect(harness.insert).toHaveBeenCalledWith(metadata);
    expect(
      harness.deleteCompensation
    ).not.toHaveBeenCalled();
  });

  it("deletes the uploaded Blob when Neon registration fails", async () => {
    const harness = createHarness();
    const metadata = buildMetadata();

    harness.upload.mockResolvedValue(metadata);
    harness.insert.mockRejectedValue(
      new Error("database unavailable")
    );
    harness.deleteCompensation.mockResolvedValue();

    await expect(
      harness.orchestrator.uploadAndRegister(buildInput())
    ).rejects.toEqual(
      expect.objectContaining({
        code: "METADATA_WRITE_FAILED_COMPENSATED",
        orphanArtifact: null
      })
    );

    expect(
      harness.deleteCompensation
    ).toHaveBeenCalledTimes(1);
    expect(
      harness.deleteCompensation
    ).toHaveBeenCalledWith(metadata);
  });

  it("does not compensate when Blob upload itself fails", async () => {
    const harness = createHarness();
    const uploadFailure = new Error("blob unavailable");

    harness.upload.mockRejectedValue(uploadFailure);

    await expect(
      harness.orchestrator.uploadAndRegister(buildInput())
    ).rejects.toBe(uploadFailure);

    expect(harness.insert).not.toHaveBeenCalled();
    expect(
      harness.deleteCompensation
    ).not.toHaveBeenCalled();
  });

  it("returns an explicit orphan descriptor if compensation fails", async () => {
    const harness = createHarness();
    const metadata = buildMetadata();
    const databaseFailure = new Error(
      "metadata registration failed"
    );
    const compensationFailure = new Error(
      "blob deletion failed"
    );

    harness.upload.mockResolvedValue(metadata);
    harness.insert.mockRejectedValue(databaseFailure);
    harness.deleteCompensation.mockRejectedValue(
      compensationFailure
    );

    await expect(
      harness.orchestrator.uploadAndRegister(buildInput())
    ).rejects.toEqual(
      expect.objectContaining({
        code: "ORPHAN_BLOB_RECONCILIATION_REQUIRED",
        orphanArtifact: metadata,
        primaryCause: databaseFailure,
        compensationCause: compensationFailure
      })
    );
  });

  it("authorizes through Neon before reading private Blob bytes", async () => {
    const harness = createHarness();
    const metadata = buildMetadata();
    const order: string[] = [];
    const downloaded = {
      statusCode: 200
    };

    harness.getAuthorized.mockImplementation(async () => {
      order.push("neon-authorization");
      return metadata;
    });

    harness.downloadAuthorized.mockImplementation(
      async () => {
        order.push("blob-download");
        return downloaded as never;
      }
    );

    await expect(
      harness.orchestrator.downloadAuthorized({
        blobReference: metadata.blobReference,
        subjectId: metadata.subjectId,
        onboardingId: metadata.onboardingId
      })
    ).resolves.toBe(downloaded);

    expect(order).toEqual([
      "neon-authorization",
      "blob-download"
    ]);

    expect(harness.getAuthorized).toHaveBeenCalledWith(
      metadata.blobReference,
      metadata.subjectId,
      metadata.onboardingId
    );

    expect(
      harness.downloadAuthorized
    ).toHaveBeenCalledWith({
      artifact: metadata,
      authorizedSubjectId: metadata.subjectId,
      authorizedOnboardingId: metadata.onboardingId
    });
  });

  it("never contacts Blob when Neon authorization fails", async () => {
    const harness = createHarness();
    const metadata = buildMetadata();

    harness.getAuthorized.mockResolvedValue(null);

    await expect(
      harness.orchestrator.downloadAuthorized({
        blobReference: metadata.blobReference,
        subjectId: metadata.subjectId,
        onboardingId: metadata.onboardingId
      })
    ).rejects.toEqual(
      expect.objectContaining({
        code: "ARTIFACT_AUTHORIZATION_DENIED"
      })
    );

    expect(
      harness.downloadAuthorized
    ).not.toHaveBeenCalled();
  });
});
