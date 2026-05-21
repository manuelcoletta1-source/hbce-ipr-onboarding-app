"use client";

import IprPhaseForm from "@/components/IprPhaseForm";

import { sha256Canonical } from "@/lib/ipr-certificate-chain";
import { getPhaseDefinitionByNumber } from "@/lib/ipr-phase-map";

import type {
  IprPhaseFieldDefinition,
  IprPhaseFormBuildDataContext
} from "@/components/IprPhaseForm";

import type { JsonObject } from "@/lib/types";

const phase = getPhaseDefinitionByNumber(5);

const CONSENT_LABELS = {
  privacy_consent: "I accept data processing for IPR verification.",
  hash_only_acknowledgement:
    "I accept the hash-only portable certificate logic.",
  data_accuracy_confirmation:
    "I confirm that the inserted data are correct.",
  document_authenticity_confirmation:
    "I confirm that the uploaded documents are authentic.",
  hbce_policy_acceptance: "I accept the HBCE operational policy.",
  no_state_identity_claim_acknowledgement:
    "I accept that IPR does not replace CIE, SPID, EUDI Wallet or official state identity.",
  internal_operational_identity_acknowledgement:
    "I accept that the HBCE-IPR certificate is an internal HBCE operational identity certificate."
} as const;

type ConsentFieldName = keyof typeof CONSENT_LABELS;

type Phase5ConsentRecord = JsonObject & {
  label: string;
  accepted: boolean;
};

type Phase5ConsentPrivateFields = JsonObject & {
  privacy_consent: Phase5ConsentRecord;
  hash_only_acknowledgement: Phase5ConsentRecord;
  data_accuracy_confirmation: Phase5ConsentRecord;
  document_authenticity_confirmation: Phase5ConsentRecord;
  hbce_policy_acceptance: Phase5ConsentRecord;
  no_state_identity_claim_acknowledgement: Phase5ConsentRecord;
  internal_operational_identity_acknowledgement: Phase5ConsentRecord;
  accepted_at: string;
};

type Phase5ConsentHashFields = JsonObject & {
  privacy_consent_hash: string;
  hash_only_acknowledgement_hash: string;
  data_accuracy_confirmation_hash: string;
  document_authenticity_confirmation_hash: string;
  hbce_policy_acceptance_hash: string;
  no_state_identity_claim_acknowledgement_hash: string;
  internal_operational_identity_acknowledgement_hash: string;
};

const fields: IprPhaseFieldDefinition[] = [
  {
    name: "privacy_consent",
    label: CONSENT_LABELS.privacy_consent,
    type: "checkbox",
    helperText:
      "This consent is included in the private HBCE-IPR certificate and hashed for audit verification."
  },
  {
    name: "hash_only_acknowledgement",
    label: CONSENT_LABELS.hash_only_acknowledgement,
    type: "checkbox",
    helperText:
      "The downloadable certificate may contain private fields, hashes and metadata. Public registry references remain hash-only."
  },
  {
    name: "data_accuracy_confirmation",
    label: CONSENT_LABELS.data_accuracy_confirmation,
    type: "checkbox",
    helperText:
      "This confirmation is included in the private HBCE-IPR certificate and hashed for audit verification."
  },
  {
    name: "document_authenticity_confirmation",
    label: CONSENT_LABELS.document_authenticity_confirmation,
    type: "checkbox",
    helperText:
      "This confirmation is included in the private HBCE-IPR certificate and hashed for audit verification."
  },
  {
    name: "hbce_policy_acceptance",
    label: CONSENT_LABELS.hbce_policy_acceptance,
    type: "checkbox",
    helperText:
      "This acceptance is included in the private HBCE-IPR certificate and hashed for audit verification."
  },
  {
    name: "no_state_identity_claim_acknowledgement",
    label: CONSENT_LABELS.no_state_identity_claim_acknowledgement,
    type: "checkbox",
    helperText:
      "This boundary is included in the private HBCE-IPR certificate and hashed for audit verification."
  },
  {
    name: "internal_operational_identity_acknowledgement",
    label: CONSENT_LABELS.internal_operational_identity_acknowledgement,
    type: "checkbox",
    helperText:
      "This boundary is included in the private HBCE-IPR certificate and hashed for audit verification."
  }
];

