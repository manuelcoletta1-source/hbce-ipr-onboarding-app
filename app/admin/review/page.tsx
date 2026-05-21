"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import IprCertificateUploader from "@/components/IprCertificateUploader";

import {
  downloadHbceIprCertificate,
  generateHbceIprCertificate,
  nowIso,
  sha256Canonical,
  validatePreviousHbceIprCertificate
} from "@/lib/ipr-certificate-chain";

import {
  getContinuationRouteFromCertificate,
  getPhaseDefinitionByNumber
} from "@/lib/ipr-phase-map";

import type { AcceptedIprCertificateUpload } from "@/components/IprCertificateUploader";

import type {
  HbceGeneratedCertificate,
  HbceIprCertificate,
  HbceIprNextPhaseCode,
  JsonObject
} from "@/lib/types";

type ApprovalDecision = "APPROVE" | "REJECT" | "REQUEST_MORE_DATA";

type ActiveApprovalUpload = {
  certificate: HbceIprCertificate;
  fileName: string;
  payloadSha256: string;
  previousPayloadSha256: string | null;
  source: "session" | "upload";
};

type Phase7ApprovalPrivateFields = JsonObject & {
  approved_by: string;
  approved_at: string;
  approval_decision: "APPROVE";
  approval_note: string;
  user_self_approval_allowed: false;
  backend_or_admin_review_required: true;
  hbce_operator_decision_required: true;
  production_backend_required: true;
  ipr_card_issuance_authorized: true;
  operational_certificate_issued: false;
  joker_c2_access_authorized: false;
  next_required_phase: "IPR_CARD_ISSUANCE";
  production_boundary: string;
};

type Phase7ApprovalHashFields = JsonObject & {
  approval_decision_hash: string;
  approved_by_hash: string;
  approval_status_hash: string;
  approval_boundary_hash: string;
  production_boundary_hash: string;
  approval_note_hash?: string;
};

const phase = getPhaseDefinitionByNumber(7);

const SESSION_CERTIFICATE_PREFIX = "HBCE_IPR_CERTIFICATE_FOR_NEXT_PHASE";

const PRODUCTION_BOUNDARY =
  "MVP client-side approval is not a production trust source. Production approval requires authenticated backend enforcement, operator authentication, audit logging, revocation control and protected evidence storage.";

const APPROVAL_BOUNDARY =
  "Certificate 07 records HBCE approval of the review package and authorizes IPR Card issuance as the next phase. It does not issue the IPR Card, does not issue the operational certificate and does not grant JOKER-C2 access.";

function getSessionCertificateKey(nextPhase: HbceIprNextPhaseCode): string {
  return `${SESSION_CERTIFICATE_PREFIX}:${nextPhase}`;
}

function readStoredCertificateForPhase(
  nextPhase: HbceIprNextPhaseCode
): unknown | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(getSessionCertificateKey(nextPhase));

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    window.sessionStorage.removeItem(getSessionCertificateKey(nextPhase));
    return null;
  }
}

function clearStoredCertificateForPhase(nextPhase: HbceIprNextPhaseCode): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(getSessionCertificateKey(nextPhase));
}

function storeCertificateForNextPhase(certificate: HbceIprCertificate): void {
  if (typeof window === "undefined") {
    return;
  }

  const nextPhase = certificate.next.next_phase;

  if (nextPhase === "COMPLETED" || nextPhase === "JOKER_C2_ACCESS") {
    return;
  }

  window.sessionStorage.setItem(
    getSessionCertificateKey(nextPhase),
    JSON.stringify(certificate)
  );
}

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

function buildActiveUploadFromAcceptedUpload(
  upload: AcceptedIprCertificateUpload
): ActiveApprovalUpload {
  return {
    certificate: upload.certificate,
    fileName: upload.fileName,
    payloadSha256: upload.payloadSha256,
    previousPayloadSha256: upload.previousPayloadSha256,
    source: "upload"
  };
}

