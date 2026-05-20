"use client";

import { useMemo, useState } from "react";

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
  JsonObject
} from "@/lib/types";

const phase = getPhaseDefinitionByNumber(9);

function createCompactId(prefix: string, source: string): string {
  const normalized = source.replace(/[^a-zA-Z0-9]/g, "").slice(0, 18);

  return `${prefix}-${normalized || "HBCE"}-${Date.now()
    .toString(36)
    .toUpperCase()}`;
}

function getOneYearValidity(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);

  return date.toISOString();
}

export default function CertificatePage() {
  const [previousUpload, setPreviousUpload] =
    useState<AcceptedIprCertificateUpload | null>(null);
  const [operatorReference, setOperatorReference] = useState("HBCE-OPERATOR");
  const [validUntil, setValidUntil] = useState(getOneYearValidity());
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCertificate, setGeneratedCertificate] =
    useState<HbceGeneratedCertificate<JsonObject> | null>(null);

  const generatedPreview = useMemo(() => {
    if (!previousUpload) {
      return null;
    }

    const cardPayload = previousUpload.certificate.payload.phase_data;
    const fallbackSource = previousUpload.payloadSha256;

    const iprId =
      typeof cardPayload.ipr_id === "string"
        ? cardPayload.ipr_id
        : createCompactId("IPR", fallbackSource);

    const subjectId =
      typeof cardPayload.subject_id === "string"
        ? cardPayload.subject_id
        : previousUpload.certificate.subject.subject_id ??
          createCompactId("SUBJECT", previousUpload.certificate.subject.subject_ref);

    const cardSerial =
      typeof cardPayload.card_serial === "string"
        ? cardPayload.card_serial
        : createCompactId("IPR-CARD", fallbackSource);

    return {
      certificateId: createCompactId("HBCE-CERT", fallbackSource),
      iprId,
      subjectId,
      cardSerial
    };
  }, [previousUpload]);

  async function issueOperationalCertificate() {
    setError("");
    setGeneratedCertificate(null);

    if (!previousUpload) {
      setError("Upload the required HBCE IPR Card certificate first.");
      return;
    }

    if (!operatorReference.trim()) {
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
      const cardPayload = previousUpload.certificate.payload.phase_data;
      const fallbackSource = previousUpload.payloadSha256;

      const iprId =
        typeof cardPayload.ipr_id === "string"
          ? cardPayload.ipr_id
          : createCompactId("IPR", fallbackSource);

      const subjectId =
        typeof cardPayload.subject_id === "string"
          ? cardPayload.subject_id
          : previousUpload.certificate.subject.subject_id ??
            createCompactId("SUBJECT", previousUpload.certificate.subject.subject_ref);

      const cardSerial =
        typeof cardPayload.card_serial === "string"
          ? cardPayload.card_serial
          : createCompactId("IPR-CARD", fallbackSource);

      const certificateId = createCompactId("HBCE-CERT", fallbackSource);

      const verificationHash = await sha256Canonical({
        kind: "HBCE_IPR_PHASE_9_OPERATIONAL_CERTIFICATE",
        certificate_id: certificateId,
        ipr_id: iprId,
        subject_id: subjectId,
        card_serial: cardSerial,
        certificate_status: "ACTIVE",
        certificate_scope: "JOKER_C2_ACCESS",
        operator_reference: operatorReference.trim(),
        previous_payload_sha256:
          previousUpload.certificate.hash_integrity.payload_sha256,
        issued_at: issuedAt,
        valid_until: validUntil
      });

      const phaseData: JsonObject = {
        certificate_id: certificateId,
        ipr_id: iprId,
        subject_id: subjectId,
        card_serial: cardSerial,
        certificate_status: "ACTIVE",
        certificate_scope: "JOKER_C2_ACCESS",
        issuer: "HERMETICUM B.C.E. S.r.l.",
        issued_at: issuedAt,
        valid_until: validUntil,
        verification_hash: verificationHash,
        operator_reference_hash: await sha256Canonical({
          kind: "HBCE_IPR_PHASE_9_OPERATOR_REFERENCE",
          value: operatorReference.trim(),
          issued_at: issuedAt
        }),
        previous_payload_sha256:
          previousUpload.certificate.hash_integrity.payload_sha256,
        next_required_phase: "JOKER_C2_ACCESS",
        access_boundary:
          "This HBCE Operational Certificate enables eligibility for JOKER-C2 access evaluation. Runtime access still requires fail-closed certificate validation.",
        legal_boundary:
          "This is an internal HBCE operational certificate. It is not a qualified eIDAS certificate unless formally integrated with a recognized trust service."
      };

      const generated = await generateHbceIprCertificate({
        phase_number: phase.phase_number,
        phase_code: phase.phase_code,
        phase_status: "COMPLETED",
        next_required_phase: phase.next_required_phase,
        subject: {
          ...previousUpload.certificate.subject,
          subject_id: subjectId
        },
        previous_certificate: previousUpload.certificate,
        previous_payload_sha256:
          previousUpload.certificate.hash_integrity.payload_sha256,
        phase_data: phaseData,
        issued_at: issuedAt
      });

      setGeneratedCertificate(generated);
      downloadHbceIprCertificate(generated.certificate, generated.file_name);
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

        <IprCertificateUploader
          expectedPreviousPhase={phase.expected_previous_phase}
          expectedNextPhase={phase.next_required_phase}
          title="Upload HBCE IPR Card Certificate"
          description="Upload hbce-ipr-08-ipr-card.hbce.json. The app verifies the IPR Card phase before issuing the final operational certificate."
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
              <p className="hbce-kicker">Certificate activation data</p>
              <h2>Issue the HBCE operational certificate.</h2>
              <p className="hbce-muted">
                The app generates a certificate ID and binds it to the IPR ID,
                subject ID, IPR Card serial and JOKER-C2 access scope.
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
              The HBCE operational certificate has been generated and downloaded.
              Upload this file on JOKER-C2 access gate.
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
