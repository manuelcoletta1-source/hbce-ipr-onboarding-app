"use client";

import { useMemo, useState } from "react";

import IprCertificateUploader from "./IprCertificateUploader";

import {
  createHashOnlySubjectRef,
  downloadHbceIprCertificate,
  generateHbceIprCertificate,
  nowIso,
  sha256Canonical,
  sha256File
} from "../lib/ipr-certificate-chain";

import {
  validateRequiredFields,
  validateRequiredUploads
} from "../lib/ipr-phase-map";

import type {
  HbceEvidenceUpload,
  HbceEvidenceUploadKind,
  HbceGeneratedCertificate,
  HbceIprCertificate,
  HbceIprPhaseDefinition,
  HbceIprPhaseRuntimeStatus,
  JsonObject
} from "../lib/types";

export type IprPhaseFieldOption = {
  label: string;
  value: string;
};

export type IprPhaseFieldDefinition = {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "date" | "checkbox" | "select";
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  options?: IprPhaseFieldOption[];
};

export type IprPhaseEvidenceInputDefinition = {
  kind: HbceEvidenceUploadKind;
  label: string;
  description?: string;
  accept?: string;
  required?: boolean;
};

export type IprPhaseFormValues = Record<string, string | boolean>;

export type IprPhaseFormBuildDataContext = {
  values: IprPhaseFormValues;
  uploads: HbceEvidenceUpload[];
  previousCertificate: HbceIprCertificate | null;
  issuedAt: string;
};

export type IprPhaseFormProps = {
  phase: HbceIprPhaseDefinition;
  fields: IprPhaseFieldDefinition[];
  evidenceInputs?: IprPhaseEvidenceInputDefinition[];
  submitLabel?: string;
  successTitle?: string;
  successDescription?: string;
  operatorLocked?: boolean;
  buildPhaseData?: (
    context: IprPhaseFormBuildDataContext
  ) => JsonObject | Promise<JsonObject>;
  onGenerated?: (certificate: HbceGeneratedCertificate<JsonObject>) => void;
};

function getRuntimeStatus(
  phaseCode: HbceIprPhaseDefinition["phase_code"]
): HbceIprPhaseRuntimeStatus {
  switch (phaseCode) {
    case "PENDING_REVIEW":
      return "PENDING_REVIEW";
    case "IPR_APPROVED":
      return "APPROVED";
    case "IPR_VERIFIED":
      return "COMPLETED";
    default:
      return "ACTIVE";
  }
}

function createInitialValues(
  fields: IprPhaseFieldDefinition[]
): IprPhaseFormValues {
  return fields.reduce<IprPhaseFormValues>((accumulator, field) => {
    accumulator[field.name] = field.type === "checkbox" ? false : "";

    return accumulator;
  }, {});
}

function normalizeFieldValue(value: string | boolean): string | boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return value.trim();
}

async function buildDefaultPhaseData(
  context: IprPhaseFormBuildDataContext
): Promise<JsonObject> {
  const normalizedValues = Object.fromEntries(
    Object.entries(context.values).map(([key, value]) => [
      key,
      normalizeFieldValue(value)
    ])
  ) as Record<string, string | boolean>;

  const valueHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_VALUES",
    values: normalizedValues
  });

  const uploadHashes = context.uploads.reduce<Record<string, string>>(
    (accumulator, upload) => {
      accumulator[upload.kind] = upload.sha256;

      return accumulator;
    },
    {}
  );

  return {
    values_hash: valueHash,
    upload_hashes,
    generated_from_previous_payload_sha256:
      context.previousCertificate?.hash_integrity.payload_sha256 ?? null,
    issued_at: context.issuedAt
  };
}

function getInputAccept(kind: HbceEvidenceUploadKind): string {
  switch (kind) {
    case "SELFIE":
      return "image/*";
    case "VIDEO_VERIFICATION":
      return "video/*";
    default:
      return "image/*,.pdf";
  }
}

