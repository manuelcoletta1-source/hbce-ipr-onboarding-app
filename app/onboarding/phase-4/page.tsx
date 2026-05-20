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
      "The subject must confirm the request in a clear operational declaration."
  }
];

const evidenceInputs: IprPhaseEvidenceInputDefinition[] = [
  {
    kind: "SELFIE",
    label: "Upload front selfie",
    description:
      "Upload a clear frontal selfie of the subject requesting the HBCE-IPR certificate.",
    accept: "image/*",
    required: true
  },
  {
    kind: "VIDEO_VERIFICATION",
    label: "Upload video verification",
    description:
      "Upload a short video verification containing the liveness declaration.",
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

  return {
    selfie_sha256: selfieSha256,
    video_sha256: videoSha256,
    liveness_declaration_sha256: await hashPhaseValue(
      context,
      "liveness_declaration"
    ),
    liveness_timestamp: context.issuedAt,
    previous_payload_sha256:
      context.previousCertificate?.hash_integrity.payload_sha256 ?? null,
    next_required_phase: "PRIVACY_COMPLIANCE",
    issued_at: context.issuedAt
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
        successDescription="The liveness certificate has been generated and downloaded. Use this file in Phase 5 — Privacy & Compliance."
      />
    </div>
  );
}
