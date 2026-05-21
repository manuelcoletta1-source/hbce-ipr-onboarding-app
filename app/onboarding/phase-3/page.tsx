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

type Phase3OfficialDocumentPrivateFields = {
  document_type: string;
  document_number: string;
  document_country: string;
  document_issuer: string;
  document_issue_date: string;
  document_expiry_date: string;
};

type Phase3OfficialDocumentHashFields = {
  document_type_hash: string;
  document_number_hash: string;
  document_country_hash: string;
  document_issuer_hash: string;
  document_issue_date_hash: string;
  document_expiry_date_hash: string;
};

type Phase3OfficialDocumentEvidenceHashes = {
  document_front_sha256?: string;
  document_back_sha256?: string;
  document_passport_page_sha256?: string;
};

const phase = getPhaseDefinitionByNumber(3);

const fields: IprPhaseFieldDefinition[] = [
  {
    name: "document_type",
    label: "Official document type",
    type: "select",
    options: [
      {
        label: "Carta d’Identità Elettronica — CIE",
        value: "ITALIAN_CIE"
      },
      {
        label: "Driving licence / Patente di guida",
        value: "DRIVING_LICENCE"
      },
      {
        label: "Passport / Passaporto",
        value: "PASSPORT"
      },
      {
        label: "EU national identity card",
        value: "EU_IDENTITY_CARD"
      },
      {
        label: "Other authorized official document",
        value: "OTHER_AUTHORIZED_OFFICIAL_DOCUMENT"
      }
    ],
    helperText:
      "Official document type declared by the subject. It is included in the private certificate and hashed for audit verification."
  },
  {
    name: "document_number",
    label: "Document number",
    type: "text",
    placeholder: "CA000000X",
    helperText:
      "Official document number. It is included in the private certificate and hashed for audit verification."
  },
  {
    name: "document_country",
    label: "Document country",
    type: "text",
    placeholder: "IT",
    helperText:
      "Country or jurisdiction of the official document. It is included in the private certificate and hashed."
  },
  {
    name: "document_issuer",
    label: "Issuing authority",
    type: "text",
    placeholder: "Comune / Ministry / Issuing authority",
    helperText:
      "Authority that issued the document. It is included in the private certificate and hashed."
  },
  {
    name: "document_issue_date",
    label: "Issue date",
    type: "date",
    helperText:
      "Document issue date. It is included in the private certificate and hashed."
  },
  {
    name: "document_expiry_date",
    label: "Expiry date",
    type: "date",
    helperText:
      "Document expiry date. It is included in the private certificate and hashed."
  }
];

