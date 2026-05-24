"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { ROUTES, SECURITY_BOUNDARY_TEXT } from "@/lib/constants";
import {
  downloadHbceIprCertificate,
  generateHbceIprCertificate,
  nowIso,
  sha256Canonical
} from "@/lib/ipr-certificate-chain";

import { BoundaryNotice } from "@/components/BoundaryNotice";
import IprCertificateUploader from "@/components/IprCertificateUploader";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { StatusBadge } from "@/components/StatusBadge";

import type { AcceptedIprCertificateUpload } from "@/components/IprCertificateUploader";
import type { HbceGeneratedCertificate, JsonObject } from "@/lib/types";

type FaceMatchStatus =
  | "PENDING"
  | "MATCHED"
  | "FAILED"
  | "MANUAL_REVIEW";

type LivenessChallenge =
  | "HEAD_TURN_LEFT_RIGHT"
  | "HEAD_TURN_RIGHT_LEFT"
  | "RANDOM_PROMPT"
  | "MANUAL_OPERATOR_PROMPT";

type LivenessReviewStatus =
  | "submitted"
  | "manual_review"
  | "approved"
  | "rejected";

type PhotoVideoFormState = {
  document_face_reference: string;
  selfie_reference: string;
  liveness_video_reference: string;
  document_face_sha256: string;
  selfie_sha256: string;
  video_sha256: string;
  photo_verification_status: LivenessReviewStatus;
  video_verification_status: LivenessReviewStatus;
  liveness_status: LivenessReviewStatus;
  face_match_status: FaceMatchStatus;
  face_match_method: string;
  liveness_challenge: LivenessChallenge;
  height_cm: string;
  weight_kg: string;
  body_build: string;
  eye_color: string;
  hair_color: string;
  hair_type: string;
  visible_scars: string;
  tattoos: string;
  piercings: string;
  distinctive_marks: string;
  biometric_verification_consent: boolean;
  descriptor_accuracy_declaration: boolean;
};

const NEXT_PHASE_STORAGE_KEY =
  "HBCE_IPR_CERTIFICATE_FOR_NEXT_PHASE:PRIVACY_COMPLIANCE";

const INITIAL_FORM_STATE: PhotoVideoFormState = {
  document_face_reference: "",
  selfie_reference: "",
  liveness_video_reference: "",
  document_face_sha256: "",
  selfie_sha256: "",
  video_sha256: "",
  photo_verification_status: "submitted",
  video_verification_status: "submitted",
  liveness_status: "manual_review",
  face_match_status: "MANUAL_REVIEW",
  face_match_method: "DOCUMENT_FACE_SELFIE_VIDEO_COMPARISON",
  liveness_challenge: "HEAD_TURN_LEFT_RIGHT",
  height_cm: "",
  weight_kg: "",
  body_build: "",
  eye_color: "",
  hair_color: "",
  hair_type: "",
  visible_scars: "",
  tattoos: "",
  piercings: "",
  distinctive_marks: "",
  biometric_verification_consent: false,
  descriptor_accuracy_declaration: false
};

const PHOTO_VIDEO_BOUNDARIES = [
  "Real photos must not be committed to this repository.",
  "Real videos must not be committed to this repository.",
  "Biometric templates must not be stored in public routes.",
  "Face templates must not be generated or exposed by this MVP page.",
  "Liveness recordings must remain in protected processing environments.",
  "The MVP stores references, hashes, states and custody declarations only.",
  "Photo/video verification prepares review only.",
  "Photo/video verification does not issue IPR Verified status.",
  "Photo/video verification does not issue an IPR Card.",
  "Photo/video verification does not activate the operational certificate.",
  "JOKER-C2 access remains denied by default."
] as const;

const PHOTO_VIDEO_EVIDENCE_ITEMS = [
  "Protected document-face reference",
  "Protected selfie reference",
  "Protected liveness-video reference",
  "Document-face SHA-256 reference",
  "Selfie SHA-256 reference",
  "Video SHA-256 reference",
  "Face match status",
  "Head-turn liveness challenge",
  "Physical descriptor profile",
  "Biometric/liveness consent",
  "Manual review requirement"
] as const;

