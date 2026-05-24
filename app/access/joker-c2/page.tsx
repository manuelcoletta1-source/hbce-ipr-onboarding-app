"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import IprCertificateUploader from "@/components/IprCertificateUploader";

import { JOKER_C2_GATEWAY_URL, ROUTES } from "@/lib/constants";
import {
  nowIso,
  validateJokerC2OperationalCertificate
} from "@/lib/ipr-certificate-chain";

import type { AcceptedIprCertificateUpload } from "@/components/IprCertificateUploader";
import type {
  HbceIprCertificate,
  HbceIprNextPhaseCode,
  HbceJokerC2AccessGateResult,
  HbceJokerC2BiologicalIdentitySnapshot,
  HbceJokerC2BiometricLivenessSnapshot,
  HbceJokerC2CustodyFieldPresence,
  HbceJokerC2IdentityHandoff,
  HbcePhysicalDescriptorProfile,
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
  "The biological identity snapshot must be present.",
  "The biometric/photo/video liveness snapshot must be present.",
  "The biometric/liveness verification consent must be confirmed.",
  "Any malformed, incomplete, expired, revoked, suspended or wrong-scope certificate must be denied."
] as const;

const FINAL_CERTIFICATE_FILE_NAME =
  "hbce-ipr-09-operational-certificate.hbce.json";

const SESSION_CERTIFICATE_PREFIX = "HBCE_IPR_CERTIFICATE_FOR_NEXT_PHASE";

const JOKER_C2_HANDOFF_FRAGMENT_KEY = "hbce_ipr_handoff";

const HANDOFF_VALIDITY_MINUTES = 15;

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
  "MANUAL_OPERATOR_PROMPT",
  "MANUAL"
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

