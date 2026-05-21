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

type ActiveOperationalCertificateUpload = {
  certificate: HbceIprCertificate;
  fileName: string;
  payloadSha256: string;
  previousPayloadSha256: string | null;
  source: "session" | "upload";
};

type Phase9OperationalPreview = {
  certificateId: string;
  iprId: string;
  subjectId: string;
  cardSerial: string;
};

type Phase9OperationalPrivateFields = JsonObject & {
  certificate_id: string;
  ipr_id: string;
  subject_id: string;
  card_serial: string;
  certificate_status: "ACTIVE";
  certificate_scope: "JOKER_C2_ACCESS";
  issuer: "HERMETICUM B.C.E. S.r.l.";
  operator_reference: string;
  issued_at: string;
  valid_until: string;
  next_required_phase: "JOKER_C2_ACCESS";
  access_boundary: string;
  legal_boundary: string;
};

type Phase9OperationalHashFields = JsonObject & {
  certificate_id_hash: string;
  ipr_id_hash: string;
  subject_id_hash: string;
  card_serial_hash: string;
  certificate_status_hash: string;
  certificate_scope_hash: string;
  operator_reference_hash: string;
  validity_hash: string;
  access_boundary_hash: string;
  legal_boundary_hash: string;
};

const phase = getPhaseDefinitionByNumber(9);

const SESSION_CERTIFICATE_PREFIX = "HBCE_IPR_CERTIFICATE_FOR_NEXT_PHASE";

const ACCESS_BOUNDARY =
  "This HBCE Operational Certificate enables eligibility for JOKER-C2 access evaluation. Runtime access still requires fail-closed certificate validation.";

