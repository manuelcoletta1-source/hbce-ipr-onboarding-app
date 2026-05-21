"use client";

import { useState } from "react";

import IprCertificateUploader from "@/components/IprCertificateUploader";

import {
  downloadHbceIprCertificate,
  generateHbceIprCertificate,
  nowIso,
  sha256Canonical
} from "@/lib/ipr-certificate-chain";

import { getPhaseDefinitionByNumber } from "@/lib/ipr-phase-map";

import type { AcceptedIprCertificateUpload } from "@/components/IprCertificateUploader";

import type {
  HbceGeneratedCertificate,
  HbceIprCertificate,
  JsonObject
} from "@/lib/types";

type ApprovalDecision = "APPROVE" | "REJECT" | "REQUEST_MORE_DATA";

type Phase7ApprovalPrivateFields = JsonObject & {
  approved_by: string;
  approved_at: string;
  approval_decision: "APPROVE";
  approval_note: string;
  user_self_approval_allowed: false;
  backend_or_admin_review_required: true;
  production_backend_required: true;
  next_required_phase: "IPR_CARD_ISSUANCE";
  production_boundary: string;
};

type Phase7ApprovalHashFields = JsonObject & {
  approval_decision_hash: string;
  approved_by_hash: string;
  approval_status_hash: string;
  production_boundary_hash: string;
  approval_note_hash?: string;
};

const phase = getPhaseDefinitionByNumber(7);

const PRODUCTION_BOUNDARY =
  "MVP client-side approval is not a production trust source. Production approval requires authenticated backend enforcement, operator authentication, audit logging, revocation control and protected evidence storage.";

function normalizeOperatorReference(value: string): string {
  return value.trim();
}

function normalizeApprovalNote(value: string): string {
  return value.trim();
}

function isApprovalDecision(value: string): value is ApprovalDecision {
  return (
    value === "APPROVE" ||
    value === "REJECT" ||
    value === "REQUEST_MORE_DATA"
  );
}

async function buildApprovalDecisionHash(params: {
  previousCertificate: HbceIprCertificate;
  approvedBy: string;
  approvalDecision: "APPROVE";
  approvalNote: string;
  approvedAt: string;
}): Promise<string> {
  return sha256Canonical({
    kind: "HBCE_IPR_PHASE_7_APPROVAL_DECISION",
    phase: "IPR_APPROVED",
    previous_payload_sha256:
      params.previousCertificate.hash_integrity.payload_sha256,
    approved_by: params.approvedBy,
    approval_decision: params.approvalDecision,
    approval_note: params.approvalNote,
    approved_at: params.approvedAt
  });
}

async function buildApprovalHashFields(params: {
  previousCertificate: HbceIprCertificate;
  privateFields: Phase7ApprovalPrivateFields;
}): Promise<Phase7ApprovalHashFields> {
  const baseHashFields: Phase7ApprovalHashFields = {
    approval_decision_hash: await buildApprovalDecisionHash({
      previousCertificate: params.previousCertificate,
      approvedBy: params.privateFields.approved_by,
      approvalDecision: params.privateFields.approval_decision,
      approvalNote: params.privateFields.approval_note,
      approvedAt: params.privateFields.approved_at
    }),
    approved_by_hash: await sha256Canonical({
      kind: "HBCE_IPR_PHASE_7_APPROVED_BY",
      phase: "IPR_APPROVED",
      value: params.privateFields.approved_by,
      previous_payload_sha256:
        params.previousCertificate.hash_integrity.payload_sha256,
      approved_at: params.privateFields.approved_at
    }),
    approval_status_hash: await sha256Canonical({
      kind: "HBCE_IPR_PHASE_7_APPROVAL_STATUS",
      phase: "IPR_APPROVED",
      approval_decision: params.privateFields.approval_decision,
      previous_payload_sha256:
        params.previousCertificate.hash_integrity.payload_sha256,
      approved_at: params.privateFields.approved_at
    }),
    production_boundary_hash: await sha256Canonical({
      kind: "HBCE_IPR_PHASE_7_PRODUCTION_BOUNDARY",
      phase: "IPR_APPROVED",
      value: PRODUCTION_BOUNDARY,
      previous_payload_sha256:
        params.previousCertificate.hash_integrity.payload_sha256,
      approved_at: params.privateFields.approved_at
    })
  };

  if (params.privateFields.approval_note) {
    baseHashFields.approval_note_hash = await sha256Canonical({
      kind: "HBCE_IPR_PHASE_7_APPROVAL_NOTE",
      phase: "IPR_APPROVED",
      value: params.privateFields.approval_note,
      previous_payload_sha256:
        params.previousCertificate.hash_integrity.payload_sha256,
      approved_at: params.privateFields.approved_at
    });
  }

  return baseHashFields;
}

