"use client";

import IprPhaseForm from "@/components/IprPhaseForm";

import { sha256Canonical } from "@/lib/ipr-certificate-chain";
import { getPhaseDefinitionByNumber } from "@/lib/ipr-phase-map";

import type {
  IprPhaseFieldDefinition,
  IprPhaseFormBuildDataContext
} from "@/components/IprPhaseForm";

import type { JsonObject } from "@/lib/types";

const phase = getPhaseDefinitionByNumber(1);

const fields: IprPhaseFieldDefinition[] = [
  {
    name: "email",
    label: "Email",
    type: "email",
    placeholder: "name@example.com",
    helperText:
      "Used only to generate the first hash-only HBCE-IPR subject reference."
  },
  {
    name: "phone_number",
    label: "Phone number",
    type: "tel",
    placeholder: "+39 000 000 0000",
    helperText:
      "Required for the initial onboarding subject record. Production verification requires backend confirmation."
  },
  {
    name: "first_name",
    label: "First name",
    type: "text",
    placeholder: "Mario"
  },
  {
    name: "last_name",
    label: "Last name",
    type: "text",
    placeholder: "Rossi"
  },
  {
    name: "country",
    label: "Country",
    type: "text",
    placeholder: "IT"
  },
  {
    name: "date_of_birth",
    label: "Date of birth",
    type: "date"
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
    kind: "HBCE_IPR_PHASE_1_FIELD",
    field: fieldName,
    value: getStringValue(context, fieldName)
  });
}

async function buildPhase1SubjectData(
  context: IprPhaseFormBuildDataContext
): Promise<JsonObject> {
  return {
    email_hash: await hashPhaseValue(context, "email"),
    phone_hash: await hashPhaseValue(context, "phone_number"),
    first_name_hash: await hashPhaseValue(context, "first_name"),
    last_name_hash: await hashPhaseValue(context, "last_name"),
    country_hash: await hashPhaseValue(context, "country"),
    date_of_birth_hash: await hashPhaseValue(context, "date_of_birth"),
    subject_creation_mode: "SELF_INITIATED_IPR_REQUEST",
    previous_payload_sha256: null,
    next_required_phase: "FISCAL_IDENTITY",
    issued_at: context.issuedAt
  };
}

export default function Phase1SubjectCreatedPage() {
  return (
    <div className="hbce-container">
      <IprPhaseForm
        phase={phase}
        fields={fields}
        buildPhaseData={buildPhase1SubjectData}
        submitLabel="Generate HBCE IPR Certificate 01"
        successTitle="HBCE IPR Certificate 01 generated"
        successDescription="The first HBCE-IPR certificate has been generated and downloaded. Use this file in Phase 2 — Fiscal Identity."
      />
    </div>
  );
}
