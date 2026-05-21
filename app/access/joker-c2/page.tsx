"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import IprCertificateUploader from "@/components/IprCertificateUploader";

import { JOKER_C2_GATEWAY_URL } from "@/lib/constants";
import { validateJokerC2OperationalCertificate } from "@/lib/ipr-certificate-chain";

import type { AcceptedIprCertificateUpload } from "@/components/IprCertificateUploader";
import type {
  HbceIprCertificate,
  HbceIprNextPhaseCode,
  HbceJokerC2AccessGateResult,
  JsonObject
} from "@/lib/types";

type ActiveJokerC2CertificateUpload = {
  certificate: HbceIprCertificate;
  fileName: string;
  payloadSha256: string;
  previousPayloadSha256: string | null;
  source: "session" | "upload";
};

const ACCESS_REQUIREMENTS = [
  "The uploaded file must be the final HBCE operational certificate.",
  "The protocol must be HBCE-IPR-RELEASE-v3.",
  "The issuer must be HERMETICUM B.C.E. S.r.l.",
  "The certificate kind must be IPR_OPERATIONAL_CERTIFICATE.",
  "The phase code must be IPR_VERIFIED.",
  "The certificate status must be ACTIVE.",
  "The certificate scope must be JOKER_C2_ACCESS.",
  "The previous payload hash must be present.",
  "The payload hash must match the canonical certificate payload.",
  "Any malformed, incomplete, expired, revoked, suspended or wrong-scope certificate must be denied."
] as const;

const FINAL_CERTIFICATE_FILE_NAME =
  "hbce-ipr-09-operational-certificate.hbce.json";

const SESSION_CERTIFICATE_PREFIX = "HBCE_IPR_CERTIFICATE_FOR_NEXT_PHASE";

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

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildActiveUploadFromAcceptedUpload(
  upload: AcceptedIprCertificateUpload
): ActiveJokerC2CertificateUpload {
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
): ActiveJokerC2CertificateUpload {
  return {
    certificate,
    fileName: FINAL_CERTIFICATE_FILE_NAME,
    payloadSha256: certificate.hash_integrity.payload_sha256,
    previousPayloadSha256: certificate.hash_integrity.previous_payload_sha256,
    source: "session"
  };
}

function getCertificatePrivateFields(
  upload: ActiveJokerC2CertificateUpload
): JsonObject | null {
  const phaseData = upload.certificate.payload.phase_data;

  if (isJsonObject(phaseData.certificate_fields)) {
    return phaseData.certificate_fields;
  }

  if (isJsonObject(phaseData.private_fields)) {
    return phaseData.private_fields;
  }

  return null;
}

