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
      "This value is written inside the private HBCE-IPR certificate and also hashed for verification."
  },
  {
    name: "document_number",
    label: "Document number",
    type: "text",
    placeholder: "CA000000X",
    helperText:
      "This value is written inside the private HBCE-IPR certificate and also hashed for verification."
  },
  {
    name: "document_country",
    label: "Document country",
    type: "text",
    placeholder: "IT",
    helperText:
      "This value is written inside the private HBCE-IPR certificate and also hashed for verification."
  },
  {
    name: "document_issuer",
    label: "Issuing authority",
    type: "text",
    placeholder: "Comune / Ministry / Issuing authority",
    helperText:
      "This value is written inside the private HBCE-IPR certificate and also hashed for verification."
  },
  {
    name: "document_issue_date",
    label: "Issue date",
    type: "date",
    helperText:
      "This value is written inside the private HBCE-IPR certificate and also hashed for verification."
  },
  {
    name: "document_expiry_date",
    label: "Expiry date",
    type: "date",
    helperText:
      "This value is written inside the private HBCE-IPR certificate and also hashed for verification."
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
    kind: "HBCE_IPR_PHASE_3_FIELD",
    field: fieldName,
    value: getStringValue(context, fieldName)
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

async function buildPhase3OfficialDocumentData(
  context: IprPhaseFormBuildDataContext
): Promise<JsonObject> {
  const documentFrontSha256 = getUploadHash(
    context,
    "OFFICIAL_DOCUMENT_FRONT"
  );
  const documentBackSha256 = getUploadHash(context, "OFFICIAL_DOCUMENT_BACK");
  const passportPageSha256 = getUploadHash(context, "PASSPORT_DATA_PAGE");

  const privateFields = {
    document_type: getStringValue(context, "document_type"),
    document_number: getStringValue(context, "document_number"),
    document_country: getStringValue(context, "document_country"),
    document_issuer: getStringValue(context, "document_issuer"),
    document_issue_date: getStringValue(context, "document_issue_date"),
    document_expiry_date: getStringValue(context, "document_expiry_date")
  };

  const hashFields = {
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

  const evidenceHashes = {
    document_front_sha256: documentFrontSha256,
    document_back_sha256: documentBackSha256,
    document_passport_page_sha256: passportPageSha256
  };

  const documentMetadataHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_3_DOCUMENT_METADATA",
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
    phase_scope: "OFFICIAL_ID_DOCUMENT",

    private_fields: privateFields,
    hash_fields: hashFields,
    evidence_hashes: evidenceHashes,

    document_type: privateFields.document_type,
    document_country: privateFields.document_country,
    document_number_hash: hashFields.document_number_hash,
    document_issuer_hash: hashFields.document_issuer_hash,
    document_issue_date_hash: hashFields.document_issue_date_hash,
    document_expiry_date_hash: hashFields.document_expiry_date_hash,
    document_metadata_hash: documentMetadataHash,

    previous_payload_sha256:
      context.previousCertificate?.hash_integrity.payload_sha256 ?? null,
    next_required_phase: "LIVENESS_CHECK",
    issued_at: context.issuedAt,

    privacy_boundary:
      "This is a private portable HBCE-IPR certificate downloaded by the subject. Official document metadata is stored inside private_fields. Uploaded document files are represented only by SHA-256 hashes and must be stored in protected backend storage in production.",

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
        successDescription="The private official document certificate has been generated and downloaded. It contains the inserted document metadata, the corresponding hashes and the SHA-256 hashes of uploaded document evidence. Use this file in Phase 4 — Liveness Check."
      />
    </div>
  );
}
