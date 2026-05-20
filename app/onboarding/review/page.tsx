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
      "This value is written inside the private HBCE-IPR certificate. It does not approve the IPR. It only creates the pending review certificate."
  }
];

const REVIEW_STATEMENT =
  "The subject submits the HBCE-IPR onboarding package for HBCE review. This certificate does not approve the IPR and does not authorize IPR Card issuance.";

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

  const privateFields = {
    submit_for_review: getBooleanValue(context, "submit_for_review"),
    review_statement: REVIEW_STATEMENT,
    review_status: "PENDING_REVIEW",
    submitted_at: context.issuedAt,
    user_self_approval_allowed: false,
    backend_or_admin_review_required: true,
    next_required_phase: "HBCE_APPROVAL"
  };

  const hashFields = {
    submit_for_review_hash: await sha256Canonical({
      kind: "HBCE_IPR_PHASE_6_SUBMIT_FOR_REVIEW",
      accepted: privateFields.submit_for_review,
      statement: REVIEW_STATEMENT,
      submitted_at: context.issuedAt
    }),
    review_statement_hash: await sha256Canonical({
      kind: "HBCE_IPR_PHASE_6_REVIEW_STATEMENT",
      statement: REVIEW_STATEMENT,
      submitted_at: context.issuedAt
    }),
    review_status_hash: await sha256Canonical({
      kind: "HBCE_IPR_PHASE_6_REVIEW_STATUS",
      review_status: privateFields.review_status,
      submitted_at: context.issuedAt
    })
  };

  const reviewPackageHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_6_REVIEW_PACKAGE",
    private_fields: privateFields,
    hash_fields: hashFields,
    previous_payload_sha256: previousPayloadSha256,
    submitted_at: context.issuedAt
  });

  return {
    certificate_visibility: "PRIVATE_PORTABLE_CERTIFICATE",
    public_registry_mode: "HASH_ONLY",
    phase_scope: "REVIEW_SUBMISSION",

    private_fields: privateFields,
    review_fields: privateFields,
    hash_fields: hashFields,

    review_package_hash: reviewPackageHash,
    submitted_at: context.issuedAt,
    previous_payload_sha256: previousPayloadSha256,
    next_required_phase: "HBCE_APPROVAL",

    review_status: "PENDING_REVIEW",
    user_self_approval_allowed: false,
    backend_or_admin_review_required: true,

    privacy_boundary:
      "This is a private portable HBCE-IPR certificate downloaded by the subject. Review submission fields are stored inside private_fields. Public verification must expose hash-only references, not private review fields.",

    trust_boundary:
      "This certificate does not approve the IPR. It only records that the onboarding package has been submitted for HBCE review. IPR approval requires the next HBCE admin/backend phase.",

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
        successDescription="The private review pending certificate has been generated and downloaded. It contains the review submission state, the pending review boundary and the corresponding hashes. HBCE approval is now required before IPR Card issuance."
      />
    </div>
  );
}