function getConsentLabel(fieldName: ConsentFieldName): string {
  return CONSENT_LABELS[fieldName];
}

function getBooleanValue(
  context: IprPhaseFormBuildDataContext,
  fieldName: ConsentFieldName
): boolean {
  return Boolean(context.values[fieldName]);
}

function buildConsentRecord(
  context: IprPhaseFormBuildDataContext,
  fieldName: ConsentFieldName
): Phase5ConsentRecord {
  return {
    label: getConsentLabel(fieldName),
    accepted: getBooleanValue(context, fieldName)
  };
}

function buildPrivateFields(
  context: IprPhaseFormBuildDataContext
): Phase5ConsentPrivateFields {
  return {
    privacy_consent: buildConsentRecord(context, "privacy_consent"),
    hash_only_acknowledgement: buildConsentRecord(
      context,
      "hash_only_acknowledgement"
    ),
    data_accuracy_confirmation: buildConsentRecord(
      context,
      "data_accuracy_confirmation"
    ),
    document_authenticity_confirmation: buildConsentRecord(
      context,
      "document_authenticity_confirmation"
    ),
    hbce_policy_acceptance: buildConsentRecord(
      context,
      "hbce_policy_acceptance"
    ),
    no_state_identity_claim_acknowledgement: buildConsentRecord(
      context,
      "no_state_identity_claim_acknowledgement"
    ),
    internal_operational_identity_acknowledgement: buildConsentRecord(
      context,
      "internal_operational_identity_acknowledgement"
    ),
    accepted_at: context.issuedAt
  };
}

async function hashConsent(
  context: IprPhaseFormBuildDataContext,
  fieldName: ConsentFieldName
): Promise<string> {
  return sha256Canonical({
    kind: "HBCE_IPR_PHASE_5_PRIVACY_COMPLIANCE_CONSENT",
    phase: "COMPLIANCE_ACCEPTED",
    field: fieldName,
    label: getConsentLabel(fieldName),
    accepted: getBooleanValue(context, fieldName),
    previous_payload_sha256:
      context.previousCertificate?.hash_integrity.payload_sha256 ?? null,
    issued_at: context.issuedAt
  });
}

async function buildHashFields(
  context: IprPhaseFormBuildDataContext
): Promise<Phase5ConsentHashFields> {
  return {
    privacy_consent_hash: await hashConsent(context, "privacy_consent"),
    hash_only_acknowledgement_hash: await hashConsent(
      context,
      "hash_only_acknowledgement"
    ),
    data_accuracy_confirmation_hash: await hashConsent(
      context,
      "data_accuracy_confirmation"
    ),
    document_authenticity_confirmation_hash: await hashConsent(
      context,
      "document_authenticity_confirmation"
    ),
    hbce_policy_acceptance_hash: await hashConsent(
      context,
      "hbce_policy_acceptance"
    ),
    no_state_identity_claim_acknowledgement_hash: await hashConsent(
      context,
      "no_state_identity_claim_acknowledgement"
    ),
    internal_operational_identity_acknowledgement_hash: await hashConsent(
      context,
      "internal_operational_identity_acknowledgement"
    )
  };
}

