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
      "Required to continue the HBCE-IPR onboarding process."
  },
  {
    name: "hash_only_acknowledgement",
    label: "I accept the hash-only portable certificate logic.",
    type: "checkbox",
    helperText:
      "The downloadable certificate stores hashes and minimal metadata, not raw documents."
  },
  {
    name: "data_accuracy_confirmation",
    label: "I confirm that the inserted data are correct.",
    type: "checkbox"
  },
  {
    name: "document_authenticity_confirmation",
    label: "I confirm that the uploaded documents are authentic.",
    type: "checkbox"
  },
  {
    name: "hbce_policy_acceptance",
    label: "I accept the HBCE operational policy.",
    type: "checkbox"
  },
  {
    name: "no_state_identity_claim_acknowledgement",
    label:
      "I accept that IPR does not replace CIE, SPID, EUDI Wallet or official state identity.",
    type: "checkbox"
  },
  {
    name: "internal_operational_identity_acknowledgement",
    label:
      "I accept that the HBCE-IPR certificate is an internal HBCE operational identity certificate.",
    type: "checkbox"
  }
];

function getBooleanValue(
  context: IprPhaseFormBuildDataContext,
  fieldName: string
): boolean {
  return Boolean(context.values[fieldName]);
}

async function hashConsent(
  context: IprPhaseFormBuildDataContext,
  fieldName: string
): Promise<string> {
  return sha256Canonical({
    kind: "HBCE_IPR_PHASE_5_CONSENT",
    field: fieldName,
    accepted: getBooleanValue(context, fieldName),
    issued_at: context.issuedAt
  });
}

async function buildPhase5PrivacyComplianceData(
  context: IprPhaseFormBuildDataContext
): Promise<JsonObject> {
  const privacyConsentHash = await hashConsent(context, "privacy_consent");
  const termsConsentHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_5_TERMS_CONSENT",
    privacy_consent: getBooleanValue(context, "privacy_consent"),
    hash_only_acknowledgement: getBooleanValue(
      context,
      "hash_only_acknowledgement"
    ),
    hbce_policy_acceptance: getBooleanValue(
      context,
      "hbce_policy_acceptance"
    ),
    no_state_identity_claim_acknowledgement: getBooleanValue(
      context,
      "no_state_identity_claim_acknowledgement"
    ),
    internal_operational_identity_acknowledgement: getBooleanValue(
      context,
      "internal_operational_identity_acknowledgement"
    ),
    issued_at: context.issuedAt
  });

  const identityVerificationConsentHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_5_IDENTITY_VERIFICATION_CONSENT",
    data_accuracy_confirmation: getBooleanValue(
      context,
      "data_accuracy_confirmation"
    ),
    document_authenticity_confirmation: getBooleanValue(
      context,
      "document_authenticity_confirmation"
    ),
    privacy_consent: getBooleanValue(context, "privacy_consent"),
    issued_at: context.issuedAt
  });

  return {
    privacy_consent_hash: privacyConsentHash,
    terms_consent_hash: termsConsentHash,
    identity_verification_consent_hash: identityVerificationConsentHash,
    gdpr_min_acknowledgement: true,
    hash_only_acknowledgement: true,
    no_state_identity_claim_acknowledgement: true,
    internal_operational_identity_acknowledgement: true,
    previous_payload_sha256:
      context.previousCertificate?.hash_integrity.payload_sha256 ?? null,
    next_required_phase: "REVIEW_SUBMISSION",
    issued_at: context.issuedAt
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
        successDescription="The privacy and compliance certificate has been generated and downloaded. Use this file in Phase 6 — HBCE Review Submission."
      />
    </div>
  );
}
