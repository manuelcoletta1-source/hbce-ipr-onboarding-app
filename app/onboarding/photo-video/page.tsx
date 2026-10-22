"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import IprCertificateUploader from "@/components/IprCertificateUploader";

import {
  downloadHbceIprCertificate,
  generateHbceIprCertificate,
  nowIso,
  sha256Canonical,
  sha256File,
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
  HbceJokerC2BiometricLivenessSnapshot,
  HashReference,
  JsonObject
} from "@/lib/types";

type ActiveLivenessUpload = {
  certificate: HbceIprCertificate;
  fileName: string;
  payloadSha256: string;
  previousPayloadSha256: string | null;
  source: "session" | "upload";
};

type LivenessChallenge =
  | "HEAD_TURN_LEFT_RIGHT"
  | "HEAD_TURN_RIGHT_LEFT"
  | "RANDOM_PROMPT"
  | "MANUAL_OPERATOR_PROMPT";

type LocalFileEvidence = JsonObject & {
  original_file_name: string;
  mime_type: string;
  size_bytes: number;
  last_modified: number;
  sha256: HashReference;
  protected_reference: string;
};

type Phase4LivenessPrivateFields = JsonObject & {
  face_photo_uploaded: true;
  liveness_video_uploaded: true;
  spoken_name_declaration_confirmed: true;
  head_turn_declaration_confirmed: true;
  biometric_verification_consent: true;
  liveness_challenge: LivenessChallenge;
  liveness_instruction: string;
  declared_spoken_name: string;
  document_face_reference: string | null;
  selfie_reference: string;
  liveness_video_reference: string;
  document_face_sha256: string | null;
  selfie_sha256: string;
  video_sha256: string;
  liveness_declaration_sha256: string;
  face_photo_evidence: LocalFileEvidence;
  liveness_video_evidence: LocalFileEvidence;
  biometric_liveness_snapshot: HbceJokerC2BiometricLivenessSnapshot;
  raw_photo_in_certificate: false;
  raw_video_in_certificate: false;
  raw_media_in_public_registry: false;
  biometric_template_generated: false;
  face_template_generated: false;
  custody_mode: "JOKER_C2_CONTROLLED_CUSTODY";
  submitted_at: string;
};

type Phase4LivenessHashFields = JsonObject & {
  face_photo_sha256: string;
  liveness_video_sha256: string;
  liveness_declaration_sha256: string;
  liveness_package_hash: string;
};

const phase = getPhaseDefinitionByNumber(4);

const SESSION_CERTIFICATE_PREFIX = "HBCE_IPR_CERTIFICATE_FOR_NEXT_PHASE";

const EXPECTED_PREVIOUS_PHASE = "OFFICIAL_DOCUMENT_SUBMITTED" as const;
const EXPECTED_NEXT_PHASE = "LIVENESS_CHECK" as const;

const LIVENESS_CHALLENGES: readonly LivenessChallenge[] = [
  "HEAD_TURN_LEFT_RIGHT",
  "HEAD_TURN_RIGHT_LEFT",
  "RANDOM_PROMPT",
  "MANUAL_OPERATOR_PROMPT"
];

const LIVENESS_INSTRUCTIONS: Record<LivenessChallenge, string> = {
  HEAD_TURN_LEFT_RIGHT:
    "Record your face, say your full name aloud, then turn your head to the left and to the right.",
  HEAD_TURN_RIGHT_LEFT:
    "Record your face, say your full name aloud, then turn your head to the right and to the left.",
  RANDOM_PROMPT:
    "Record your face, say your full name aloud, then follow the random liveness prompt displayed by the operator.",
  MANUAL_OPERATOR_PROMPT:
    "Record your face, say your full name aloud, then follow the manual HBCE operator liveness instruction."
};

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

function buildActiveUploadFromAcceptedUpload(
  upload: AcceptedIprCertificateUpload
): ActiveLivenessUpload {
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
): ActiveLivenessUpload {
  return {
    certificate,
    fileName: "hbce-ipr-03-official-document.hbce.json",
    payloadSha256: certificate.hash_integrity.payload_sha256,
    previousPayloadSha256: certificate.hash_integrity.previous_payload_sha256,
    source: "session"
  };
}