async function buildPhase5PrivacyComplianceData(
  context: IprPhaseFormBuildDataContext
): Promise<JsonObject> {
  const privateFields = buildPrivateFields(context);
  const hashFields = await buildHashFields(context);

  const previousPayloadSha256 =
    context.previousCertificate?.hash_integrity.payload_sha256 ?? null;

  const termsConsentHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_5_TERMS_CONSENT",
    phase: "COMPLIANCE_ACCEPTED",
    private_fields: privateFields,
    hash_fields: hashFields,
    previous_payload_sha256: previousPayloadSha256,
    issued_at: context.issuedAt
  });

  const identityVerificationConsentHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_5_IDENTITY_VERIFICATION_CONSENT",
    phase: "COMPLIANCE_ACCEPTED",
    data_accuracy_confirmation:
      privateFields.data_accuracy_confirmation.accepted,
    document_authenticity_confirmation:
      privateFields.document_authenticity_confirmation.accepted,
    privacy_consent: privateFields.privacy_consent.accepted,
    previous_payload_sha256: previousPayloadSha256,
    issued_at: context.issuedAt
  });

  return {
    certificate_role: "STEP_5_PRIVACY_COMPLIANCE_ACCEPTANCE",
    certificate_visibility: "PRIVATE_PORTABLE_CERTIFICATE",
    public_registry_mode: "HASH_ONLY",
    phase_scope: "PRIVACY_COMPLIANCE",

    private_fields: privateFields,
    consent_fields: privateFields,
    consent_private_data: privateFields,
    consent_private_data_included: true,

    hash_fields: hashFields,

    privacy_consent_hash: hashFields.privacy_consent_hash,
    hash_only_acknowledgement_hash:
      hashFields.hash_only_acknowledgement_hash,
    data_accuracy_confirmation_hash:
      hashFields.data_accuracy_confirmation_hash,
    document_authenticity_confirmation_hash:
      hashFields.document_authenticity_confirmation_hash,
    hbce_policy_acceptance_hash:
      hashFields.hbce_policy_acceptance_hash,
    no_state_identity_claim_acknowledgement_hash:
      hashFields.no_state_identity_claim_acknowledgement_hash,
    internal_operational_identity_acknowledgement_hash:
      hashFields.internal_operational_identity_acknowledgement_hash,

    terms_consent_hash: termsConsentHash,
    identity_verification_consent_hash: identityVerificationConsentHash,

    gdpr_min_acknowledgement:
      privateFields.privacy_consent.accepted &&
      privateFields.hash_only_acknowledgement.accepted,
    hash_only_acknowledgement:
      privateFields.hash_only_acknowledgement.accepted,
    no_state_identity_claim_acknowledgement:
      privateFields.no_state_identity_claim_acknowledgement.accepted,
    internal_operational_identity_acknowledgement:
      privateFields.internal_operational_identity_acknowledgement.accepted,

    fiscal_identity_collected: true,
    fiscal_identity_verified: false,
    official_document_uploaded: true,
    official_document_verified: false,
    liveness_submitted: true,
    liveness_verified: false,
    privacy_compliance_accepted: true,
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
      privacy_compliance_accepted: true,
      hbce_review_status: "NOT_STARTED",
      ipr_approved: false,
      ipr_card_issued: false,
      operational_certificate_issued: false,
      joker_c2_access: "DENIED"
    },

    previous_payload_sha256: previousPayloadSha256,
    next_required_phase: "REVIEW_SUBMISSION",
    issued_at: context.issuedAt,
    issued_at_utc: context.issuedAt,

    certificate_boundary:
      "This file records privacy and compliance acceptance for the HBCE IPR onboarding chain. It does not certify final identity verification, it does not issue an IPR Card and it does not grant JOKER-C2 access.",

    privacy_boundary:
      "This is a private portable HBCE-IPR certificate downloaded by the subject. It may contain consent statements and acceptance values. Public verification must expose hash-only references, not private consent fields."
  };
}

export default function Phase5PrivacyCompliancePage() {
  return (
    <div className="hbce-container">
      <IprPhaseForm
        phase={phase}
        fields={fields}
        buildPhaseData={buildPhase5PrivacyComplianceData}
        submitLabel="Generate HBCE IPR Certificate 05"
        successTitle="HBCE IPR Certificate 05 generated"
        successDescription="The private privacy and compliance certificate has been generated and downloaded. It links Certificate 04 to the accepted consent statements, their acceptance values and their hash references. Use this file in Phase 6 — HBCE Review Submission."
      />
    </div>
  );
}
