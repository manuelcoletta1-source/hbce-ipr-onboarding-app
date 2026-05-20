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

const fields: IprPhaseFieldDefinition[] = [
  {
    name: "privacy_consent",
    label: "I accept data processing for IPR verification.",
    type: "checkbox",
    helperText:
      "This consent is written inside the private HBCE-IPR certificate and also hashed for verification."
  },
  {
    name: "hash_only_acknowledgement",
    label: "I accept the hash-only portable certificate logic.",
    type: "checkbox",
    helperText:
      "The downloadable certificate stores private fields, hashes and metadata. Public registry references remain hash-only."
  },
  {
    name: "data_accuracy_confirmation",
    label: "I confirm that the inserted data are correct.",
    type: "checkbox",
    helperText:
      "This confirmation is written inside the private HBCE-IPR certificate and also hashed for verification."
  },
  {
    name: "document_authenticity_confirmation",
    label: "I confirm that the uploaded documents are authentic.",
    type: "checkbox",
    helperText:
      "This confirmation is written inside the private HBCE-IPR certificate and also hashed for verification."
  },
  {
    name: "hbce_policy_acceptance",
    label: "I accept the HBCE operational policy.",
    type: "checkbox",
    helperText:
      "This acceptance is written inside the private HBCE-IPR certificate and also hashed for verification."
  },
  {
    name: "no_state_identity_claim_acknowledgement",
    label:
      "I accept that IPR does not replace CIE, SPID, EUDI Wallet or official state identity.",
    type: "checkbox",
    helperText:
      "This boundary is written inside the private HBCE-IPR certificate and also hashed for verification."
  },
  {
    name: "internal_operational_identity_acknowledgement",
    label:
      "I accept that the HBCE-IPR certificate is an internal HBCE operational identity certificate.",
    type: "checkbox",
    helperText:
      "This boundary is written inside the private HBCE-IPR certificate and also hashed for verification."
  }
];

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

function getConsentLabel(fieldName: ConsentFieldName): string {
  return CONSENT_LABELS[fieldName];
}

function getBooleanValue(
  context: IprPhaseFormBuildDataContext,
  fieldName: ConsentFieldName
): boolean {
  return Boolean(context.values[fieldName]);
}

async function hashConsent(
  context: IprPhaseFormBuildDataContext,
  fieldName: ConsentFieldName
): Promise<string> {
  return sha256Canonical({
    kind: "HBCE_IPR_PHASE_5_CONSENT",
    field: fieldName,
    label: getConsentLabel(fieldName),
    accepted: getBooleanValue(context, fieldName),
    issued_at: context.issuedAt
  });
}

async function buildPhase5PrivacyComplianceData(
  context: IprPhaseFormBuildDataContext
): Promise<JsonObject> {
  const privateFields = {
    privacy_consent: {
      label: getConsentLabel("privacy_consent"),
      accepted: getBooleanValue(context, "privacy_consent")
    },
    hash_only_acknowledgement: {
      label: getConsentLabel("hash_only_acknowledgement"),
      accepted: getBooleanValue(context, "hash_only_acknowledgement")
    },
    data_accuracy_confirmation: {
      label: getConsentLabel("data_accuracy_confirmation"),
      accepted: getBooleanValue(context, "data_accuracy_confirmation")
    },
    document_authenticity_confirmation: {
      label: getConsentLabel("document_authenticity_confirmation"),
      accepted: getBooleanValue(context, "document_authenticity_confirmation")
    },
    hbce_policy_acceptance: {
      label: getConsentLabel("hbce_policy_acceptance"),
      accepted: getBooleanValue(context, "hbce_policy_acceptance")
    },
    no_state_identity_claim_acknowledgement: {
      label: getConsentLabel("no_state_identity_claim_acknowledgement"),
      accepted: getBooleanValue(
        context,
        "no_state_identity_claim_acknowledgement"
      )
    },
    internal_operational_identity_acknowledgement: {
      label: getConsentLabel("internal_operational_identity_acknowledgement"),
      accepted: getBooleanValue(
        context,
        "internal_operational_identity_acknowledgement"
      )
    },
    accepted_at: context.issuedAt
  };

  const hashFields = {
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

  const termsConsentHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_5_TERMS_CONSENT",
    private_fields: privateFields,
    hash_fields: hashFields,
    previous_payload_sha256:
      context.previousCertificate?.hash_integrity.payload_sha256 ?? null,
    issued_at: context.issuedAt
  });

  const identityVerificationConsentHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_5_IDENTITY_VERIFICATION_CONSENT",
    data_accuracy_confirmation:
      privateFields.data_accuracy_confirmation.accepted,
    document_authenticity_confirmation:
      privateFields.document_authenticity_confirmation.accepted,
    privacy_consent: privateFields.privacy_consent.accepted,
    issued_at: context.issuedAt
  });

  return {
    certificate_visibility: "PRIVATE_PORTABLE_CERTIFICATE",
    public_registry_mode: "HASH_ONLY",
    phase_scope: "PRIVACY_COMPLIANCE",

    private_fields: privateFields,
    consent_fields: privateFields,
    hash_fields: hashFields,

    privacy_consent_hash: hashFields.privacy_consent_hash,
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

    previous_payload_sha256:
      context.previousCertificate?.hash_integrity.payload_sha256 ?? null,
    next_required_phase: "REVIEW_SUBMISSION",
    issued_at: context.issuedAt,

    privacy_boundary:
      "This is a private portable HBCE-IPR certificate downloaded by the subject. Consent statements and acceptance values are stored inside private_fields. Public verification must expose hash-only references, not private consent fields."
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
        successDescription="The private privacy and compliance certificate has been generated and downloaded. It contains the accepted consent statements, the corresponding acceptance values and their hashes. Use this file in Phase 6 — HBCE Review Submission."
      />
    </div>
  );
}
