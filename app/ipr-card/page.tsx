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

const phase = getPhaseDefinitionByNumber(8);

function createCompactId(prefix: string, source: string): string {
  const normalized = source.replace(/[^a-zA-Z0-9]/g, "").slice(0, 18);

  return `${prefix}-${normalized || "HBCE"}-${Date.now().toString(36).toUpperCase()}`;
}

function getOneYearValidity(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);

  return date.toISOString();
}

export default function IPRCardPage() {
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

    const baseHash = previousUpload.payloadSha256;

    return {
      iprId: createCompactId("IPR", baseHash),
      subjectId:
        previousUpload.certificate.subject.subject_id ??
        createCompactId("SUBJECT", previousUpload.certificate.subject.subject_ref),
      cardSerial: createCompactId("IPR-CARD", baseHash)
    };
  }, [previousUpload]);

  async function issueIprCardCertificate() {
    setError("");
    setGeneratedCertificate(null);

    if (!previousUpload) {
      setError("Upload the required HBCE approved certificate first.");
      return;
    }

    if (!operatorReference.trim()) {
      setError("Insert the HBCE issuer/operator reference before issuing the IPR Card.");
      return;
    }

    if (!validUntil.trim()) {
      setError("Insert the IPR Card validity date.");
      return;
    }

    setIsGenerating(true);

    try {
      const issuedAt = nowIso();
      const iprId = createCompactId("IPR", previousUpload.payloadSha256);
      const subjectId =
        previousUpload.certificate.subject.subject_id ??
        createCompactId("SUBJECT", previousUpload.certificate.subject.subject_ref);
      const cardSerial = createCompactId("IPR-CARD", previousUpload.payloadSha256);

      const cardMetadataHash = await sha256Canonical({
        kind: "HBCE_IPR_PHASE_8_CARD_METADATA",
        ipr_id: iprId,
        subject_id: subjectId,
        card_serial: cardSerial,
        card_status: "ACTIVE",
        operator_reference: operatorReference.trim(),
        previous_payload_sha256:
          previousUpload.certificate.hash_integrity.payload_sha256,
        issued_at: issuedAt,
        valid_until: validUntil
      });

      const phaseData: JsonObject = {
        ipr_id: iprId,
        subject_id: subjectId,
        card_serial: cardSerial,
        card_status: "ACTIVE",
        issuer: "HERMETICUM B.C.E. S.r.l.",
        issued_at: issuedAt,
        valid_until: validUntil,
        card_metadata_hash: cardMetadataHash,
        operator_reference_hash: await sha256Canonical({
          kind: "HBCE_IPR_PHASE_8_OPERATOR_REFERENCE",
          value: operatorReference.trim(),
          issued_at: issuedAt
        }),
        previous_payload_sha256:
          previousUpload.certificate.hash_integrity.payload_sha256,
        next_required_phase: "OPERATIONAL_CERTIFICATE",
        non_replacement_boundary:
          "HBCE IPR Card is an internal operational identity card. It does not replace CIE, SPID, EUDI Wallet, passport, driving licence or official state identity."
      };

      const generated = await generateHbceIprCertificate({
        phase_number: phase.phase_number,
        phase_code: phase.phase_code,
        phase_status: "ACTIVE",
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
          <p className="hbce-kicker">HBCE IPR Card</p>

          <h1>{phase.title}</h1>

          <p>
            This phase issues the virtual IPR Card file after HBCE approval. The
            card is an internal operational identity credential for the HBCE
            ecosystem and prepares the subject for the operational certificate
            step.
          </p>
        </section>

        <IprCertificateUploader
          expectedPreviousPhase={phase.expected_previous_phase}
          expectedNextPhase={phase.next_required_phase}
          title="Upload HBCE Approved IPR Certificate"
          description="Upload hbce-ipr-07-ipr-approved.hbce.json. The app verifies the approved phase before issuing the IPR Card certificate."
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
              <p className="hbce-kicker">Card issuance data</p>
              <h2>Issue the virtual IPR Card.</h2>
              <p className="hbce-muted">
                The app generates an IPR ID, subject ID and card serial from the
                approved certificate hash. The portable certificate stores hash
                references and operational metadata only.
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
                  onChange={(event) =>
                    setValidUntil(new Date(event.target.value).toISOString())
                  }
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
              The IPR Card certificate has been generated and downloaded. Use
              this file for Phase 9 — HBCE Operational Certificate.
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
