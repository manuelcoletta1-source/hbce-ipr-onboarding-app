"use client";

import IprPhaseForm from "@/components/IprPhaseForm";

import { sha256Canonical } from "@/lib/ipr-certificate-chain";
import { getPhaseDefinitionByNumber } from "@/lib/ipr-phase-map";

import type {
  IprPhaseFieldDefinition,
  IprPhaseFormBuildDataContext
} from "@/components/IprPhaseForm";

import type { JsonObject } from "@/lib/types";

const phase = getPhaseDefinitionByNumber(6);

const fields: IprPhaseFieldDefinition[] = [
  {
    name: "submit_for_review",
    label: "Submit this HBCE-IPR onboarding package for HBCE review.",
    type: "checkbox",
    helperText:
      "This does not approve the IPR. It only creates the pending review certificate."
  }
];

function getBooleanValue(
  context: IprPhaseFormBuildDataContext,
  fieldName: string
): boolean {
  return Boolean(context.values[fieldName]);
}

async function buildPhase6ReviewPendingData(
  context: IprPhaseFormBuildDataContext
): Promise<JsonObject> {
  const previousPayloadSha256 =
    context.previousCertificate?.hash_integrity.payload_sha256 ?? null;

  const reviewPackageHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_6_REVIEW_PACKAGE",
    submit_for_review: getBooleanValue(context, "submit_for_review"),
    previous_payload_sha256: previousPayloadSha256,
    submitted_at: context.issuedAt
  });

  return {
    review_package_hash: reviewPackageHash,
    submitted_at: context.issuedAt,
    previous_payload_sha256: previousPayloadSha256,
    next_required_phase: "HBCE_APPROVAL",
    review_status: "PENDING_REVIEW",
    user_self_approval_allowed: false,
    backend_or_admin_review_required: true,
    issued_at: context.issuedAt
  };
}

export default function OnboardingReviewPage() {
  return (
    <div className="hbce-container">
      <IprPhaseForm
        phase={phase}
        fields={fields}
        buildPhaseData={buildPhase6ReviewPendingData}
        submitLabel="Generate HBCE IPR Certificate 06"
        successTitle="HBCE IPR Certificate 06 generated"
        successDescription="The review pending certificate has been generated and downloaded. HBCE approval is now required before IPR Card issuance."
      />
    </div>
  );
}
