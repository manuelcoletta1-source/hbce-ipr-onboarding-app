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
      "Enter the fiscal identifier used for the HBCE-IPR fiscal identity phase."
  },
  {
    name: "citizenship",
    label: "Citizenship",
    type: "text",
    placeholder: "IT"
  },
  {
    name: "fiscal_country",
    label: "Fiscal country",
    type: "text",
    placeholder: "IT"
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
      "The portable certificate stores hashes only. Raw documents require protected backend storage in production."
  }
];

const evidenceInputs: IprPhaseEvidenceInputDefinition[] = [
  {
    kind: "TAX_ID_DOCUMENT_FRONT",
    label: "Upload tessera sanitaria / tax ID document front",
    description:
      "Upload the front side of the tessera sanitaria, codice fiscale card or equivalent fiscal document.",
    accept: "image/*,.pdf",
    required: true
  },
  {
    kind: "TAX_ID_DOCUMENT_BACK",
    label: "Upload tessera sanitaria / tax ID document back",
    description:
      "Upload the back side of the tessera sanitaria, codice fiscale card or equivalent fiscal document.",
    accept: "image/*,.pdf",
    required: true
  },
  {
    kind: "TAX_ID_DOCUMENT_SINGLE",
    label: "Optional single fiscal certificate",
    description:
      "Use this only when the fiscal evidence is a single-page certificate instead of a front/back card.",
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

  const metadataHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_2_FISCAL_METADATA",
    tax_id_hash: await hashPhaseValue(context, "tax_id"),
    citizenship_hash: await hashPhaseValue(context, "citizenship"),
    fiscal_country_hash: await hashPhaseValue(context, "fiscal_country"),
    fiscal_document_type_hash: await hashPhaseValue(
      context,
      "fiscal_document_type"
    ),
    tax_id_document_front_sha256: taxIdDocumentFrontSha256,
    tax_id_document_back_sha256: taxIdDocumentBackSha256,
    tax_id_document_single_sha256: taxIdDocumentSingleSha256
  });

  return {
    tax_id_value_hash: await hashPhaseValue(context, "tax_id"),
    citizenship_hash: await hashPhaseValue(context, "citizenship"),
    fiscal_country_hash: await hashPhaseValue(context, "fiscal_country"),
    fiscal_document_type_hash: await hashPhaseValue(
      context,
      "fiscal_document_type"
    ),
    tax_id_metadata_hash: metadataHash,
    previous_payload_sha256:
      context.previousCertificate?.hash_integrity.payload_sha256 ?? null,
    next_required_phase: "OFFICIAL_ID_DOCUMENT",
    issued_at: context.issuedAt,
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
        successDescription="The fiscal identity certificate has been generated and downloaded. Use this file in Phase 3 — Official ID Document."
      />
    </div>
  );
}
