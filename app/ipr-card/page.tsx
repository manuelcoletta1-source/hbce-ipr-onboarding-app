"use client";

import { useEffect, useMemo, useState } from "react";
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

type ActiveIprCardUpload = {
  certificate: HbceIprCertificate;
  fileName: string;
  payloadSha256: string;
  previousPayloadSha256: string | null;
  source: "session" | "upload";
};

type Phase8CardPreview = {
  iprId: string;
  subjectId: string;
  cardSerial: string;
};

type Phase8IprCardPrivateFields = JsonObject & {
  ipr_id: string;
  subject_id: string;
  card_serial: string;
  card_status: "ACTIVE";
  issuer: "HERMETICUM B.C.E. S.r.l.";
  operator_reference: string;
  issued_at: string;
  valid_until: string;
  next_required_phase: "OPERATIONAL_CERTIFICATE";
  non_replacement_boundary: string;
  operational_certificate_issued: false;
  joker_c2_access_authorized: false;
};

type Phase8IprCardHashFields = JsonObject & {
  ipr_id_hash: string;
  subject_id_hash: string;
  card_serial_hash: string;
  card_status_hash: string;
  operator_reference_hash: string;
  validity_hash: string;
  non_replacement_boundary_hash: string;
  card_boundary_hash: string;
};

const phase = getPhaseDefinitionByNumber(8);

const SESSION_CERTIFICATE_PREFIX = "HBCE_IPR_CERTIFICATE_FOR_NEXT_PHASE";

const NON_REPLACEMENT_BOUNDARY =
  "HBCE IPR Card is an internal operational identity card. It does not replace CIE, SPID, EUDI Wallet, passport, driving licence, national identity card, qualified eIDAS certificate or official state identity.";

const CARD_ISSUANCE_BOUNDARY =
  "Certificate 08 records internal HBCE IPR Card issuance. It does not issue the final operational certificate and it does not grant JOKER-C2 access.";

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

function createCompactId(prefix: string, source: string): string {
  const normalized = source.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const compact = normalized.slice(0, 24) || "HBCE";

  return `${prefix}-${compact}`;
}

function getOneYearValidity(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);

  return date.toISOString();
}

function normalizeOperatorReference(value: string): string {
  return value.trim();
}

function normalizeValidUntil(value: string): string {
  return value.trim();
}

function isValidFutureIsoDate(value: string): boolean {
  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    return false;
  }

  return parsed > Date.now();
}

function buildActiveUploadFromAcceptedUpload(
  upload: AcceptedIprCertificateUpload
): ActiveIprCardUpload {
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
): ActiveIprCardUpload {
  return {
    certificate,
    fileName: "hbce-ipr-07-ipr-approved.hbce.json",
    payloadSha256: certificate.hash_integrity.payload_sha256,
    previousPayloadSha256: certificate.hash_integrity.previous_payload_sha256,
    source: "session"
  };
}

function buildCardPreview(previousUpload: ActiveIprCardUpload): Phase8CardPreview {
  const baseHash = previousUpload.payloadSha256;

  const subjectId =
    previousUpload.certificate.subject.subject_id ??
    createCompactId("SUBJECT", previousUpload.certificate.subject.subject_ref);

  return {
    iprId: createCompactId("IPR", baseHash),
    subjectId,
    cardSerial: createCompactId("IPR-CARD", baseHash)
  };
}