function buildActiveUploadFromSession(
  certificate: HbceIprCertificate
): ActiveApprovalUpload {
  return {
    certificate,
    fileName: "hbce-ipr-06-review-pending.hbce.json",
    payloadSha256: certificate.hash_integrity.payload_sha256,
    previousPayloadSha256: certificate.hash_integrity.previous_payload_sha256,
    source: "session"
  };
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
  const approvalDecisionHash = await buildApprovalDecisionHash({
    previousCertificate: params.previousCertificate,
    approvedBy: params.privateFields.approved_by,
    approvalDecision: params.privateFields.approval_decision,
    approvalNote: params.privateFields.approval_note,
    approvedAt: params.privateFields.approved_at
  });

  const approvedByHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_7_APPROVED_BY",
    phase: "IPR_APPROVED",
    value: params.privateFields.approved_by,
    previous_payload_sha256:
      params.previousCertificate.hash_integrity.payload_sha256,
    approved_at: params.privateFields.approved_at
  });

  const approvalStatusHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_7_APPROVAL_STATUS",
    phase: "IPR_APPROVED",
    approval_decision: params.privateFields.approval_decision,
    ipr_card_issuance_authorized:
      params.privateFields.ipr_card_issuance_authorized,
    operational_certificate_issued:
      params.privateFields.operational_certificate_issued,
    joker_c2_access_authorized:
      params.privateFields.joker_c2_access_authorized,
    previous_payload_sha256:
      params.previousCertificate.hash_integrity.payload_sha256,
    approved_at: params.privateFields.approved_at
  });

  const approvalBoundaryHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_7_APPROVAL_BOUNDARY",
    phase: "IPR_APPROVED",
    value: APPROVAL_BOUNDARY,
    user_self_approval_allowed:
      params.privateFields.user_self_approval_allowed,
    backend_or_admin_review_required:
      params.privateFields.backend_or_admin_review_required,
    hbce_operator_decision_required:
      params.privateFields.hbce_operator_decision_required,
    next_required_phase: params.privateFields.next_required_phase,
    previous_payload_sha256:
      params.previousCertificate.hash_integrity.payload_sha256,
    approved_at: params.privateFields.approved_at
  });

  const productionBoundaryHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_7_PRODUCTION_BOUNDARY",
    phase: "IPR_APPROVED",
    value: PRODUCTION_BOUNDARY,
    production_backend_required:
      params.privateFields.production_backend_required,
    previous_payload_sha256:
      params.previousCertificate.hash_integrity.payload_sha256,
    approved_at: params.privateFields.approved_at
  });

  const hashFields: Phase7ApprovalHashFields = {
    approval_decision_hash: approvalDecisionHash,
    approved_by_hash: approvedByHash,
    approval_status_hash: approvalStatusHash,
    approval_boundary_hash: approvalBoundaryHash,
    production_boundary_hash: productionBoundaryHash
  };

  if (params.privateFields.approval_note) {
    hashFields.approval_note_hash = await sha256Canonical({
      kind: "HBCE_IPR_PHASE_7_APPROVAL_NOTE",
      phase: "IPR_APPROVED",
      value: params.privateFields.approval_note,
      previous_payload_sha256:
        params.previousCertificate.hash_integrity.payload_sha256,
      approved_at: params.privateFields.approved_at
    });
  }

  return hashFields;
}

