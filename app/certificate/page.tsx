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
  HbceJokerC2BiologicalIdentitySnapshot,
  HbceJokerC2BiometricLivenessSnapshot,
  HbcePhysicalDescriptorProfile,
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
  joker_c2_access_granted: false;
  joker_c2_gate_validation_required: true;
  identity_snapshot?: HbceJokerC2BiologicalIdentitySnapshot;
  biological_identity_snapshot?: HbceJokerC2BiologicalIdentitySnapshot;
  physical_descriptor_profile?: HbcePhysicalDescriptorProfile;
  biometric_liveness_snapshot?: HbceJokerC2BiometricLivenessSnapshot;
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
  gate_validation_boundary_hash: string;
};

const phase = getPhaseDefinitionByNumber(9);

const SESSION_CERTIFICATE_PREFIX = "HBCE_IPR_CERTIFICATE_FOR_NEXT_PHASE";

const ACCESS_BOUNDARY =
  "This HBCE Operational Certificate enables eligibility for JOKER-C2 access evaluation. Runtime access still requires fail-closed certificate validation.";

const LEGAL_BOUNDARY =
  "This is an internal HBCE operational certificate. It is not a qualified eIDAS certificate unless formally integrated with a recognized trust service.";

const GATE_VALIDATION_BOUNDARY =
  "Certificate 09 does not directly grant JOKER-C2 runtime access. It must be submitted to the JOKER-C2 access gate, which validates protocol, issuer, phase, status, scope, previous hash and payload hash fail-closed.";

const FACE_MATCH_STATUSES = [
  "NOT_STARTED",
  "PENDING",
  "MATCHED",
  "FAILED",
  "MANUAL_REVIEW"
] as const;

const LIVENESS_CHALLENGES = [
  "HEAD_TURN_LEFT_RIGHT",
  "HEAD_TURN_RIGHT_LEFT",
  "RANDOM_PROMPT",
  "MANUAL_OPERATOR_PROMPT"
] as const;

const LIVENESS_REVIEW_STATUSES = [
  "submitted",
  "manual_review",
  "approved",
  "rejected"
] as const;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonObject(value: unknown): value is JsonObject {
  return isRecord(value);
}

