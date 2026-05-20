"use client";

import { useId, useMemo, useRef, useState } from "react";

import {
  createValidationResult,
  isHbceIprCertificate,
  readHbceIprCertificateFile,
  recomputeCertificatePayloadSha256
} from "../lib/ipr-certificate-chain";

import type {
  HbceCertificateValidationResult,
  HbceIprCertificate,
  HbceIprCertificatePhaseCode,
  HbceIprNextPhaseCode,
  HashReference
} from "../lib/types";

export type IprCertificateUploaderMode =
  | "strict_previous"
  | "read_any";

export type AcceptedIprCertificateUpload = {
  certificate: HbceIprCertificate;
  file: File;
  fileName: string;
  payloadSha256: HashReference;
  previousPayloadSha256: HashReference | null;
};

export type IprCertificateUploaderProps = {
  id?: string;
  title?: string;
  description?: string;
  mode?: IprCertificateUploaderMode;
  expectedPreviousPhase?: HbceIprCertificatePhaseCode | null;
  expectedNextPhase?: HbceIprNextPhaseCode;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  onCertificateAccepted?: (upload: AcceptedIprCertificateUpload) => void;
  onValidation?: (validation: HbceCertificateValidationResult) => void;
};

function getDefaultTitle(mode: IprCertificateUploaderMode): string {
  if (mode === "read_any") {
    return "Continue with Existing HBCE IPR Certificate";
  }

  return "Upload Previous HBCE IPR Certificate";
}

function getDefaultDescription(mode: IprCertificateUploaderMode): string {
  if (mode === "read_any") {
    return "Upload the latest HBCE-IPR certificate you own. The app will read the current phase and determine the next operational step.";
  }

  return "Upload the required previous HBCE-IPR certificate. The app will verify protocol, issuer, phase, next phase and payload hash before allowing this step.";
}

function getAcceptedFileLabel(file: File): string {
  const sizeKb = Math.max(1, Math.round(file.size / 1024));

  return `${file.name} · ${sizeKb} KB`;
}