function normalizeDeclaredName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function createProtectedReference(prefix: string, hash: string): string {
  return `${prefix}-${hash.slice(0, 24).toUpperCase()}`;
}

async function buildLocalFileEvidence(
  file: File,
  prefix: string
): Promise<LocalFileEvidence> {
  const sha256 = await sha256File(file);

  return {
    original_file_name: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    last_modified: file.lastModified,
    sha256,
    protected_reference: createProtectedReference(prefix, sha256)
  };
}

function getSelectedFileLabel(file: File | null): string {
  if (!file) {
    return "No file selected";
  }

  return `${file.name} · ${Math.round(file.size / 1024)} KB`;
}

function buildLivenessSnapshot(params: {
  facePhotoEvidence: LocalFileEvidence;
  videoEvidence: LocalFileEvidence;
  livenessChallenge: LivenessChallenge;
  livenessDeclarationSha256: string;
  biometricConsent: boolean;
  submittedAt: string;
}): HbceJokerC2BiometricLivenessSnapshot {
  return {
    document_face_reference: null,
    selfie_reference: params.facePhotoEvidence.protected_reference,
    liveness_video_reference: params.videoEvidence.protected_reference,
    document_face_sha256: null,
    selfie_sha256: params.facePhotoEvidence.sha256,
    video_sha256: params.videoEvidence.sha256,
    liveness_declaration_sha256: params.livenessDeclarationSha256,
    face_match_status: "MANUAL_REVIEW",
    face_match_method:
      "HBCE_MANUAL_REVIEW_REQUIRED_AFTER_SELFIE_AND_VIDEO_LIVENESS_UPLOAD",
    liveness_challenge: params.livenessChallenge,
    liveness_verified: false,
    liveness_timestamp: params.submittedAt,
    photo_verification_status: "submitted",
    video_verification_status: "submitted",
    liveness_status: "manual_review",
    biometric_verification_consent: params.biometricConsent,
    manual_review_required: true,
    raw_photo_in_certificate: false,
    raw_video_in_certificate: false,
    raw_media_in_public_registry: false,
    biometric_template_generated: false,
    face_template_generated: false,
    custody_mode: "JOKER_C2_CONTROLLED_CUSTODY"
  };
}

async function buildPhase4HashFields(params: {
  privateFields: Phase4LivenessPrivateFields;
  previousPayloadSha256: string;
}): Promise<Phase4LivenessHashFields> {
  const livenessPackageHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_4_PHOTO_VIDEO_LIVENESS_PACKAGE",
    phase: "LIVENESS_SUBMITTED",
    previous_payload_sha256: params.previousPayloadSha256,
    private_fields: params.privateFields,
    submitted_at: params.privateFields.submitted_at
  });

  return {
    face_photo_sha256: params.privateFields.selfie_sha256,
    liveness_video_sha256: params.privateFields.video_sha256,
    liveness_declaration_sha256:
      params.privateFields.liveness_declaration_sha256,
    liveness_package_hash: livenessPackageHash
  };
}