async function buildHashFields(params: {
  privateFields: Phase8IprCardPrivateFields;
  previousPayloadSha256: string;
}): Promise<Phase8IprCardHashFields> {
  const iprIdHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_8_IPR_ID",
    phase: "IPR_CARD_ISSUED",
    value: params.privateFields.ipr_id,
    previous_payload_sha256: params.previousPayloadSha256,
    issued_at: params.privateFields.issued_at
  });

  const subjectIdHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_8_SUBJECT_ID",
    phase: "IPR_CARD_ISSUED",
    value: params.privateFields.subject_id,
    previous_payload_sha256: params.previousPayloadSha256,
    issued_at: params.privateFields.issued_at
  });

  const cardSerialHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_8_CARD_SERIAL",
    phase: "IPR_CARD_ISSUED",
    value: params.privateFields.card_serial,
    previous_payload_sha256: params.previousPayloadSha256,
    issued_at: params.privateFields.issued_at
  });

  const cardStatusHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_8_CARD_STATUS",
    phase: "IPR_CARD_ISSUED",
    value: params.privateFields.card_status,
    previous_payload_sha256: params.previousPayloadSha256,
    issued_at: params.privateFields.issued_at
  });

  const operatorReferenceHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_8_OPERATOR_REFERENCE",
    phase: "IPR_CARD_ISSUED",
    value: params.privateFields.operator_reference,
    previous_payload_sha256: params.previousPayloadSha256,
    issued_at: params.privateFields.issued_at
  });

  const validityHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_8_VALIDITY",
    phase: "IPR_CARD_ISSUED",
    previous_payload_sha256: params.previousPayloadSha256,
    issued_at: params.privateFields.issued_at,
    valid_until: params.privateFields.valid_until
  });

  const nonReplacementBoundaryHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_8_NON_REPLACEMENT_BOUNDARY",
    phase: "IPR_CARD_ISSUED",
    value: NON_REPLACEMENT_BOUNDARY,
    previous_payload_sha256: params.previousPayloadSha256,
    issued_at: params.privateFields.issued_at
  });

  const cardBoundaryHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_8_CARD_BOUNDARY",
    phase: "IPR_CARD_ISSUED",
    value: CARD_ISSUANCE_BOUNDARY,
    operational_certificate_issued:
      params.privateFields.operational_certificate_issued,
    joker_c2_access_authorized:
      params.privateFields.joker_c2_access_authorized,
    next_required_phase: params.privateFields.next_required_phase,
    previous_payload_sha256: params.previousPayloadSha256,
    issued_at: params.privateFields.issued_at
  });

  return {
    ipr_id_hash: iprIdHash,
    subject_id_hash: subjectIdHash,
    card_serial_hash: cardSerialHash,
    card_status_hash: cardStatusHash,
    operator_reference_hash: operatorReferenceHash,
    validity_hash: validityHash,
    non_replacement_boundary_hash: nonReplacementBoundaryHash,
    card_boundary_hash: cardBoundaryHash
  };
}