function buildDeniedResult(reason: string): HbceJokerC2AccessGateResult {
  return {
    decision: "ACCESS_DENIED",
    reason,
    checked_at: nowIso()
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonObject(value: unknown): value is JsonObject {
  return isRecord(value);
}

function isHbceIprCertificateLike(
  value: unknown
): value is HbceIprCertificate {
  if (!isRecord(value)) {
    return false;
  }

  if (value.proto !== "HBCE-IPR-RELEASE-v3") {
    return false;
  }

  if (
    value.kind !== "IPR_PHASE_CERTIFICATE" &&
    value.kind !== "IPR_OPERATIONAL_CERTIFICATE"
  ) {
    return false;
  }

  if (!isRecord(value.issuer)) {
    return false;
  }

  if (!isRecord(value.phase)) {
    return false;
  }

  if (!isRecord(value.subject)) {
    return false;
  }

  if (!isRecord(value.hash_integrity)) {
    return false;
  }

  if (typeof value.hash_integrity.payload_sha256 !== "string") {
    return false;
  }

  if (
    value.hash_integrity.previous_payload_sha256 !== null &&
    typeof value.hash_integrity.previous_payload_sha256 !== "string"
  ) {
    return false;
  }

  if (!isRecord(value.payload)) {
    return false;
  }

  if (!isJsonObject(value.payload.phase_data)) {
    return false;
  }

  if (!isRecord(value.next)) {
    return false;
  }

  return typeof value.next.next_phase === "string";
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

function getCertificateFields(
  upload: ActiveJokerC2CertificateUpload | null
): JsonObject | null {
  if (!upload) {
    return null;
  }

  const phaseData = upload.certificate.payload.phase_data;

  return getJsonObjectField(phaseData, "certificate_fields");
}

function getPhaseData(
  upload: ActiveJokerC2CertificateUpload | null
): JsonObject | null {
  return upload?.certificate.payload.phase_data ?? null;
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

function getRecordString(value: unknown, key: string): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const field = value[key];

  return typeof field === "string" && field.trim().length > 0
    ? field.trim()
    : null;
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

function getIdentitySources(
  upload: ActiveJokerC2CertificateUpload | null,
  privateFields: JsonObject | null
): JsonObject[] {
  const phaseData = getPhaseData(upload);
  const certificateFields = getCertificateFields(upload);

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

function getPhaseDataString(
  upload: ActiveJokerC2CertificateUpload | null,
  key: string
): string | null {
  const phaseData = getPhaseData(upload);

  return getStringField(phaseData, key);
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

function addMinutesToIso(baseIso: string, minutes: number): string {
  const baseDate = new Date(baseIso);
  const safeDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;

  return new Date(safeDate.getTime() + minutes * 60 * 1000).toISOString();
}

function buildSafeHandoffId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `HBCE-JOKER-C2-HANDOFF-${crypto.randomUUID()}`;
  }

  return `HBCE-JOKER-C2-HANDOFF-${Date.now().toString(36)}`;
}

function encodeBase64UrlJson(value: unknown): string {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildJokerC2GatewayUrlWithHandoff(
  handoff: HbceJokerC2IdentityHandoff
): string {
  const encodedHandoff = encodeBase64UrlJson(handoff);
  const gatewayWithoutFragment = JOKER_C2_GATEWAY_URL.split("#")[0];

  return `${gatewayWithoutFragment}#${JOKER_C2_HANDOFF_FRAGMENT_KEY}=${encodedHandoff}`;
}

function buildBiologicalDisplayName(
  upload: ActiveJokerC2CertificateUpload | null,
  privateFields: JsonObject | null
): string | null {
  const sources = getIdentitySources(upload, privateFields);

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

function buildPhysicalDescriptorProfile(
  upload: ActiveJokerC2CertificateUpload | null,
  privateFields: JsonObject | null
): HbcePhysicalDescriptorProfile | null {
  const identitySources = getIdentitySources(upload, privateFields);
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

function buildBiometricLivenessSnapshot(
  upload: ActiveJokerC2CertificateUpload | null,
  privateFields: JsonObject | null
): HbceJokerC2BiometricLivenessSnapshot | null {
  const identitySources = getIdentitySources(upload, privateFields);
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
      ) ?? "MANUAL",
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

function buildBiologicalIdentitySnapshot(
  upload: ActiveJokerC2CertificateUpload | null,
  privateFields: JsonObject | null
): HbceJokerC2BiologicalIdentitySnapshot {
  const sources = getIdentitySources(upload, privateFields);
  const biometricLivenessSnapshot = buildBiometricLivenessSnapshot(
    upload,
    privateFields
  );
  const physicalDescriptorProfile = buildPhysicalDescriptorProfile(
    upload,
    privateFields
  );

  return {
    display_name: buildBiologicalDisplayName(upload, privateFields),
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
      "fiscal_code_hash",
      "tax_identifier_hash",
      "tax_id_value_hash"
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
}

function buildCustodyFieldPresence(
  biologicalIdentity: HbceJokerC2BiologicalIdentitySnapshot
): HbceJokerC2CustodyFieldPresence {
  const biometricSnapshot =
    biologicalIdentity.biometric_liveness_snapshot ?? null;
  const physicalProfile = biologicalIdentity.physical_descriptor_profile ?? null;

  return {
    identity_name: Boolean(
      biologicalIdentity.display_name ||
        biologicalIdentity.first_name ||
        biologicalIdentity.last_name
    ),
    birth_data: Boolean(
      biologicalIdentity.birth_date || biologicalIdentity.birth_place
    ),
    contact_data: Boolean(
      biologicalIdentity.email || biologicalIdentity.phone_number
    ),
    fiscal_or_tax_identifier_reference: Boolean(
      biologicalIdentity.fiscal_or_tax_identifier_ref
    ),
    document_reference: Boolean(biologicalIdentity.document_ref),
    phone_verification: Boolean(biologicalIdentity.phone_verified),
    email_verification: Boolean(biologicalIdentity.email_verified),
    document_verification: Boolean(biologicalIdentity.document_verified),
    liveness_verification: Boolean(
      biologicalIdentity.liveness_verified ||
        biometricSnapshot?.liveness_verified
    ),
    compliance_review: Boolean(biologicalIdentity.compliance_review_status),
    physical_descriptors: hasPhysicalDescriptorProfileContent(physicalProfile),
    biometric_liveness_media:
      hasBiometricLivenessSnapshotContent(biometricSnapshot),
    face_match_verification: Boolean(
      biometricSnapshot?.face_match_status === "MATCHED" ||
        biometricSnapshot?.face_match_status === "MANUAL_REVIEW"
    ),
    document_face_comparison: Boolean(
      biometricSnapshot?.document_face_reference ||
        biometricSnapshot?.document_face_sha256
    )
  };
}

function buildJokerC2IdentityHandoff(
  upload: ActiveJokerC2CertificateUpload,
  accessResult: HbceJokerC2AccessGateResult,
  privateFields: JsonObject | null
): HbceJokerC2IdentityHandoff {
  const handoffIssuedAt = nowIso();
  const certificateStatus = getDisplayedCertificateStatus(upload, privateFields);
  const certificateScope = getDisplayedCertificateScope(upload, privateFields);
  const certificateId = getStringField(privateFields, "certificate_id");
  const iprId = getStringField(privateFields, "ipr_id");
  const subjectId =
    getStringField(privateFields, "subject_id") ??
    getRecordString(upload.certificate.subject, "subject_id") ??
    getRecordString(upload.certificate.subject, "id");
  const cardSerial = getStringField(privateFields, "card_serial");
  const issuedAt = getStringField(privateFields, "issued_at");
  const validUntil = getStringField(privateFields, "valid_until");
  const biologicalIdentity = buildBiologicalIdentitySnapshot(
    upload,
    privateFields
  );

  return {
    handoff_version: "HBCE-JOKER-C2-IPR-HANDOFF-v1",
    handoff_id: buildSafeHandoffId(),
    issued_at: handoffIssuedAt,
    expires_at: addMinutesToIso(handoffIssuedAt, HANDOFF_VALIDITY_MINUTES),
    issuer: upload.certificate.issuer,
    gateway: {
      source_app: "HBCE_IPR_ONBOARDING_APP",
      source_route: "/access/joker-c2",
      target_runtime: "AI_JOKER_C2",
      target_url: JOKER_C2_GATEWAY_URL,
      transport: "URL_FRAGMENT_BASE64URL_JSON",
      custody_mode: "JOKER_C2_CONTROLLED_CUSTODY"
    },
    access: {
      decision: "ACCESS_GRANTED",
      checked_at: accessResult.checked_at,
      reason: accessResult.reason
    },
    certificate: {
      file_name: upload.fileName,
      proto: upload.certificate.proto,
      kind: upload.certificate.kind,
      phase_code: upload.certificate.phase.code,
      phase_status: upload.certificate.phase.status,
      certificate_id: certificateId,
      certificate_status:
        certificateStatus === "ACTIVE" ||
        certificateStatus === "EXPIRED" ||
        certificateStatus === "REVOKED" ||
        certificateStatus === "SUSPENDED"
          ? certificateStatus
          : null,
      certificate_scope:
        certificateScope === "JOKER_C2_ACCESS" ? certificateScope : null,
      ipr_id: iprId,
      subject_id: subjectId,
      card_serial: cardSerial,
      issued_at: issuedAt,
      valid_until: validUntil
    },
    biological_identity: biologicalIdentity,
    compliance_custody: {
      custody_statement:
        "AI JOKER-C2 is the controlled operational custodian for compliance data, bureaucratic procedure data, document references, face/photo/video liveness references and identity-bound runtime continuity. This handoff transmits a minimized operational identity snapshot, hashes, states and custody references only.",
      full_data_custodian: "AI_JOKER_C2",
      custody_subject: biologicalIdentity.display_name,
      custody_ipr_id: iprId,
      custody_certificate_id: certificateId,
      custody_fields_present: buildCustodyFieldPresence(biologicalIdentity),
      raw_documents_in_fragment: false,
      raw_document_images_in_fragment: false,
      raw_video_liveness_in_fragment: false,
      raw_biometric_templates_in_fragment: false,
      raw_face_templates_in_fragment: false,
      fragment_policy: "MINIMIZED_HANDOFF_ONLY"
    },
    integrity: {
      payload_sha256: upload.payloadSha256,
      previous_payload_sha256: upload.previousPayloadSha256,
      handoff_payload_canonicalization: "JSON_STRINGIFY_BASE64URL_CLIENT_MVP"
    },
    runtime_claims: {
      no_simple_email_access: true,
      no_simple_subscription_access: true,
      ipr_verified_required: true,
      joker_c2_identity_bound_session: true,
      governed_runtime_required: true
    },
    boundary: {
      statement:
        "This client-side handoff enables the MVP identity-bound JOKER-C2 test. It does not replace future server-side token issuance, revocation checks, encrypted custody storage or regulated trust-service integrations.",
      production_upgrade:
        "Replace URL fragment handoff with a server-issued, signed, short-lived, one-time access token bound to the operational certificate and validated by JOKER-C2 before runtime initialization."
    }
  };
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
    } catch (validationError) {
      setAccessResult(
        buildDeniedResult(
          validationError instanceof Error
            ? validationError.message
            : "The HBCE operational certificate could not be validated."
        )
      );
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

      if (!isHbceIprCertificateLike(stored)) {
        clearStoredCertificateForPhase("JOKER_C2_ACCESS");

        if (!cancelled) {
          setAcceptedUpload(null);
          setAccessResult(
            buildDeniedResult(
              "The stored operational certificate is malformed and was rejected fail-closed."
            )
          );
        }

        return;
      }

      const sessionUpload = buildActiveUploadFromSession(stored);

      try {
        const result = await validateJokerC2OperationalCertificate(
          sessionUpload.certificate
        );

        if (cancelled) {
          return;
        }

        if (result.decision !== "ACCESS_GRANTED") {
          clearStoredCertificateForPhase("JOKER_C2_ACCESS");
        }

        setAcceptedUpload(sessionUpload);
        setAccessResult(result);
      } catch (validationError) {
        if (cancelled) {
          return;
        }

        clearStoredCertificateForPhase("JOKER_C2_ACCESS");
        setAcceptedUpload(sessionUpload);
        setAccessResult(
          buildDeniedResult(
            validationError instanceof Error
              ? validationError.message
              : "The stored operational certificate failed JOKER-C2 gate validation."
          )
        );
      }
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
  const subjectId =
    getStringField(privateFields, "subject_id") ??
    getRecordString(acceptedUpload?.certificate.subject, "subject_id") ??
    getRecordString(acceptedUpload?.certificate.subject, "id");
  const cardSerial = getStringField(privateFields, "card_serial");
  const validUntil = getStringField(privateFields, "valid_until");

  const biologicalIdentity = useMemo(
    () => buildBiologicalIdentitySnapshot(acceptedUpload, privateFields),
    [acceptedUpload, privateFields]
  );

  const physicalDescriptorProfile =
    biologicalIdentity.physical_descriptor_profile ?? null;

  const biometricLivenessSnapshot =
    biologicalIdentity.biometric_liveness_snapshot ?? null;

  const jokerC2IdentityHandoff = useMemo(() => {
    if (!acceptedUpload || !accessResult || !isAccessGranted) {
      return null;
    }

    return buildJokerC2IdentityHandoff(
      acceptedUpload,
      accessResult,
      privateFields
    );
  }, [acceptedUpload, accessResult, isAccessGranted, privateFields]);

  const jokerC2GatewayUrl = jokerC2IdentityHandoff
    ? buildJokerC2GatewayUrlWithHandoff(jokerC2IdentityHandoff)
    : JOKER_C2_GATEWAY_URL;

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
            <Link className="hbce-btn" href={ROUTES.certificate}>
              Back to Certificate
            </Link>

            <Link className="hbce-btn" href={ROUTES.onboarding}>
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
              biological_subject:{" "}
              {biologicalIdentity.display_name ?? "unavailable"}
            </p>
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
            <p className="hbce-mono">
              face_match_status:{" "}
              {biometricLivenessSnapshot?.face_match_status ?? "unavailable"}
            </p>
            <p className="hbce-mono">
              liveness_verified:{" "}
              {String(Boolean(biometricLivenessSnapshot?.liveness_verified))}
            </p>
            <p className="hbce-mono">
              biometric_verification_consent:{" "}
              {String(
                Boolean(
                  biometricLivenessSnapshot?.biometric_verification_consent
                )
              )}
            </p>

            <div className="hbce-actions">
              <a
                className="hbce-btn hbce-btn--primary"
                href={jokerC2GatewayUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                Open JOKER-C2 Runtime with IPR Handoff
              </a>

              <Link className="hbce-btn" href={ROUTES.onboarding}>
                Start another IPR onboarding
              </Link>
            </div>
          </section>
        ) : null}

        {jokerC2IdentityHandoff ? (
          <section className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">JOKER-C2 identity handoff</p>

            <h2>IPR biological and liveness handoff prepared.</h2>

            <p>
              The access gate has prepared a minimized identity handoff for
              JOKER-C2. The runtime receives the IPR identity, certificate
              reference, physical descriptors, liveness state, custody context
              and hash continuity needed to start an identity-bound governed
              session.
            </p>

            <p className="hbce-mono">
              handoff_version: {jokerC2IdentityHandoff.handoff_version}
            </p>
            <p className="hbce-mono">
              handoff_id: {jokerC2IdentityHandoff.handoff_id}
            </p>
            <p className="hbce-mono">
              handoff_expires_at: {jokerC2IdentityHandoff.expires_at}
            </p>
            <p className="hbce-mono">
              custody_mode: {jokerC2IdentityHandoff.gateway.custody_mode}
            </p>
            <p className="hbce-mono">
              fragment_policy:{" "}
              {jokerC2IdentityHandoff.compliance_custody.fragment_policy}
            </p>
            <p className="hbce-mono">
              raw_documents_in_fragment:{" "}
              {String(
                jokerC2IdentityHandoff.compliance_custody
                  .raw_documents_in_fragment
              )}
            </p>
            <p className="hbce-mono">
              raw_document_images_in_fragment:{" "}
              {String(
                jokerC2IdentityHandoff.compliance_custody
                  .raw_document_images_in_fragment
              )}
            </p>
            <p className="hbce-mono">
              raw_video_liveness_in_fragment:{" "}
              {String(
                jokerC2IdentityHandoff.compliance_custody
                  .raw_video_liveness_in_fragment
              )}
            </p>
            <p className="hbce-mono">
              raw_biometric_templates_in_fragment:{" "}
              {String(
                jokerC2IdentityHandoff.compliance_custody
                  .raw_biometric_templates_in_fragment
              )}
            </p>
            <p className="hbce-mono">
              raw_face_templates_in_fragment:{" "}
              {String(
                jokerC2IdentityHandoff.compliance_custody
                  .raw_face_templates_in_fragment
              )}
            </p>
          </section>
        ) : null}

        <section className="hbce-card">
          <p className="hbce-kicker">Access requirements</p>
          <h2>JOKER-C2 remains closed unless every condition is valid.</h2>

          <p>
            This gate is fail-closed. A malformed certificate, wrong phase,
            wrong issuer, missing hash, invalid scope, inactive status, missing
            identity snapshot, missing liveness snapshot or broken canonical
            payload blocks access.
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

            {biologicalIdentity.display_name ? (
              <p className="hbce-mono">
                biological_subject: {biologicalIdentity.display_name}
              </p>
            ) : null}

            {biologicalIdentity.first_name ? (
              <p className="hbce-mono">
                first_name: {biologicalIdentity.first_name}
              </p>
            ) : null}

            {biologicalIdentity.last_name ? (
              <p className="hbce-mono">
                last_name: {biologicalIdentity.last_name}
              </p>
            ) : null}

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

            {validUntil ? (
              <p className="hbce-mono">valid_until: {validUntil}</p>
            ) : null}
          </section>
        ) : null}

        {physicalDescriptorProfile ? (
          <section className="hbce-card">
            <p className="hbce-kicker">Physical descriptor profile</p>
            <h2>Declared biological descriptor layer.</h2>

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
              hair_type: {physicalDescriptorProfile.hair_type ?? "unavailable"}
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
          <section className="hbce-card">
            <p className="hbce-kicker">Photo / video liveness snapshot</p>
            <h2>Minimized liveness and face-comparison references.</h2>

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
              document_face_sha256:{" "}
              {biometricLivenessSnapshot.document_face_sha256 ?? "unavailable"}
            </p>
            <p className="hbce-mono">
              selfie_sha256:{" "}
              {biometricLivenessSnapshot.selfie_sha256 ?? "unavailable"}
            </p>
            <p className="hbce-mono">
              video_sha256:{" "}
              {biometricLivenessSnapshot.video_sha256 ?? "unavailable"}
            </p>
            <p className="hbce-mono">
              face_match_status: {biometricLivenessSnapshot.face_match_status}
            </p>
            <p className="hbce-mono">
              liveness_challenge:{" "}
              {biometricLivenessSnapshot.liveness_challenge}
            </p>
            <p className="hbce-mono">
              liveness_verified:{" "}
              {String(biometricLivenessSnapshot.liveness_verified)}
            </p>
            <p className="hbce-mono">
              biometric_verification_consent:{" "}
              {String(
                biometricLivenessSnapshot.biometric_verification_consent
              )}
            </p>
            <p className="hbce-mono">
              raw_photo_in_certificate:{" "}
              {String(biometricLivenessSnapshot.raw_photo_in_certificate)}
            </p>
            <p className="hbce-mono">
              raw_video_in_certificate:{" "}
              {String(biometricLivenessSnapshot.raw_video_in_certificate)}
            </p>
            <p className="hbce-mono">
              biometric_template_generated:{" "}
              {String(
                biometricLivenessSnapshot.biometric_template_generated
              )}
            </p>
            <p className="hbce-mono">
              face_template_generated:{" "}
              {String(biometricLivenessSnapshot.face_template_generated)}
            </p>
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

          <p>
            For the MVP test, this page sends a minimized IPR handoff to
            JOKER-C2 through a browser fragment. In production, the same logic
            must become a short-lived server-side signed token with revocation,
            expiry, encrypted custody storage and runtime-side verification.
          </p>

          <p>
            Raw photos, raw videos, document images, face templates and biometric
            templates are not transmitted through the browser fragment. JOKER-C2
            receives references, hashes, verification states and custody
            declarations only.
          </p>
        </section>
      </main>
    </div>
  );
}
