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

type Phase4LivenessPrivateFields = {
  liveness_declaration: string;
  liveness_timestamp: string;
};

type Phase4LivenessHashFields = {
  liveness_declaration_sha256: string;
};

type Phase4LivenessEvidenceHashes = {
  selfie_sha256: string;
  video_sha256: string;
};

const phase = getPhaseDefinitionByNumber(4);

const fields: IprPhaseFieldDefinition[] = [
  {
    name: "liveness_declaration",
    label: "Liveness declaration",
    type: "text",
    placeholder:
      "Confermo di essere il soggetto che richiede il certificato operativo HBCE IPR.",
    helperText:
      "This declaration is included in the private HBCE-IPR certificate and hashed for audit verification."
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

function getRawStringValue(
  context: IprPhaseFormBuildDataContext,
  fieldName: string
): string {
  const value = context.values[fieldName];

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value ?? "").trim();
}

function normalizeLivenessDeclaration(value: string): string {
  return value.trim();
}

function getNormalizedPhase4Value(
  context: IprPhaseFormBuildDataContext,
  fieldName: string
): string {
  const rawValue = getRawStringValue(context, fieldName);

  switch (fieldName) {
    case "liveness_declaration":
      return normalizeLivenessDeclaration(rawValue);
    default:
      return rawValue;
  }
}

async function hashPhaseValue(
  context: IprPhaseFormBuildDataContext,
  fieldName: string
): Promise<string> {
  return sha256Canonical({
    kind: "HBCE_IPR_PHASE_4_LIVENESS_FIELD",
    phase: "LIVENESS_SUBMITTED",
    field: fieldName,
    value: getNormalizedPhase4Value(context, fieldName),
    previous_payload_sha256:
      context.previousCertificate?.hash_integrity.payload_sha256 ?? null
  });
}

function getUploadHash(
  context: IprPhaseFormBuildDataContext,
  kind: "SELFIE" | "VIDEO_VERIFICATION"
): string {
  return context.uploads.find((upload) => upload.kind === kind)?.sha256 ?? "";
}

function buildSubmittedPrivateFields(
  context: IprPhaseFormBuildDataContext
): Phase4LivenessPrivateFields {
  return {
    liveness_declaration: getRawStringValue(context, "liveness_declaration"),
    liveness_timestamp: context.issuedAt
  };
}

function buildNormalizedPrivateFields(
  context: IprPhaseFormBuildDataContext
): Phase4LivenessPrivateFields {
  return {
    liveness_declaration: getNormalizedPhase4Value(
      context,
      "liveness_declaration"
    ),
    liveness_timestamp: context.issuedAt
  };
}

async function buildHashFields(
  context: IprPhaseFormBuildDataContext
): Promise<Phase4LivenessHashFields> {
  return {
    liveness_declaration_sha256: await hashPhaseValue(
      context,
      "liveness_declaration"
    )
  };
}

function buildEvidenceHashes(
  context: IprPhaseFormBuildDataContext
): Phase4LivenessEvidenceHashes {
  return {
    selfie_sha256: getUploadHash(context, "SELFIE"),
    video_sha256: getUploadHash(context, "VIDEO_VERIFICATION")
  };
}

async function buildPhase4LivenessData(
  context: IprPhaseFormBuildDataContext
): Promise<JsonObject> {
  const submittedPrivateFields = buildSubmittedPrivateFields(context);
  const privateFields = buildNormalizedPrivateFields(context);
  const hashFields = await buildHashFields(context);
  const evidenceHashes = buildEvidenceHashes(context);

  const previousPayloadSha256 =
    context.previousCertificate?.hash_integrity.payload_sha256 ?? null;

  const livenessMetadataHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_4_LIVENESS_METADATA",
    phase: "LIVENESS_SUBMITTED",
    private_fields: privateFields,
    hash_fields: hashFields,
    evidence_hashes: evidenceHashes,
    previous_payload_sha256: previousPayloadSha256,
    issued_at: context.issuedAt
  });

  return {
    certificate_role: "STEP_4_LIVENESS_COLLECTION",
    certificate_visibility: "PRIVATE_PORTABLE_CERTIFICATE",
    public_registry_mode: "HASH_ONLY",
    phase_scope: "LIVENESS_CHECK",

    private_fields: privateFields,
    submitted_private_fields: submittedPrivateFields,
    liveness_private_data: privateFields,
    liveness_private_data_included: true,

    hash_fields: hashFields,
    evidence_hashes: evidenceHashes,

    selfie_sha256: evidenceHashes.selfie_sha256,
    video_sha256: evidenceHashes.video_sha256,
    liveness_declaration_sha256: hashFields.liveness_declaration_sha256,
    liveness_metadata_hash: livenessMetadataHash,
    liveness_timestamp: context.issuedAt,

    fiscal_identity_collected: true,
    fiscal_identity_verified: false,
    official_document_uploaded: true,
    official_document_verified: false,
    liveness_submitted: true,
    liveness_verified: false,
    ipr_status: "NOT_YET_ISSUED",
    ipr_card_status: "NOT_ISSUED",
    joker_c2_access: "DENIED",

    verification_state: {
      email_verified: false,
      phone_verified: false,
      fiscal_identity_collected: true,
      fiscal_identity_verified: false,
      official_document_uploaded: true,
      official_document_verified: false,
      liveness_submitted: true,
      liveness_verified: false,
      privacy_compliance_accepted: false,
      hbce_review_status: "NOT_STARTED",
      ipr_approved: false,
      ipr_card_issued: false,
      operational_certificate_issued: false,
      joker_c2_access: "DENIED"
    },

    previous_payload_sha256: previousPayloadSha256,
    next_required_phase: "PRIVACY_COMPLIANCE",
    issued_at: context.issuedAt,
    issued_at_utc: context.issuedAt,

    certificate_boundary:
      "This file records liveness evidence submission for the HBCE IPR onboarding chain. It does not certify final identity verification, it does not issue an IPR Card and it does not grant JOKER-C2 access.",

    privacy_boundary:
      "This is a private portable HBCE-IPR certificate downloaded by the subject. It may contain the liveness declaration. Selfie and video evidence are represented only by SHA-256 hashes and must be stored in protected backend storage in production."
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
        successDescription="The private liveness certificate has been generated and downloaded. It links Certificate 03 to selfie, video verification and the liveness declaration, storing only SHA-256 hashes for media evidence. Use this file in Phase 5 — Privacy & Compliance."
      />
    </div>
  );
}