export default function IprPhaseForm({
  phase,
  fields,
  evidenceInputs = [],
  submitLabel,
  successTitle,
  successDescription,
  operatorLocked = false,
  buildPhaseData,
  onGenerated
}: IprPhaseFormProps) {
  const [values, setValues] = useState<IprPhaseFormValues>(() =>
    createInitialValues(fields)
  );
  const [previousCertificate, setPreviousCertificate] =
    useState<HbceIprCertificate | null>(null);
  const [uploads, setUploads] = useState<HbceEvidenceUpload[]>([]);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [missingUploads, setMissingUploads] = useState<
    HbceEvidenceUploadKind[]
  >([]);
  const [error, setError] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCertificate, setGeneratedCertificate] =
    useState<HbceGeneratedCertificate<JsonObject> | null>(null);

  const requiresPreviousCertificate = phase.requires_previous_certificate;
  const requiredFieldNames = useMemo(
    () => fields.filter((field) => field.required !== false).map((field) => field.name),
    [fields]
  );

  const requiredUploadKinds = useMemo(() => {
    const explicitRequired = evidenceInputs
      .filter((input) => input.required !== false)
      .map((input) => input.kind);

    if (explicitRequired.length > 0) {
      return explicitRequired;
    }

    return phase.required_uploads;
  }, [evidenceInputs, phase.required_uploads]);

  function updateValue(name: string, value: string | boolean) {
    setValues((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleEvidenceUpload(
    kind: HbceEvidenceUploadKind,
    file: File | null
  ) {
    if (!file) {
      setUploads((current) => current.filter((upload) => upload.kind !== kind));
      return;
    }

    const sha256 = await sha256File(file);

    const upload: HbceEvidenceUpload = {
      kind,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      sha256,
      uploaded_at: nowIso()
    };

    setUploads((current) => [
      ...current.filter((item) => item.kind !== kind),
      upload
    ]);
  }

  async function generateCertificate() {
    setError("");
    setMissingFields([]);
    setMissingUploads([]);
    setGeneratedCertificate(null);

    if (operatorLocked || phase.requires_hbce_operator) {
      setError(
        "This phase is locked to HBCE operator/backend approval and cannot be freely generated by the user."
      );
      return;
    }

    if (requiresPreviousCertificate && !previousCertificate) {
      setError("Upload the required previous HBCE IPR certificate first.");
      return;
    }

    const fieldValidation = validateRequiredFields(requiredFieldNames, values);
    const uploadValidation = validateRequiredUploads(
      requiredUploadKinds,
      uploads
    );

    setMissingFields(fieldValidation.missing_fields);
    setMissingUploads(uploadValidation.missing_uploads);

    if (!fieldValidation.valid || !uploadValidation.valid) {
      setError("Complete all required fields and uploads before generating the certificate.");
      return;
    }

    setIsGenerating(true);

    try {
      const issuedAt = nowIso();

      const phaseData = buildPhaseData
        ? await buildPhaseData({
            values,
            uploads,
            previousCertificate,
            issuedAt
          })
        : await buildDefaultPhaseData({
            values,
            uploads,
            previousCertificate,
            issuedAt
          });

      const subjectRef =
        previousCertificate?.subject.subject_ref ??
        (await createHashOnlySubjectRef({
          phase: phase.phase_code,
          values: values as JsonObject
        }));

      const generated = await generateHbceIprCertificate({
        phase_number: phase.phase_number,
        phase_code: phase.phase_code,
        phase_status: getRuntimeStatus(phase.phase_code),
        next_required_phase: phase.next_required_phase,
        subject: {
          entity_type: "HUMAN",
          subject_ref: subjectRef,
          subject_id: previousCertificate?.subject.subject_id
        },
        previous_certificate: previousCertificate,
        previous_payload_sha256:
          previousCertificate?.hash_integrity.payload_sha256 ?? null,
        phase_data: phaseData,
        evidence_uploads: uploads,
        issued_at: issuedAt
      });

      setGeneratedCertificate(generated);
      onGenerated?.(generated);

      downloadHbceIprCertificate(generated.certificate, generated.file_name);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Certificate generation failed."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="hbce-main">
      <section className="hbce-hero">
        <p className="hbce-kicker">HBCE IPR Onboarding</p>
        <h1>{phase.title}</h1>
        <p>{phase.description}</p>
      </section>

      {requiresPreviousCertificate ? (
        <IprCertificateUploader
          expectedPreviousPhase={phase.expected_previous_phase}
          expectedNextPhase={phase.next_required_phase}
          onCertificateAccepted={(upload) => {
            setPreviousCertificate(upload.certificate);
            setError("");
          }}
          onValidation={(validation) => {
            if (!validation.valid) {
              setPreviousCertificate(null);
            }
          }}
        />
      ) : null}

      <section className="hbce-card">
        <div className="hbce-stack">
          <div>
            <p className="hbce-kicker">Phase data</p>
            <h2>Required information</h2>
            <p className="hbce-muted">
              Complete the required fields for this phase. Sensitive values are
              used to generate hash-only certificate data.
            </p>
          </div>

          <div className="hbce-form-grid">
            {fields.map((field) => {
              const hasError = missingFields.includes(field.name);

              if (field.type === "checkbox") {
                return (
                  <label
                    className={[
                      "hbce-check",
                      hasError ? "hbce-field-error" : ""
                    ].join(" ")}
                    key={field.name}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(values[field.name])}
                      onChange={(event) =>
                        updateValue(field.name, event.target.checked)
                      }
                    />
                    <span>
                      <strong>{field.label}</strong>
                      {field.helperText ? <small>{field.helperText}</small> : null}
                    </span>
                  </label>
                );
              }

              if (field.type === "select") {
                return (
                  <label className="hbce-field" key={field.name}>
                    <span>{field.label}</span>
                    <select
                      value={String(values[field.name] ?? "")}
                      onChange={(event) =>
                        updateValue(field.name, event.target.value)
                      }
                    >
                      <option value="">Select</option>
                      {(field.options ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {field.helperText ? <small>{field.helperText}</small> : null}
                    {hasError ? (
                      <small className="hbce-error-text">Required field.</small>
                    ) : null}
                  </label>
                );
              }

              return (
                <label className="hbce-field" key={field.name}>
                  <span>{field.label}</span>
                  <input
                    type={field.type ?? "text"}
                    value={String(values[field.name] ?? "")}
                    placeholder={field.placeholder}
                    onChange={(event) =>
                      updateValue(field.name, event.target.value)
                    }
                  />
                  {field.helperText ? <small>{field.helperText}</small> : null}
                  {hasError ? (
                    <small className="hbce-error-text">Required field.</small>
                  ) : null}
                </label>
              );
            })}
          </div>
        </div>
      </section>

      {evidenceInputs.length > 0 ? (
        <section className="hbce-card">
          <div className="hbce-stack">
            <div>
              <p className="hbce-kicker">Evidence upload</p>
              <h2>Required phase evidence</h2>
              <p className="hbce-muted">
                Uploaded evidence is hashed locally for the portable
                certificate. Raw files must belong to protected backend storage
                in production.
              </p>
            </div>

            <div className="hbce-form-grid">
              {evidenceInputs.map((evidence) => {
                const hasError = missingUploads.includes(evidence.kind);
                const uploaded = uploads.find(
                  (upload) => upload.kind === evidence.kind
                );

                return (
                  <label className="hbce-field" key={evidence.kind}>
                    <span>{evidence.label}</span>
                    <input
                      type="file"
                      accept={evidence.accept ?? getInputAccept(evidence.kind)}
                      onChange={(event) =>
                        handleEvidenceUpload(
                          evidence.kind,
                          event.target.files?.[0] ?? null
                        )
                      }
                    />
                    {evidence.description ? (
                      <small>{evidence.description}</small>
                    ) : null}
                    {uploaded ? (
                      <small className="hbce-mono">
                        sha256: {uploaded.sha256}
                      </small>
                    ) : null}
                    {hasError ? (
                      <small className="hbce-error-text">
                        Required upload.
                      </small>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </div>
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
          <h2>{successTitle ?? generatedCertificate.file_name}</h2>
          <p>
            {successDescription ??
              "The HBCE-IPR certificate has been generated and downloaded. Use this file for the next phase."}
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
          onClick={generateCertificate}
        >
          {isGenerating
            ? "Generating certificate"
            : submitLabel ?? `Generate ${phase.file_name}`}
        </button>
      </section>
    </main>
  );
}
