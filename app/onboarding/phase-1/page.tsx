"use client";

import IprPhaseForm from "@/components/IprPhaseForm";

import { sha256Canonical } from "@/lib/ipr-certificate-chain";
import { getPhaseDefinitionByNumber } from "@/lib/ipr-phase-map";

import type {
  IprPhaseFieldDefinition,
  IprPhaseFormBuildDataContext
} from "@/components/IprPhaseForm";

import type {
  HbceJokerC2BiologicalIdentitySnapshot,
  JsonObject
} from "@/lib/types";

type Phase1CustomerFields = JsonObject & {
  email: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  country: string;
  date_of_birth: string;
};

type Phase1HashFields = JsonObject & {
  email_hash: string;
  phone_hash: string;
  first_name_hash: string;
  last_name_hash: string;
  country_hash: string;
  date_of_birth_hash: string;
};

type Phase1EmailVerificationFields = JsonObject & {
  email_verified: true;
  email_verified_at: string;
  email_verification_channel: "EMAIL_OTP";
  email_verification_hash: string;
};

type Phase1PhoneVerificationFields = JsonObject & {
  phone_verified: true;
  phone_verified_at: string;
  phone_verification_channel: "SMS_OTP";
  phone_verification_hash: string;
};

type Phase1RegistrationSnapshot = JsonObject & {
  subject_creation_mode: "SELF_INITIATED_IPR_REQUEST";
  display_name: string;
  email: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  country: string;
  birth_date: string;
  email_verified: true;
  phone_verified: true;
  email_verification_channel: "EMAIL_OTP";
  phone_verification_channel: "SMS_OTP";
  fiscal_identity_collected: false;
  fiscal_identity_verified: false;
  official_document_uploaded: false;
  official_document_verified: false;
  liveness_submitted: false;
  liveness_verified: false;
  privacy_compliance_accepted: false;
  ipr_approved: false;
  ipr_card_issued: false;
  operational_certificate_issued: false;
  joker_c2_access: "DENIED";
  next_required_phase: "FISCAL_IDENTITY";
};

const phase = getPhaseDefinitionByNumber(1);