const PHOTO_VIDEO_REVIEW_RULES = [
  "The subject must already have completed fiscal identity evidence.",
  "The subject must already have submitted official identity document evidence.",
  "The document-face reference must point to protected storage in production.",
  "The selfie reference must point to protected storage in production.",
  "The video reference must point to protected storage in production.",
  "Raw photos and raw videos must not be exposed through public routes.",
  "The liveness state must remain pending or under manual review until operator validation.",
  "The onboarding case can move to privacy and compliance, but cannot self-approve."
] as const;

function trimOrNull(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : null;
}

function buildPhysicalDescriptorProfile(form: PhotoVideoFormState): JsonObject {
  return {
    height_cm: parseOptionalNumber(form.height_cm),
    weight_kg: parseOptionalNumber(form.weight_kg),
    body_build: trimOrNull(form.body_build),
    eye_color: trimOrNull(form.eye_color),
    hair_color: trimOrNull(form.hair_color),
    hair_type: trimOrNull(form.hair_type),
    visible_scars: trimOrNull(form.visible_scars),
    tattoos: trimOrNull(form.tattoos),
    piercings: trimOrNull(form.piercings),
    distinctive_marks: trimOrNull(form.distinctive_marks),
    descriptor_accuracy_declaration: form.descriptor_accuracy_declaration
  };
}

function buildBiometricLivenessSnapshot(params: {
  form: PhotoVideoFormState;
  issuedAt: string;
  livenessDeclarationSha256: string;
}): JsonObject {
  const livenessVerified =
    params.form.face_match_status === "MATCHED" &&
    params.form.liveness_status === "approved";

  return {
    document_face_reference: params.form.document_face_reference.trim(),
    selfie_reference: params.form.selfie_reference.trim(),
    liveness_video_reference: params.form.liveness_video_reference.trim(),
    document_face_sha256: params.form.document_face_sha256.trim(),
    selfie_sha256: params.form.selfie_sha256.trim(),
    video_sha256: params.form.video_sha256.trim(),
    liveness_declaration_sha256: params.livenessDeclarationSha256,
    face_match_status: params.form.face_match_status,
    face_match_method: params.form.face_match_method.trim(),
    liveness_challenge: params.form.liveness_challenge,
    liveness_verified: livenessVerified,
    liveness_timestamp: params.issuedAt,
    photo_verification_status: params.form.photo_verification_status,
    video_verification_status: params.form.video_verification_status,
    liveness_status: params.form.liveness_status,
    biometric_verification_consent:
      params.form.biometric_verification_consent,
    manual_review_required: !livenessVerified,
    raw_photo_in_certificate: false,
    raw_video_in_certificate: false,
    biometric_template_generated: false,
    face_template_generated: false,
    custody_mode: "JOKER_C2_CONTROLLED_CUSTODY"
  };
}

function storeGeneratedCertificateForNextPhase(
  generated: HbceGeneratedCertificate
): void {
  window.sessionStorage.setItem(
    NEXT_PHASE_STORAGE_KEY,
    JSON.stringify(generated.certificate)
  );
}

function hasRequiredLivenessFields(form: PhotoVideoFormState): boolean {
  return (
    form.document_face_reference.trim().length > 0 &&
    form.selfie_reference.trim().length > 0 &&
    form.liveness_video_reference.trim().length > 0 &&
    form.document_face_sha256.trim().length > 0 &&
    form.selfie_sha256.trim().length > 0 &&
    form.video_sha256.trim().length > 0 &&
    form.face_match_method.trim().length > 0 &&
    form.biometric_verification_consent &&
    form.descriptor_accuracy_declaration
  );
}

