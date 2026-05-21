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

type Phase2FiscalPrivateFields = {
  tax_id: string;
  citizenship: string;
  fiscal_country: string;
  fiscal_document_type: string;
};

type Phase2FiscalHashFields = {
  tax_id_value_hash: string;
  citizenship_hash: string;
  fiscal_country_hash: string;
  fiscal_document_type_hash: string;
};

type Phase2FiscalEvidenceHashes = {
  tax_id_document_front_sha256?: string;
  tax_id_document_back_sha256?: string;
  tax_id_document_sha256?: string;
};

const phase = getPhaseDefinitionByNumber(2);

const fields: IprPhaseFieldDefinition[] = [
  {
    name: "tax_id",
    label: "Codice fiscale / Tax ID / National Tax Identifier",
    type: "text",
    placeholder: "RSSMRA88B05A944X",
    helperText:
      "Fiscal identity value. It is included in the private HBCE-IPR certificate and hashed for audit verification."
  },
  {
    name: "citizenship",
    label: "Citizenship",
    type: "text",
    placeholder: "IT",
    helperText:
      "Citizenship value declared by the subject. It is included in the private certificate and hashed."
  },
  {
    name: "fiscal_country",
    label: "Fiscal country",
    type: "text",
    placeholder: "IT",
    helperText:
      "Fiscal jurisdiction declared by the subject. It is included in the private certificate and hashed."
  },
  {
    name: "fiscal_document_type",
    label: "Fiscal document type",
    type: "select",
    options: [
      {
        label: "Italian tessera sanitaria / codice fiscale",
        value: "ITALIAN_TESSERA_SANITARIA"
      },
      {
        label: "Italian codice fiscale certificate",
        value: "ITALIAN_CODICE_FISCALE"
      },
      {
        label: "EU tax ID document",
        value: "EU_TAX_ID_DOCUMENT"
      },
      {
        label: "National fiscal document",
        value: "NATIONAL_FISCAL_DOCUMENT"
      },
      {
        label: "Other authorized fiscal document",
        value: "OTHER_AUTHORIZED_FISCAL_DOCUMENT"
      }
    ],
    helperText:
      "The selected fiscal evidence type is included in the private certificate. Uploaded documents are represented only by SHA-256 hashes."
  }
];

