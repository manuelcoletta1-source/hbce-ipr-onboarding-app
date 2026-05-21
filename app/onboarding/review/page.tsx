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

const REVIEW_STATEMENT =
  "The subject submits the HBCE-IPR onboarding package for HBCE review. This certificate does not approve the IPR and does not authorize IPR Card issuance.";

const SUBMIT_FOR_REVIEW_LABEL =
  "Submit this HBCE-IPR onboarding package for HBCE review.";

type Phase6ReviewPrivateFields = JsonObject & {
  submit_for_review: boolean;
  review_statement: string;
  review_status: "PENDING_REVIEW";
  submitted_at: string;
  user_self_approval_allowed: false;
  backend_or_admin_review_required: true;
  hbce_operator_decision_required: true;
  ipr_approval_granted: false;
  ipr_card_issuance_authorized: false;
  joker_c2_access_authorized: false;
  next_required_phase: "HBCE_APPROVAL";
};

type Phase6ReviewHashFields = JsonObject & {
  submit_for_review_hash: string;
  review_statement_hash: string;
  review_status_hash: string;
  review_boundary_hash: string;
};

const fields: IprPhaseFieldDefinition[] = [
  {
    name: "submit_for_review",
    label: SUBMIT_FOR_REVIEW_LABEL,
    type: "checkbox",
    helperText:
      "This value is included in the private HBCE-IPR certificate. It does not approve the IPR. It only creates the pending review certificate."
  }
];

function getSubmitForReviewValue(
  context: IprPhaseFormBuildDataContext
): boolean {
  return Boolean(context.values.submit_for_review);
}

function assertReviewSubmissionAccepted(
  context: IprPhaseFormBuildDataContext
): void {
  if (!getSubmitForReviewValue(context)) {
    throw new Error(
      "HBCE fail-closed: Certificate 06 cannot be generated until the subject explicitly submits the onboarding package for HBCE review."
    );
  }
}

function buildPrivateFields(
  context: IprPhaseFormBuildDataContext
): Phase6ReviewPrivateFields {
  return {
    submit_for_review: getSubmitForReviewValue(context),
    review_statement: REVIEW_STATEMENT,
    review_status: "PENDING_REVIEW",
    submitted_at: context.issuedAt,
    user_self_approval_allowed: false,
    backend_or_admin_review_required: true,
    hbce_operator_decision_required: true,
    ipr_approval_granted: false,
    ipr_card_issuance_authorized: false,
    joker_c2_access_authorized: false,
    next_required_phase: "HBCE_APPROVAL"
  };
}

async function buildHashFields(
  privateFields: Phase6ReviewPrivateFields,
  previousPayloadSha256: string | null,
  issuedAt: string
): Promise<Phase6ReviewHashFields> {
  const submitForReviewHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_6_SUBMIT_FOR_REVIEW",
    phase: "PENDING_REVIEW",
    label: SUBMIT_FOR_REVIEW_LABEL,
    accepted: privateFields.submit_for_review,
    statement: REVIEW_STATEMENT,
    previous_payload_sha256: previousPayloadSha256,
    submitted_at: issuedAt
  });

  const reviewStatementHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_6_REVIEW_STATEMENT",
    phase: "PENDING_REVIEW",
    statement: REVIEW_STATEMENT,
    previous_payload_sha256: previousPayloadSha256,
    submitted_at: issuedAt
  });

  const reviewStatusHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_6_REVIEW_STATUS",
    phase: "PENDING_REVIEW",
    review_status: privateFields.review_status,
    user_self_approval_allowed: privateFields.user_self_approval_allowed,
    backend_or_admin_review_required:
      privateFields.backend_or_admin_review_required,
    hbce_operator_decision_required:
      privateFields.hbce_operator_decision_required,
    previous_payload_sha256: previousPayloadSha256,
    submitted_at: issuedAt
  });

  const reviewBoundaryHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_6_REVIEW_BOUNDARY",
    phase: "PENDING_REVIEW",
    ipr_approval_granted: privateFields.ipr_approval_granted,
    ipr_card_issuance_authorized:
      privateFields.ipr_card_issuance_authorized,
    joker_c2_access_authorized: privateFields.joker_c2_access_authorized,
    next_required_phase: privateFields.next_required_phase,
    previous_payload_sha256: previousPayloadSha256,
    submitted_at: issuedAt
  });

  return {
    submit_for_review_hash: submitForReviewHash,
    review_statement_hash: reviewStatementHash,
    review_status_hash: reviewStatusHash,
    review_boundary_hash: reviewBoundaryHash
  };
}

