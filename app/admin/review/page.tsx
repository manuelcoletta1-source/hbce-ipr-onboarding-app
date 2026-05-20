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

const phase = getPhaseDefinitionByNumber(7);

export default function AdminReviewPage() {
  const [previousUpload, setPreviousUpload] =
    useState<AcceptedIprCertificateUpload | null>(null);
  const [approvedBy, setApprovedBy] = useState("");
  const [approvalDecision, setApprovalDecision] = useState("APPROVE");
  const [approvalNote, setApprovalNote] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCertificate, setGeneratedCertificate] =
    useState<HbceGeneratedCertificate<JsonObject> | null>(null);

  async function buildApprovalDecisionHash(params: {
    previousCertificate: HbceIprCertificate;
    approvedBy: string;
    approvalDecision: string;
    approvalNote: string;
    approvedAt: string;
  }): Promise<string> {
    return sha256Canonical({
      kind: "HBCE_IPR_PHASE_7_APPROVAL_DECISION",
      previous_payload_sha256:
        params.previousCertificate.hash_integrity.payload_sha256,
      approved_by: params.approvedBy,
      approval_decision: params.approvalDecision,
      approval_note: params.approvalNote,
      approved_at: params.approvedAt
    });
  }

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

    if (!approvedBy.trim()) {
      setError("Insert the HBCE operator reference before approval.");
      return;
    }

    setIsGenerating(true);

    try {
      const approvedAt = nowIso();

      const approvalDecisionHash = await buildApprovalDecisionHash({
        previousCertificate: previousUpload.certificate,
        approvedBy: approvedBy.trim(),
        approvalDecision,
        approvalNote: approvalNote.trim(),
        approvedAt
      });

      const phaseData: JsonObject = {
        approved_by: approvedBy.trim(),
        approved_at: approvedAt,
        approval_decision_hash: approvalDecisionHash,
        approval_decision: "APPROVE",
        previous_payload_sha256:
          previousUpload.certificate.hash_integrity.payload_sha256,
        next_required_phase: "IPR_CARD_ISSUANCE",
        user_self_approval_allowed: false,
        backend_or_admin_review_required: true,
        production_boundary:
          "MVP client-side approval is not a production trust source. Production approval requires authenticated backend enforcement."
      };

      if (approvalNote.trim()) {
        phaseData.approval_note_hash = await sha256Canonical({
          kind: "HBCE_IPR_PHASE_7_APPROVAL_NOTE",
          value: approvalNote.trim(),
          approved_at: approvedAt
        });
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
                  Use an operator reference, not a public personal document.
                </small>
              </label>

              <label className="hbce-field">
                <span>Review decision</span>
                <select
                  value={approvalDecision}
                  onChange={(event) => setApprovalDecision(event.target.value)}
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
                  The portable certificate stores only the note hash, not the raw
                  note.
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
              The HBCE approval certificate has been generated and downloaded.
              Use this file for Phase 8 — IPR Card issuance.
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
