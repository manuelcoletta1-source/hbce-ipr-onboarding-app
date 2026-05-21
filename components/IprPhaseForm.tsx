"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import EmailOtpVerification from "./EmailOtpVerification";
import IprCertificateUploader from "./IprCertificateUploader";

import {
  createHashOnlySubjectRef,
  downloadHbceIprCertificate,
  generateHbceIprCertificate,
  nowIso,
  sha256Canonical,
  sha256File,
  toEuropeRomeIso,
  validatePreviousHbceIprCertificate
} from "../lib/ipr-certificate-chain";

import {
  getContinuationRouteFromCertificate,
  validateRequiredFields,
  validateRequiredUploads
} from "../lib/ipr-phase-map";

import type { EmailOtpVerificationPayload } from "./EmailOtpVerification";

import type {
  HbceEvidenceUpload,
  HbceEvidenceUploadKind,
  HbceGeneratedCertificate,
  HbceIprCertificate,
  HbceIprNextPhaseCode,
  HbceIprPhaseDefinition,
  HbceIprPhaseRuntimeStatus,
  HbceIprSubject,
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
  emailVerification: EmailOtpVerificationPayload | null;
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

const SESSION_CERTIFICATE_PREFIX = "HBCE_IPR_CERTIFICATE_FOR_NEXT_PHASE";

function getSessionCertificateKey(nextPhase: HbceIprNextPhaseCode): string {
  return `${SESSION_CERTIFICATE_PREFIX}:${nextPhase}`;
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

function getExpectedPreviousCertificateNextPhase(
  phase: HbceIprPhaseDefinition
): HbceIprNextPhaseCode | null {
  switch (phase.phase_number) {
    case 1:
      return null;
    case 2:
      return "FISCAL_IDENTITY";
    case 3:
      return "OFFICIAL_ID_DOCUMENT";
    case 4:
      return "LIVENESS_CHECK";
    case 5:
      return "PRIVACY_COMPLIANCE";
    case 6:
      return "REVIEW_SUBMISSION";
    case 7:
      return "HBCE_APPROVAL";
    case 8:
      return "IPR_CARD_ISSUANCE";
    case 9:
      return "OPERATIONAL_CERTIFICATE";
  }
}

function getRuntimeStatus(
  phaseCode: HbceIprPhaseDefinition["phase_code"]
): HbceIprPhaseRuntimeStatus {
  switch (phaseCode) {
    case "SUBJECT_CREATED":
      return "PENDING";
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

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeFieldValue(value: string | boolean): string | boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return value.trim();
}

function normalizeSubjectValue(
  fieldName: string,
  value: string | boolean
): string | boolean {
  if (typeof value === "boolean") {
    return value;
  }

  const trimmedValue = value.trim();

  if (fieldName === "email") {
    return normalizeEmail(trimmedValue);
  }

  if (fieldName === "phone_number") {
    return trimmedValue.replace(/\s+/g, "");
  }

  return trimmedValue;
}

function getEmailValue(values: IprPhaseFormValues): string {
  const value = values.email;

  if (typeof value !== "string") {
    return "";
  }

  return normalizeEmail(value);
}

function buildNormalizedValues(values: IprPhaseFormValues): JsonObject {
  const output: JsonObject = {};

  for (const [key, value] of Object.entries(values)) {
    const normalizedValue = normalizeFieldValue(value);

    output[key] = normalizedValue;
  }

  return output;
}

function buildSubjectReferenceInput(
  phaseCode: HbceIprPhaseDefinition["phase_code"],
  values: IprPhaseFormValues
): JsonObject {
  const normalizedValues: JsonObject = {};

  for (const [key, value] of Object.entries(values)) {
    normalizedValues[key] = normalizeSubjectValue(key, value);
  }

  return {
    kind: "HBCE_HASH_ONLY_SUBJECT_REF_INPUT",
    phase: phaseCode,
    entity_type: "HUMAN",
    values: normalizedValues
  };
}

async function buildDefaultPhaseData(
  context: IprPhaseFormBuildDataContext
): Promise<JsonObject> {
  const normalizedValues = buildNormalizedValues(context.values);

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
    upload_hashes: uploadHashes,
    generated_from_previous_payload_sha256:
      context.previousCertificate?.hash_integrity.payload_sha256 ?? null,
    issued_at: context.issuedAt,
    ...(context.emailVerification
      ? { email_verification: context.emailVerification }
      : {})
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

function buildSubject(
  subjectRef: string,
  previousCertificate: HbceIprCertificate | null
): HbceIprSubject {
  const previousSubjectId = previousCertificate?.subject.subject_id;

  if (previousSubjectId) {
    return {
      entity_type: "HUMAN",
      subject_ref: subjectRef,
      subject_id: previousSubjectId
    };
  }

  return {
    entity_type: "HUMAN",
    subject_ref: subjectRef
  };
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
  const router = useRouter();

  const [values, setValues] = useState<IprPhaseFormValues>(() =>
    createInitialValues(fields)
  );
  const [previousCertificate, setPreviousCertificate] =
    useState<HbceIprCertificate | null>(null);
  const [previousCertificateSource, setPreviousCertificateSource] = useState<
    "session" | "upload" | null
  >(null);
  const [emailVerification, setEmailVerification] =
    useState<EmailOtpVerificationPayload | null>(null);
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
  const requiresEmailVerification = phase.phase_code === "SUBJECT_CREATED";

  const currentEmailValue = useMemo(() => getEmailValue(values), [values]);

  const emailIsVerifiedForCurrentValue =
    Boolean(emailVerification?.email_verified) &&
    emailVerification?.email === currentEmailValue;

  const expectedPreviousCertificateNextPhase = useMemo(
    () => getExpectedPreviousCertificateNextPhase(phase),
    [phase]
  );

  const requiredFieldNames = useMemo(
    () =>
      fields
        .filter((field) => field.required !== false)
        .map((field) => field.name),
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

  useEffect(() => {
    let cancelled = false;

    async function restorePreviousCertificateFromSession() {
      if (!requiresPreviousCertificate) {
        return;
      }

      if (!phase.expected_previous_phase) {
        return;
      }

      if (!expectedPreviousCertificateNextPhase) {
        return;
      }

      if (previousCertificate) {
        return;
      }

      const stored = readStoredCertificateForPhase(
        expectedPreviousCertificateNextPhase
      );

      if (!stored) {
        return;
      }

      const validation = await validatePreviousHbceIprCertificate({
        certificate: stored,
        expected_previous_phase: phase.expected_previous_phase,
        expected_next_phase: expectedPreviousCertificateNextPhase
      });

      if (cancelled) {
        return;
      }

      if (validation.valid) {
        setPreviousCertificate(stored as HbceIprCertificate);
        setPreviousCertificateSource("session");
        setError("");
        return;
      }

      clearStoredCertificateForPhase(expectedPreviousCertificateNextPhase);
      setPreviousCertificate(null);
      setPreviousCertificateSource(null);
      setError(
        "The stored previous HBCE IPR certificate was rejected. Upload the required previous certificate manually."
      );
    }

    void restorePreviousCertificateFromSession();

    return () => {
      cancelled = true;
    };
  }, [
    expectedPreviousCertificateNextPhase,
    phase.expected_previous_phase,
    previousCertificate,
    requiresPreviousCertificate
  ]);

  function updateValue(name: string, value: string | boolean) {
    setValues((current) => {
      const nextValues = {
        ...current,
        [name]: value
      };

      if (name === "email") {
        const nextEmail = typeof value === "string" ? normalizeEmail(value) : "";

        if (emailVerification && emailVerification.email !== nextEmail) {
          setEmailVerification(null);
        }
      }

      return nextValues;
    });
  }

  function clearPreviousCertificate() {
    if (expectedPreviousCertificateNextPhase) {
      clearStoredCertificateForPhase(expectedPreviousCertificateNextPhase);
    }

    setPreviousCertificate(null);
    setPreviousCertificateSource(null);
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
      setError(
        "Complete all required fields and uploads before generating the certificate."
      );
      return;
    }

    if (requiresEmailVerification && !emailIsVerifiedForCurrentValue) {
      setError(
        "Verify the customer email with the one-time code before generating Certificate 01."
      );
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
            issuedAt,
            emailVerification
          })
        : await buildDefaultPhaseData({
            values,
            uploads,
            previousCertificate,
            issuedAt,
            emailVerification
          });

      const subjectRef =
        previousCertificate?.subject.subject_ref ??
        (await createHashOnlySubjectRef(
          buildSubjectReferenceInput(phase.phase_code, values)
        ));

      const generated = await generateHbceIprCertificate({
        phase_number: phase.phase_number,
        phase_code: phase.phase_code,
        phase_status: getRuntimeStatus(phase.phase_code),
        next_required_phase: phase.next_required_phase,
        subject: buildSubject(subjectRef, previousCertificate),
        previous_certificate: previousCertificate,
        previous_payload_sha256:
          previousCertificate?.hash_integrity.payload_sha256 ?? null,
        phase_data: phaseData,
        evidence_uploads: uploads,
        issued_at: issuedAt
      });

      setGeneratedCertificate(generated);
      onGenerated?.(generated);

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

      {requiresPreviousCertificate && previousCertificate ? (
        <section className="hbce-card hbce-card--soft">
          <p className="hbce-kicker">
            {previousCertificateSource === "session"
              ? "Previous certificate loaded from session"
              : "Previous certificate accepted"}
          </p>
          <h2>Certificate chain continuity ready.</h2>
          <p>
            The required previous HBCE-IPR certificate is already available for
            this phase. You can now complete the phase data and required
            evidence uploads.
          </p>
          <p className="hbce-mono">
            previous_phase: {previousCertificate.phase.code}
          </p>
          <p className="hbce-mono">
            unlocks_phase: {previousCertificate.next.next_phase}
          </p>
          <p className="hbce-mono">
            payload_sha256: {previousCertificate.hash_integrity.payload_sha256}
          </p>
          <p className="hbce-mono">
            previous_payload_sha256:{" "}
            {previousCertificate.hash_integrity.previous_payload_sha256 ?? "null"}
          </p>

          <div className="hbce-actions">
            <button
              className="hbce-btn hbce-btn--ghost"
              type="button"
              onClick={clearPreviousCertificate}
            >
              Use another certificate
            </button>
          </div>
        </section>
      ) : requiresPreviousCertificate ? (
        <IprCertificateUploader
          expectedPreviousPhase={phase.expected_previous_phase}
          expectedNextPhase={expectedPreviousCertificateNextPhase ?? "COMPLETED"}
          onCertificateAccepted={(upload) => {
            setPreviousCertificate(upload.certificate);
            setPreviousCertificateSource("upload");
            setError("");
          }}
          onValidation={(validation) => {
            if (!validation.valid) {
              setPreviousCertificate(null);
              setPreviousCertificateSource(null);
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
              used to generate private certificate data and hash-only audit
              references.
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

      {requiresEmailVerification ? (
        <EmailOtpVerification
          emailValue={currentEmailValue}
          disabled={isGenerating}
          onVerified={(payload) => {
            setEmailVerification(payload);
            setError("");
          }}
          onReset={() => {
            setEmailVerification(null);
          }}
        />
      ) : null}

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
            file_name: {generatedCertificate.file_name}
          </p>
          <p className="hbce-mono">
            phase: {generatedCertificate.certificate.phase.code}
          </p>
          <p className="hbce-mono">
            status: {generatedCertificate.certificate.phase.status}
          </p>
          <p className="hbce-mono">
            issued_at_utc: {generatedCertificate.generated_at}
          </p>
          <p className="hbce-mono">
            issued_at_local: {toEuropeRomeIso(generatedCertificate.generated_at)}
          </p>
          <p className="hbce-mono">
            payload_sha256: {generatedCertificate.payload_sha256}
          </p>
          {generatedCertificate.previous_payload_sha256 ? (
            <p className="hbce-mono">
              previous_payload_sha256:{" "}
              {generatedCertificate.previous_payload_sha256}
            </p>
          ) : (
            <p className="hbce-mono">previous_payload_sha256: null</p>
          )}
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
