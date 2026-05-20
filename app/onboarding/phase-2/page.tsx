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

const phase = getPhaseDefinitionByNumber(2);

const fields: IprPhaseFieldDefinition[] = [
  {
    name: "tax_id",
    label: "Codice fiscale / Tax ID / National Tax Identifier",
    type: "text",
    placeholder: "RSSMRA88B05A944X",
    helperText:
      "This value is written inside the private HBCE-IPR certificate and also hashed for verification."
  },
  {
    name: "citizenship",
    label: "Citizenship",
    type: "text",
    placeholder: "IT",
    helperText:
      "This value is written inside the private HBCE-IPR certificate and also hashed for verification."
  },
  {
    name: "fiscal_country",
    label: "Fiscal country",
    type: "text",
    placeholder: "IT",
    helperText:
      "This value is written inside the private HBCE-IPR certificate and also hashed for verification."
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
      "The selected value is written inside the private certificate. Uploaded fiscal evidence is represented only by SHA-256 hashes."
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
    kind: "HBCE_IPR_PHASE_2_FIELD",
    field: fieldName,
    value: getStringValue(context, fieldName)
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

async function buildPhase2FiscalIdentityData(
  context: IprPhaseFormBuildDataContext
): Promise<JsonObject> {
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

  const privateFields = {
    tax_id: getStringValue(context, "tax_id"),
    citizenship: getStringValue(context, "citizenship"),
    fiscal_country: getStringValue(context, "fiscal_country"),
    fiscal_document_type: getStringValue(context, "fiscal_document_type")
  };

  const hashFields = {
    tax_id_value_hash: await hashPhaseValue(context, "tax_id"),
    citizenship_hash: await hashPhaseValue(context, "citizenship"),
    fiscal_country_hash: await hashPhaseValue(context, "fiscal_country"),
    fiscal_document_type_hash: await hashPhaseValue(
      context,
      "fiscal_document_type"
    )
  };

  const evidenceHashes = {
    tax_id_document_front_sha256: taxIdDocumentFrontSha256,
    tax_id_document_back_sha256: taxIdDocumentBackSha256,
    tax_id_document_sha256: taxIdDocumentSingleSha256
  };

  const metadataHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_2_FISCAL_METADATA",
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
    phase_scope: "FISCAL_IDENTITY",

    private_fields: privateFields,
    hash_fields: hashFields,
    evidence_hashes: evidenceHashes,

    tax_id_value_hash: hashFields.tax_id_value_hash,
    citizenship_hash: hashFields.citizenship_hash,
    fiscal_country_hash: hashFields.fiscal_country_hash,
    fiscal_document_type_hash: hashFields.fiscal_document_type_hash,
    tax_id_metadata_hash: metadataHash,

    previous_payload_sha256:
      context.previousCertificate?.hash_integrity.payload_sha256 ?? null,
    next_required_phase: "OFFICIAL_ID_DOCUMENT",
    issued_at: context.issuedAt,

    privacy_boundary:
      "This is a private portable HBCE-IPR certificate downloaded by the subject. Fiscal identity values are stored inside private_fields. Uploaded fiscal evidence is represented only by SHA-256 hashes and must be stored in protected backend storage in production.",

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
        successDescription="The private fiscal identity certificate has been generated and downloaded. It contains the inserted fiscal data, the corresponding hashes and the SHA-256 hashes of uploaded fiscal evidence. Use this file in Phase 3 — Official ID Document."
      />
    </div>
  );
}
