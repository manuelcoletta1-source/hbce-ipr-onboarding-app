"use client";

import IprPhaseForm from "@/components/IprPhaseForm";

import { sha256Canonical } from "@/lib/ipr-certificate-chain";
import { getPhaseDefinitionByNumber } from "@/lib/ipr-phase-map";

import type {
  IprPhaseEvidenceInputDefinition,
  IprPhaseFieldDefinition,
  IprPhaseFormBuildDataContext
} from "@/components/IprPhaseForm";

import type { JsonObject } from "@/lib/types";

const phase = getPhaseDefinitionByNumber(4);

const fields: IprPhaseFieldDefinition[] = [
  {
    name: "liveness_declaration",
    label: "Liveness declaration",
    type: "text",
    placeholder:
      "Confermo di essere il soggetto che richiede il certificato operativo HBCE IPR.",
    helperText:
      "This declaration is written inside the private HBCE-IPR certificate and also hashed for verification."
  }
];

const evidenceInputs: IprPhaseEvidenceInputDefinition[] = [
  {
    kind: "SELFIE",
    label: "Upload front selfie",
    description:
      "Upload a clear frontal selfie of the subject requesting the HBCE-IPR certificate. The file itself is not embedded in the certificate; only its SHA-256 hash is stored.",
    accept: "image/*",
    required: true
  },
  {
    kind: "VIDEO_VERIFICATION",
    label: "Upload video verification",
    description:
      "Upload a short video verification containing the liveness declaration. The file itself is not embedded in the certificate; only its SHA-256 hash is stored.",
    accept: "video/*",
    required: true
  }
];

function getStringValue(
  context: IprPhaseFormBuildDataContext,
  fieldName: string
): string {
  const value = context.values[fieldName];

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value ?? "").trim();
}

async function hashPhaseValue(
  context: IprPhaseFormBuildDataContext,
  fieldName: string
): Promise<string> {
  return sha256Canonical({
    kind: "HBCE_IPR_PHASE_4_FIELD",
    field: fieldName,
    value: getStringValue(context, fieldName)
  });
}

function getUploadHash(
  context: IprPhaseFormBuildDataContext,
  kind: "SELFIE" | "VIDEO_VERIFICATION"
): string | null {
  return context.uploads.find((upload) => upload.kind === kind)?.sha256 ?? null;
}

async function buildPhase4LivenessData(
  context: IprPhaseFormBuildDataContext
): Promise<JsonObject> {
  const selfieSha256 = getUploadHash(context, "SELFIE");
  const videoSha256 = getUploadHash(context, "VIDEO_VERIFICATION");

  const privateFields = {
    liveness_declaration: getStringValue(context, "liveness_declaration"),
    liveness_timestamp: context.issuedAt
  };

  const hashFields = {
    liveness_declaration_sha256: await hashPhaseValue(
      context,
      "liveness_declaration"
    )
  };

  const evidenceHashes = {
    selfie_sha256: selfieSha256,
    video_sha256: videoSha256
  };

  const livenessMetadataHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_4_LIVENESS_METADATA",
    private_fields: privateFields,
    hash_fields: hashFields,
    evidence_hashes: evidenceHashes,
    previous_payload_sha256:
      context.previousCertificate?.hash_integrity.payload_sha256 ?? null,
    issued_at: context.issuedAt
  });

  return {
    certificate_visibility: "PRIVATE_PORTABLE_CERTIFICATE",
    public_registry_mode: "HASH_ONLY",
    phase_scope: "LIVENESS_CHECK",

    private_fields: privateFields,
    hash_fields: hashFields,
    evidence_hashes: evidenceHashes,

    selfie_sha256: selfieSha256,
    video_sha256: videoSha256,
    liveness_declaration_sha256: hashFields.liveness_declaration_sha256,
    liveness_metadata_hash: livenessMetadataHash,
    liveness_timestamp: context.issuedAt,

    previous_payload_sha256:
      context.previousCertificate?.hash_integrity.payload_sha256 ?? null,
    next_required_phase: "PRIVACY_COMPLIANCE",
    issued_at: context.issuedAt,

    privacy_boundary:
      "This is a private portable HBCE-IPR certificate downloaded by the subject. The liveness declaration is stored inside private_fields. Selfie and video evidence are represented only by SHA-256 hashes and must be stored in protected backend storage in production."
  };
}

export default function Phase4LivenessPage() {
  return (
    <div className="hbce-container">
      <IprPhaseForm
        phase={phase}
        fields={fields}
        evidenceInputs={evidenceInputs}
        buildPhaseData={buildPhase4LivenessData}
        submitLabel="Generate HBCE IPR Certificate 04"
        successTitle="HBCE IPR Certificate 04 generated"
        successDescription="The private liveness certificate has been generated and downloaded. It contains the liveness declaration, the corresponding hash and the SHA-256 hashes of selfie and video evidence. Use this file in Phase 5 — Privacy & Compliance."
      />
    </div>
  );
}