const evidenceInputs: IprPhaseEvidenceInputDefinition[] = [
  {
    kind: "TAX_ID_DOCUMENT_FRONT",
    label: "Upload tessera sanitaria / tax ID document front",
    description:
      "Upload the front side of the tessera sanitaria, codice fiscale card or equivalent fiscal document. The file itself is not embedded in the certificate; only its SHA-256 hash is stored.",
    accept: "image/*,.pdf",
    required: true
  },
  {
    kind: "TAX_ID_DOCUMENT_BACK",
    label: "Upload tessera sanitaria / tax ID document back",
    description:
      "Upload the back side of the tessera sanitaria, codice fiscale card or equivalent fiscal document. The file itself is not embedded in the certificate; only its SHA-256 hash is stored.",
    accept: "image/*,.pdf",
    required: true
  },
  {
    kind: "TAX_ID_DOCUMENT_SINGLE",
    label: "Optional single fiscal certificate",
    description:
      "Use this only when the fiscal evidence is a single-page certificate instead of a front/back card. The file itself is not embedded in the certificate; only its SHA-256 hash is stored.",
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

function normalizeTaxId(value: string): string {
  return value.replace(/\s+/g, "").trim().toUpperCase();
}

function normalizeCountryCode(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeDocumentType(value: string): string {
  return value.trim().toUpperCase();
}

function getNormalizedPhase2Value(
  context: IprPhaseFormBuildDataContext,
  fieldName: string
): string {
  const rawValue = getRawStringValue(context, fieldName);

  switch (fieldName) {
    case "tax_id":
      return normalizeTaxId(rawValue);
    case "citizenship":
    case "fiscal_country":
      return normalizeCountryCode(rawValue);
    case "fiscal_document_type":
      return normalizeDocumentType(rawValue);
    default:
      return rawValue;
  }
}

async function hashPhaseValue(
  context: IprPhaseFormBuildDataContext,
  fieldName: string
): Promise<string> {
  return sha256Canonical({
    kind: "HBCE_IPR_PHASE_2_FISCAL_FIELD",
    phase: "FISCAL_IDENTITY_COLLECTED",
    field: fieldName,
    value: getNormalizedPhase2Value(context, fieldName),
    previous_payload_sha256:
      context.previousCertificate?.hash_integrity.payload_sha256 ?? null
  });
}

function getUploadHash(
  context: IprPhaseFormBuildDataContext,
  kind:
    | "TAX_ID_DOCUMENT_FRONT"
    | "TAX_ID_DOCUMENT_BACK"
    | "TAX_ID_DOCUMENT_SINGLE"
): string | null {
  return context.uploads.find((upload) => upload.kind === kind)?.sha256 ?? null;
}

function buildSubmittedPrivateFields(
  context: IprPhaseFormBuildDataContext
): Phase2FiscalPrivateFields {
  return {
    tax_id: getRawStringValue(context, "tax_id"),
    citizenship: getRawStringValue(context, "citizenship"),
    fiscal_country: getRawStringValue(context, "fiscal_country"),
    fiscal_document_type: getRawStringValue(context, "fiscal_document_type")
  };
}

function buildNormalizedPrivateFields(
  context: IprPhaseFormBuildDataContext
): Phase2FiscalPrivateFields {
  return {
    tax_id: getNormalizedPhase2Value(context, "tax_id"),
    citizenship: getNormalizedPhase2Value(context, "citizenship"),
    fiscal_country: getNormalizedPhase2Value(context, "fiscal_country"),
    fiscal_document_type: getNormalizedPhase2Value(
      context,
      "fiscal_document_type"
    )
  };
}

async function buildHashFields(
  context: IprPhaseFormBuildDataContext
): Promise<Phase2FiscalHashFields> {
  return {
    tax_id_value_hash: await hashPhaseValue(context, "tax_id"),
    citizenship_hash: await hashPhaseValue(context, "citizenship"),
    fiscal_country_hash: await hashPhaseValue(context, "fiscal_country"),
    fiscal_document_type_hash: await hashPhaseValue(
      context,
      "fiscal_document_type"
    )
  };
}

function buildEvidenceHashes(
  context: IprPhaseFormBuildDataContext
): Phase2FiscalEvidenceHashes {
  const taxIdDocumentFrontSha256 = getUploadHash(
    context,
    "TAX_ID_DOCUMENT_FRONT"
  );
  const taxIdDocumentBackSha256 = getUploadHash(
    context,
    "TAX_ID_DOCUMENT_BACK"
  );
  const taxIdDocumentSingleSha256 = getUploadHash(
    context,
    "TAX_ID_DOCUMENT_SINGLE"
  );

  return {
    ...(taxIdDocumentFrontSha256
      ? { tax_id_document_front_sha256: taxIdDocumentFrontSha256 }
      : {}),
    ...(taxIdDocumentBackSha256
      ? { tax_id_document_back_sha256: taxIdDocumentBackSha256 }
      : {}),
    ...(taxIdDocumentSingleSha256
      ? { tax_id_document_sha256: taxIdDocumentSingleSha256 }
      : {})
  };
}

async function buildPhase2FiscalIdentityData(
  context: IprPhaseFormBuildDataContext
): Promise<JsonObject> {
  const submittedPrivateFields = buildSubmittedPrivateFields(context);
  const privateFields = buildNormalizedPrivateFields(context);
  const hashFields = await buildHashFields(context);
  const evidenceHashes = buildEvidenceHashes(context);

  const previousPayloadSha256 =
    context.previousCertificate?.hash_integrity.payload_sha256 ?? null;

  const metadataHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_2_FISCAL_METADATA",
    phase: "FISCAL_IDENTITY_COLLECTED",
    private_fields: privateFields,
    hash_fields: hashFields,
    evidence_hashes: evidenceHashes,
    previous_payload_sha256: previousPayloadSha256,
    issued_at: context.issuedAt
  });

  return {
    certificate_role: "STEP_2_FISCAL_IDENTITY_COLLECTION",
    certificate_visibility: "PRIVATE_PORTABLE_CERTIFICATE",
    public_registry_mode: "HASH_ONLY",
    phase_scope: "FISCAL_IDENTITY",

    private_fields: privateFields,
    submitted_private_fields: submittedPrivateFields,
    fiscal_private_data: privateFields,
    fiscal_private_data_included: true,

    hash_fields: hashFields,
    evidence_hashes: evidenceHashes,

    tax_id_value_hash: hashFields.tax_id_value_hash,
    citizenship_hash: hashFields.citizenship_hash,
    fiscal_country_hash: hashFields.fiscal_country_hash,
    fiscal_document_type_hash: hashFields.fiscal_document_type_hash,
    tax_id_metadata_hash: metadataHash,

    fiscal_identity_collected: true,
    fiscal_identity_verified: false,
    official_document_uploaded: false,
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
      official_document_uploaded: false,
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
    next_required_phase: "OFFICIAL_ID_DOCUMENT",
    issued_at: context.issuedAt,
    issued_at_utc: context.issuedAt,

    certificate_boundary:
      "This file records fiscal identity collection for the HBCE IPR onboarding chain. It does not certify final identity verification, it does not issue an IPR Card and it does not grant JOKER-C2 access.",

    privacy_boundary:
      "This is a private portable HBCE-IPR certificate downloaded by the subject. It may contain fiscal identity values. Uploaded fiscal evidence is represented only by SHA-256 hashes and must be stored in protected backend storage in production.",

    ...evidenceHashes
  };
}

export default function Phase2FiscalIdentityPage() {
  return (
    <div className="hbce-container">
      <IprPhaseForm
        phase={phase}
        fields={fields}
        evidenceInputs={evidenceInputs}
        buildPhaseData={buildPhase2FiscalIdentityData}
        submitLabel="Generate HBCE IPR Certificate 02"
        successTitle="HBCE IPR Certificate 02 generated"
        successDescription="The private fiscal identity certificate has been generated and downloaded. It links Certificate 01 to the declared fiscal identity, records the corresponding hashes and stores only SHA-256 hashes for uploaded fiscal evidence. Use this file in Phase 3 — Official ID Document."
      />
    </div>
  );
}
