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
      "This value is written inside the private HBCE-IPR certificate and also hashed for verification."
  },
  {
    name: "phone_number",
    label: "Phone number",
    type: "tel",
    placeholder: "+39 000 000 0000",
    helperText:
      "This value is written inside the private HBCE-IPR certificate and also hashed for verification."
  },
  {
    name: "first_name",
    label: "First name",
    type: "text",
    placeholder: "Mario",
    helperText:
      "This value is written inside the private HBCE-IPR certificate and also hashed for verification."
  },
  {
    name: "last_name",
    label: "Last name",
    type: "text",
    placeholder: "Rossi",
    helperText:
      "This value is written inside the private HBCE-IPR certificate and also hashed for verification."
  },
  {
    name: "country",
    label: "Country",
    type: "text",
    placeholder: "IT",
    helperText:
      "Use the country code or country name provided by the subject."
  },
  {
    name: "date_of_birth",
    label: "Date of birth",
    type: "date",
    helperText:
      "This value is written inside the private certificate and hashed."
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
  const privateFields = {
    email: getStringValue(context, "email"),
    phone_number: getStringValue(context, "phone_number"),
    first_name: getStringValue(context, "first_name"),
    last_name: getStringValue(context, "last_name"),
    country: getStringValue(context, "country"),
    date_of_birth: getStringValue(context, "date_of_birth")
  };

  const hashFields = {
    email_hash: await hashPhaseValue(context, "email"),
    phone_hash: await hashPhaseValue(context, "phone_number"),
    first_name_hash: await hashPhaseValue(context, "first_name"),
    last_name_hash: await hashPhaseValue(context, "last_name"),
    country_hash: await hashPhaseValue(context, "country"),
    date_of_birth_hash: await hashPhaseValue(context, "date_of_birth")
  };

  return {
    certificate_visibility: "PRIVATE_PORTABLE_CERTIFICATE",
    public_registry_mode: "HASH_ONLY",
    subject_creation_mode: "SELF_INITIATED_IPR_REQUEST",

    private_fields: privateFields,
    hash_fields: hashFields,

    email_hash: hashFields.email_hash,
    phone_hash: hashFields.phone_hash,
    first_name_hash: hashFields.first_name_hash,
    last_name_hash: hashFields.last_name_hash,
    country_hash: hashFields.country_hash,
    date_of_birth_hash: hashFields.date_of_birth_hash,

    previous_payload_sha256: null,
    next_required_phase: "FISCAL_IDENTITY",
    issued_at: context.issuedAt,

    privacy_boundary:
      "This is a private portable HBCE-IPR certificate downloaded by the subject. Public verification must expose hash-only references, not private fields."
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
        successDescription="The first private HBCE-IPR certificate has been generated and downloaded. It contains the inserted subject data and the corresponding hashes. Use this file in Phase 2 — Fiscal Identity."
      />
    </div>
  );
}