export default function OnboardingPhotoVideoPage() {
  const [previousUpload, setPreviousUpload] =
    useState<AcceptedIprCertificateUpload | null>(null);
  const [form, setForm] = useState<PhotoVideoFormState>(INITIAL_FORM_STATE);
  const [generatedCertificate, setGeneratedCertificate] =
    useState<HbceGeneratedCertificate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const canGenerateCertificate =
    previousUpload !== null && hasRequiredLivenessFields(form);

  const photoVideoStateItems = useMemo(
    () =>
      [
        {
          label: "Previous official document certificate",
          status: previousUpload ? "approved" : "pending"
        },
        {
          label: "Document face evidence",
          status: form.document_face_sha256.trim() ? "submitted" : "pending"
        },
        {
          label: "Selfie evidence",
          status: form.selfie_sha256.trim() ? "submitted" : "pending"
        },
        {
          label: "Video evidence",
          status: form.video_sha256.trim() ? "submitted" : "pending"
        },
        {
          label: "Liveness state",
          status:
            form.liveness_status === "approved" ? "approved" : "manual_review"
        },
        {
          label: "IPR Verified",
          status: "denied"
        },
        {
          label: "JOKER-C2 access",
          status: "denied"
        }
      ] as const,
    [
      previousUpload,
      form.document_face_sha256,
      form.selfie_sha256,
      form.video_sha256,
      form.liveness_status
    ]
  );

  function updateFormField<K extends keyof PhotoVideoFormState>(
    key: K,
    value: PhotoVideoFormState[K]
  ): void {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handleGenerateCertificate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!previousUpload) {
      setGenerationError(
        "Upload the previous HBCE official document certificate before generating the liveness certificate."
      );
      return;
    }

    if (!hasRequiredLivenessFields(form)) {
      setGenerationError(
        "Complete the protected references, hashes, face match method, biometric consent and descriptor declaration before generating the certificate."
      );
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const issuedAt = nowIso();

      const livenessDeclarationSha256 = await sha256Canonical({
        kind: "HBCE_LIVENESS_DECLARATION",
        document_face_reference: form.document_face_reference.trim(),
        selfie_reference: form.selfie_reference.trim(),
        liveness_video_reference: form.liveness_video_reference.trim(),
        document_face_sha256: form.document_face_sha256.trim(),
        selfie_sha256: form.selfie_sha256.trim(),
        video_sha256: form.video_sha256.trim(),
        face_match_status: form.face_match_status,
        face_match_method: form.face_match_method.trim(),
        liveness_challenge: form.liveness_challenge,
        biometric_verification_consent: form.biometric_verification_consent,
        descriptor_accuracy_declaration:
          form.descriptor_accuracy_declaration,
        issued_at: issuedAt
      });

      const biometricLivenessSnapshot = buildBiometricLivenessSnapshot({
        form,
        issuedAt,
        livenessDeclarationSha256
      });

      const physicalDescriptorProfile = buildPhysicalDescriptorProfile(form);

      const phaseData: JsonObject = {
        selfie_sha256: form.selfie_sha256.trim(),
        video_sha256: form.video_sha256.trim(),
        liveness_declaration_sha256: livenessDeclarationSha256,
        liveness_timestamp: issuedAt,
        document_face_reference: form.document_face_reference.trim(),
        selfie_reference: form.selfie_reference.trim(),
        liveness_video_reference: form.liveness_video_reference.trim(),
        document_face_sha256: form.document_face_sha256.trim(),
        photo_reference: form.selfie_reference.trim(),
        video_reference: form.liveness_video_reference.trim(),
        photo_hash: form.selfie_sha256.trim(),
        video_hash: form.video_sha256.trim(),
        photo_verification_status: form.photo_verification_status,
        video_verification_status: form.video_verification_status,
        liveness_status: form.liveness_status,
        face_match_status: form.face_match_status,
        face_match_method: form.face_match_method.trim(),
        liveness_challenge: form.liveness_challenge,
        liveness_verified:
          form.face_match_status === "MATCHED" &&
          form.liveness_status === "approved",
        biometric_verification_consent:
          form.biometric_verification_consent,
        manual_review_required:
          form.face_match_status !== "MATCHED" ||
          form.liveness_status !== "approved",
        physical_descriptor_profile: physicalDescriptorProfile,
        biometric_liveness_snapshot: biometricLivenessSnapshot,
        joker_c2_custody_reference: {
          custodian: "AI_JOKER_C2",
          custody_mode: "JOKER_C2_CONTROLLED_CUSTODY",
          raw_photo_in_certificate: false,
          raw_video_in_certificate: false,
          raw_media_in_public_registry: false,
          certificate_contains: "hashes_references_states_only"
        }
      };

      const generated = await generateHbceIprCertificate({
        phase_number: 4,
        phase_code: "LIVENESS_SUBMITTED",
        phase_status: "PENDING_REVIEW",
        next_required_phase: "PRIVACY_COMPLIANCE",
        subject: previousUpload.certificate.subject,
        previous_certificate: previousUpload.certificate,
        previous_payload_sha256: previousUpload.payloadSha256,
        phase_data: phaseData,
        issued_at: issuedAt
      });

      storeGeneratedCertificateForNextPhase(generated);
      downloadHbceIprCertificate(generated.certificate, generated.file_name);
      setGeneratedCertificate(generated);
    } catch (error) {
      setGenerationError(
        error instanceof Error
          ? error.message
          : "The HBCE liveness certificate could not be generated."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">Step 04 · Photo / Video Liveness</p>

        <h1 className="hbce-title">
          Prepare face, photo, video and liveness verification.
        </h1>

        <p className="hbce-lead">
          This phase binds the official document face evidence, live selfie,
          dynamic liveness video and physical descriptor profile to the HBCE IPR
          onboarding chain. The MVP records protected references, hashes,
          verification states and custody boundaries only.
        </p>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <p className="hbce-kicker">Previous phase certificate</p>
            <h2>Upload Certificate 03 before liveness generation.</h2>

            <p>
              The photo/video liveness certificate must be chained to the
              previous official identity document certificate. Without that
              previous hash, this phase remains closed.
            </p>

            <IprCertificateUploader
              expectedPreviousPhase="OFFICIAL_DOCUMENT_SUBMITTED"
              expectedNextPhase="LIVENESS_CHECK"
              title="Upload HBCE Official Document Certificate"
              description="Upload hbce-ipr-03-official-document.hbce.json. The liveness phase can be generated only after the official document phase has been accepted."
              onCertificateAccepted={(upload) => {
                setPreviousUpload(upload);
                setGeneratedCertificate(null);
                setGenerationError(null);
              }}
              onValidation={(validation) => {
                if (!validation.valid) {
                  setPreviousUpload(null);
                  setGeneratedCertificate(null);
                }
              }}
            />
          </div>

          <div className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">Verification state</p>
            <h2>Photo/video verification prepares review, not access.</h2>

            <p>
              Face and liveness verification are evidence preparation layers.
              They do not directly issue IPR Verified status, issue the IPR
              Card, activate the operational certificate or grant access to
              JOKER-C2.
            </p>

            <div className="hbce-card-preview__meta">
              {photoVideoStateItems.map((item) => (
                <div className="hbce-meta" key={item.label}>
                  <span className="hbce-meta__label">{item.label}</span>
                  <span className="hbce-meta__value">
                    <StatusBadge status={item.status} />
                  </span>
                </div>
              ))}
            </div>

            {generatedCertificate ? (
              <>
                <div className="hbce-divider" />

                <p className="hbce-mono">
                  file_name: {generatedCertificate.file_name}
                </p>
                <p className="hbce-mono">
                  payload_sha256: {generatedCertificate.payload_sha256}
                </p>
                <p className="hbce-mono">
                  previous_payload_sha256:{" "}
                  {generatedCertificate.previous_payload_sha256}
                </p>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <form className="hbce-card" onSubmit={handleGenerateCertificate}>
          <p className="hbce-kicker">Biometric & liveness evidence</p>
          <h2>Prepare protected face and liveness metadata.</h2>

          <p>
            In production, these references must point to protected storage,
            authorized verification providers and lawful identity verification
            workflows. This MVP does not process raw photos, raw videos, face
            templates or biometric templates inside the public route.
          </p>

          <div className="hbce-grid hbce-grid--3">
            <div className="hbce-field">
              <label className="hbce-label" htmlFor="document_face_reference">
                Protected document-face reference
              </label>
              <input
                autoComplete="off"
                className="hbce-input hbce-mono"
                id="document_face_reference"
                name="document_face_reference"
                onChange={(event) =>
                  updateFormField(
                    "document_face_reference",
                    event.target.value
                  )
                }
                placeholder="protected_document_face_reference_demo"
                type="text"
                value={form.document_face_reference}
              />
            </div>

            <div className="hbce-field">
              <label className="hbce-label" htmlFor="selfie_reference">
                Protected selfie reference
              </label>
              <input
                autoComplete="off"
                className="hbce-input hbce-mono"
                id="selfie_reference"
                name="selfie_reference"
                onChange={(event) =>
                  updateFormField("selfie_reference", event.target.value)
                }
                placeholder="protected_selfie_reference_demo"
                type="text"
                value={form.selfie_reference}
              />
            </div>

            <div className="hbce-field">
              <label className="hbce-label" htmlFor="liveness_video_reference">
                Protected liveness-video reference
              </label>
              <input
                autoComplete="off"
                className="hbce-input hbce-mono"
                id="liveness_video_reference"
                name="liveness_video_reference"
                onChange={(event) =>
                  updateFormField(
                    "liveness_video_reference",
                    event.target.value
                  )
                }
                placeholder="protected_liveness_video_reference_demo"
                type="text"
                value={form.liveness_video_reference}
              />
            </div>
          </div>

          <div className="hbce-grid hbce-grid--3">
            <div className="hbce-field">
              <label className="hbce-label" htmlFor="document_face_sha256">
                Document-face SHA-256
              </label>
              <input
                autoComplete="off"
                className="hbce-input hbce-mono"
                id="document_face_sha256"
                name="document_face_sha256"
                onChange={(event) =>
                  updateFormField("document_face_sha256", event.target.value)
                }
                placeholder="sha256_document_face_hash"
                type="text"
                value={form.document_face_sha256}
              />
            </div>

            <div className="hbce-field">
              <label className="hbce-label" htmlFor="selfie_sha256">
                Selfie SHA-256
              </label>
              <input
                autoComplete="off"
                className="hbce-input hbce-mono"
                id="selfie_sha256"
                name="selfie_sha256"
                onChange={(event) =>
                  updateFormField("selfie_sha256", event.target.value)
                }
                placeholder="sha256_selfie_hash"
                type="text"
                value={form.selfie_sha256}
              />
            </div>

            <div className="hbce-field">
              <label className="hbce-label" htmlFor="video_sha256">
                Liveness video SHA-256
              </label>
              <input
                autoComplete="off"
                className="hbce-input hbce-mono"
                id="video_sha256"
                name="video_sha256"
                onChange={(event) =>
                  updateFormField("video_sha256", event.target.value)
                }
                placeholder="sha256_video_hash"
                type="text"
                value={form.video_sha256}
              />
            </div>
          </div>

          <div className="hbce-grid hbce-grid--3">
            <div className="hbce-field">
              <label className="hbce-label" htmlFor="face_match_status">
                Face match status
              </label>
              <select
                className="hbce-select"
                id="face_match_status"
                name="face_match_status"
                onChange={(event) =>
                  updateFormField(
                    "face_match_status",
                    event.target.value as FaceMatchStatus
                  )
                }
                value={form.face_match_status}
              >
                <option value="MANUAL_REVIEW">Manual review</option>
                <option value="PENDING">Pending</option>
                <option value="MATCHED">Matched</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            <div className="hbce-field">
              <label className="hbce-label" htmlFor="face_match_method">
                Face match method
              </label>
              <input
                autoComplete="off"
                className="hbce-input hbce-mono"
                id="face_match_method"
                name="face_match_method"
                onChange={(event) =>
                  updateFormField("face_match_method", event.target.value)
                }
                placeholder="DOCUMENT_FACE_SELFIE_VIDEO_COMPARISON"
                type="text"
                value={form.face_match_method}
              />
            </div>

            <div className="hbce-field">
              <label className="hbce-label" htmlFor="liveness_challenge">
                Liveness challenge
              </label>
              <select
                className="hbce-select"
                id="liveness_challenge"
                name="liveness_challenge"
                onChange={(event) =>
                  updateFormField(
                    "liveness_challenge",
                    event.target.value as LivenessChallenge
                  )
                }
                value={form.liveness_challenge}
              >
                <option value="HEAD_TURN_LEFT_RIGHT">
                  Head turn left / right
                </option>
                <option value="HEAD_TURN_RIGHT_LEFT">
                  Head turn right / left
                </option>
                <option value="RANDOM_PROMPT">Random prompt</option>
                <option value="MANUAL_OPERATOR_PROMPT">
                  Manual operator prompt
                </option>
              </select>
            </div>
          </div>

          <div className="hbce-grid hbce-grid--3">
            <div className="hbce-field">
              <label className="hbce-label" htmlFor="photo_verification_status">
                Photo verification status
              </label>
              <select
                className="hbce-select"
                id="photo_verification_status"
                name="photo_verification_status"
                onChange={(event) =>
                  updateFormField(
                    "photo_verification_status",
                    event.target.value as LivenessReviewStatus
                  )
                }
                value={form.photo_verification_status}
              >
                <option value="submitted">Submitted</option>
                <option value="manual_review">Manual review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="hbce-field">
              <label className="hbce-label" htmlFor="video_verification_status">
                Video verification status
              </label>
              <select
                className="hbce-select"
                id="video_verification_status"
                name="video_verification_status"
                onChange={(event) =>
                  updateFormField(
                    "video_verification_status",
                    event.target.value as LivenessReviewStatus
                  )
                }
                value={form.video_verification_status}
              >
                <option value="submitted">Submitted</option>
                <option value="manual_review">Manual review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="hbce-field">
              <label className="hbce-label" htmlFor="liveness_status">
                Liveness review status
              </label>
              <select
                className="hbce-select"
                id="liveness_status"
                name="liveness_status"
                onChange={(event) =>
                  updateFormField(
                    "liveness_status",
                    event.target.value as LivenessReviewStatus
                  )
                }
                value={form.liveness_status}
              >
                <option value="manual_review">Manual review</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="hbce-divider" />

          <p className="hbce-kicker">Physical descriptor profile</p>
          <h2>Attach declared physical descriptors.</h2>

          <p>
            These fields describe the biological subject for operational
            identity continuity. They are not face templates, fingerprints,
            iris templates or raw biometric media.
          </p>

          <div className="hbce-grid hbce-grid--3">
            <div className="hbce-field">
              <label className="hbce-label" htmlFor="height_cm">
                Height in centimeters
              </label>
              <input
                autoComplete="off"
                className="hbce-input"
                id="height_cm"
                inputMode="numeric"
                name="height_cm"
                onChange={(event) =>
                  updateFormField("height_cm", event.target.value)
                }
                placeholder="170"
                type="text"
                value={form.height_cm}
              />
            </div>

            <div className="hbce-field">
              <label className="hbce-label" htmlFor="weight_kg">
                Weight in kilograms
              </label>
              <input
                autoComplete="off"
                className="hbce-input"
                id="weight_kg"
                inputMode="numeric"
                name="weight_kg"
                onChange={(event) =>
                  updateFormField("weight_kg", event.target.value)
                }
                placeholder="70"
                type="text"
                value={form.weight_kg}
              />
            </div>

            <div className="hbce-field">
              <label className="hbce-label" htmlFor="body_build">
                Body build
              </label>
              <input
                autoComplete="off"
                className="hbce-input"
                id="body_build"
                name="body_build"
                onChange={(event) =>
                  updateFormField("body_build", event.target.value)
                }
                placeholder="medium"
                type="text"
                value={form.body_build}
              />
            </div>
          </div>

          <div className="hbce-grid hbce-grid--3">
            <div className="hbce-field">
              <label className="hbce-label" htmlFor="eye_color">
                Eye color
              </label>
              <input
                autoComplete="off"
                className="hbce-input"
                id="eye_color"
                name="eye_color"
                onChange={(event) =>
                  updateFormField("eye_color", event.target.value)
                }
                placeholder="brown"
                type="text"
                value={form.eye_color}
              />
            </div>

            <div className="hbce-field">
              <label className="hbce-label" htmlFor="hair_color">
                Hair color
              </label>
              <input
                autoComplete="off"
                className="hbce-input"
                id="hair_color"
                name="hair_color"
                onChange={(event) =>
                  updateFormField("hair_color", event.target.value)
                }
                placeholder="black"
                type="text"
                value={form.hair_color}
              />
            </div>

            <div className="hbce-field">
              <label className="hbce-label" htmlFor="hair_type">
                Hair type
              </label>
              <input
                autoComplete="off"
                className="hbce-input"
                id="hair_type"
                name="hair_type"
                onChange={(event) =>
                  updateFormField("hair_type", event.target.value)
                }
                placeholder="short"
                type="text"
                value={form.hair_type}
              />
            </div>
          </div>

          <div className="hbce-grid hbce-grid--2">
            <div className="hbce-field">
              <label className="hbce-label" htmlFor="visible_scars">
                Visible scars
              </label>
              <textarea
                className="hbce-textarea"
                id="visible_scars"
                name="visible_scars"
                onChange={(event) =>
                  updateFormField("visible_scars", event.target.value)
                }
                placeholder="No visible scars declared"
                rows={3}
                value={form.visible_scars}
              />
            </div>

            <div className="hbce-field">
              <label className="hbce-label" htmlFor="distinctive_marks">
                Distinctive marks
              </label>
              <textarea
                className="hbce-textarea"
                id="distinctive_marks"
                name="distinctive_marks"
                onChange={(event) =>
                  updateFormField("distinctive_marks", event.target.value)
                }
                placeholder="No distinctive marks declared"
                rows={3}
                value={form.distinctive_marks}
              />
            </div>
          </div>

          <div className="hbce-grid hbce-grid--2">
            <div className="hbce-field">
              <label className="hbce-label" htmlFor="tattoos">
                Tattoos
              </label>
              <textarea
                className="hbce-textarea"
                id="tattoos"
                name="tattoos"
                onChange={(event) =>
                  updateFormField("tattoos", event.target.value)
                }
                placeholder="No tattoos declared"
                rows={3}
                value={form.tattoos}
              />
            </div>

            <div className="hbce-field">
              <label className="hbce-label" htmlFor="piercings">
                Piercings
              </label>
              <textarea
                className="hbce-textarea"
                id="piercings"
                name="piercings"
                onChange={(event) =>
                  updateFormField("piercings", event.target.value)
                }
                placeholder="No piercings declared"
                rows={3}
                value={form.piercings}
              />
            </div>
          </div>

          <div className="hbce-divider" />

          <div className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">Consent and declaration</p>

            <label className="hbce-checkbox">
              <input
                checked={form.biometric_verification_consent}
                name="biometric_verification_consent"
                onChange={(event) =>
                  updateFormField(
                    "biometric_verification_consent",
                    event.target.checked
                  )
                }
                type="checkbox"
              />
              <span>
                I confirm that photo, face and liveness references are used for
                HBCE IPR onboarding, anti-impersonation control, review
                preparation and governed JOKER-C2 access only.
              </span>
            </label>

            <label className="hbce-checkbox">
              <input
                checked={form.descriptor_accuracy_declaration}
                name="descriptor_accuracy_declaration"
                onChange={(event) =>
                  updateFormField(
                    "descriptor_accuracy_declaration",
                    event.target.checked
                  )
                }
                type="checkbox"
              />
              <span>
                I declare that the physical descriptor profile is accurate to
                the best of my knowledge.
              </span>
            </label>
          </div>

          <BoundaryNotice title="Manual review required" tone="warning">
            Photo/video metadata can prepare the onboarding case for privacy and
            HBCE review, but it cannot self-approve the subject, issue IPR
            Verified status, issue an IPR Card or unlock JOKER-C2 access.
          </BoundaryNotice>

          {generationError ? (
            <BoundaryNotice title="Certificate generation blocked" tone="danger">
              {generationError}
            </BoundaryNotice>
          ) : null}

          {generatedCertificate ? (
            <BoundaryNotice title="Certificate 04 generated" tone="warning">
              The HBCE liveness certificate has been generated, downloaded and
              stored for the next Privacy & Compliance phase in this browser
              session.
            </BoundaryNotice>
          ) : null}

          <div className="hbce-actions">
            <Link className="hbce-btn" href={ROUTES.onboardingDocuments}>
              Back to Official ID Document
            </Link>

            <button
              className="hbce-btn hbce-btn--primary"
              disabled={!canGenerateCertificate || isGenerating}
              type="submit"
            >
              {isGenerating
                ? "Generating Certificate 04..."
                : "Generate Photo / Video Liveness Certificate"}
            </button>

            <Link className="hbce-btn" href={ROUTES.onboardingPhase5}>
              Continue to Privacy & Compliance
            </Link>
          </div>
        </form>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">Expected evidence layer</p>
            <h2>Evidence prepared by this phase.</h2>

            <ul className="hbce-list">
              {PHOTO_VIDEO_EVIDENCE_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <div className="hbce-divider" />

            <h3>Review rules</h3>
            <ul className="hbce-list">
              {PHOTO_VIDEO_REVIEW_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>

          <div className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">Security boundaries</p>
            <h2>Raw biometric media stay outside public routes.</h2>

            <ul className="hbce-list">
              {PHOTO_VIDEO_BOUNDARIES.map((boundary) => (
                <li key={boundary}>{boundary}</li>
              ))}
            </ul>

            <div className="hbce-divider" />

            <BoundaryNotice title="Photo / video security boundary" tone="danger">
              {SECURITY_BOUNDARY_TEXT} Real photos, real videos, biometric
              templates, liveness recordings and face templates must not be
              committed to this repository or exposed in public routes.
            </BoundaryNotice>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <h2>Current onboarding position</h2>
          <OnboardingStepper currentStep="phase_4_liveness" />
        </div>
      </section>
    </div>
  );
}