export default function PhotoVideoLivenessPage() {
  const router = useRouter();

  const [previousUpload, setPreviousUpload] =
    useState<ActiveLivenessUpload | null>(null);
  const [facePhotoFile, setFacePhotoFile] = useState<File | null>(null);
  const [livenessVideoFile, setLivenessVideoFile] = useState<File | null>(null);
  const [declaredSpokenName, setDeclaredSpokenName] = useState("");
  const [livenessChallenge, setLivenessChallenge] =
    useState<LivenessChallenge>("HEAD_TURN_LEFT_RIGHT");
  const [spokenNameConfirmed, setSpokenNameConfirmed] = useState(false);
  const [headTurnConfirmed, setHeadTurnConfirmed] = useState(false);
  const [biometricConsent, setBiometricConsent] = useState(false);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCertificate, setGeneratedCertificate] =
    useState<HbceGeneratedCertificate<JsonObject> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function restoreDocumentCertificateFromSession() {
      if (previousUpload) {
        return;
      }

      const stored = readStoredCertificateForPhase(EXPECTED_NEXT_PHASE);

      if (!stored) {
        return;
      }

      const validation = await validatePreviousHbceIprCertificate({
        certificate: stored,
        expected_previous_phase: EXPECTED_PREVIOUS_PHASE,
        expected_next_phase: EXPECTED_NEXT_PHASE
      });

      if (cancelled) {
        return;
      }

      if (!validation.valid) {
        clearStoredCertificateForPhase(EXPECTED_NEXT_PHASE);
        setPreviousUpload(null);
        setError(
          "The stored official document certificate was rejected. Upload Certificate 03 manually."
        );
        return;
      }

      setPreviousUpload(
        buildActiveUploadFromSession(stored as HbceIprCertificate)
      );
      setError("");
    }

    void restoreDocumentCertificateFromSession();

    return () => {
      cancelled = true;
    };
  }, [previousUpload]);

  const currentInstruction = useMemo(
    () => LIVENESS_INSTRUCTIONS[livenessChallenge],
    [livenessChallenge]
  );

  function clearPreviousUpload() {
    clearStoredCertificateForPhase(EXPECTED_NEXT_PHASE);
    setPreviousUpload(null);
    setGeneratedCertificate(null);
    setError("");
  }

  async function generateLivenessCertificate() {
    setError("");
    setGeneratedCertificate(null);

    if (!previousUpload) {
      setError("Upload Certificate 03 before generating Certificate 04.");
      return;
    }

    if (!facePhotoFile) {
      setError("Upload a clear front face photo before continuing.");
      return;
    }

    if (!livenessVideoFile) {
      setError(
        "Upload a liveness video showing your face, your spoken name and the head turn."
      );
      return;
    }

    const normalizedDeclaredName = normalizeDeclaredName(declaredSpokenName);

    if (!normalizedDeclaredName) {
      setError(
        "Insert the full name that is spoken aloud inside the liveness video."
      );
      return;
    }

    if (!spokenNameConfirmed) {
      setError(
        "Confirm that the liveness video includes the subject saying the declared full name aloud."
      );
      return;
    }

    if (!headTurnConfirmed) {
      setError(
        "Confirm that the liveness video includes the required head movement."
      );
      return;
    }

    if (!biometricConsent) {
      setError(
        "Confirm biometric/liveness consent before generating Certificate 04."
      );
      return;
    }

    setIsGenerating(true);

    try {
      const validation = await validatePreviousHbceIprCertificate({
        certificate: previousUpload.certificate,
        expected_previous_phase: EXPECTED_PREVIOUS_PHASE,
        expected_next_phase: EXPECTED_NEXT_PHASE
      });

      if (!validation.valid) {
        setPreviousUpload(null);
        clearStoredCertificateForPhase(EXPECTED_NEXT_PHASE);
        setError(
          validation.message ||
            "The official document certificate failed validation."
        );
        return;
      }

      const submittedAt = nowIso();
      const previousPayloadSha256 =
        previousUpload.certificate.hash_integrity.payload_sha256;

      const facePhotoEvidence = await buildLocalFileEvidence(
        facePhotoFile,
        "HBCE-FACE-PHOTO"
      );
      const videoEvidence = await buildLocalFileEvidence(
        livenessVideoFile,
        "HBCE-LIVENESS-VIDEO"
      );

      const livenessDeclarationSha256 = await sha256Canonical({
        kind: "HBCE_IPR_PHASE_4_LIVENESS_DECLARATION",
        phase: "LIVENESS_SUBMITTED",
        declared_spoken_name: normalizedDeclaredName,
        liveness_challenge: livenessChallenge,
        liveness_instruction: currentInstruction,
        spoken_name_declaration_confirmed: spokenNameConfirmed,
        head_turn_declaration_confirmed: headTurnConfirmed,
        biometric_verification_consent: biometricConsent,
        face_photo_sha256: facePhotoEvidence.sha256,
        video_sha256: videoEvidence.sha256,
        previous_payload_sha256: previousPayloadSha256,
        submitted_at: submittedAt
      });

      const biometricLivenessSnapshot = buildLivenessSnapshot({
        facePhotoEvidence,
        videoEvidence,
        livenessChallenge,
        livenessDeclarationSha256,
        biometricConsent,
        submittedAt
      });

      const privateFields: Phase4LivenessPrivateFields = {
        face_photo_uploaded: true,
        liveness_video_uploaded: true,
        spoken_name_declaration_confirmed: true,
        head_turn_declaration_confirmed: true,
        biometric_verification_consent: true,
        liveness_challenge: livenessChallenge,
        liveness_instruction: currentInstruction,
        declared_spoken_name: normalizedDeclaredName,
        document_face_reference: null,
        selfie_reference: facePhotoEvidence.protected_reference,
        liveness_video_reference: videoEvidence.protected_reference,
        document_face_sha256: null,
        selfie_sha256: facePhotoEvidence.sha256,
        video_sha256: videoEvidence.sha256,
        liveness_declaration_sha256: livenessDeclarationSha256,
        face_photo_evidence: facePhotoEvidence,
        liveness_video_evidence: videoEvidence,
        biometric_liveness_snapshot: biometricLivenessSnapshot,
        raw_photo_in_certificate: false,
        raw_video_in_certificate: false,
        raw_media_in_public_registry: false,
        biometric_template_generated: false,
        face_template_generated: false,
        custody_mode: "JOKER_C2_CONTROLLED_CUSTODY",
        submitted_at: submittedAt
      };

      const hashFields = await buildPhase4HashFields({
        privateFields,
        previousPayloadSha256
      });

      const phaseData: JsonObject = {
        certificate_role: "STEP_4_PHOTO_VIDEO_LIVENESS_EVIDENCE",
        certificate_visibility: "PRIVATE_PORTABLE_CERTIFICATE",
        public_registry_mode: "HASH_ONLY",
        phase_scope: "PHOTO_VIDEO_LIVENESS",

        private_fields: privateFields,
        liveness_fields: privateFields,
        liveness_private_data: privateFields,
        liveness_private_data_included: true,

        biometric_liveness_snapshot: biometricLivenessSnapshot,

        hash_fields: hashFields,

        face_photo_uploaded: true,
        liveness_video_uploaded: true,
        spoken_name_declaration_confirmed: true,
        head_turn_declaration_confirmed: true,
        biometric_verification_consent: true,

        declared_spoken_name: normalizedDeclaredName,
        liveness_challenge: livenessChallenge,
        liveness_instruction: currentInstruction,

        selfie_reference: facePhotoEvidence.protected_reference,
        liveness_video_reference: videoEvidence.protected_reference,
        selfie_sha256: facePhotoEvidence.sha256,
        video_sha256: videoEvidence.sha256,
        liveness_declaration_sha256: livenessDeclarationSha256,

        face_photo_sha256: hashFields.face_photo_sha256,
        liveness_video_sha256: hashFields.liveness_video_sha256,
        liveness_package_hash: hashFields.liveness_package_hash,

        face_match_status: "MANUAL_REVIEW",
        face_match_method:
          "HBCE_MANUAL_REVIEW_REQUIRED_AFTER_SELFIE_AND_VIDEO_LIVENESS_UPLOAD",
        liveness_submitted: true,
        liveness_verified: false,
        liveness_timestamp: submittedAt,
        photo_verification_status: "submitted",
        video_verification_status: "submitted",
        liveness_status: "manual_review",

        raw_photo_in_certificate: false,
        raw_video_in_certificate: false,
        raw_media_in_public_registry: false,
        biometric_template_generated: false,
        face_template_generated: false,
        custody_mode: "JOKER_C2_CONTROLLED_CUSTODY",

        fiscal_identity_collected: true,
        fiscal_identity_verified: false,
        official_document_uploaded: true,
        official_document_verified: false,
        privacy_compliance_accepted: false,
        ipr_status: "NOT_YET_ISSUED",
        ipr_card_status: "NOT_ISSUED",
        joker_c2_access: "DENIED",

        verification_state: {
          email_verified: false,
          phone_verified: false,
          fiscal_identity_collected: true,
          fiscal_identity_verified: false,
          official_document_uploaded: true,
          official_document_verified: false,
          liveness_submitted: true,
          liveness_verified: false,
          biometric_verification_consent: true,
          privacy_compliance_accepted: false,
          hbce_review_status: "NOT_STARTED",
          ipr_approved: false,
          ipr_card_issued: false,
          operational_certificate_issued: false,
          joker_c2_access: "DENIED"
        },

        previous_payload_sha256: previousPayloadSha256,
        next_required_phase: "PRIVACY_COMPLIANCE",
        submitted_at: submittedAt,
        issued_at: submittedAt,
        issued_at_utc: submittedAt,

        joker_c2_custody_reference: {
          custodian: "AI_JOKER_C2",
          custody_mode: "JOKER_C2_CONTROLLED_CUSTODY",
          raw_photo_in_certificate: false,
          raw_video_in_certificate: false,
          raw_media_in_public_registry: false,
          certificate_contains: "hashes_references_states_only"
        },

        certificate_boundary:
          "This file records photo/video liveness submission for the HBCE IPR onboarding chain. It does not approve the IPR, it does not verify the subject by itself, it does not issue the IPR Card and it does not grant JOKER-C2 access.",

        privacy_boundary:
          "This is a private portable HBCE-IPR certificate downloaded by the subject. It contains file references, hashes, declarations and verification states only. It must not contain raw photos, raw videos, biometric templates or face templates.",

        biometric_boundary:
          "The photo/video liveness certificate stores protected references, SHA-256 hashes, liveness declarations and review states. Raw biometric media remain outside the certificate and outside the public registry.",

        trust_boundary:
          "Certificate 04 records liveness submission only. HBCE manual or backend review is required before IPR approval, IPR Card issuance, operational certificate activation and JOKER-C2 access."
      };

      const generated = await generateHbceIprCertificate({
        phase_number: phase.phase_number,
        phase_code: phase.phase_code,
        phase_status: "ACTIVE",
        next_required_phase: phase.next_required_phase,
        subject: previousUpload.certificate.subject,
        previous_certificate: previousUpload.certificate,
        previous_payload_sha256: previousPayloadSha256,
        phase_data: phaseData,
        issued_at: submittedAt
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
          : "HBCE photo/video liveness certificate generation failed."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="hbce-container">
      <main className="hbce-main">
        <section className="hbce-hero">
          <p className="hbce-kicker">HBCE IPR · Fase 04</p>

          <h1>{phase.title}</h1>

          <p>
            Carica una fotografia nitida del volto e un video di verifica.
            Nel video devi mostrare il volto, pronunciare nome e cognome
            e ruotare la testa secondo le istruzioni indicate.
          </p>
        </section>

        {previousUpload ? (
          <section className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">
              {previousUpload.source === "session"
                ? "Certificato del documento recuperato dalla sessione"
                : "Certificato del documento accettato"}
            </p>

            <h2>Certificato 03 pronto per la verifica con foto e video.</h2>

            <p>
              Il certificato del documento richiesto è disponibile.
              Ora puoi caricare la fotografia e il video necessari
              per il Certificato 04.
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
                Utilizza un altro Certificato 03
              </button>
            </div>
          </section>
        ) : (
          <IprCertificateUploader
            expectedPreviousPhase={EXPECTED_PREVIOUS_PHASE}
            expectedNextPhase={EXPECTED_NEXT_PHASE}
            title="Carica il certificato del documento d’identità"
            description="Carica hbce-ipr-03-official-document.hbce.json. L’applicazione verifica il Certificato 03 prima di consentire il caricamento di foto e video."
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
              <p className="hbce-kicker">Fotografia del volto</p>
              <h2>Carica una fotografia frontale nitida del volto.</h2>
              <p className="hbce-muted">
                Il certificato contiene soltanto l&apos;hash SHA-256 e un
                riferimento locale. La fotografia originale non viene
                inserita nel certificato HBCE-IPR.
              </p>
            </div>

            <label className="hbce-field">
              <span>File della fotografia del volto</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  setFacePhotoFile(event.target.files?.[0] ?? null);
                  setGeneratedCertificate(null);
                  setError("");
                }}
              />
              <small>{getSelectedFileLabel(facePhotoFile)}</small>
            </label>
          </div>
        </section>

        <section className="hbce-card">
          <div className="hbce-stack">
            <div>
              <p className="hbce-kicker">Video di verifica della presenza</p>
              <h2>Carica un video in cui pronunci il nome e ruoti la testa.</h2>
              <p className="hbce-muted">
                Il video deve mostrare il volto, contenere nome e cognome
                pronunciati ad alta voce e il movimento richiesto della testa.
                Il video originale non viene inserito nel certificato HBCE-IPR.
              </p>
            </div>

            <label className="hbce-field">
              <span>Nome e cognome pronunciati nel video</span>
              <input
                type="text"
                value={declaredSpokenName}
                placeholder="Nome e cognome pronunciati ad alta voce"
                onChange={(event) => {
                  setDeclaredSpokenName(event.target.value);
                  setGeneratedCertificate(null);
                  setError("");
                }}
              />
              <small>
                Il nome inserito deve corrispondere a quello pronunciato
                nel video caricato.
              </small>
            </label>

            <label className="hbce-field">
              <span>Movimento richiesto per la verifica</span>
              <select
                value={livenessChallenge}
                onChange={(event) => {
                  setLivenessChallenge(event.target.value as LivenessChallenge);
                  setGeneratedCertificate(null);
                  setError("");
                }}
              >
                {LIVENESS_CHALLENGES.map((challenge) => (
                  <option key={challenge} value={challenge}>
                    {challenge}
                  </option>
                ))}
              </select>
              <small>{currentInstruction}</small>
            </label>

            <label className="hbce-field">
              <span>File del video di verifica</span>
              <input
                type="file"
                accept="video/*"
                onChange={(event) => {
                  setLivenessVideoFile(event.target.files?.[0] ?? null);
                  setGeneratedCertificate(null);
                  setError("");
                }}
              />
              <small>{getSelectedFileLabel(livenessVideoFile)}</small>
            </label>

            <label className="hbce-check">
              <input
                type="checkbox"
                checked={spokenNameConfirmed}
                onChange={(event) => {
                  setSpokenNameConfirmed(event.target.checked);
                  setGeneratedCertificate(null);
                  setError("");
                }}
              />
              <span>
                Confermo che nel video caricato vengono pronunciati
                ad alta voce il nome e il cognome dichiarati.
              </span>
            </label>

            <label className="hbce-check">
              <input
                type="checkbox"
                checked={headTurnConfirmed}
                onChange={(event) => {
                  setHeadTurnConfirmed(event.target.checked);
                  setGeneratedCertificate(null);
                  setError("");
                }}
              />
              <span>
                Confermo che il video caricato contiene il movimento
                della testa richiesto.
              </span>
            </label>

            <label className="hbce-check">
              <input
                type="checkbox"
                checked={biometricConsent}
                onChange={(event) => {
                  setBiometricConsent(event.target.checked);
                  setGeneratedCertificate(null);
                  setError("");
                }}
              />
              <span>
                Accetto l&apos;utilizzo dei riferimenti per la verifica biometrica
                e della presenza nel percorso HBCE-IPR. Fotografie, video
                originali e modelli biometrici non sono inseriti nel certificato portabile.
              </span>
            </label>
          </div>
        </section>

        <section className="hbce-card hbce-card--soft">
          <p className="hbce-kicker">Limiti del contenuto del certificato</p>
          <h2>Il Certificato 04 contiene soltanto hash e riferimenti.</h2>

          <p>
            L&apos;applicazione calcola localmente gli hash SHA-256 della
            fotografia e del video. Il Certificato 04 conserva soltanto
            riferimenti, hash, dichiarazioni e stati di revisione.
          </p>

          <p className="hbce-mono">raw_photo_in_certificate: false</p>
          <p className="hbce-mono">raw_video_in_certificate: false</p>
          <p className="hbce-mono">biometric_template_generated: false</p>
          <p className="hbce-mono">face_template_generated: false</p>
          <p className="hbce-mono">
            custody_mode: JOKER_C2_CONTROLLED_CUSTODY
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
            <p className="hbce-kicker">Certificato generato</p>
            <h2>{generatedCertificate.file_name}</h2>

            <p>
              Il certificato privato relativo alla verifica con foto e video
              è stato generato e scaricato. Utilizza questo file nella
              Fase 05: Privacy e conformità.
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
            onClick={generateLivenessCertificate}
          >
            {isGenerating
              ? "Generazione del Certificato HBCE-IPR 04"
              : "Genera il Certificato HBCE-IPR 04"}
          </button>
        </section>
      </main>
    </div>
  );
}