const fields: IprPhaseFieldDefinition[] = [
  {
    name: "email",
    label: "Email",
    type: "email",
    placeholder: "name@example.com",
    helperText:
      "Customer email. It must be verified by one-time code before Certificate 01 can be generated."
  },
  {
    name: "phone_number",
    label: "Phone number",
    type: "tel",
    placeholder: "+39 000 000 0000",
    helperText:
      "Customer phone number. It must be verified by SMS one-time code before Certificate 01 can be generated."
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

function buildDisplayName(fields: Phase1CustomerFields): string {
  return [fields.first_name, fields.last_name].filter(Boolean).join(" ").trim();
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

function buildEmailVerificationFields(
  context: IprPhaseFormBuildDataContext
): Phase1EmailVerificationFields {
  if (!context.emailVerification?.email_verified) {
    throw new Error(
      "Email verification is required before generating Certificate 01."
    );
  }

  return {
    email_verified: true,
    email_verified_at: context.emailVerification.email_verified_at,
    email_verification_channel:
      context.emailVerification.email_verification_channel,
    email_verification_hash: context.emailVerification.email_verification_hash
  };
}

function buildPhoneVerificationFields(
  context: IprPhaseFormBuildDataContext
): Phase1PhoneVerificationFields {
  if (!context.phoneVerification?.phone_verified) {
    throw new Error(
      "Phone verification is required before generating Certificate 01."
    );
  }

  return {
    phone_verified: true,
    phone_verified_at: context.phoneVerification.phone_verified_at,
    phone_verification_channel:
      context.phoneVerification.phone_verification_channel,
    phone_verification_hash: context.phoneVerification.phone_verification_hash
  };
}

async function hashPhaseValue(
  context: IprPhaseFormBuildDataContext,
  fieldName: string
): Promise<string> {
  return sha256Canonical({
    kind: "HBCE_IPR_PHASE_1_CUSTOMER_FIELD",
    phase: "SUBJECT_CREATED",
    field: fieldName,
    value: getNormalizedPhase1Value(context, fieldName),
    issued_at: context.issuedAt
  });
}

function buildSubmittedPrivateFields(
  context: IprPhaseFormBuildDataContext
): Phase1CustomerFields {
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
): Phase1CustomerFields {
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
): Promise<Phase1HashFields> {
  return {
    email_hash: await hashPhaseValue(context, "email"),
    phone_hash: await hashPhaseValue(context, "phone_number"),
    first_name_hash: await hashPhaseValue(context, "first_name"),
    last_name_hash: await hashPhaseValue(context, "last_name"),
    country_hash: await hashPhaseValue(context, "country"),
    date_of_birth_hash: await hashPhaseValue(context, "date_of_birth")
  };
}

async function buildEmailVerificationAuditHash(
  context: IprPhaseFormBuildDataContext,
  emailVerificationFields: Phase1EmailVerificationFields
): Promise<string> {
  return sha256Canonical({
    kind: "HBCE_IPR_PHASE_1_EMAIL_VERIFICATION_AUDIT",
    phase: "SUBJECT_CREATED",
    email: getNormalizedPhase1Value(context, "email"),
    email_verified: emailVerificationFields.email_verified,
    email_verified_at: emailVerificationFields.email_verified_at,
    email_verification_channel:
      emailVerificationFields.email_verification_channel,
    email_verification_hash: emailVerificationFields.email_verification_hash,
    issued_at: context.issuedAt
  });
}

async function buildPhoneVerificationAuditHash(
  context: IprPhaseFormBuildDataContext,
  phoneVerificationFields: Phase1PhoneVerificationFields
): Promise<string> {
  return sha256Canonical({
    kind: "HBCE_IPR_PHASE_1_PHONE_VERIFICATION_AUDIT",
    phase: "SUBJECT_CREATED",
    phone_number: getNormalizedPhase1Value(context, "phone_number"),
    phone_verified: phoneVerificationFields.phone_verified,
    phone_verified_at: phoneVerificationFields.phone_verified_at,
    phone_verification_channel:
      phoneVerificationFields.phone_verification_channel,
    phone_verification_hash: phoneVerificationFields.phone_verification_hash,
    issued_at: context.issuedAt
  });
}

function buildRegistrationSnapshot(params: {
  privateFields: Phase1CustomerFields;
  emailVerificationFields: Phase1EmailVerificationFields;
  phoneVerificationFields: Phase1PhoneVerificationFields;
}): Phase1RegistrationSnapshot {
  return {
    subject_creation_mode: "SELF_INITIATED_IPR_REQUEST",
    display_name: buildDisplayName(params.privateFields),
    email: params.privateFields.email,
    phone_number: params.privateFields.phone_number,
    first_name: params.privateFields.first_name,
    last_name: params.privateFields.last_name,
    country: params.privateFields.country,
    birth_date: params.privateFields.date_of_birth,
    email_verified: params.emailVerificationFields.email_verified,
    phone_verified: params.phoneVerificationFields.phone_verified,
    email_verification_channel:
      params.emailVerificationFields.email_verification_channel,
    phone_verification_channel:
      params.phoneVerificationFields.phone_verification_channel,
    fiscal_identity_collected: false,
    fiscal_identity_verified: false,
    official_document_uploaded: false,
    official_document_verified: false,
    liveness_submitted: false,
    liveness_verified: false,
    privacy_compliance_accepted: false,
    ipr_approved: false,
    ipr_card_issued: false,
    operational_certificate_issued: false,
    joker_c2_access: "DENIED",
    next_required_phase: "FISCAL_IDENTITY"
  };
}

function buildIdentitySnapshot(params: {
  privateFields: Phase1CustomerFields;
  emailVerificationFields: Phase1EmailVerificationFields;
  phoneVerificationFields: Phase1PhoneVerificationFields;
}): HbceJokerC2BiologicalIdentitySnapshot {
  return {
    display_name: buildDisplayName(params.privateFields),
    first_name: params.privateFields.first_name,
    last_name: params.privateFields.last_name,
    birth_date: params.privateFields.date_of_birth,
    birth_place: null,
    nationality: null,
    country: params.privateFields.country,
    email: params.privateFields.email,
    phone_number: params.privateFields.phone_number,
    fiscal_or_tax_identifier_ref: null,
    document_ref: null,
    phone_verified: params.phoneVerificationFields.phone_verified,
    email_verified: params.emailVerificationFields.email_verified,
    document_verified: false,
    liveness_verified: false,
    compliance_review_status: "SUBJECT_CREATED"
  };
}

async function buildPhase1SubjectData(
  context: IprPhaseFormBuildDataContext
): Promise<JsonObject> {
  const submittedPrivateFields = buildSubmittedPrivateFields(context);
  const privateFields = buildNormalizedPrivateFields(context);
  const hashFields = await buildHashFields(context);
  const emailVerificationFields = buildEmailVerificationFields(context);
  const phoneVerificationFields = buildPhoneVerificationFields(context);

  const emailVerificationAuditHash = await buildEmailVerificationAuditHash(
    context,
    emailVerificationFields
  );

  const phoneVerificationAuditHash = await buildPhoneVerificationAuditHash(
    context,
    phoneVerificationFields
  );

  const registrationSnapshot = buildRegistrationSnapshot({
    privateFields,
    emailVerificationFields,
    phoneVerificationFields
  });

  const identitySnapshot = buildIdentitySnapshot({
    privateFields,
    emailVerificationFields,
    phoneVerificationFields
  });

  const subjectCreationHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_1_SUBJECT_CREATION",
    phase: "SUBJECT_CREATED",
    private_fields: privateFields,
    hash_fields: hashFields,
    email_verification_fields: emailVerificationFields,
    phone_verification_fields: phoneVerificationFields,
    registration_snapshot: registrationSnapshot,
    identity_snapshot: identitySnapshot,
    previous_payload_sha256: null,
    issued_at: context.issuedAt
  });

  const identitySnapshotHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_1_IDENTITY_SNAPSHOT",
    phase: "SUBJECT_CREATED",
    identity_snapshot: identitySnapshot,
    registration_snapshot: registrationSnapshot,
    previous_payload_sha256: null,
    issued_at: context.issuedAt
  });

  const enrichedPrivateFields: JsonObject = {
    ...privateFields,
    email_verified: true,
    email_verified_at: emailVerificationFields.email_verified_at,
    email_verification_channel:
      emailVerificationFields.email_verification_channel,
    email_verification_hash: emailVerificationFields.email_verification_hash,
    phone_verified: true,
    phone_verified_at: phoneVerificationFields.phone_verified_at,
    phone_verification_channel:
      phoneVerificationFields.phone_verification_channel,
    phone_verification_hash: phoneVerificationFields.phone_verification_hash,
    identity_snapshot: identitySnapshot,
    biological_identity_snapshot: identitySnapshot,
    registration_snapshot: registrationSnapshot,
    subject_creation_hash: subjectCreationHash,
    identity_snapshot_hash: identitySnapshotHash
  };

  return {
    certificate_role: "STEP_1_CLIENT_INTAKE",
    certificate_visibility: "PRIVATE_PORTABLE_CERTIFICATE",
    public_registry_mode: "HASH_ONLY",
    phase_scope: "CLIENT_INTAKE",
    subject_creation_mode: "SELF_INITIATED_IPR_REQUEST",

    private_fields: enrichedPrivateFields,
    submitted_private_fields: submittedPrivateFields,
    client_private_data: enrichedPrivateFields,
    client_private_data_included: true,

    registration_fields: enrichedPrivateFields,
    registration_snapshot: registrationSnapshot,
    identity_snapshot: identitySnapshot,
    biological_identity_snapshot: identitySnapshot,

    email_verification_fields: emailVerificationFields,
    phone_verification_fields: phoneVerificationFields,

    hash_fields: {
      ...hashFields,
      email_verification_audit_hash: emailVerificationAuditHash,
      phone_verification_audit_hash: phoneVerificationAuditHash,
      subject_creation_hash: subjectCreationHash,
      identity_snapshot_hash: identitySnapshotHash
    },

    email_hash: hashFields.email_hash,
    phone_hash: hashFields.phone_hash,
    first_name_hash: hashFields.first_name_hash,
    last_name_hash: hashFields.last_name_hash,
    country_hash: hashFields.country_hash,
    date_of_birth_hash: hashFields.date_of_birth_hash,

    email: privateFields.email,
    phone_number: privateFields.phone_number,
    first_name: privateFields.first_name,
    last_name: privateFields.last_name,
    country: privateFields.country,
    birth_date: privateFields.date_of_birth,
    date_of_birth: privateFields.date_of_birth,
    display_name: registrationSnapshot.display_name,

    email_verified: emailVerificationFields.email_verified,
    email_verified_at: emailVerificationFields.email_verified_at,
    email_verification_channel:
      emailVerificationFields.email_verification_channel,
    email_verification_hash: emailVerificationFields.email_verification_hash,
    email_verification_audit_hash: emailVerificationAuditHash,

    phone_verified: phoneVerificationFields.phone_verified,
    phone_verified_at: phoneVerificationFields.phone_verified_at,
    phone_verification_channel:
      phoneVerificationFields.phone_verification_channel,
    phone_verification_hash: phoneVerificationFields.phone_verification_hash,
    phone_verification_audit_hash: phoneVerificationAuditHash,

    subject_creation_hash: subjectCreationHash,
    identity_snapshot_hash: identitySnapshotHash,

    fiscal_identity_collected: false,
    fiscal_identity_verified: false,
    official_document_uploaded: false,
    official_document_verified: false,
    liveness_submitted: false,
    liveness_verified: false,
    privacy_compliance_accepted: false,

    ipr_status: "NOT_YET_ISSUED",
    ipr_card_status: "NOT_ISSUED",
    operational_certificate_issued: false,
    joker_c2_access: "DENIED",

    verification_state: {
      email_verified: true,
      email_verified_at: emailVerificationFields.email_verified_at,
      email_verification_channel:
        emailVerificationFields.email_verification_channel,
      phone_verified: true,
      phone_verified_at: phoneVerificationFields.phone_verified_at,
      phone_verification_channel:
        phoneVerificationFields.phone_verification_channel,
      fiscal_identity_collected: false,
      fiscal_identity_verified: false,
      official_document_uploaded: false,
      official_document_verified: false,
      liveness_submitted: false,
      liveness_verified: false,
      privacy_compliance_accepted: false,
      hbce_review_status: "NOT_STARTED",
      ipr_approved: false,
      ipr_card_issued: false,
      operational_certificate_issued: false,
      joker_c2_access: "DENIED"
    },

    joker_c2_custody: {
      custody_statement:
        "AI JOKER-C2 is the future controlled operational custodian for minimized subject intake references, contact verification references and onboarding continuity inside HBCE governed runtime workflows.",
      full_data_custodian: "AI_JOKER_C2",
      custody_subject: registrationSnapshot.display_name,
      custody_ipr_id: null,
      custody_certificate_id: null,
      custody_fields_present: {
        identity_snapshot: true,
        registration_metadata: true,
        email_verification_reference: true,
        phone_verification_reference: true,
        raw_documents: false,
        raw_biometric_media: false
      },
      raw_documents_in_fragment: false,
      raw_document_images_in_fragment: false,
      raw_video_liveness_in_fragment: false,
      raw_biometric_templates_in_fragment: false,
      raw_face_templates_in_fragment: false,
      fragment_policy: "MINIMIZED_HANDOFF_ONLY"
    },

    previous_payload_sha256: null,
    next_required_phase: "FISCAL_IDENTITY",
    issued_at: context.issuedAt,
    issued_at_utc: context.issuedAt,
    created_at_utc: context.issuedAt,

    certificate_boundary:
      "This file records the creation of the HBCE IPR customer profile request after email OTP verification and phone SMS OTP verification. It does not certify verified identity, it does not issue an IPR Card and it does not grant JOKER-C2 access.",

    privacy_boundary:
      "This is a private portable HBCE-IPR certificate downloaded by the subject. It may contain customer intake data, email verification references and phone verification references. Public verification must expose hash-only references, not private identity fields. OTP codes are never written inside the certificate.",

    biometric_boundary:
      "Certificate 01 does not collect official documents, photos, videos, biometric templates or face templates. It creates only the initial subject/contact verification snapshot required for the next fiscal identity phase.",

    trust_boundary:
      "Certificate 01 creates the initial HBCE IPR onboarding subject only. Fiscal identity, official document, liveness, HBCE review, IPR Card issuance, operational certificate activation and JOKER-C2 access remain denied."
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
        successDescription="The first private HBCE-IPR certificate has been generated and downloaded after email OTP and phone SMS OTP verification. It records the customer profile creation, initial identity snapshot, contact verification references and the corresponding hash references. It does not verify the identity yet. Use this file in Phase 2 — Fiscal Identity."
      />
    </div>
  );
}