export default function IPRCardPage() {
  const router = useRouter();

  const [previousUpload, setPreviousUpload] =
    useState<ActiveIprCardUpload | null>(null);
  const [operatorReference, setOperatorReference] = useState("HBCE-OPERATOR");
  const [validUntil, setValidUntil] = useState(getOneYearValidity());
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCertificate, setGeneratedCertificate] =
    useState<HbceGeneratedCertificate<JsonObject> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function restoreApprovedCertificateFromSession() {
      if (previousUpload) {
        return;
      }

      const stored = readStoredCertificateForPhase("IPR_CARD_ISSUANCE");

      if (!stored) {
        return;
      }

      const validation = await validatePreviousHbceIprCertificate({
        certificate: stored,
        expected_previous_phase: "IPR_APPROVED",
        expected_next_phase: "IPR_CARD_ISSUANCE"
      });

      if (cancelled) {
        return;
      }

      if (!validation.valid) {
        clearStoredCertificateForPhase("IPR_CARD_ISSUANCE");
        setPreviousUpload(null);
        setError(
          "The stored approved certificate was rejected. Upload Certificate 07 manually."
        );
        return;
      }

      setPreviousUpload(
        buildActiveUploadFromSession(stored as HbceIprCertificate)
      );
      setError("");
    }

    void restoreApprovedCertificateFromSession();

    return () => {
      cancelled = true;
    };
  }, [previousUpload]);

  const generatedPreview = useMemo(() => {
    if (!previousUpload) {
      return null;
    }

    return buildCardPreview(previousUpload);
  }, [previousUpload]);

  function clearPreviousUpload() {
    clearStoredCertificateForPhase("IPR_CARD_ISSUANCE");
    setPreviousUpload(null);
    setGeneratedCertificate(null);
    setError("");
  }

  async function issueIprCardCertificate() {
    setError("");
    setGeneratedCertificate(null);

    if (!previousUpload) {
      setError("Upload the required HBCE approved certificate first.");
      return;
    }

    const normalizedOperatorReference =
      normalizeOperatorReference(operatorReference);

    if (!normalizedOperatorReference) {
      setError(
        "Insert the HBCE issuer/operator reference before issuing the IPR Card."
      );
      return;
    }

    const normalizedValidUntil = normalizeValidUntil(validUntil);

    if (!normalizedValidUntil) {
      setError("Insert the IPR Card validity date.");
      return;
    }

    if (!isValidFutureIsoDate(normalizedValidUntil)) {
      setError(
        "Insert a valid future date for the IPR Card validity boundary."
      );
      return;
    }

    setIsGenerating(true);

    try {
      const validation = await validatePreviousHbceIprCertificate({
        certificate: previousUpload.certificate,
        expected_previous_phase: "IPR_APPROVED",
        expected_next_phase: "IPR_CARD_ISSUANCE"
      });

      if (!validation.valid) {
        setPreviousUpload(null);
        clearStoredCertificateForPhase("IPR_CARD_ISSUANCE");
        setError(
          validation.message || "The approved certificate failed validation."
        );
        return;
      }

      const issuedAt = nowIso();

      const previousPayloadSha256 =
        previousUpload.certificate.hash_integrity.payload_sha256;

      const cardPreview = buildCardPreview(previousUpload);

      const privateFields: Phase8IprCardPrivateFields = {
        ipr_id: cardPreview.iprId,
        subject_id: cardPreview.subjectId,
        card_serial: cardPreview.cardSerial,
        card_status: "ACTIVE",
        issuer: "HERMETICUM B.C.E. S.r.l.",
        operator_reference: normalizedOperatorReference,
        issued_at: issuedAt,
        valid_until: normalizedValidUntil,
        next_required_phase: "OPERATIONAL_CERTIFICATE",
        non_replacement_boundary: NON_REPLACEMENT_BOUNDARY,
        operational_certificate_issued: false,
        joker_c2_access_authorized: false
      };

      const hashFields = await buildHashFields({
        privateFields,
        previousPayloadSha256
      });

      const cardMetadataHash = await sha256Canonical({
        kind: "HBCE_IPR_PHASE_8_CARD_METADATA",
        phase: "IPR_CARD_ISSUED",
        private_fields: privateFields,
        hash_fields: hashFields,
        previous_payload_sha256: previousPayloadSha256,
        issued_at: issuedAt
      });

      const phaseData: JsonObject = {
        certificate_role: "STEP_8_IPR_CARD_ISSUANCE",
        certificate_visibility: "PRIVATE_PORTABLE_CERTIFICATE",
        public_registry_mode: "HASH_ONLY",
        phase_scope: "IPR_CARD_ISSUANCE",

        private_fields: privateFields,
        card_fields: privateFields,
        card_private_data: privateFields,
        card_private_data_included: true,

        hash_fields: hashFields,

        ipr_id: privateFields.ipr_id,
        subject_id: privateFields.subject_id,
        card_serial: privateFields.card_serial,
        card_status: privateFields.card_status,
        issuer: privateFields.issuer,
        issued_at: privateFields.issued_at,
        issued_at_utc: privateFields.issued_at,
        valid_until: privateFields.valid_until,

        ipr_id_hash: hashFields.ipr_id_hash,
        subject_id_hash: hashFields.subject_id_hash,
        card_serial_hash: hashFields.card_serial_hash,
        card_status_hash: hashFields.card_status_hash,
        operator_reference_hash: hashFields.operator_reference_hash,
        validity_hash: hashFields.validity_hash,
        non_replacement_boundary_hash:
          hashFields.non_replacement_boundary_hash,
        card_boundary_hash: hashFields.card_boundary_hash,
        card_metadata_hash: cardMetadataHash,

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
        ipr_card_issued: true,
        ipr_card_status: "ACTIVE",
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
          ipr_card_issued: true,
          operational_certificate_issued: false,
          joker_c2_access: "DENIED"
        },

        previous_payload_sha256: previousPayloadSha256,
        next_required_phase: "OPERATIONAL_CERTIFICATE",

        non_replacement_boundary: NON_REPLACEMENT_BOUNDARY,
        card_issuance_boundary: CARD_ISSUANCE_BOUNDARY,

        certificate_boundary:
          "This file records internal HBCE IPR Card issuance. It does not replace any official state identity document, it does not issue a qualified eIDAS certificate and it does not grant JOKER-C2 access by itself.",

        privacy_boundary:
          "This is a private portable HBCE-IPR certificate downloaded by the subject. IPR Card fields are stored inside private_fields. Public verification must expose hash-only references, not private card fields.",

        trust_boundary:
          "HBCE IPR Card is an internal operational identity credential for HBCE-governed workflows. It is not a state identity document, bank account, payment instrument or regulated trust service."
      };

      const generated = await generateHbceIprCertificate({
        phase_number: phase.phase_number,
        phase_code: phase.phase_code,
        phase_status: "ACTIVE",
        next_required_phase: phase.next_required_phase,
        subject: {
          ...previousUpload.certificate.subject,
          subject_id: cardPreview.subjectId
        },
        previous_certificate: previousUpload.certificate,
        previous_payload_sha256: previousPayloadSha256,
        phase_data: phaseData,
        issued_at: issuedAt
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
          : "HBCE IPR Card certificate generation failed."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="hbce-container">
      <main className="hbce-main">
        <section className="hbce-hero">
          <p className="hbce-kicker">HBCE IPR Card · Phase 08</p>

          <h1>{phase.title}</h1>

          <p>
            This phase issues the virtual IPR Card file after HBCE approval. The
            card is an internal operational identity credential for the HBCE
            ecosystem and prepares the subject for the operational certificate
            step.
          </p>
        </section>

        {previousUpload ? (
          <section className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">
              {previousUpload.source === "session"
                ? "Approved certificate loaded from session"
                : "Approved certificate accepted"}
            </p>

            <h2>Certificate 07 ready for IPR Card issuance.</h2>

            <p>
              The required approved certificate is already available for this
              phase. You can now issue the internal HBCE IPR Card.
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
                Use another Certificate 07
              </button>
            </div>
          </section>
        ) : (
          <IprCertificateUploader
            expectedPreviousPhase={phase.expected_previous_phase}
            expectedNextPhase="IPR_CARD_ISSUANCE"
            title="Upload HBCE Approved IPR Certificate"
            description="Upload hbce-ipr-07-ipr-approved.hbce.json. The app verifies the approved phase before issuing the IPR Card certificate."
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
              <p className="hbce-kicker">Card issuance data</p>
              <h2>Issue the virtual IPR Card.</h2>
              <p className="hbce-muted">
                The app generates a deterministic IPR ID, subject ID and card
                serial from the approved certificate hash. These values are
                written inside the private IPR Card certificate and also hashed
                for verification.
              </p>
            </div>

            <div className="hbce-form-grid">
              <label className="hbce-field">
                <span>HBCE issuer/operator reference</span>
                <input
                  type="text"
                  value={operatorReference}
                  placeholder="HBCE-OPERATOR"
                  onChange={(event) => setOperatorReference(event.target.value)}
                />
                <small>
                  This value is written inside the private IPR Card certificate
                  and also hashed.
                </small>
              </label>

              <label className="hbce-field">
                <span>Valid until</span>
                <input
                  type="datetime-local"
                  value={validUntil.slice(0, 16)}
                  onChange={(event) => {
                    if (!event.target.value) {
                      setValidUntil("");
                      return;
                    }

                    setValidUntil(new Date(event.target.value).toISOString());
                  }}
                />
                <small>
                  Default validity is one year from issuance. Production validity
                  must be enforced server-side.
                </small>
              </label>
            </div>
          </div>
        </section>

        {generatedPreview ? (
          <section className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">Generated card preview</p>
            <h2>IPR Card identifiers</h2>

            <p className="hbce-mono">ipr_id: {generatedPreview.iprId}</p>
            <p className="hbce-mono">subject_id: {generatedPreview.subjectId}</p>
            <p className="hbce-mono">
              card_serial: {generatedPreview.cardSerial}
            </p>
            <p className="hbce-mono">card_status: ACTIVE</p>
            <p className="hbce-mono">operational_certificate: NOT_ISSUED</p>
            <p className="hbce-mono">joker_c2_access: DENIED</p>
          </section>
        ) : null}

        <section className="hbce-card">
          <p className="hbce-kicker">Legal boundary</p>
          <h2>The IPR Card is not a state identity document.</h2>
          <p>
            HBCE IPR Card does not replace CIE, SPID, EUDI Wallet, passport,
            driving licence, public identity card, qualified eIDAS certificate or
            any official state identity system. It is an internal operational
            identity card for HBCE-governed workflows.
          </p>
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
              The private IPR Card certificate has been generated and downloaded.
              It contains IPR Card fields, the corresponding hashes and the legal
              non-replacement boundary. Use this file for Phase 9 — HBCE
              Operational Certificate.
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
            onClick={issueIprCardCertificate}
          >
            {isGenerating
              ? "Issuing IPR Card certificate"
              : "Issue HBCE IPR Certificate 08"}
          </button>
        </section>
      </main>
    </div>
  );
}
