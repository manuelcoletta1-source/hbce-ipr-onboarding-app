"use client";

import Link from "next/link";
import { useState } from "react";

import IprCertificateUploader from "@/components/IprCertificateUploader";

import { validateJokerC2OperationalCertificate } from "@/lib/ipr-certificate-chain";

import type { AcceptedIprCertificateUpload } from "@/components/IprCertificateUploader";
import type { HbceJokerC2AccessGateResult } from "@/lib/types";

const ACCESS_REQUIREMENTS = [
  "The uploaded file must be an HBCE operational certificate.",
  "The certificate kind must be IPR_OPERATIONAL_CERTIFICATE.",
  "The phase code must be IPR_VERIFIED.",
  "The certificate status must be ACTIVE.",
  "The certificate scope must be JOKER_C2_ACCESS.",
  "The issuer must be HERMETICUM B.C.E. S.r.l.",
  "The previous payload hash must be present.",
  "The payload hash must match the canonical certificate payload."
] as const;

export default function JokerC2AccessPage() {
  const [acceptedUpload, setAcceptedUpload] =
    useState<AcceptedIprCertificateUpload | null>(null);
  const [accessResult, setAccessResult] =
    useState<HbceJokerC2AccessGateResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  async function evaluateAccess(upload: AcceptedIprCertificateUpload) {
    setAcceptedUpload(upload);
    setAccessResult(null);
    setIsChecking(true);

    try {
      const result = await validateJokerC2OperationalCertificate(
        upload.certificate
      );

      setAccessResult(result);
    } finally {
      setIsChecking(false);
    }
  }

  const isAccessGranted = accessResult?.decision === "ACCESS_GRANTED";

  return (
    <div className="hbce-container">
      <main className="hbce-main">
        <section className="hbce-hero">
          <p className="hbce-kicker">JOKER-C2 Verified Access</p>

          <h1>Upload the HBCE Operational Certificate.</h1>

          <p>
            JOKER-C2 does not open through a simple email login or subscription.
            Access requires a valid HBCE operational certificate generated at the
            end of the IPR onboarding chain.
          </p>

          <div className="hbce-actions">
            <Link className="hbce-btn" href="/certificate">
              Back to Certificate
            </Link>

            <Link className="hbce-btn" href="/onboarding">
              Continue Onboarding
            </Link>
          </div>
        </section>

        <IprCertificateUploader
          expectedPreviousPhase="IPR_VERIFIED"
          expectedNextPhase="JOKER_C2_ACCESS"
          title="Upload HBCE Operational Certificate"
          description="Upload hbce-ipr-09-operational-certificate.hbce.json. The gate verifies protocol, issuer, phase, status, scope and payload hash before allowing governed JOKER-C2 access."
          onCertificateAccepted={(upload) => {
            void evaluateAccess(upload);
          }}
          onValidation={(validation) => {
            if (!validation.valid) {
              setAcceptedUpload(null);
              setAccessResult(null);
            }
          }}
        />

        <section className="hbce-card">
          <p className="hbce-kicker">Access requirements</p>
          <h2>JOKER-C2 remains closed unless every condition is valid.</h2>

          <p>
            This gate is fail-closed. A malformed certificate, wrong phase,
            wrong issuer, missing hash, invalid scope or inactive status blocks
            access.
          </p>

          <ul className="hbce-list">
            {ACCESS_REQUIREMENTS.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
        </section>

        {isChecking ? (
          <section className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">Checking certificate</p>
            <h2>Evaluating JOKER-C2 access.</h2>
            <p>
              The certificate is being checked against the HBCE operational
              access requirements.
            </p>
          </section>
        ) : null}

        {acceptedUpload ? (
          <section className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">Uploaded certificate</p>
            <h2>HBCE certificate received.</h2>

            <p className="hbce-mono">file_name: {acceptedUpload.fileName}</p>

            <p className="hbce-mono">
              phase: {acceptedUpload.certificate.phase.code}
            </p>

            <p className="hbce-mono">
              kind: {acceptedUpload.certificate.kind}
            </p>

            <p className="hbce-mono">
              payload_sha256: {acceptedUpload.payloadSha256}
            </p>

            {acceptedUpload.previousPayloadSha256 ? (
              <p className="hbce-mono">
                previous_payload_sha256:{" "}
                {acceptedUpload.previousPayloadSha256}
              </p>
            ) : null}
          </section>
        ) : null}

        {accessResult ? (
          <section
            className={
              isAccessGranted
                ? "hbce-card hbce-card--success"
                : "hbce-card hbce-card--danger"
            }
          >
            <p className="hbce-kicker">Access decision</p>

            <h2>{accessResult.decision}</h2>

            <p>{accessResult.reason}</p>

            {accessResult.certificate_status ? (
              <p className="hbce-mono">
                certificate_status: {accessResult.certificate_status}
              </p>
            ) : null}

            {accessResult.certificate_scope ? (
              <p className="hbce-mono">
                certificate_scope: {accessResult.certificate_scope}
              </p>
            ) : null}

            {accessResult.payload_sha256 ? (
              <p className="hbce-mono">
                payload_sha256: {accessResult.payload_sha256}
              </p>
            ) : null}

            {accessResult.previous_payload_sha256 ? (
              <p className="hbce-mono">
                previous_payload_sha256:{" "}
                {accessResult.previous_payload_sha256}
              </p>
            ) : null}

            <p className="hbce-mono">checked_at: {accessResult.checked_at}</p>

            {isAccessGranted ? (
              <div className="hbce-actions">
                <a
                  className="hbce-btn hbce-btn--primary"
                  href="https://hbce-ai-joker-c2.vercel.app/interface"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Open JOKER-C2 Runtime
                </a>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="hbce-card">
          <p className="hbce-kicker">Boundary</p>
          <h2>Access is governed, not automatic.</h2>

          <p>
            The HBCE operational certificate enables JOKER-C2 access evaluation.
            It does not bypass governance, revocation, suspension, expiry,
            runtime policy or future server-side enforcement.
          </p>
        </section>
      </main>
    </div>
  );
}