const evidenceInputs: IprPhaseEvidenceInputDefinition[] = [
  {
    kind: "OFFICIAL_DOCUMENT_FRONT",
    label: "Upload official document front / CIE front / licence front",
    description:
      "Upload the front side of the CIE, driving licence, EU identity card or other official document. The file itself is not embedded in the certificate; only its SHA-256 hash is stored.",
    accept: "image/*,.pdf",
    required: true
  },
  {
    kind: "OFFICIAL_DOCUMENT_BACK",
    label: "Upload official document back / CIE back / licence back",
    description:
      "Upload the back side when the selected document has two sides. The file itself is not embedded in the certificate; only its SHA-256 hash is stored.",
    accept: "image/*,.pdf",
    required: false
  },
  {
    kind: "PASSPORT_DATA_PAGE",
    label: "Upload passport data page",
    description:
      "Use this field when the selected official document is a passport. The file itself is not embedded in the certificate; only its SHA-256 hash is stored.",
    accept: "image/*,.pdf",
    required: false
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

function normalizeDocumentType(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeDocumentNumber(value: string): string {
  return value.replace(/\s+/g, "").trim().toUpperCase();
}

function normalizeCountryCode(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeIssuer(value: string): string {
  return value.trim();
}

function normalizeDate(value: string): string {
  return value.trim();
}

function getNormalizedPhase3Value(
  context: IprPhaseFormBuildDataContext,
  fieldName: string
): string {
  const rawValue = getRawStringValue(context, fieldName);

  switch (fieldName) {
    case "document_type":
      return normalizeDocumentType(rawValue);
    case "document_number":
      return normalizeDocumentNumber(rawValue);
    case "document_country":
      return normalizeCountryCode(rawValue);
    case "document_issuer":
      return normalizeIssuer(rawValue);
    case "document_issue_date":
    case "document_expiry_date":
      return normalizeDate(rawValue);
    default:
      return rawValue;
  }
}

async function hashPhaseValue(
  context: IprPhaseFormBuildDataContext,
  fieldName: string
): Promise<string> {
  return sha256Canonical({
    kind: "HBCE_IPR_PHASE_3_OFFICIAL_DOCUMENT_FIELD",
    phase: "OFFICIAL_DOCUMENT_SUBMITTED",
    field: fieldName,
    value: getNormalizedPhase3Value(context, fieldName),
    previous_payload_sha256:
      context.previousCertificate?.hash_integrity.payload_sha256 ?? null
  });
}

function getUploadHash(
  context: IprPhaseFormBuildDataContext,
  kind:
    | "OFFICIAL_DOCUMENT_FRONT"
    | "OFFICIAL_DOCUMENT_BACK"
    | "PASSPORT_DATA_PAGE"
): string | null {
  return context.uploads.find((upload) => upload.kind === kind)?.sha256 ?? null;
}

function buildSubmittedPrivateFields(
  context: IprPhaseFormBuildDataContext
): Phase3OfficialDocumentPrivateFields {
  return {
    document_type: getRawStringValue(context, "document_type"),
    document_number: getRawStringValue(context, "document_number"),
    document_country: getRawStringValue(context, "document_country"),
    document_issuer: getRawStringValue(context, "document_issuer"),
    document_issue_date: getRawStringValue(context, "document_issue_date"),
    document_expiry_date: getRawStringValue(context, "document_expiry_date")
  };
}

function buildNormalizedPrivateFields(
  context: IprPhaseFormBuildDataContext
): Phase3OfficialDocumentPrivateFields {
  return {
    document_type: getNormalizedPhase3Value(context, "document_type"),
    document_number: getNormalizedPhase3Value(context, "document_number"),
    document_country: getNormalizedPhase3Value(context, "document_country"),
    document_issuer: getNormalizedPhase3Value(context, "document_issuer"),
    document_issue_date: getNormalizedPhase3Value(
      context,
      "document_issue_date"
    ),
    document_expiry_date: getNormalizedPhase3Value(
      context,
      "document_expiry_date"
    )
  };
}

async function buildHashFields(
  context: IprPhaseFormBuildDataContext
): Promise<Phase3OfficialDocumentHashFields> {
  return {
    document_type_hash: await hashPhaseValue(context, "document_type"),
    document_number_hash: await hashPhaseValue(context, "document_number"),
    document_country_hash: await hashPhaseValue(context, "document_country"),
    document_issuer_hash: await hashPhaseValue(context, "document_issuer"),
    document_issue_date_hash: await hashPhaseValue(
      context,
      "document_issue_date"
    ),
    document_expiry_date_hash: await hashPhaseValue(
      context,
      "document_expiry_date"
    )
  };
}

function buildEvidenceHashes(
  context: IprPhaseFormBuildDataContext
): Phase3OfficialDocumentEvidenceHashes {
  const documentFrontSha256 = getUploadHash(
    context,
    "OFFICIAL_DOCUMENT_FRONT"
  );
  const documentBackSha256 = getUploadHash(context, "OFFICIAL_DOCUMENT_BACK");
  const passportPageSha256 = getUploadHash(context, "PASSPORT_DATA_PAGE");

  return {
    ...(documentFrontSha256
      ? { document_front_sha256: documentFrontSha256 }
      : {}),
    ...(documentBackSha256
      ? { document_back_sha256: documentBackSha256 }
      : {}),
    ...(passportPageSha256
      ? { document_passport_page_sha256: passportPageSha256 }
      : {})
  };
}

async function buildPhase3OfficialDocumentData(
  context: IprPhaseFormBuildDataContext
): Promise<JsonObject> {
  const submittedPrivateFields = buildSubmittedPrivateFields(context);
  const privateFields = buildNormalizedPrivateFields(context);
  const hashFields = await buildHashFields(context);
  const evidenceHashes = buildEvidenceHashes(context);

  const previousPayloadSha256 =
    context.previousCertificate?.hash_integrity.payload_sha256 ?? null;

  const documentMetadataHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_3_DOCUMENT_METADATA",
    phase: "OFFICIAL_DOCUMENT_SUBMITTED",
    private_fields: privateFields,
    hash_fields: hashFields,
    evidence_hashes: evidenceHashes,
    previous_payload_sha256: previousPayloadSha256,
    issued_at: context.issuedAt
  });

  return {
    certificate_role: "STEP_3_OFFICIAL_DOCUMENT_COLLECTION",
    certificate_visibility: "PRIVATE_PORTABLE_CERTIFICATE",
    public_registry_mode: "HASH_ONLY",
    phase_scope: "OFFICIAL_ID_DOCUMENT",

    private_fields: privateFields,
    submitted_private_fields: submittedPrivateFields,
    official_document_private_data: privateFields,
    official_document_private_data_included: true,

    hash_fields: hashFields,
    evidence_hashes: evidenceHashes,

    document_type: privateFields.document_type,
    document_country: privateFields.document_country,
    document_type_hash: hashFields.document_type_hash,
    document_number_hash: hashFields.document_number_hash,
    document_country_hash: hashFields.document_country_hash,
    document_issuer_hash: hashFields.document_issuer_hash,
    document_issue_date_hash: hashFields.document_issue_date_hash,
    document_expiry_date_hash: hashFields.document_expiry_date_hash,
    document_metadata_hash: documentMetadataHash,

    fiscal_identity_collected: true,
    fiscal_identity_verified: false,
    official_document_uploaded: true,
    official_document_verified: false,
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
      liveness_verified: false,
      privacy_compliance_accepted: false,
      hbce_review_status: "NOT_STARTED",
      ipr_approved: false,
      ipr_card_issued: false,
      operational_certificate_issued: false,
      joker_c2_access: "DENIED"
    },

    previous_payload_sha256: previousPayloadSha256,
    next_required_phase: "LIVENESS_CHECK",
    issued_at: context.issuedAt,
    issued_at_utc: context.issuedAt,

    certificate_boundary:
      "This file records official document submission for the HBCE IPR onboarding chain. It does not certify final identity verification, it does not issue an IPR Card and it does not grant JOKER-C2 access.",

    privacy_boundary:
      "This is a private portable HBCE-IPR certificate downloaded by the subject. It may contain official document metadata. Uploaded document files are represented only by SHA-256 hashes and must be stored in protected backend storage in production.",

    ...evidenceHashes
  };
}

export default function Phase3OfficialDocumentPage() {
  return (
    <div className="hbce-container">
      <IprPhaseForm
        phase={phase}
        fields={fields}
        evidenceInputs={evidenceInputs}
        buildPhaseData={buildPhase3OfficialDocumentData}
        submitLabel="Generate HBCE IPR Certificate 03"
        successTitle="HBCE IPR Certificate 03 generated"
        successDescription="The private official document certificate has been generated and downloaded. It links Certificate 02 to the submitted official document metadata, records the corresponding hashes and stores only SHA-256 hashes for uploaded document evidence. Use this file in Phase 4 — Liveness Check."
      />
    </div>
  );
}