const LEGAL_BOUNDARY =
  "This is an internal HBCE operational certificate. It is not a qualified eIDAS certificate unless formally integrated with a recognized trust service.";

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

  if (nextPhase === "COMPLETED") {
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

function readStringFromPayload(
  payload: JsonObject,
  key: string
): string | null {
  const value = payload[key];

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function buildActiveUploadFromAcceptedUpload(
  upload: AcceptedIprCertificateUpload
): ActiveOperationalCertificateUpload {
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
): ActiveOperationalCertificateUpload {
  return {
    certificate,
    fileName: "hbce-ipr-08-ipr-card.hbce.json",
    payloadSha256: certificate.hash_integrity.payload_sha256,
    previousPayloadSha256: certificate.hash_integrity.previous_payload_sha256,
    source: "session"
  };
}

function buildOperationalPreview(
  previousUpload: ActiveOperationalCertificateUpload
): Phase9OperationalPreview {
  const cardPayload = previousUpload.certificate.payload.phase_data;
  const fallbackSource = previousUpload.payloadSha256;

  const iprId =
    readStringFromPayload(cardPayload, "ipr_id") ??
    createCompactId("IPR", fallbackSource);

  const subjectId =
    readStringFromPayload(cardPayload, "subject_id") ??
    previousUpload.certificate.subject.subject_id ??
    createCompactId(
      "SUBJECT",
      previousUpload.certificate.subject.subject_ref
    );

  const cardSerial =
    readStringFromPayload(cardPayload, "card_serial") ??
    createCompactId("IPR-CARD", fallbackSource);

  return {
    certificateId: createCompactId("HBCE-CERT", fallbackSource),
    iprId,
    subjectId,
    cardSerial
  };
}

async function buildHashFields(params: {
  privateFields: Phase9OperationalPrivateFields;
  previousPayloadSha256: string;
}): Promise<Phase9OperationalHashFields> {
  return {
    certificate_id_hash: await sha256Canonical({
      kind: "HBCE_IPR_PHASE_9_CERTIFICATE_ID",
      phase: "IPR_VERIFIED",
      value: params.privateFields.certificate_id,
      previous_payload_sha256: params.previousPayloadSha256,
      issued_at: params.privateFields.issued_at
    }),
    ipr_id_hash: await sha256Canonical({
      kind: "HBCE_IPR_PHASE_9_IPR_ID",
      phase: "IPR_VERIFIED",
      value: params.privateFields.ipr_id,
      previous_payload_sha256: params.previousPayloadSha256,
      issued_at: params.privateFields.issued_at
    }),
    subject_id_hash: await sha256Canonical({
      kind: "HBCE_IPR_PHASE_9_SUBJECT_ID",
      phase: "IPR_VERIFIED",
      value: params.privateFields.subject_id,
      previous_payload_sha256: params.previousPayloadSha256,
      issued_at: params.privateFields.issued_at
    }),
    card_serial_hash: await sha256Canonical({
      kind: "HBCE_IPR_PHASE_9_CARD_SERIAL",
      phase: "IPR_VERIFIED",
      value: params.privateFields.card_serial,
      previous_payload_sha256: params.previousPayloadSha256,
      issued_at: params.privateFields.issued_at
    }),
    certificate_status_hash: await sha256Canonical({
      kind: "HBCE_IPR_PHASE_9_CERTIFICATE_STATUS",
      phase: "IPR_VERIFIED",
      value: params.privateFields.certificate_status,
      previous_payload_sha256: params.previousPayloadSha256,
      issued_at: params.privateFields.issued_at
    }),
    certificate_scope_hash: await sha256Canonical({
      kind: "HBCE_IPR_PHASE_9_CERTIFICATE_SCOPE",
      phase: "IPR_VERIFIED",
      value: params.privateFields.certificate_scope,
      previous_payload_sha256: params.previousPayloadSha256,
      issued_at: params.privateFields.issued_at
    }),
    operator_reference_hash: await sha256Canonical({
      kind: "HBCE_IPR_PHASE_9_OPERATOR_REFERENCE",
      phase: "IPR_VERIFIED",
      value: params.privateFields.operator_reference,
      previous_payload_sha256: params.previousPayloadSha256,
      issued_at: params.privateFields.issued_at
    }),
    validity_hash: await sha256Canonical({
      kind: "HBCE_IPR_PHASE_9_VALIDITY",
      phase: "IPR_VERIFIED",
      previous_payload_sha256: params.previousPayloadSha256,
      issued_at: params.privateFields.issued_at,
      valid_until: params.privateFields.valid_until
    }),
    access_boundary_hash: await sha256Canonical({
      kind: "HBCE_IPR_PHASE_9_ACCESS_BOUNDARY",
      phase: "IPR_VERIFIED",
      value: ACCESS_BOUNDARY,
      previous_payload_sha256: params.previousPayloadSha256,
      issued_at: params.privateFields.issued_at
    }),
    legal_boundary_hash: await sha256Canonical({
      kind: "HBCE_IPR_PHASE_9_LEGAL_BOUNDARY",
      phase: "IPR_VERIFIED",
      value: LEGAL_BOUNDARY,
      previous_payload_sha256: params.previousPayloadSha256,
      issued_at: params.privateFields.issued_at
    })
  };
}

export default function CertificatePage() {
  const router = useRouter();

  const [previousUpload, setPreviousUpload] =
    useState<ActiveOperationalCertificateUpload | null>(null);
  const [operatorReference, setOperatorReference] = useState("HBCE-OPERATOR");
  const [validUntil, setValidUntil] = useState(getOneYearValidity());
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCertificate, setGeneratedCertificate] =
    useState<HbceGeneratedCertificate<JsonObject> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function restoreIprCardCertificateFromSession() {
      if (previousUpload) {
        return;
      }

      const stored = readStoredCertificateForPhase("OPERATIONAL_CERTIFICATE");

      if (!stored) {
        return;
      }

      const validation = await validatePreviousHbceIprCertificate({
        certificate: stored,
        expected_previous_phase: "IPR_CARD_ISSUED",
        expected_next_phase: "OPERATIONAL_CERTIFICATE"
      });

      if (cancelled) {
        return;
      }

      if (!validation.valid) {
        clearStoredCertificateForPhase("OPERATIONAL_CERTIFICATE");
        setPreviousUpload(null);
        setError(
          "The stored IPR Card certificate was rejected. Upload Certificate 08 manually."
        );
        return;
      }

      setPreviousUpload(buildActiveUploadFromSession(stored as HbceIprCertificate));
      setError("");
    }

    void restoreIprCardCertificateFromSession();

    return () => {
      cancelled = true;
    };
  }, [previousUpload]);

  const generatedPreview = useMemo(() => {
    if (!previousUpload) {
      return null;
    }

    return buildOperationalPreview(previousUpload);
  }, [previousUpload]);

  function clearPreviousUpload() {
    clearStoredCertificateForPhase("OPERATIONAL_CERTIFICATE");
    setPreviousUpload(null);
  }

  async function issueOperationalCertificate() {
    setError("");
    setGeneratedCertificate(null);

    if (!previousUpload) {
      setError("Upload the required HBCE IPR Card certificate first.");
      return;
    }

    const normalizedOperatorReference =
      normalizeOperatorReference(operatorReference);

    if (!normalizedOperatorReference) {
      setError(
        "Insert the HBCE issuer/operator reference before issuing the operational certificate."
      );
      return;
    }

    if (!validUntil.trim()) {
      setError("Insert the operational certificate validity date.");
      return;
    }

    setIsGenerating(true);

    try {
      const issuedAt = nowIso();
      const previousPayloadSha256 =
        previousUpload.certificate.hash_integrity.payload_sha256;
      const operationalPreview = buildOperationalPreview(previousUpload);

      const privateFields: Phase9OperationalPrivateFields = {
        certificate_id: operationalPreview.certificateId,
        ipr_id: operationalPreview.iprId,
        subject_id: operationalPreview.subjectId,
        card_serial: operationalPreview.cardSerial,
        certificate_status: "ACTIVE",
        certificate_scope: "JOKER_C2_ACCESS",
        issuer: "HERMETICUM B.C.E. S.r.l.",
        operator_reference: normalizedOperatorReference,
        issued_at: issuedAt,
        valid_until: validUntil,
        next_required_phase: "JOKER_C2_ACCESS",
        access_boundary: ACCESS_BOUNDARY,
        legal_boundary: LEGAL_BOUNDARY
      };

      const hashFields = await buildHashFields({
        privateFields,
        previousPayloadSha256
      });

      const verificationHash = await sha256Canonical({
        kind: "HBCE_IPR_PHASE_9_OPERATIONAL_CERTIFICATE",
        phase: "IPR_VERIFIED",
        private_fields: privateFields,
        hash_fields: hashFields,
        previous_payload_sha256: previousPayloadSha256,
        issued_at: issuedAt
      });

      const phaseData: JsonObject = {
        certificate_role: "STEP_9_OPERATIONAL_CERTIFICATE",
        certificate_visibility: "PRIVATE_PORTABLE_CERTIFICATE",
        public_registry_mode: "HASH_ONLY",
        phase_scope: "OPERATIONAL_CERTIFICATE",

        private_fields: privateFields,
        certificate_fields: privateFields,
        operational_certificate_private_data: privateFields,
        operational_certificate_private_data_included: true,

        hash_fields: hashFields,

        certificate_id: privateFields.certificate_id,
        ipr_id: privateFields.ipr_id,
        subject_id: privateFields.subject_id,
        card_serial: privateFields.card_serial,
        certificate_status: privateFields.certificate_status,
        certificate_scope: privateFields.certificate_scope,
        issuer: privateFields.issuer,
        issued_at: privateFields.issued_at,
        issued_at_utc: privateFields.issued_at,
        valid_until: privateFields.valid_until,

        certificate_id_hash: hashFields.certificate_id_hash,
        ipr_id_hash: hashFields.ipr_id_hash,
        subject_id_hash: hashFields.subject_id_hash,
        card_serial_hash: hashFields.card_serial_hash,
        certificate_status_hash: hashFields.certificate_status_hash,
        certificate_scope_hash: hashFields.certificate_scope_hash,
        operator_reference_hash: hashFields.operator_reference_hash,
        validity_hash: hashFields.validity_hash,
        access_boundary_hash: hashFields.access_boundary_hash,
        legal_boundary_hash: hashFields.legal_boundary_hash,
        verification_hash: verificationHash,

        fiscal_identity_collected: true,
        fiscal_identity_verified: true,
        official_document_uploaded: true,
        official_document_verified: true,
        liveness_submitted: true,
        liveness_verified: true,
        privacy_compliance_accepted: true,
        hbce_review_status: "APPROVED",
        ipr_approved: true,
        ipr_status: "VERIFIED",
        ipr_card_issued: true,
        ipr_card_status: "ACTIVE",
        operational_certificate_issued: true,
        operational_certificate_status: "ACTIVE",
        joker_c2_access: "ELIGIBLE_FOR_GATE_VALIDATION",

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
          operational_certificate_issued: true,
          operational_certificate_status: "ACTIVE",
          joker_c2_access: "ELIGIBLE_FOR_GATE_VALIDATION"
        },

        previous_payload_sha256: previousPayloadSha256,
        next_required_phase: "JOKER_C2_ACCESS",

        access_boundary: ACCESS_BOUNDARY,
        legal_boundary: LEGAL_BOUNDARY,

        certificate_boundary:
          "This file records the final HBCE operational certificate for the IPR onboarding chain. It enables JOKER-C2 access evaluation, but JOKER-C2 must still validate the certificate fail-closed before granting runtime access.",

        privacy_boundary:
          "This is a private portable HBCE-IPR certificate downloaded by the subject. Operational certificate fields are stored inside private_fields. Public verification must expose hash-only references, not private certificate fields.",

        trust_boundary:
          "This certificate enables eligibility for JOKER-C2 access evaluation only. JOKER-C2 must still validate protocol, issuer, phase, status, scope, previous hash and payload hash before granting access."
      };

      const generated = await generateHbceIprCertificate({
        phase_number: phase.phase_number,
        phase_code: phase.phase_code,
        phase_status: "COMPLETED",
        next_required_phase: phase.next_required_phase,
        subject: {
          ...previousUpload.certificate.subject,
          subject_id: operationalPreview.subjectId
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
          : "HBCE operational certificate generation failed."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="hbce-container">
      <main className="hbce-main">
        <section className="hbce-hero">
          <p className="hbce-kicker">HBCE Operational Certificate</p>

          <h1>{phase.title}</h1>

          <p>
            This phase issues the final HBCE operational certificate after IPR
            Card issuance. The certificate is the file required for governed
            JOKER-C2 access evaluation.
          </p>
        </section>

        {previousUpload ? (
          <section className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">
              {previousUpload.source === "session"
                ? "IPR Card certificate loaded from session"
                : "IPR Card certificate accepted"}
            </p>

            <h2>Certificate 08 ready for operational certificate issuance.</h2>

            <p>
              The required IPR Card certificate is already available for this
              phase. You can now issue the final HBCE operational certificate.
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
                Use another Certificate 08
              </button>
            </div>
          </section>
        ) : (
          <IprCertificateUploader
            expectedPreviousPhase={phase.expected_previous_phase}
            expectedNextPhase="OPERATIONAL_CERTIFICATE"
            title="Upload HBCE IPR Card Certificate"
            description="Upload hbce-ipr-08-ipr-card.hbce.json. The app verifies the IPR Card phase before issuing the final operational certificate."
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
              <p className="hbce-kicker">Certificate activation data</p>
              <h2>Issue the HBCE operational certificate.</h2>
              <p className="hbce-muted">
                The app generates a deterministic certificate ID and binds it to
                the IPR ID, subject ID, IPR Card serial and JOKER-C2 access
                scope. These values are written inside the private operational
                certificate and also hashed for verification.
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
                  This value is written inside the private operational
                  certificate and also hashed.
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
            <p className="hbce-kicker">Generated certificate preview</p>
            <h2>Operational certificate identifiers</h2>

            <p className="hbce-mono">
              certificate_id: {generatedPreview.certificateId}
            </p>
            <p className="hbce-mono">ipr_id: {generatedPreview.iprId}</p>
            <p className="hbce-mono">subject_id: {generatedPreview.subjectId}</p>
            <p className="hbce-mono">
              card_serial: {generatedPreview.cardSerial}
            </p>
            <p className="hbce-mono">certificate_status: ACTIVE</p>
            <p className="hbce-mono">certificate_scope: JOKER_C2_ACCESS</p>
            <p className="hbce-mono">
              joker_c2_access: ELIGIBLE_FOR_GATE_VALIDATION
            </p>
          </section>
        ) : null}

        <section className="hbce-card">
          <p className="hbce-kicker">Certificate boundary</p>
          <h2>The certificate enables access evaluation, not automatic trust.</h2>
          <p>
            The HBCE operational certificate is the internal authorization file
            used by the JOKER-C2 gate. JOKER-C2 must still validate protocol,
            issuer, phase, status, scope, previous hash and payload hash before
            granting access.
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
              The private HBCE operational certificate has been generated and
              downloaded. It contains certificate fields, the corresponding
              hashes and the JOKER-C2 access boundary. Upload this file on the
              JOKER-C2 access gate.
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
            onClick={issueOperationalCertificate}
          >
            {isGenerating
              ? "Issuing operational certificate"
              : "Issue HBCE IPR Certificate 09"}
          </button>
        </section>
      </main>
    </div>
  );
}