function getStringField(fields: JsonObject | null, key: string): string | null {
  if (!fields) {
    return null;
  }

  const value = fields[key];

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function getPhaseDataString(
  upload: ActiveJokerC2CertificateUpload | null,
  key: string
): string | null {
  if (!upload) {
    return null;
  }

  const value = upload.certificate.payload.phase_data[key];

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function getDisplayedCertificateStatus(
  upload: ActiveJokerC2CertificateUpload | null,
  privateFields: JsonObject | null
): string | null {
  return (
    getStringField(privateFields, "certificate_status") ??
    getPhaseDataString(upload, "certificate_status") ??
    null
  );
}

function getDisplayedCertificateScope(
  upload: ActiveJokerC2CertificateUpload | null,
  privateFields: JsonObject | null
): string | null {
  return (
    getStringField(privateFields, "certificate_scope") ??
    getPhaseDataString(upload, "certificate_scope") ??
    null
  );
}

export default function JokerC2AccessPage() {
  const [acceptedUpload, setAcceptedUpload] =
    useState<ActiveJokerC2CertificateUpload | null>(null);
  const [accessResult, setAccessResult] =
    useState<HbceJokerC2AccessGateResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  async function evaluateAccess(upload: ActiveJokerC2CertificateUpload) {
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

  useEffect(() => {
    let cancelled = false;

    async function restoreOperationalCertificateFromSession() {
      if (acceptedUpload) {
        return;
      }

      const stored = readStoredCertificateForPhase("JOKER_C2_ACCESS");

      if (!stored) {
        return;
      }

      const sessionUpload = buildActiveUploadFromSession(
        stored as HbceIprCertificate
      );

      const result = await validateJokerC2OperationalCertificate(
        sessionUpload.certificate
      );

      if (cancelled) {
        return;
      }

      if (result.decision !== "ACCESS_GRANTED") {
        clearStoredCertificateForPhase("JOKER_C2_ACCESS");
        setAcceptedUpload(sessionUpload);
        setAccessResult(result);
        return;
      }

      setAcceptedUpload(sessionUpload);
      setAccessResult(result);
    }

    void restoreOperationalCertificateFromSession();

    return () => {
      cancelled = true;
    };
  }, [acceptedUpload]);

  function clearAcceptedCertificate() {
    clearStoredCertificateForPhase("JOKER_C2_ACCESS");
    setAcceptedUpload(null);
    setAccessResult(null);
  }

  const isAccessGranted = accessResult?.decision === "ACCESS_GRANTED";
  const privateFields = acceptedUpload
    ? getCertificatePrivateFields(acceptedUpload)
    : null;
  const displayedCertificateStatus = getDisplayedCertificateStatus(
    acceptedUpload,
    privateFields
  );
  const displayedCertificateScope = getDisplayedCertificateScope(
    acceptedUpload,
    privateFields
  );

  const certificateId = getStringField(privateFields, "certificate_id");
  const iprId = getStringField(privateFields, "ipr_id");
  const subjectId = getStringField(privateFields, "subject_id");
  const cardSerial = getStringField(privateFields, "card_serial");
  const issuedAt = getStringField(privateFields, "issued_at");
  const validUntil = getStringField(privateFields, "valid_until");

  return (
    <div className="hbce-container">
      <main className="hbce-main">
        <section className="hbce-hero">
          <p className="hbce-kicker">JOKER-C2 Verified Access</p>

          <h1>Upload the HBCE Operational Certificate.</h1>

          <p>
            JOKER-C2 does not open through a simple email login or subscription.
            Access requires the final HBCE operational certificate generated at
            the end of the IPR onboarding chain.
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

        {acceptedUpload ? (
          <section className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">
              {acceptedUpload.source === "session"
                ? "Operational certificate loaded from session"
                : "Operational certificate accepted"}
            </p>

            <h2>Certificate 09 ready for JOKER-C2 gate evaluation.</h2>

            <p>
              The final HBCE operational certificate is available. The gate has
              evaluated it using fail-closed validation.
            </p>

            <div className="hbce-actions">
              <button
                className="hbce-btn hbce-btn--ghost"
                type="button"
                onClick={clearAcceptedCertificate}
              >
                Use another Certificate 09
              </button>
            </div>
          </section>
        ) : (
          <IprCertificateUploader
            expectedPreviousPhase="IPR_VERIFIED"
            expectedNextPhase="JOKER_C2_ACCESS"
            title="Upload HBCE Operational Certificate"
            description={`Upload ${FINAL_CERTIFICATE_FILE_NAME}. The gate verifies protocol, issuer, kind, phase, status, scope, previous hash and payload hash before allowing governed JOKER-C2 access.`}
            onCertificateAccepted={(upload) => {
              void evaluateAccess(buildActiveUploadFromAcceptedUpload(upload));
            }}
            onValidation={(validation) => {
              if (!validation.valid) {
                setAcceptedUpload(null);
                setAccessResult(null);
              }
            }}
          />
        )}

        {isAccessGranted ? (
          <section className="hbce-card hbce-card--success">
            <p className="hbce-kicker">IPR Verified</p>

            <h2>HBCE IPR Verified · JOKER-C2 Access Granted</h2>

            <p>
              The subject has completed the HBCE IPR onboarding chain. The IPR
              Card is active, the operational certificate is valid and the
              certificate scope allows governed JOKER-C2 access.
            </p>

            <div className="hbce-grid hbce-grid--3">
              <div className="hbce-card hbce-card--soft">
                <p className="hbce-kicker">IPR status</p>
                <h3>VERIFIED</h3>
                <p className="hbce-muted">
                  The operational identity chain reached the final verified
                  phase.
                </p>
              </div>

              <div className="hbce-card hbce-card--soft">
                <p className="hbce-kicker">IPR Card</p>
                <h3>ACTIVE</h3>
                <p className="hbce-muted">
                  The internal HBCE IPR Card has been issued for governed
                  workflows.
                </p>
              </div>

              <div className="hbce-card hbce-card--soft">
                <p className="hbce-kicker">JOKER-C2</p>
                <h3>ACCESS_GRANTED</h3>
                <p className="hbce-muted">
                  The final operational certificate passed fail-closed access
                  validation.
                </p>
              </div>
            </div>

            <p className="hbce-mono">
              certificate_id: {certificateId ?? "unavailable"}
            </p>
            <p className="hbce-mono">ipr_id: {iprId ?? "unavailable"}</p>
            <p className="hbce-mono">
              subject_id: {subjectId ?? "unavailable"}
            </p>
            <p className="hbce-mono">
              card_serial: {cardSerial ?? "unavailable"}
            </p>
            <p className="hbce-mono">
              certificate_status: {displayedCertificateStatus ?? "unavailable"}
            </p>
            <p className="hbce-mono">
              certificate_scope: {displayedCertificateScope ?? "unavailable"}
            </p>
            <p className="hbce-mono">
              valid_until: {validUntil ?? "unavailable"}
            </p>

            <div className="hbce-actions">
              <a
                className="hbce-btn hbce-btn--primary"
                href={JOKER_C2_GATEWAY_URL}
                rel="noopener noreferrer"
                target="_blank"
              >
                Open JOKER-C2 Runtime
              </a>

              <Link className="hbce-btn" href="/onboarding">
                Start another IPR onboarding
              </Link>
            </div>
          </section>
        ) : null}

        <section className="hbce-card">
          <p className="hbce-kicker">Access requirements</p>
          <h2>JOKER-C2 remains closed unless every condition is valid.</h2>

          <p>
            This gate is fail-closed. A malformed certificate, wrong phase,
            wrong issuer, missing hash, invalid scope, inactive status or broken
            canonical payload blocks access.
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
            <h2>HBCE operational certificate received.</h2>

            <p className="hbce-mono">file_name: {acceptedUpload.fileName}</p>

            <p className="hbce-mono">
              proto: {acceptedUpload.certificate.proto}
            </p>

            <p className="hbce-mono">
              issuer: {acceptedUpload.certificate.issuer.legal_name}
            </p>

            <p className="hbce-mono">
              kind: {acceptedUpload.certificate.kind}
            </p>

            <p className="hbce-mono">
              phase: {acceptedUpload.certificate.phase.code}
            </p>

            <p className="hbce-mono">
              phase_status: {acceptedUpload.certificate.phase.status}
            </p>

            {displayedCertificateStatus ? (
              <p className="hbce-mono">
                certificate_status: {displayedCertificateStatus}
              </p>
            ) : null}

            {displayedCertificateScope ? (
              <p className="hbce-mono">
                certificate_scope: {displayedCertificateScope}
              </p>
            ) : null}

            <p className="hbce-mono">
              payload_sha256: {acceptedUpload.payloadSha256}
            </p>

            {acceptedUpload.previousPayloadSha256 ? (
              <p className="hbce-mono">
                previous_payload_sha256:{" "}
                {acceptedUpload.previousPayloadSha256}
              </p>
            ) : (
              <p className="hbce-mono">previous_payload_sha256: null</p>
            )}
          </section>
        ) : null}

        {privateFields ? (
          <section className="hbce-card">
            <p className="hbce-kicker">Private certificate fields</p>
            <h2>Operational identity data read from the private certificate.</h2>

            {certificateId ? (
              <p className="hbce-mono">certificate_id: {certificateId}</p>
            ) : null}

            {iprId ? <p className="hbce-mono">ipr_id: {iprId}</p> : null}

            {subjectId ? (
              <p className="hbce-mono">subject_id: {subjectId}</p>
            ) : null}

            {cardSerial ? (
              <p className="hbce-mono">card_serial: {cardSerial}</p>
            ) : null}

            {displayedCertificateStatus ? (
              <p className="hbce-mono">
                certificate_status: {displayedCertificateStatus}
              </p>
            ) : null}

            {displayedCertificateScope ? (
              <p className="hbce-mono">
                certificate_scope: {displayedCertificateScope}
              </p>
            ) : null}

            {issuedAt ? (
              <p className="hbce-mono">issued_at: {issuedAt}</p>
            ) : null}

            {validUntil ? (
              <p className="hbce-mono">valid_until: {validUntil}</p>
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
