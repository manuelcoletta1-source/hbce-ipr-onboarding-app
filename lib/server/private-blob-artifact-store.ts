import "server-only";

import {
  del,
  get,
  put,
  type GetBlobResult,
  type PutBlobResult
} from "@vercel/blob";

import { sha256Hex } from "@/lib/ipr-certificate-chain";

export const PRIVATE_ARTIFACT_KINDS = [
  "IDENTITY_DOCUMENT",
  "FISCAL_DOCUMENT",
  "PHOTO_EVIDENCE",
  "VIDEO_LIVENESS_EVIDENCE",
  "PHASE_CERTIFICATE",
  "OPERATIONAL_CERTIFICATE",
  "IPR_PDF"
] as const;

export type PrivateArtifactKind =
  (typeof PRIVATE_ARTIFACT_KINDS)[number];

export type PrivateBlobBody =
  | Blob
  | ArrayBuffer
  | Uint8Array;

export type UploadPrivateArtifactInput = {
  readonly onboardingId: string;
  readonly subjectId: string;
  readonly artifactKind: PrivateArtifactKind;
  readonly mimeType: string;
  readonly body: PrivateBlobBody;
};

export type PrivateArtifactMetadata = {
  readonly artifactId: string;
  readonly onboardingId: string;
  readonly subjectId: string;
  readonly artifactKind: PrivateArtifactKind;
  readonly blobReference: string;
  readonly sha256: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly createdAt: string;
};

export type AuthorizedPrivateArtifactRead = {
  readonly artifact: PrivateArtifactMetadata;
  readonly authorizedSubjectId: string;
  readonly authorizedOnboardingId: string;
};

export type PrivateBlobPut = (
  pathname: string,
  body: Blob,
  options: {
    readonly access: "private";
    readonly contentType: string;
    readonly addRandomSuffix: false;
  }
) => Promise<PutBlobResult>;

export type PrivateBlobGet = (
  blobReference: string,
  options: {
    readonly access: "private";
  }
) => Promise<GetBlobResult | null>;

export type PrivateBlobDelete = (
  blobReference: string
) => Promise<void>;

export type PrivateBlobOperations = {
  readonly put: PrivateBlobPut;
  readonly get: PrivateBlobGet;
  readonly del: PrivateBlobDelete;
};

export type PrivateBlobArtifactStoreErrorCode =
  | "INVALID_INPUT"
  | "SUBJECT_BINDING_MISMATCH"
  | "ONBOARDING_BINDING_MISMATCH"
  | "BLOB_NOT_FOUND";

export class PrivateBlobArtifactStoreError extends Error {
  readonly code: PrivateBlobArtifactStoreErrorCode;

  constructor(
    code: PrivateBlobArtifactStoreErrorCode,
    message: string
  ) {
    super(message);
    this.name = "PrivateBlobArtifactStoreError";
    this.code = code;
  }
}

const defaultOperations: PrivateBlobOperations = {
  put: (pathname, body, options) =>
    put(pathname, body, options),
  get: (blobReference, options) =>
    get(blobReference, options),
  del: async (blobReference) => {
    await del(blobReference);
  }
};

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new PrivateBlobArtifactStoreError(
      "INVALID_INPUT",
      `${field} must be a non-empty string.`
    );
  }
}

function getBodySize(body: PrivateBlobBody): number {
  if (body instanceof Blob) {
    return body.size;
  }

  if (body instanceof Uint8Array) {
    return body.byteLength;
  }

  return body.byteLength;
}

function normalizeUploadBody(
  body: PrivateBlobBody,
  mimeType: string
): Blob {
  if (body instanceof Blob) {
    return body;
  }

  if (body instanceof Uint8Array) {
    const copiedBytes = new Uint8Array(body.byteLength);
    copiedBytes.set(body);

    return new Blob(
      [copiedBytes.buffer],
      { type: mimeType }
    );
  }

  return new Blob([body], { type: mimeType });
}

function createPrivatePathname(
  artifactKind: PrivateArtifactKind
): string {
  const kind = artifactKind.toLowerCase().replaceAll("_", "-");

  return `hbce-private/${kind}/${crypto.randomUUID()}`;
}

function createArtifactId(): string {
  return `artifact_${crypto.randomUUID()}`;
}

export class PrivateBlobArtifactStore {
  private readonly operations: PrivateBlobOperations;
  private readonly now: () => Date;

  constructor(
    operations: PrivateBlobOperations = defaultOperations,
    now: () => Date = () => new Date()
  ) {
    this.operations = operations;
    this.now = now;
  }

  async upload(
    input: UploadPrivateArtifactInput
  ): Promise<PrivateArtifactMetadata> {
    assertNonEmpty(input.onboardingId, "onboardingId");
    assertNonEmpty(input.subjectId, "subjectId");
    assertNonEmpty(input.mimeType, "mimeType");

    const pathname = createPrivatePathname(input.artifactKind);
    const sha256 = await sha256Hex(input.body);
    const sizeBytes = getBodySize(input.body);
    const uploadBody = normalizeUploadBody(
      input.body,
      input.mimeType
    );
    const createdAt = this.now().toISOString();

    const uploaded = await this.operations.put(
      pathname,
      uploadBody,
      {
        access: "private",
        contentType: input.mimeType,
        addRandomSuffix: false
      }
    );

    if (
      typeof uploaded.pathname !== "string" ||
      uploaded.pathname.trim().length === 0
    ) {
      throw new PrivateBlobArtifactStoreError(
        "INVALID_INPUT",
        "Vercel Blob returned an invalid private pathname."
      );
    }

    return {
      artifactId: createArtifactId(),
      onboardingId: input.onboardingId,
      subjectId: input.subjectId,
      artifactKind: input.artifactKind,
      blobReference: uploaded.pathname,
      sha256,
      mimeType: input.mimeType,
      sizeBytes,
      createdAt
    };
  }

  async downloadAuthorized(
    request: AuthorizedPrivateArtifactRead
  ): Promise<GetBlobResult> {
    if (
      request.artifact.subjectId !==
      request.authorizedSubjectId
    ) {
      throw new PrivateBlobArtifactStoreError(
        "SUBJECT_BINDING_MISMATCH",
        "The authorized subject does not own this artifact."
      );
    }

    if (
      request.artifact.onboardingId !==
      request.authorizedOnboardingId
    ) {
      throw new PrivateBlobArtifactStoreError(
        "ONBOARDING_BINDING_MISMATCH",
        "The authorized onboarding does not own this artifact."
      );
    }

    const downloaded = await this.operations.get(
      request.artifact.blobReference,
      { access: "private" }
    );

    if (!downloaded) {
      throw new PrivateBlobArtifactStoreError(
        "BLOB_NOT_FOUND",
        "The authorized private artifact is unavailable."
      );
    }

    return downloaded;
  }

  async deleteCompensation(
    artifact: PrivateArtifactMetadata
  ): Promise<void> {
    assertNonEmpty(
      artifact.blobReference,
      "blobReference"
    );

    await this.operations.del(artifact.blobReference);
  }
}

export function createPrivateBlobArtifactStore(
  operations?: PrivateBlobOperations
): PrivateBlobArtifactStore {
  return new PrivateBlobArtifactStore(operations);
}
