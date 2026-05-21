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
      "Customer email. It is included in the private portable certificate and hashed for audit verification."
  },
  {
    name: "phone_number",
    label: "Phone number",
    type: "tel",
    placeholder: "+39 000 000 0000",
    helperText:
      "Customer phone number. It is included in the private portable certificate and hashed for audit verification."
  },
  {
    name: "first_name",
    label: "First name",
    type: "text",
    placeholder: "Mario",
    helperText:
      "Customer first name. It is included in the private portable certificate and hashed for audit verification."
  },
  {
    name: "last_name",
    label: "Last name",
    type: "text",
    placeholder: "Rossi",
    helperText:
      "Customer last name. It is included in the private portable certificate and hashed for audit verification."
  },
  {
    name: "country",
    label: "Country",
    type: "text",
    placeholder: "Italy / IT",
    helperText:
      "Customer country or country code. It is included in the private portable certificate and hashed."
  },
  {
    name: "date_of_birth",
    label: "Date of birth",
    type: "date",
    helperText:
      "Customer date of birth. It is included in the private portable certificate and hashed."
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

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhoneNumber(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

function normalizeName(value: string): string {
  return value.trim();
}

function normalizeCountry(value: string): string {
  return value.trim();
}

function normalizeDate(value: string): string {
  return value.trim();
}

function getNormalizedPhase1Value(
  context: IprPhaseFormBuildDataContext,
  fieldName: string
): string {
  const rawValue = getRawStringValue(context, fieldName);

  switch (fieldName) {
    case "email":
      return normalizeEmail(rawValue);
    case "phone_number":
      return normalizePhoneNumber(rawValue);
    case "first_name":
    case "last_name":
      return normalizeName(rawValue);
    case "country":
      return normalizeCountry(rawValue);
    case "date_of_birth":
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
    kind: "HBCE_IPR_PHASE_1_CUSTOMER_FIELD",
    phase: "SUBJECT_CREATED",
    field: fieldName,
    value: getNormalizedPhase1Value(context, fieldName)
  });
}

function buildSubmittedPrivateFields(
  context: IprPhaseFormBuildDataContext
): JsonObject {
  return {
    email: getRawStringValue(context, "email"),
    phone_number: getRawStringValue(context, "phone_number"),
    first_name: getRawStringValue(context, "first_name"),
    last_name: getRawStringValue(context, "last_name"),
    country: getRawStringValue(context, "country"),
    date_of_birth: getRawStringValue(context, "date_of_birth")
  };
}

function buildNormalizedPrivateFields(
  context: IprPhaseFormBuildDataContext
): JsonObject {
  return {
    email: getNormalizedPhase1Value(context, "email"),
    phone_number: getNormalizedPhase1Value(context, "phone_number"),
    first_name: getNormalizedPhase1Value(context, "first_name"),
    last_name: getNormalizedPhase1Value(context, "last_name"),
    country: getNormalizedPhase1Value(context, "country"),
    date_of_birth: getNormalizedPhase1Value(context, "date_of_birth")
  };
}

async function buildHashFields(
  context: IprPhaseFormBuildDataContext
): Promise<JsonObject> {
  return {
    email_hash: await hashPhaseValue(context, "email"),
    phone_hash: await hashPhaseValue(context, "phone_number"),
    first_name_hash: await hashPhaseValue(context, "first_name"),
    last_name_hash: await hashPhaseValue(context, "last_name"),
    country_hash: await hashPhaseValue(context, "country"),
    date_of_birth_hash: await hashPhaseValue(context, "date_of_birth")
  };
}

async function buildPhase1SubjectData(
  context: IprPhaseFormBuildDataContext
): Promise<JsonObject> {
  const submittedPrivateFields = buildSubmittedPrivateFields(context);
  const privateFields = buildNormalizedPrivateFields(context);
  const hashFields = await buildHashFields(context);

  return {
    certificate_role: "STEP_1_CLIENT_INTAKE",
    certificate_visibility: "PRIVATE_PORTABLE_CERTIFICATE",
    public_registry_mode: "HASH_ONLY",
    subject_creation_mode: "SELF_INITIATED_IPR_REQUEST",

    private_fields: privateFields,
    submitted_private_fields: submittedPrivateFields,
    client_private_data: privateFields,
    client_private_data_included: true,

    hash_fields: hashFields,

    email_hash: hashFields.email_hash,
    phone_hash: hashFields.phone_hash,
    first_name_hash: hashFields.first_name_hash,
    last_name_hash: hashFields.last_name_hash,
    country_hash: hashFields.country_hash,
    date_of_birth_hash: hashFields.date_of_birth_hash,

    ipr_status: "NOT_YET_ISSUED",
    ipr_card_status: "NOT_ISSUED",
    joker_c2_access: "DENIED",

    verification_state: {
      email_verified: false,
      phone_verified: false,
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

    previous_payload_sha256: null,
    next_required_phase: "FISCAL_IDENTITY",
    issued_at: context.issuedAt,
    created_at_utc: context.issuedAt,

    certificate_boundary:
      "This file records the creation of the HBCE IPR customer profile request. It does not certify verified identity, it does not issue an IPR Card and it does not grant JOKER-C2 access.",

    privacy_boundary:
      "This is a private portable HBCE-IPR certificate downloaded by the subject. It may contain customer intake data. Public verification must expose hash-only references, not private identity fields."
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
        successDescription="The first private HBCE-IPR certificate has been generated and downloaded. It records the customer profile creation, the exact creation timestamp and the corresponding hash references. It does not verify the identity yet. Use this file in Phase 2 — Fiscal Identity."
      />
    </div>
  );
}