export default function AdminReviewPage() {
  const [previousUpload, setPreviousUpload] =
    useState<AcceptedIprCertificateUpload | null>(null);
  const [approvedBy, setApprovedBy] = useState("");
  const [approvalDecision, setApprovalDecision] =
    useState<ApprovalDecision>("APPROVE");
  const [approvalNote, setApprovalNote] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCertificate, setGeneratedCertificate] =
    useState<HbceGeneratedCertificate<JsonObject> | null>(null);

  async function issueApprovalCertificate() {
    setError("");
    setGeneratedCertificate(null);

    if (!previousUpload) {
      setError("Upload the required review pending HBCE IPR certificate first.");
      return;
    }

    if (approvalDecision !== "APPROVE") {
      setError(
        "This MVP page only generates the approved certificate. REJECT and REQUEST_MORE_DATA must be handled by a backend/admin workflow."
      );
      return;
    }

    const normalizedApprovedBy = normalizeOperatorReference(approvedBy);
    const normalizedApprovalNote = normalizeApprovalNote(approvalNote);

    if (!normalizedApprovedBy) {
      setError("Insert the HBCE operator reference before approval.");
      return;
    }

    setIsGenerating(true);

    try {
      const approvedAt = nowIso();

      const privateFields: Phase7ApprovalPrivateFields = {
        approved_by: normalizedApprovedBy,
        approved_at: approvedAt,
        approval_decision: "APPROVE",
        approval_note: normalizedApprovalNote,
        user_self_approval_allowed: false,
        backend_or_admin_review_required: true,
        production_backend_required: true,
        next_required_phase: "IPR_CARD_ISSUANCE",
        production_boundary: PRODUCTION_BOUNDARY
      };

      const hashFields = await buildApprovalHashFields({
        previousCertificate: previousUpload.certificate,
        privateFields
      });

      const approvalMetadataHash = await sha256Canonical({
        kind: "HBCE_IPR_PHASE_7_APPROVAL_METADATA",
        phase: "IPR_APPROVED",
        private_fields: privateFields,
        hash_fields: hashFields,
        previous_payload_sha256:
          previousUpload.certificate.hash_integrity.payload_sha256,
        approved_at: approvedAt
      });

      const phaseData: JsonObject = {
        certificate_role: "STEP_7_HBCE_APPROVAL",
        certificate_visibility: "PRIVATE_PORTABLE_CERTIFICATE",
        public_registry_mode: "HASH_ONLY",
        phase_scope: "HBCE_APPROVAL",

        private_fields: privateFields,
        approval_fields: privateFields,
        approval_private_data: privateFields,
        approval_private_data_included: true,

        hash_fields: hashFields,

        approved_by: privateFields.approved_by,
        approved_at: privateFields.approved_at,
        approval_decision: privateFields.approval_decision,
        approval_decision_hash: hashFields.approval_decision_hash,
        approved_by_hash: hashFields.approved_by_hash,
        approval_status_hash: hashFields.approval_status_hash,
        production_boundary_hash: hashFields.production_boundary_hash,
        approval_metadata_hash: approvalMetadataHash,

        fiscal_identity_collected: true,
        fiscal_identity_verified: true,
        official_document_uploaded: true,
        official_document_verified: true,
        liveness_submitted: true,
        liveness_verified: true,
        privacy_compliance_accepted: true,
        hbce_review_status: "APPROVED",
        ipr_approved: true,
        ipr_status: "APPROVED",
        ipr_card_status: "NOT_ISSUED",
        joker_c2_access: "DENIED",

        verification_state: {
          email_verified: true,
          phone_verified: true,
          fiscal_identity_collected: true,
          fiscal_identity_verified: true,
          official_document_uploaded: true,
          official_document_verified: true,
          liveness_submitted: true,
          liveness_verified: true,
          privacy_compliance_accepted: true,
          hbce_review_status: "APPROVED",
          ipr_approved: true,
          ipr_card_issued: false,
          operational_certificate_issued: false,
          joker_c2_access: "DENIED"
        },

        previous_payload_sha256:
          previousUpload.certificate.hash_integrity.payload_sha256,
        next_required_phase: "IPR_CARD_ISSUANCE",
        issued_at: approvedAt,
        issued_at_utc: approvedAt,

        user_self_approval_allowed: false,
        backend_or_admin_review_required: true,
        production_backend_required: true,
        production_boundary: PRODUCTION_BOUNDARY,

        certificate_boundary:
          "This file records HBCE approval of the onboarding review package. It authorizes IPR Card issuance as the next phase, but it does not itself issue the IPR Card, the final operational certificate or JOKER-C2 access.",

        privacy_boundary:
          "This is a private portable HBCE-IPR certificate. Approval fields are stored inside private_fields. Public verification must expose hash-only references, not private approval fields.",

        trust_boundary:
          "This MVP client-side approval certificate completes the local demo approval step only. Production approval requires authenticated backend/admin enforcement, operator identity, audit logging and revocation control."
      };

      if (hashFields.approval_note_hash) {
        phaseData.approval_note_hash = hashFields.approval_note_hash;
      }

      const generated = await generateHbceIprCertificate({
        phase_number: phase.phase_number,
        phase_code: phase.phase_code,
        phase_status: "APPROVED",
        next_required_phase: phase.next_required_phase,
        subject: previousUpload.certificate.subject,
        previous_certificate: previousUpload.certificate,
        previous_payload_sha256:
          previousUpload.certificate.hash_integrity.payload_sha256,
        phase_data: phaseData,
        issued_at: approvedAt
      });

      setGeneratedCertificate(generated);
      downloadHbceIprCertificate(generated.certificate, generated.file_name);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "HBCE approval certificate generation failed."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="hbce-container">
      <main className="hbce-main">
        <section className="hbce-hero">
          <p className="hbce-kicker">HBCE Admin Review</p>

          <h1>{phase.title}</h1>

          <p>
            This phase issues the approved HBCE-IPR certificate after review.
            The user cannot self-approve. In production, this operation must be
            enforced by authenticated backend/admin logic.
          </p>
        </section>

        <IprCertificateUploader
          expectedPreviousPhase={phase.expected_previous_phase}
          expectedNextPhase={phase.next_required_phase}
          title="Upload Review Pending HBCE IPR Certificate"
          description="Upload hbce-ipr-06-review-pending.hbce.json. The page verifies the previous phase before issuing the HBCE approval certificate."
          onCertificateAccepted={(upload) => {
            setPreviousUpload(upload);
            setError("");
          }}
          onValidation={(validation) => {
            if (!validation.valid) {
              setPreviousUpload(null);
            }
          }}
        />

        <section className="hbce-card">
          <div className="hbce-stack">
            <div>
              <p className="hbce-kicker">Approval decision</p>
              <h2>HBCE operator decision</h2>
              <p className="hbce-muted">
                Only APPROVE generates the next certificate in this MVP. Other
                decisions must be handled by a backend/admin workflow.
              </p>
            </div>

            <div className="hbce-form-grid">
              <label className="hbce-field">
                <span>Approved by</span>
                <input
                  type="text"
                  value={approvedBy}
                  placeholder="HBCE operator reference"
                  onChange={(event) => setApprovedBy(event.target.value)}
                />
                <small>
                  This value is written inside the private approval certificate
                  and also hashed for verification.
                </small>
              </label>

              <label className="hbce-field">
                <span>Review decision</span>
                <select
                  value={approvalDecision}
                  onChange={(event) => {
                    const value = event.target.value;

                    if (isApprovalDecision(value)) {
                      setApprovalDecision(value);
                    }
                  }}
                >
                  <option value="APPROVE">APPROVE</option>
                  <option value="REJECT">REJECT</option>
                  <option value="REQUEST_MORE_DATA">REQUEST_MORE_DATA</option>
                </select>
              </label>

              <label className="hbce-field">
                <span>Approval note</span>
                <input
                  type="text"
                  value={approvalNote}
                  placeholder="Optional internal note"
                  onChange={(event) => setApprovalNote(event.target.value)}
                />
                <small>
                  This optional value is written inside the private approval
                  certificate and also hashed. Do not insert raw personal
                  documents here.
                </small>
              </label>
            </div>
          </div>
        </section>

        {previousUpload ? (
          <section className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">Previous certificate accepted</p>
            <h2>Review package ready for approval.</h2>

            <p className="hbce-mono">
              current_phase: {previousUpload.certificate.phase.code}
            </p>

            <p className="hbce-mono">
              payload_sha256: {previousUpload.payloadSha256}
            </p>

            {previousUpload.previousPayloadSha256 ? (
              <p className="hbce-mono">
                previous_payload_sha256:{" "}
                {previousUpload.previousPayloadSha256}
              </p>
            ) : null}
          </section>
        ) : null}

        {error ? (
          <section className="hbce-card hbce-card--danger">
            <strong>FAIL_CLOSED</strong>
            <p>{error}</p>
          </section>
        ) : null}

        {generatedCertificate ? (
          <section className="hbce-card hbce-card--success">
            <p className="hbce-kicker">Certificate generated</p>
            <h2>{generatedCertificate.file_name}</h2>

            <p>
              The private HBCE approval certificate has been generated and
              downloaded. It contains approval fields, the corresponding hashes
              and the production trust boundary. Use this file for Phase 8 — IPR
              Card issuance.
            </p>

            <p className="hbce-mono">
              phase: {generatedCertificate.certificate.phase.code}
            </p>

            <p className="hbce-mono">
              status: {generatedCertificate.certificate.phase.status}
            </p>

            <p className="hbce-mono">
              payload_sha256: {generatedCertificate.payload_sha256}
            </p>

            {generatedCertificate.previous_payload_sha256 ? (
              <p className="hbce-mono">
                previous_payload_sha256:{" "}
                {generatedCertificate.previous_payload_sha256}
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="hbce-actions">
          <button
            className="hbce-btn hbce-btn--primary"
            type="button"
            disabled={isGenerating}
            onClick={issueApprovalCertificate}
          >
            {isGenerating
              ? "Issuing approval certificate"
              : "Issue HBCE IPR Certificate 07"}
          </button>
        </section>
      </main>
    </div>
  );
}