async function buildPhase6ReviewPendingData(
  context: IprPhaseFormBuildDataContext
): Promise<JsonObject> {
  assertReviewSubmissionAccepted(context);

  const previousPayloadSha256 =
    context.previousCertificate?.hash_integrity.payload_sha256 ?? null;

  const privateFields = buildPrivateFields(context);

  const hashFields = await buildHashFields(
    privateFields,
    previousPayloadSha256,
    context.issuedAt
  );

  const reviewPackageHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_6_REVIEW_PACKAGE",
    phase: "PENDING_REVIEW",
    private_fields: privateFields,
    hash_fields: hashFields,
    previous_payload_sha256: previousPayloadSha256,
    submitted_at: context.issuedAt
  });

  return {
    certificate_role: "STEP_6_REVIEW_SUBMISSION",
    certificate_visibility: "PRIVATE_PORTABLE_CERTIFICATE",
    public_registry_mode: "HASH_ONLY",
    phase_scope: "REVIEW_SUBMISSION",

    private_fields: privateFields,
    review_fields: privateFields,
    review_private_data: privateFields,
    review_private_data_included: true,

    hash_fields: hashFields,

    submit_for_review_hash: hashFields.submit_for_review_hash,
    review_statement_hash: hashFields.review_statement_hash,
    review_status_hash: hashFields.review_status_hash,
    review_boundary_hash: hashFields.review_boundary_hash,
    review_package_hash: reviewPackageHash,

    submitted_at: context.issuedAt,
    review_status: "PENDING_REVIEW",
    user_self_approval_allowed: false,
    backend_or_admin_review_required: true,
    hbce_operator_decision_required: true,

    fiscal_identity_collected: true,
    fiscal_identity_verified: false,
    official_document_uploaded: true,
    official_document_verified: false,
    liveness_submitted: true,
    liveness_verified: false,
    privacy_compliance_accepted: true,

    hbce_review_status: "PENDING_REVIEW",
    ipr_approved: false,
    ipr_status: "PENDING",
    ipr_card_status: "NOT_ISSUED",
    operational_certificate_issued: false,
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
      hbce_review_status: "PENDING_REVIEW",
      ipr_approved: false,
      ipr_card_issued: false,
      operational_certificate_issued: false,
      joker_c2_access: "DENIED"
    },

    previous_payload_sha256: previousPayloadSha256,
    next_required_phase: "HBCE_APPROVAL",
    issued_at: context.issuedAt,
    issued_at_utc: context.issuedAt,

    certificate_boundary:
      "This file records that the HBCE IPR onboarding package has been submitted for review. It does not approve the IPR, it does not issue an IPR Card and it does not grant JOKER-C2 access.",

    privacy_boundary:
      "This is a private portable HBCE-IPR certificate downloaded by the subject. It may contain review submission fields. Public verification must expose hash-only references, not private review fields.",

    trust_boundary:
      "This certificate does not approve the IPR. It only records that the onboarding package has been submitted for HBCE review. IPR approval requires the next HBCE admin/backend phase."
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
        successDescription="The private review pending certificate has been generated and downloaded. It links Certificate 05 to the HBCE review submission state. HBCE approval is now required before IPR Card issuance."
      />
    </div>
  );
}