export default function AdminReviewPage() {
  const router = useRouter();

  const [previousUpload, setPreviousUpload] =
    useState<ActiveApprovalUpload | null>(null);
  const [approvedBy, setApprovedBy] = useState("");
  const [approvalDecision, setApprovalDecision] =
    useState<ApprovalDecision>("APPROVE");
  const [approvalNote, setApprovalNote] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCertificate, setGeneratedCertificate] =
    useState<HbceGeneratedCertificate<JsonObject> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function restoreReviewPendingCertificateFromSession() {
      if (previousUpload) {
        return;
      }

      const stored = readStoredCertificateForPhase("HBCE_APPROVAL");

      if (!stored) {
        return;
      }

      const validation = await validatePreviousHbceIprCertificate({
        certificate: stored,
        expected_previous_phase: "PENDING_REVIEW",
        expected_next_phase: "HBCE_APPROVAL"
      });

      if (cancelled) {
        return;
      }

      if (!validation.valid) {
        clearStoredCertificateForPhase("HBCE_APPROVAL");
        setPreviousUpload(null);
        setError(
          "The stored review pending certificate was rejected. Upload Certificate 06 manually."
        );
        return;
      }

      setPreviousUpload(
        buildActiveUploadFromSession(stored as HbceIprCertificate)
      );
      setError("");
    }

    void restoreReviewPendingCertificateFromSession();

    return () => {
      cancelled = true;
    };
  }, [previousUpload]);

  function clearPreviousUpload() {
    clearStoredCertificateForPhase("HBCE_APPROVAL");
    setPreviousUpload(null);
    setGeneratedCertificate(null);
    setError("");
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
        "This MVP page only generates Certificate 07 for APPROVE decisions. REJECT and REQUEST_MORE_DATA must be handled by a protected backend/admin workflow."
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
      const validation = await validatePreviousHbceIprCertificate({
        certificate: previousUpload.certificate,
        expected_previous_phase: "PENDING_REVIEW",
        expected_next_phase: "HBCE_APPROVAL"
      });

      if (!validation.valid) {
        setPreviousUpload(null);
        clearStoredCertificateForPhase("HBCE_APPROVAL");
        setError(
          validation.message ||
            "The review pending certificate failed validation."
        );
        return;
      }

      const approvedAt = nowIso();

      const privateFields: Phase7ApprovalPrivateFields = {
        approved_by: normalizedApprovedBy,
        approved_at: approvedAt,
        approval_decision: "APPROVE",
        approval_note: normalizedApprovalNote,
        user_self_approval_allowed: false,
        backend_or_admin_review_required: true,
        hbce_operator_decision_required: true,
        production_backend_required: true,
        ipr_card_issuance_authorized: true,
        operational_certificate_issued: false,
        joker_c2_access_authorized: false,
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
        approval_boundary_hash: hashFields.approval_boundary_hash,
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
        operational_certificate_issued: false,
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
        hbce_operator_decision_required: true,
        production_backend_required: true,
        ipr_card_issuance_authorized: true,
        production_boundary: PRODUCTION_BOUNDARY,

        certificate_boundary: APPROVAL_BOUNDARY,

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
      storeCertificateForNextPhase(generated.certificate);
      downloadHbceIprCertificate(generated.certificate, generated.file_name);

      const nextRoute = getContinuationRouteFromCertificate(
        generated.certificate
      );

      window.setTimeout(() => {
        router.push(nextRoute);
      }, 250);
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
          <p className="hbce-kicker">HBCE Admin Review · Phase 07</p>

          <h1>{phase.title}</h1>

          <p>
            This phase issues the approved HBCE-IPR certificate after review.
            The user cannot self-approve. In production, this operation must be
            enforced by authenticated backend/admin logic.
          </p>
        </section>

        {previousUpload ? (
          <section className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">
              {previousUpload.source === "session"
                ? "Review pending certificate loaded from session"
                : "Review pending certificate accepted"}
            </p>

            <h2>Certificate 06 ready for HBCE approval.</h2>

            <p>
              The required review pending certificate is available for this
              admin phase. The HBCE operator can now issue Certificate 07.
            </p>

            <p className="hbce-mono">file_name: {previousUpload.fileName}</p>

            <p className="hbce-mono">
              current_phase: {previousUpload.certificate.phase.code}
            </p>

            <p className="hbce-mono">
              unlocks_phase: {previousUpload.certificate.next.next_phase}
            </p>

            <p className="hbce-mono">
              payload_sha256: {previousUpload.payloadSha256}
            </p>

            {previousUpload.previousPayloadSha256 ? (
              <p className="hbce-mono">
                previous_payload_sha256: {previousUpload.previousPayloadSha256}
              </p>
            ) : null}

            <div className="hbce-actions">
              <button
                className="hbce-btn hbce-btn--ghost"
                type="button"
                onClick={clearPreviousUpload}
              >
                Use another Certificate 06
              </button>
            </div>
          </section>
        ) : (
          <IprCertificateUploader
            expectedPreviousPhase={phase.expected_previous_phase}
            expectedNextPhase="HBCE_APPROVAL"
            title="Upload Review Pending HBCE IPR Certificate"
            description="Upload hbce-ipr-06-review-pending.hbce.json. The page verifies the previous phase before issuing the HBCE approval certificate."
            onCertificateAccepted={(upload) => {
              setPreviousUpload(buildActiveUploadFromAcceptedUpload(upload));
              setError("");
            }}
            onValidation={(validation) => {
              if (!validation.valid) {
                setPreviousUpload(null);
              }
            }}
          />
        )}

        <section className="hbce-card">
          <div className="hbce-stack">
            <div>
              <p className="hbce-kicker">Approval decision</p>
              <h2>HBCE operator decision</h2>
              <p className="hbce-muted">
                Only APPROVE generates the next certificate in this MVP. Other
                decisions must be handled by a protected backend/admin workflow.
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
                <small>
                  In this MVP, only APPROVE can produce Certificate 07.
                </small>
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