export default function IprCertificateUploader({
  id,
  title,
  description,
  mode = "strict_previous",
  expectedPreviousPhase = null,
  expectedNextPhase,
  required = true,
  disabled = false,
  className,
  onCertificateAccepted,
  onValidation
}: IprCertificateUploaderProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFileLabel, setSelectedFileLabel] = useState<string>("");
  const [validation, setValidation] =
    useState<HbceCertificateValidationResult | null>(null);
  const [payloadSha256, setPayloadSha256] = useState<HashReference | null>(null);
  const [previousPayloadSha256, setPreviousPayloadSha256] =
    useState<HashReference | null>(null);
  const [isReading, setIsReading] = useState(false);

  const resolvedTitle = useMemo(
    () => title ?? getDefaultTitle(mode),
    [mode, title]
  );

  const resolvedDescription = useMemo(
    () => description ?? getDefaultDescription(mode),
    [description, mode]
  );

  function resetUploader() {
    setSelectedFileLabel("");
    setValidation(null);
    setPayloadSha256(null);
    setPreviousPayloadSha256(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function validateAnyHbceCertificate(
    file: File
  ): Promise<{
    certificate: HbceIprCertificate | null;
    validation: HbceCertificateValidationResult;
  }> {
    const raw = await file.text();

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        certificate: null,
        validation: createValidationResult({
          valid: false,
          reason: "INVALID_JSON",
          message: "Certificate rejected. The uploaded file is not valid JSON."
        })
      };
    }

    if (!isHbceIprCertificate(parsed)) {
      return {
        certificate: null,
        validation: createValidationResult({
          valid: false,
          reason: "INVALID_JSON",
          message:
            "Certificate rejected. The uploaded file is not a valid HBCE IPR certificate."
        })
      };
    }

    const recomputedHash = await recomputeCertificatePayloadSha256(parsed);

    if (recomputedHash !== parsed.hash_integrity.payload_sha256) {
      return {
        certificate: null,
        validation: createValidationResult({
          valid: false,
          reason: "HASH_MISMATCH",
          message:
            "Certificate rejected. The uploaded HBCE IPR certificate payload hash does not match its canonical payload.",
          received_phase: parsed.phase.code,
          received_next_phase: parsed.next.next_phase,
          payload_sha256: parsed.hash_integrity.payload_sha256,
          previous_payload_sha256:
            parsed.hash_integrity.previous_payload_sha256
        })
      };
    }

    return {
      certificate: parsed,
      validation: createValidationResult({
        valid: true,
        message: "HBCE IPR certificate accepted.",
        received_phase: parsed.phase.code,
        received_next_phase: parsed.next.next_phase,
        payload_sha256: parsed.hash_integrity.payload_sha256,
        previous_payload_sha256:
          parsed.hash_integrity.previous_payload_sha256
      })
    };
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setValidation(null);
    setPayloadSha256(null);
    setPreviousPayloadSha256(null);

    if (!file) {
      return;
    }

    setSelectedFileLabel(getAcceptedFileLabel(file));
    setIsReading(true);

    try {
      const parsed =
        mode === "read_any"
          ? await validateAnyHbceCertificate(file)
          : await readHbceIprCertificateFile(
              file,
              expectedPreviousPhase,
              expectedNextPhase ?? "COMPLETED"
            );

      setValidation(parsed.validation);
      onValidation?.(parsed.validation);

      if (!parsed.validation.valid || !parsed.certificate) {
        return;
      }

      const acceptedUpload: AcceptedIprCertificateUpload = {
        certificate: parsed.certificate,
        file,
        fileName: file.name,
        payloadSha256: parsed.certificate.hash_integrity.payload_sha256,
        previousPayloadSha256:
          parsed.certificate.hash_integrity.previous_payload_sha256
      };

      setPayloadSha256(acceptedUpload.payloadSha256);
      setPreviousPayloadSha256(acceptedUpload.previousPayloadSha256);

      onCertificateAccepted?.(acceptedUpload);
    } catch (error) {
      const failedValidation = createValidationResult({
        valid: false,
        reason: "INVALID_JSON",
        message:
          error instanceof Error
            ? error.message
            : "Certificate rejected. The uploaded HBCE IPR certificate could not be read."
      });

      setValidation(failedValidation);
      onValidation?.(failedValidation);
    } finally {
      setIsReading(false);
    }
  }

  const statusClassName = validation?.valid
    ? "hbce-upload-status hbce-upload-status--valid"
    : validation
      ? "hbce-upload-status hbce-upload-status--invalid"
      : "hbce-upload-status";

  return (
    <section className={["hbce-card", className].filter(Boolean).join(" ")}>
      <div className="hbce-stack">
        <div>
          <p className="hbce-kicker">
            {required ? "Required IPR input" : "Optional IPR input"}
          </p>
          <h2>{resolvedTitle}</h2>
          <p className="hbce-muted">{resolvedDescription}</p>
        </div>

        <label className="hbce-upload-zone" htmlFor={inputId}>
          <span className="hbce-upload-zone__title">
            Select HBCE-IPR `.hbce.json` certificate
          </span>
          <span className="hbce-upload-zone__text">
            {selectedFileLabel || "No certificate selected"}
          </span>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept=".json,.hbce,application/json"
            disabled={disabled || isReading}
            onChange={handleFileChange}
          />
        </label>

        {isReading ? (
          <div className="hbce-upload-status">
            Reading and validating HBCE IPR certificate.
          </div>
        ) : null}

        {validation ? (
          <div className={statusClassName}>
            <strong>{validation.valid ? "VALID" : "FAIL_CLOSED"}</strong>
            <p>{validation.message}</p>

            {validation.reason ? (
              <p className="hbce-mono">reason: {validation.reason}</p>
            ) : null}

            {validation.received_phase ? (
              <p className="hbce-mono">
                received_phase: {validation.received_phase}
              </p>
            ) : null}

            {validation.received_next_phase ? (
              <p className="hbce-mono">
                received_next_phase: {validation.received_next_phase}
              </p>
            ) : null}

            {payloadSha256 ? (
              <p className="hbce-mono">payload_sha256: {payloadSha256}</p>
            ) : null}

            {previousPayloadSha256 ? (
              <p className="hbce-mono">
                previous_payload_sha256: {previousPayloadSha256}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="hbce-actions">
          <button
            className="hbce-btn"
            type="button"
            disabled={disabled || isReading}
            onClick={() => inputRef.current?.click()}
          >
            Upload certificate
          </button>

          <button
            className="hbce-btn hbce-btn--ghost"
            type="button"
            disabled={disabled || isReading || !selectedFileLabel}
            onClick={resetUploader}
          >
            Reset
          </button>
        </div>
      </div>
    </section>
  );
}
