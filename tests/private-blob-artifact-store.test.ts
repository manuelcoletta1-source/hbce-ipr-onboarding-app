import { describe, expect, it, vi } from "vitest";

import { sha256Hex } from "../lib/ipr-certificate-chain";
import {
  PrivateBlobArtifactStore,
  type PrivateArtifactMetadata,
  type PrivateBlobOperations
} from "../lib/server/private-blob-artifact-store";

function createOperations() {
  const put = vi.fn<PrivateBlobOperations["put"]>();
  const get = vi.fn<PrivateBlobOperations["get"]>();
  const del = vi.fn<PrivateBlobOperations["del"]>();

  return {
    operations: { put, get, del },
    put,
    get,
    del
  };
}

function buildArtifact(
  overrides: Partial<PrivateArtifactMetadata> = {}
): PrivateArtifactMetadata {
  return {
    artifactId: "artifact_server_001",
    onboardingId: "onb_server_001",
    subjectId: "sub_server_001",
    artifactKind: "IDENTITY_DOCUMENT",
    blobReference:
      "hbce-private/identity-document/blob_server_001",
    sha256: "sha256_artifact",
    mimeType: "application/pdf",
    sizeBytes: 4,
    createdAt: "2026-09-04T15:20:00.000Z",
    ...overrides
  };
}

describe("private Vercel Blob artifact store", () => {
  it("uploads bytes with private access and minimized metadata", async () => {
    const { operations, put } = createOperations();
    const body = new Uint8Array([1, 2, 3, 4]);

    put.mockResolvedValue({
      url: "https://private.example/blob",
      downloadUrl: "https://private.example/blob?download=1",
      pathname:
        "hbce-private/identity-document/generated-blob",
      etag: "etag-upload",
      contentType: "application/pdf",
      contentDisposition: "inline"
    });

    const store = new PrivateBlobArtifactStore(
      operations,
      () => new Date("2026-09-04T15:20:00.000Z")
    );

    const result = await store.upload({
      onboardingId: "onb_server_001",
      subjectId: "sub_server_001",
      artifactKind: "IDENTITY_DOCUMENT",
      mimeType: "application/pdf",
      body
    });

    expect(put).toHaveBeenCalledTimes(1);

    const call = put.mock.calls.at(0)!;
    const [pathname, uploadedBody, options] = call;

    expect(pathname).toMatch(
      /^hbce-private\/identity-document\/[0-9a-f-]+$/
    );
    expect(pathname).not.toContain("sub_server_001");
    expect(pathname).not.toContain("onb_server_001");
    expect(uploadedBody).toBeInstanceOf(Blob);
    expect(
      Array.from(
        new Uint8Array(await uploadedBody.arrayBuffer())
      )
    ).toEqual([1, 2, 3, 4]);
    expect(uploadedBody.type).toBe("application/pdf");
    expect(options).toEqual({
      access: "private",
      contentType: "application/pdf",
      addRandomSuffix: false
    });

    expect(result).toEqual({
      artifactId: expect.stringMatching(
        /^artifact_[0-9a-f-]+$/
      ),
      onboardingId: "onb_server_001",
      subjectId: "sub_server_001",
      artifactKind: "IDENTITY_DOCUMENT",
      blobReference:
        "hbce-private/identity-document/generated-blob",
      sha256: await sha256Hex(body),
      mimeType: "application/pdf",
      sizeBytes: 4,
      createdAt: "2026-09-04T15:20:00.000Z"
    });

    expect(result).not.toHaveProperty("url");
    expect(result).not.toHaveProperty("downloadUrl");
    expect(result).not.toHaveProperty("token");
  });

  it("fails before upload when an identifier is empty", async () => {
    const { operations, put } = createOperations();
    const store = new PrivateBlobArtifactStore(operations);

    await expect(
      store.upload({
        onboardingId: "",
        subjectId: "sub_server_001",
        artifactKind: "IDENTITY_DOCUMENT",
        mimeType: "application/pdf",
        body: new Uint8Array([1])
      })
    ).rejects.toEqual(
      expect.objectContaining({
        code: "INVALID_INPUT"
      })
    );

    expect(put).not.toHaveBeenCalled();
  });

  it("downloads only with private access after exact binding", async () => {
    const { operations, get } = createOperations();
    const downloaded = {
      stream: new ReadableStream(),
      statusCode: 200 as const,
      headers: new Headers(),
      blob: {
        url: "https://private.example/blob",
        downloadUrl: "https://private.example/blob?download=1",
        pathname:
          "hbce-private/identity-document/blob_server_001",
        contentType: "application/pdf",
        contentDisposition: "inline",
        size: 4,
        uploadedAt: new Date("2026-09-04T15:20:00.000Z"),
        etag: "etag-private",
        cacheControl: "private, max-age=0, no-store"
      }
    };

    get.mockResolvedValue(downloaded);

    const store = new PrivateBlobArtifactStore(operations);
    const artifact = buildArtifact();

    await expect(
      store.downloadAuthorized({
        artifact,
        authorizedSubjectId: artifact.subjectId,
        authorizedOnboardingId: artifact.onboardingId
      })
    ).resolves.toBe(downloaded);

    expect(get).toHaveBeenCalledWith(
      artifact.blobReference,
      { access: "private" }
    );
  });

  it("fails closed before Blob access on subject mismatch", async () => {
    const { operations, get } = createOperations();
    const store = new PrivateBlobArtifactStore(operations);

    await expect(
      store.downloadAuthorized({
        artifact: buildArtifact(),
        authorizedSubjectId: "sub_other",
        authorizedOnboardingId: "onb_server_001"
      })
    ).rejects.toEqual(
      expect.objectContaining({
        code: "SUBJECT_BINDING_MISMATCH"
      })
    );

    expect(get).not.toHaveBeenCalled();
  });

  it("fails closed before Blob access on onboarding mismatch", async () => {
    const { operations, get } = createOperations();
    const store = new PrivateBlobArtifactStore(operations);

    await expect(
      store.downloadAuthorized({
        artifact: buildArtifact(),
        authorizedSubjectId: "sub_server_001",
        authorizedOnboardingId: "onb_other"
      })
    ).rejects.toEqual(
      expect.objectContaining({
        code: "ONBOARDING_BINDING_MISMATCH"
      })
    );

    expect(get).not.toHaveBeenCalled();
  });

  it("fails closed when the authorized blob is unavailable", async () => {
    const { operations, get } = createOperations();

    get.mockResolvedValue(null);

    const store = new PrivateBlobArtifactStore(operations);
    const artifact = buildArtifact();

    await expect(
      store.downloadAuthorized({
        artifact,
        authorizedSubjectId: artifact.subjectId,
        authorizedOnboardingId: artifact.onboardingId
      })
    ).rejects.toEqual(
      expect.objectContaining({
        code: "BLOB_NOT_FOUND"
      })
    );
  });

  it("exposes deletion only as an explicit compensation operation", async () => {
    const { operations, del } = createOperations();

    del.mockResolvedValue();

    const store = new PrivateBlobArtifactStore(operations);
    const artifact = buildArtifact();

    await store.deleteCompensation(artifact);

    expect(del).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith(
      artifact.blobReference
    );
  });
});
