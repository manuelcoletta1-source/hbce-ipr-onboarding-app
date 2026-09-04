import "server-only";

import type { GetBlobResult } from "@vercel/blob";

import type {
  PrivateArtifactMetadataRepository
} from "@/lib/server/neon-private-artifact-repository";
import type {
  PrivateArtifactMetadata,
  PrivateBlobArtifactStore,
  UploadPrivateArtifactInput
} from "@/lib/server/private-blob-artifact-store";

export type PrivateArtifactStorageErrorCode =
  | "METADATA_WRITE_FAILED_COMPENSATED"
  | "ORPHAN_BLOB_RECONCILIATION_REQUIRED"
  | "ARTIFACT_AUTHORIZATION_DENIED";

export class PrivateArtifactStorageError extends Error {
  readonly code: PrivateArtifactStorageErrorCode;
  readonly orphanArtifact: PrivateArtifactMetadata | null;
  readonly primaryCause: unknown;
  readonly compensationCause: unknown;

  constructor(input: {
    code: PrivateArtifactStorageErrorCode;
    message: string;
    orphanArtifact?: PrivateArtifactMetadata;
    primaryCause?: unknown;
    compensationCause?: unknown;
  }) {
    super(input.message);
    this.name = "PrivateArtifactStorageError";
    this.code = input.code;
    this.orphanArtifact = input.orphanArtifact ?? null;
    this.primaryCause = input.primaryCause;
    this.compensationCause = input.compensationCause;
  }
}

export type AuthorizedPrivateArtifactDownloadInput = {
  readonly blobReference: string;
  readonly subjectId: string;
  readonly onboardingId: string;
};

export class PrivateArtifactStorageOrchestrator {
  private readonly blobStore: PrivateBlobArtifactStore;
  private readonly metadataRepository:
    PrivateArtifactMetadataRepository;

  constructor(
    blobStore: PrivateBlobArtifactStore,
    metadataRepository: PrivateArtifactMetadataRepository
  ) {
    this.blobStore = blobStore;
    this.metadataRepository = metadataRepository;
  }

  async uploadAndRegister(
    input: UploadPrivateArtifactInput
  ): Promise<PrivateArtifactMetadata> {
    const uploaded = await this.blobStore.upload(input);

    try {
      return await this.metadataRepository.insert(uploaded);
    } catch (primaryCause) {
      try {
        await this.blobStore.deleteCompensation(uploaded);
      } catch (compensationCause) {
        throw new PrivateArtifactStorageError({
          code: "ORPHAN_BLOB_RECONCILIATION_REQUIRED",
          message:
            "Blob upload succeeded, metadata registration failed and Blob compensation also failed.",
          orphanArtifact: uploaded,
          primaryCause,
          compensationCause
        });
      }

      throw new PrivateArtifactStorageError({
        code: "METADATA_WRITE_FAILED_COMPENSATED",
        message:
          "Blob upload was removed after metadata registration failed.",
        primaryCause
      });
    }
  }

  async downloadAuthorized(
    input: AuthorizedPrivateArtifactDownloadInput
  ): Promise<GetBlobResult> {
    const artifact =
      await this.metadataRepository.getAuthorized(
        input.blobReference,
        input.subjectId,
        input.onboardingId
      );

    if (!artifact) {
      throw new PrivateArtifactStorageError({
        code: "ARTIFACT_AUTHORIZATION_DENIED",
        message:
          "No private artifact exists for the authorized subject and onboarding binding."
      });
    }

    return this.blobStore.downloadAuthorized({
      artifact,
      authorizedSubjectId: input.subjectId,
      authorizedOnboardingId: input.onboardingId
    });
  }
}

export function createPrivateArtifactStorageOrchestrator(
  blobStore: PrivateBlobArtifactStore,
  metadataRepository: PrivateArtifactMetadataRepository
): PrivateArtifactStorageOrchestrator {
  return new PrivateArtifactStorageOrchestrator(
    blobStore,
    metadataRepository
  );
}