function getJsonObjectField(
  fields: JsonObject | null,
  key: string
): JsonObject | null {
  if (!fields) {
    return null;
  }

  const value = fields[key];

  return isJsonObject(value) ? value : null;
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

function getNumberField(fields: JsonObject | null, key: string): number | null {
  if (!fields) {
    return null;
  }

  const value = fields[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value.trim());

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getBooleanField(fields: JsonObject | null, key: string): boolean {
  if (!fields) {
    return false;
  }

  return fields[key] === true;
}

function getStringFromSources(
  sources: readonly (JsonObject | null)[],
  keys: readonly string[]
): string | null {
  for (const source of sources) {
    for (const key of keys) {
      const value = getStringField(source, key);

      if (value) {
        return value;
      }
    }
  }

  return null;
}

function getNumberFromSources(
  sources: readonly (JsonObject | null)[],
  keys: readonly string[]
): number | null {
  for (const source of sources) {
    for (const key of keys) {
      const value = getNumberField(source, key);

      if (value !== null) {
        return value;
      }
    }
  }

  return null;
}

function getBooleanFromSources(
  sources: readonly (JsonObject | null)[],
  keys: readonly string[]
): boolean {
  for (const source of sources) {
    for (const key of keys) {
      if (getBooleanField(source, key)) {
        return true;
      }
    }
  }

  return false;
}

function getAllowedStringFromSources<TAllowed extends string>(
  sources: readonly (JsonObject | null)[],
  keys: readonly string[],
  allowedValues: readonly TAllowed[]
): TAllowed | null {
  const value = getStringFromSources(sources, keys);

  if (value && allowedValues.includes(value as TAllowed)) {
    return value as TAllowed;
  }

  return null;
}

function getFirstNestedObjectFromSources(
  sources: readonly (JsonObject | null)[],
  keys: readonly string[]
): JsonObject | null {
  for (const source of sources) {
    if (!source) {
      continue;
    }

    for (const key of keys) {
      const nested = getJsonObjectField(source, key);

      if (nested) {
        return nested;
      }
    }
  }

  return null;
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

function normalizeValidUntil(value: string): string {
  return value.trim();
}

function isValidFutureIsoDate(value: string): boolean {
  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    return false;
  }

  return parsed > Date.now();
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

function getIdentitySourcesFromCertificate(
  certificate: HbceIprCertificate | null
): JsonObject[] {
  if (!certificate) {
    return [];
  }

  const phaseData = certificate.payload.phase_data;
  const privateFields = getJsonObjectField(phaseData, "private_fields");
  const certificateFields = getJsonObjectField(phaseData, "certificate_fields");

  const explicitBiologicalSnapshot = getFirstNestedObjectFromSources(
    [phaseData, privateFields, certificateFields],
    ["biological_identity_snapshot"]
  );

  const explicitIdentitySnapshot = getFirstNestedObjectFromSources(
    [phaseData, privateFields, certificateFields],
    ["identity_snapshot"]
  );

  return [
    explicitBiologicalSnapshot,
    explicitIdentitySnapshot,
    privateFields,
    certificateFields,
    phaseData
  ].filter(isJsonObject);
}

function hasPhysicalDescriptorProfileContent(
  profile: HbcePhysicalDescriptorProfile | null
): boolean {
  if (!profile) {
    return false;
  }

  return (
    profile.height_cm !== null ||
    profile.weight_kg !== null ||
    profile.body_build !== null ||
    profile.eye_color !== null ||
    profile.hair_color !== null ||
    profile.hair_type !== null ||
    profile.visible_scars !== null ||
    profile.tattoos !== null ||
    profile.piercings !== null ||
    profile.distinctive_marks !== null ||
    profile.descriptor_accuracy_declaration
  );
}

function buildPhysicalDescriptorProfileFromCertificate(
  certificate: HbceIprCertificate | null
): HbcePhysicalDescriptorProfile | null {
  const identitySources = getIdentitySourcesFromCertificate(certificate);
  const explicitProfile = getFirstNestedObjectFromSources(identitySources, [
    "physical_descriptor_profile"
  ]);

  const sources = [explicitProfile, ...identitySources];

  const profile: HbcePhysicalDescriptorProfile = {
    height_cm: getNumberFromSources(sources, ["height_cm"]),
    weight_kg: getNumberFromSources(sources, ["weight_kg"]),
    body_build: getStringFromSources(sources, ["body_build"]),
    eye_color: getStringFromSources(sources, ["eye_color"]),
    hair_color: getStringFromSources(sources, ["hair_color"]),
    hair_type: getStringFromSources(sources, ["hair_type"]),
    visible_scars: getStringFromSources(sources, ["visible_scars"]),
    tattoos: getStringFromSources(sources, ["tattoos"]),
    piercings: getStringFromSources(sources, ["piercings"]),
    distinctive_marks: getStringFromSources(sources, ["distinctive_marks"]),
    descriptor_accuracy_declaration: getBooleanFromSources(sources, [
      "descriptor_accuracy_declaration"
    ])
  };

  return hasPhysicalDescriptorProfileContent(profile) ? profile : null;
}

function hasBiometricLivenessSnapshotContent(
  snapshot: HbceJokerC2BiometricLivenessSnapshot | null
): boolean {
  if (!snapshot) {
    return false;
  }

  return (
    snapshot.document_face_reference !== null ||
    snapshot.selfie_reference !== null ||
    snapshot.liveness_video_reference !== null ||
    snapshot.document_face_sha256 !== null ||
    snapshot.selfie_sha256 !== null ||
    snapshot.video_sha256 !== null ||
    snapshot.liveness_declaration_sha256 !== null ||
    snapshot.face_match_status !== "NOT_STARTED" ||
    snapshot.face_match_method !== null ||
    snapshot.liveness_verified ||
    snapshot.liveness_timestamp !== null ||
    snapshot.photo_verification_status !== null ||
    snapshot.video_verification_status !== null ||
    snapshot.liveness_status !== null ||
    snapshot.biometric_verification_consent
  );
}

function buildBiometricLivenessSnapshotFromCertificate(
  certificate: HbceIprCertificate | null
): HbceJokerC2BiometricLivenessSnapshot | null {
  const identitySources = getIdentitySourcesFromCertificate(certificate);
  const explicitSnapshot = getFirstNestedObjectFromSources(identitySources, [
    "biometric_liveness_snapshot"
  ]);

  const sources = [explicitSnapshot, ...identitySources];
  const faceMatchStatus =
    getAllowedStringFromSources(
      sources,
      ["face_match_status"],
      FACE_MATCH_STATUSES
    ) ?? "NOT_STARTED";

  const snapshot: HbceJokerC2BiometricLivenessSnapshot = {
    document_face_reference: getStringFromSources(sources, [
      "document_face_reference"
    ]),
    selfie_reference: getStringFromSources(sources, [
      "selfie_reference",
      "photo_reference"
    ]),
    liveness_video_reference: getStringFromSources(sources, [
      "liveness_video_reference",
      "video_reference"
    ]),
    document_face_sha256: getStringFromSources(sources, [
      "document_face_sha256"
    ]),
    selfie_sha256: getStringFromSources(sources, [
      "selfie_sha256",
      "photo_hash"
    ]),
    video_sha256: getStringFromSources(sources, [
      "video_sha256",
      "video_hash"
    ]),
    liveness_declaration_sha256: getStringFromSources(sources, [
      "liveness_declaration_sha256"
    ]),
    face_match_status: faceMatchStatus,
    face_match_method: getStringFromSources(sources, ["face_match_method"]),
    liveness_challenge:
      getAllowedStringFromSources(
        sources,
        ["liveness_challenge"],
        LIVENESS_CHALLENGES
      ) ?? "MANUAL_OPERATOR_PROMPT",
    liveness_verified: getBooleanFromSources(sources, ["liveness_verified"]),
    liveness_timestamp: getStringFromSources(sources, [
      "liveness_timestamp"
    ]),
    photo_verification_status: getAllowedStringFromSources(
      sources,
      ["photo_verification_status"],
      LIVENESS_REVIEW_STATUSES
    ),
    video_verification_status: getAllowedStringFromSources(
      sources,
      ["video_verification_status"],
      LIVENESS_REVIEW_STATUSES
    ),
    liveness_status: getAllowedStringFromSources(
      sources,
      ["liveness_status"],
      LIVENESS_REVIEW_STATUSES
    ),
    biometric_verification_consent: getBooleanFromSources(sources, [
      "biometric_verification_consent"
    ]),
    manual_review_required:
      getBooleanFromSources(sources, ["manual_review_required"]) ||
      faceMatchStatus !== "MATCHED",
    raw_photo_in_certificate: false,
    raw_video_in_certificate: false,
    raw_media_in_public_registry: false,
    biometric_template_generated: false,
    face_template_generated: false,
    custody_mode: "JOKER_C2_CONTROLLED_CUSTODY"
  };

  return hasBiometricLivenessSnapshotContent(snapshot) ? snapshot : null;
}

function buildDisplayNameFromSources(sources: JsonObject[]): string | null {
  const explicitDisplayName = getStringFromSources(sources, [
    "display_name",
    "full_name",
    "legal_name",
    "subject_name",
    "name"
  ]);

  if (explicitDisplayName) {
    return explicitDisplayName;
  }

  const firstName = getStringFromSources(sources, ["first_name", "given_name"]);
  const lastName = getStringFromSources(sources, [
    "last_name",
    "family_name",
    "surname"
  ]);

  const composedName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return composedName.length > 0 ? composedName : null;
}

function hasBiologicalIdentitySnapshotContent(
  snapshot: HbceJokerC2BiologicalIdentitySnapshot | null
): boolean {
  if (!snapshot) {
    return false;
  }

  return (
    snapshot.display_name !== null ||
    snapshot.first_name !== null ||
    snapshot.last_name !== null ||
    snapshot.birth_date !== null ||
    snapshot.birth_place !== null ||
    snapshot.nationality !== null ||
    snapshot.country !== null ||
    snapshot.email !== null ||
    snapshot.phone_number !== null ||
    snapshot.fiscal_or_tax_identifier_ref !== null ||
    snapshot.document_ref !== null ||
    snapshot.phone_verified ||
    snapshot.email_verified ||
    snapshot.document_verified ||
    snapshot.liveness_verified ||
    snapshot.compliance_review_status !== null ||
    hasPhysicalDescriptorProfileContent(
      snapshot.physical_descriptor_profile ?? null
    ) ||
    hasBiometricLivenessSnapshotContent(
      snapshot.biometric_liveness_snapshot ?? null
    )
  );
}

function buildIdentitySnapshotFromCertificate(
  certificate: HbceIprCertificate | null
): HbceJokerC2BiologicalIdentitySnapshot | null {
  const sources = getIdentitySourcesFromCertificate(certificate);
  const physicalDescriptorProfile =
    buildPhysicalDescriptorProfileFromCertificate(certificate);
  const biometricLivenessSnapshot =
    buildBiometricLivenessSnapshotFromCertificate(certificate);

  const snapshot: HbceJokerC2BiologicalIdentitySnapshot = {
    display_name: buildDisplayNameFromSources(sources),
    first_name: getStringFromSources(sources, ["first_name", "given_name"]),
    last_name: getStringFromSources(sources, [
      "last_name",
      "family_name",
      "surname"
    ]),
    birth_date: getStringFromSources(sources, [
      "birth_date",
      "date_of_birth",
      "dob"
    ]),
    birth_place: getStringFromSources(sources, [
      "birth_place",
      "place_of_birth"
    ]),
    nationality: getStringFromSources(sources, ["nationality", "citizenship"]),
    country: getStringFromSources(sources, [
      "country",
      "country_code",
      "residence_country",
      "fiscal_country"
    ]),
    email: getStringFromSources(sources, ["email", "email_address"]),
    phone_number: getStringFromSources(sources, [
      "phone_number",
      "phone",
      "mobile_phone"
    ]),
    fiscal_or_tax_identifier_ref: getStringFromSources(sources, [
      "fiscal_or_tax_identifier_ref",
      "fiscal_code_ref",
      "tax_identifier_ref",
      "national_tax_identifier_ref",
      "tax_id_value_hash",
      "fiscal_identifier_hash",
      "tax_id_document_front_sha256",
      "tax_id_document_back_sha256",
      "tax_id_document_sha256"
    ]),
    document_ref: getStringFromSources(sources, [
      "document_ref",
      "document_hash",
      "identity_document_hash",
      "document_identifier_ref",
      "document_number_hash",
      "document_front_sha256",
      "document_back_sha256",
      "document_passport_page_sha256",
      "document_metadata_hash"
    ]),
    phone_verified: getBooleanFromSources(sources, [
      "phone_verified",
      "is_phone_verified"
    ]),
    email_verified: getBooleanFromSources(sources, [
      "email_verified",
      "is_email_verified"
    ]),
    document_verified: getBooleanFromSources(sources, [
      "document_verified",
      "identity_document_verified",
      "official_document_verified",
      "is_document_verified"
    ]),
    liveness_verified:
      getBooleanFromSources(sources, [
        "liveness_verified",
        "selfie_verified",
        "video_verified",
        "is_liveness_verified"
      ]) || Boolean(biometricLivenessSnapshot?.liveness_verified),
    compliance_review_status: getStringFromSources(sources, [
      "compliance_review_status",
      "kyc_status",
      "review_status",
      "hbce_review_status"
    ]),
    ...(physicalDescriptorProfile
      ? { physical_descriptor_profile: physicalDescriptorProfile }
      : {}),
    ...(biometricLivenessSnapshot
      ? { biometric_liveness_snapshot: biometricLivenessSnapshot }
      : {})
  };

  return hasBiologicalIdentitySnapshotContent(snapshot) ? snapshot : null;
}

async function buildHashFields(params: {
  privateFields: Phase9OperationalPrivateFields;
  previousPayloadSha256: string;
}): Promise<Phase9OperationalHashFields> {
  const certificateIdHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_9_CERTIFICATE_ID",
    phase: "IPR_VERIFIED",
    value: params.privateFields.certificate_id,
    previous_payload_sha256: params.previousPayloadSha256,
    issued_at: params.privateFields.issued_at
  });

  const iprIdHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_9_IPR_ID",
    phase: "IPR_VERIFIED",
    value: params.privateFields.ipr_id,
    previous_payload_sha256: params.previousPayloadSha256,
    issued_at: params.privateFields.issued_at
  });

  const subjectIdHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_9_SUBJECT_ID",
    phase: "IPR_VERIFIED",
    value: params.privateFields.subject_id,
    previous_payload_sha256: params.previousPayloadSha256,
    issued_at: params.privateFields.issued_at
  });

  const cardSerialHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_9_CARD_SERIAL",
    phase: "IPR_VERIFIED",
    value: params.privateFields.card_serial,
    previous_payload_sha256: params.previousPayloadSha256,
    issued_at: params.privateFields.issued_at
  });

  const certificateStatusHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_9_CERTIFICATE_STATUS",
    phase: "IPR_VERIFIED",
    value: params.privateFields.certificate_status,
    previous_payload_sha256: params.previousPayloadSha256,
    issued_at: params.privateFields.issued_at
  });

  const certificateScopeHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_9_CERTIFICATE_SCOPE",
    phase: "IPR_VERIFIED",
    value: params.privateFields.certificate_scope,
    previous_payload_sha256: params.previousPayloadSha256,
    issued_at: params.privateFields.issued_at
  });

  const operatorReferenceHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_9_OPERATOR_REFERENCE",
    phase: "IPR_VERIFIED",
    value: params.privateFields.operator_reference,
    previous_payload_sha256: params.previousPayloadSha256,
    issued_at: params.privateFields.issued_at
  });

  const validityHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_9_VALIDITY",
    phase: "IPR_VERIFIED",
    previous_payload_sha256: params.previousPayloadSha256,
    issued_at: params.privateFields.issued_at,
    valid_until: params.privateFields.valid_until
  });

  const accessBoundaryHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_9_ACCESS_BOUNDARY",
    phase: "IPR_VERIFIED",
    value: ACCESS_BOUNDARY,
    previous_payload_sha256: params.previousPayloadSha256,
    issued_at: params.privateFields.issued_at
  });

  const legalBoundaryHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_9_LEGAL_BOUNDARY",
    phase: "IPR_VERIFIED",
    value: LEGAL_BOUNDARY,
    previous_payload_sha256: params.previousPayloadSha256,
    issued_at: params.privateFields.issued_at
  });

  const gateValidationBoundaryHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_9_GATE_VALIDATION_BOUNDARY",
    phase: "IPR_VERIFIED",
    value: GATE_VALIDATION_BOUNDARY,
    joker_c2_access_granted: params.privateFields.joker_c2_access_granted,
    joker_c2_gate_validation_required:
      params.privateFields.joker_c2_gate_validation_required,
    next_required_phase: params.privateFields.next_required_phase,
    previous_payload_sha256: params.previousPayloadSha256,
    issued_at: params.privateFields.issued_at
  });

  return {
    certificate_id_hash: certificateIdHash,
    ipr_id_hash: iprIdHash,
    subject_id_hash: subjectIdHash,
    card_serial_hash: cardSerialHash,
    certificate_status_hash: certificateStatusHash,
    certificate_scope_hash: certificateScopeHash,
    operator_reference_hash: operatorReferenceHash,
    validity_hash: validityHash,
    access_boundary_hash: accessBoundaryHash,
    legal_boundary_hash: legalBoundaryHash,
    gate_validation_boundary_hash: gateValidationBoundaryHash
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

      setPreviousUpload(
        buildActiveUploadFromSession(stored as HbceIprCertificate)
      );
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

  const previousIdentitySnapshot = useMemo(
    () =>
      previousUpload
        ? buildIdentitySnapshotFromCertificate(previousUpload.certificate)
        : null,
    [previousUpload]
  );

  const physicalDescriptorProfile =
    previousIdentitySnapshot?.physical_descriptor_profile ?? null;

  const biometricLivenessSnapshot =
    previousIdentitySnapshot?.biometric_liveness_snapshot ?? null;

  function clearPreviousUpload() {
    clearStoredCertificateForPhase("OPERATIONAL_CERTIFICATE");
    setPreviousUpload(null);
    setGeneratedCertificate(null);
    setError("");
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

    const normalizedValidUntil = normalizeValidUntil(validUntil);

    if (!normalizedValidUntil) {
      setError("Insert the operational certificate validity date.");
      return;
    }

    if (!isValidFutureIsoDate(normalizedValidUntil)) {
      setError(
        "Insert a valid future date for the operational certificate validity boundary."
      );
      return;
    }

    setIsGenerating(true);

    try {
      const validation = await validatePreviousHbceIprCertificate({
        certificate: previousUpload.certificate,
        expected_previous_phase: "IPR_CARD_ISSUED",
        expected_next_phase: "OPERATIONAL_CERTIFICATE"
      });

      if (!validation.valid) {
        setPreviousUpload(null);
        clearStoredCertificateForPhase("OPERATIONAL_CERTIFICATE");
        setError(
          validation.message ||
            "The IPR Card certificate failed operational certificate validation."
        );
        return;
      }

      const issuedAt = nowIso();

      const previousPayloadSha256 =
        previousUpload.certificate.hash_integrity.payload_sha256;

      const operationalPreview = buildOperationalPreview(previousUpload);
      const identitySnapshot = buildIdentitySnapshotFromCertificate(
        previousUpload.certificate
      );
      const inheritedPhysicalDescriptorProfile =
        identitySnapshot?.physical_descriptor_profile ?? null;
      const inheritedBiometricLivenessSnapshot =
        identitySnapshot?.biometric_liveness_snapshot ?? null;

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
        valid_until: normalizedValidUntil,
        next_required_phase: "JOKER_C2_ACCESS",
        access_boundary: ACCESS_BOUNDARY,
        legal_boundary: LEGAL_BOUNDARY,
        joker_c2_access_granted: false,
        joker_c2_gate_validation_required: true,
        ...(identitySnapshot
          ? {
              identity_snapshot: identitySnapshot,
              biological_identity_snapshot: identitySnapshot
            }
          : {}),
        ...(inheritedPhysicalDescriptorProfile
          ? { physical_descriptor_profile: inheritedPhysicalDescriptorProfile }
          : {}),
        ...(inheritedBiometricLivenessSnapshot
          ? { biometric_liveness_snapshot: inheritedBiometricLivenessSnapshot }
          : {})
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
        identity_snapshot: identitySnapshot,
        physical_descriptor_profile: inheritedPhysicalDescriptorProfile,
        biometric_liveness_snapshot: inheritedBiometricLivenessSnapshot,
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

        ...(identitySnapshot
          ? {
              identity_snapshot: identitySnapshot,
              biological_identity_snapshot: identitySnapshot
            }
          : {}),
        ...(inheritedPhysicalDescriptorProfile
          ? { physical_descriptor_profile: inheritedPhysicalDescriptorProfile }
          : {}),
        ...(inheritedBiometricLivenessSnapshot
          ? { biometric_liveness_snapshot: inheritedBiometricLivenessSnapshot }
          : {}),

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
        gate_validation_boundary_hash: hashFields.gate_validation_boundary_hash,
        verification_hash: verificationHash,

        fiscal_identity_collected: true,
        fiscal_identity_verified: true,
        official_document_uploaded: true,
        official_document_verified: true,
        liveness_submitted: true,
        liveness_verified: Boolean(
          identitySnapshot?.liveness_verified ||
            inheritedBiometricLivenessSnapshot?.liveness_verified
        ),
        biometric_verification_consent: Boolean(
          inheritedBiometricLivenessSnapshot?.biometric_verification_consent
        ),
        privacy_compliance_accepted: true,

        hbce_review_status: "APPROVED",
        ipr_approved: true,
        ipr_status: "VERIFIED",
        ipr_card_issued: true,
        ipr_card_status: "ACTIVE",
        operational_certificate_issued: true,
        operational_certificate_status: "ACTIVE",
        joker_c2_access: "ELIGIBLE_FOR_GATE_VALIDATION",
        joker_c2_access_granted: false,
        joker_c2_gate_validation_required: true,

        verification_state: {
          email_verified: true,
          phone_verified: true,
          fiscal_identity_collected: true,
          fiscal_identity_verified: true,
          official_document_uploaded: true,
          official_document_verified: true,
          liveness_submitted: true,
          liveness_verified: Boolean(
            identitySnapshot?.liveness_verified ||
              inheritedBiometricLivenessSnapshot?.liveness_verified
          ),
          biometric_verification_consent: Boolean(
            inheritedBiometricLivenessSnapshot?.biometric_verification_consent
          ),
          privacy_compliance_accepted: true,
          hbce_review_status: "APPROVED",
          ipr_approved: true,
          ipr_card_issued: true,
          operational_certificate_issued: true,
          operational_certificate_status: "ACTIVE",
          joker_c2_access: "ELIGIBLE_FOR_GATE_VALIDATION",
          joker_c2_access_granted: false,
          joker_c2_gate_validation_required: true
        },

        previous_payload_sha256: previousPayloadSha256,
        next_required_phase: "JOKER_C2_ACCESS",

        access_boundary: ACCESS_BOUNDARY,
        legal_boundary: LEGAL_BOUNDARY,
        gate_validation_boundary: GATE_VALIDATION_BOUNDARY,

        certificate_boundary:
          "This file records the final HBCE operational certificate for the IPR onboarding chain. It enables JOKER-C2 access evaluation, but JOKER-C2 must still validate the certificate fail-closed before granting runtime access.",

        privacy_boundary:
          "This is a private portable HBCE-IPR certificate downloaded by the subject. Operational certificate fields and minimized identity/liveness snapshots are stored inside private_fields. Public verification must expose hash-only references, not private certificate fields or raw biometric media.",

        trust_boundary:
          "This certificate enables eligibility for JOKER-C2 access evaluation only. JOKER-C2 must still validate protocol, issuer, phase, status, scope, previous hash, payload hash, identity snapshot and liveness snapshot before granting access.",

        biometric_boundary:
          "The operational certificate may carry minimized liveness references, hashes and verification states. It must not carry raw photos, raw videos, biometric templates or face templates."
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
          <p className="hbce-kicker">HBCE Operational Certificate · Phase 09</p>

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
            <p className="hbce-mono">joker_c2_access_granted: false</p>
          </section>
        ) : null}

        {previousIdentitySnapshot ? (
          <section className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">Inherited identity snapshot</p>
            <h2>Biological identity inherited from Certificate 08.</h2>

            <p>
              Certificate 09 will inherit the identity, physical descriptor and
              liveness snapshot already chained through the previous IPR Card
              certificate.
            </p>

            <p className="hbce-mono">
              biological_subject:{" "}
              {previousIdentitySnapshot.display_name ?? "unavailable"}
            </p>
            <p className="hbce-mono">
              document_verified:{" "}
              {String(previousIdentitySnapshot.document_verified)}
            </p>
            <p className="hbce-mono">
              liveness_verified:{" "}
              {String(previousIdentitySnapshot.liveness_verified)}
            </p>
            <p className="hbce-mono">
              compliance_review_status:{" "}
              {previousIdentitySnapshot.compliance_review_status ??
                "unavailable"}
            </p>
          </section>
        ) : null}

        {physicalDescriptorProfile ? (
          <section className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">Inherited physical descriptor profile</p>
            <h2>Physical descriptor layer ready for Certificate 09.</h2>

            <p className="hbce-mono">
              height_cm: {physicalDescriptorProfile.height_cm ?? "unavailable"}
            </p>
            <p className="hbce-mono">
              weight_kg: {physicalDescriptorProfile.weight_kg ?? "unavailable"}
            </p>
            <p className="hbce-mono">
              body_build:{" "}
              {physicalDescriptorProfile.body_build ?? "unavailable"}
            </p>
            <p className="hbce-mono">
              eye_color: {physicalDescriptorProfile.eye_color ?? "unavailable"}
            </p>
            <p className="hbce-mono">
              hair_color:{" "}
              {physicalDescriptorProfile.hair_color ?? "unavailable"}
            </p>
            <p className="hbce-mono">
              descriptor_accuracy_declaration:{" "}
              {String(
                physicalDescriptorProfile.descriptor_accuracy_declaration
              )}
            </p>
          </section>
        ) : null}

        {biometricLivenessSnapshot ? (
          <section className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">Inherited liveness snapshot</p>
            <h2>Photo/video liveness ready for Certificate 09.</h2>

            <p className="hbce-mono">
              document_face_reference:{" "}
              {biometricLivenessSnapshot.document_face_reference ??
                "unavailable"}
            </p>
            <p className="hbce-mono">
              selfie_reference:{" "}
              {biometricLivenessSnapshot.selfie_reference ?? "unavailable"}
            </p>
            <p className="hbce-mono">
              liveness_video_reference:{" "}
              {biometricLivenessSnapshot.liveness_video_reference ??
                "unavailable"}
            </p>
            <p className="hbce-mono">
              face_match_status: {biometricLivenessSnapshot.face_match_status}
            </p>
            <p className="hbce-mono">
              liveness_challenge:{" "}
              {biometricLivenessSnapshot.liveness_challenge}
            </p>
            <p className="hbce-mono">
              biometric_verification_consent:{" "}
              {String(
                biometricLivenessSnapshot.biometric_verification_consent
              )}
            </p>
          </section>
        ) : null}

        <section className="hbce-card">
          <p className="hbce-kicker">Certificate boundary</p>
          <h2>The certificate enables access evaluation, not automatic trust.</h2>
          <p>
            The HBCE operational certificate is the internal authorization file
            used by the JOKER-C2 gate. JOKER-C2 must still validate protocol,
            issuer, phase, status, scope, previous hash, payload hash, identity
            snapshot and liveness snapshot before granting access.
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
              hashes, the inherited minimized identity/liveness snapshot and the
              JOKER-C2 access boundary. Upload this file on the JOKER-C2 access
              gate.
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
