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
  JsonObject
} from "@/lib/types";

type ActiveJokerC2CertificateUpload = {
  certificate: HbceIprCertificate;
  fileName: string;
  payloadSha256: string;
  previousPayloadSha256: string | null;
  source: "session" | "upload";
};

type HbceJokerC2BiologicalIdentitySnapshot = {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  birth_place: string | null;
  nationality: string | null;
  country: string | null;
  email: string | null;
  phone_number: string | null;
  fiscal_or_tax_identifier_ref: string | null;
  document_ref: string | null;
  phone_verified: boolean;
  email_verified: boolean;
  document_verified: boolean;
  liveness_verified: boolean;
  compliance_review_status: string | null;
};

type HbceJokerC2IdentityHandoff = {
  handoff_version: "HBCE-JOKER-C2-IPR-HANDOFF-v1";
  handoff_id: string;
  issued_at: string;
  expires_at: string;
  issuer: {
    legal_name: string;
    hallmark: string | null;
    jurisdiction: string | null;
  };
  gateway: {
    source_app: "HBCE_IPR_ONBOARDING_APP";
    source_route: "/access/joker-c2";
    target_runtime: "AI_JOKER_C2";
    target_url: string;
    transport: "URL_FRAGMENT_BASE64URL_JSON";
    custody_mode: "JOKER_C2_CONTROLLED_CUSTODY";
  };
  access: {
    decision: "ACCESS_GRANTED";
    checked_at: string;
    reason: string;
  };
  certificate: {
    file_name: string;
    proto: string;
    kind: string;
    phase_code: string;
    phase_status: string;
    certificate_id: string | null;
    certificate_status: string | null;
    certificate_scope: string | null;
    ipr_id: string | null;
    subject_id: string | null;
    card_serial: string | null;
    issued_at: string | null;
    valid_until: string | null;
  };
  biological_identity: HbceJokerC2BiologicalIdentitySnapshot;
  compliance_custody: {
    custody_statement: string;
    full_data_custodian: "AI_JOKER_C2";
    custody_subject: string | null;
    custody_ipr_id: string | null;
    custody_certificate_id: string | null;
    custody_fields_present: Record<string, boolean>;
    raw_documents_in_fragment: false;
    raw_document_images_in_fragment: false;
    raw_video_liveness_in_fragment: false;
    fragment_policy: "MINIMIZED_HANDOFF_ONLY";
  };
  integrity: {
    payload_sha256: string;
    previous_payload_sha256: string | null;
    handoff_payload_canonicalization: "JSON_STRINGIFY_BASE64URL_CLIENT_MVP";
  };
  runtime_claims: {
    no_simple_email_access: true;
    no_simple_subscription_access: true;
    ipr_verified_required: true;
    joker_c2_identity_bound_session: true;
    governed_runtime_required: true;
  };
  boundary: {
    statement: string;
    production_upgrade: string;
  };
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

const JOKER_C2_HANDOFF_FRAGMENT_KEY = "hbce_ipr_handoff";

const HANDOFF_VALIDITY_MINUTES = 15;

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

function getBooleanField(fields: JsonObject | null, key: string): boolean {
  if (!fields) {
    return false;
  }

  return fields[key] === true;
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

function getPhaseDataBoolean(
  upload: ActiveJokerC2CertificateUpload | null,
  key: string
): boolean {
  if (!upload) {
    return false;
  }

  return upload.certificate.payload.phase_data[key] === true;
}

function getRecordString(
  value: unknown,
  key: string
): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const field = value[key];

  return typeof field === "string" && field.trim().length > 0
    ? field.trim()
    : null;
}

function getFirstAvailableString(
  upload: ActiveJokerC2CertificateUpload | null,
  privateFields: JsonObject | null,
  keys: readonly string[]
): string | null {
  for (const key of keys) {
    const privateField = getStringField(privateFields, key);

    if (privateField) {
      return privateField;
    }

    const phaseField = getPhaseDataString(upload, key);

    if (phaseField) {
      return phaseField;
    }
  }

  return null;
}

function getFirstAvailableBoolean(
  upload: ActiveJokerC2CertificateUpload | null,
  privateFields: JsonObject | null,
  keys: readonly string[]
): boolean {
  for (const key of keys) {
    if (getBooleanField(privateFields, key)) {
      return true;
    }

    if (getPhaseDataBoolean(upload, key)) {
      return true;
    }
  }

  return false;
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
  const explicitDisplayName = getFirstAvailableString(upload, privateFields, [
    "display_name",
    "full_name",
    "legal_name",
    "subject_name",
    "name"
  ]);

  if (explicitDisplayName) {
    return explicitDisplayName;
  }

  const firstName = getFirstAvailableString(upload, privateFields, [
    "first_name",
    "given_name"
  ]);

  const lastName = getFirstAvailableString(upload, privateFields, [
    "last_name",
    "family_name",
    "surname"
  ]);

  const composedName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return composedName.length > 0 ? composedName : null;
}

function buildBiologicalIdentitySnapshot(
  upload: ActiveJokerC2CertificateUpload | null,
  privateFields: JsonObject | null
): HbceJokerC2BiologicalIdentitySnapshot {
  return {
    display_name: buildBiologicalDisplayName(upload, privateFields),
    first_name: getFirstAvailableString(upload, privateFields, [
      "first_name",
      "given_name"
    ]),
    last_name: getFirstAvailableString(upload, privateFields, [
      "last_name",
      "family_name",
      "surname"
    ]),
    birth_date: getFirstAvailableString(upload, privateFields, [
      "birth_date",
      "date_of_birth",
      "dob"
    ]),
    birth_place: getFirstAvailableString(upload, privateFields, [
      "birth_place",
      "place_of_birth"
    ]),
    nationality: getFirstAvailableString(upload, privateFields, [
      "nationality",
      "citizenship"
    ]),
    country: getFirstAvailableString(upload, privateFields, [
      "country",
      "country_code",
      "residence_country"
    ]),
    email: getFirstAvailableString(upload, privateFields, [
      "email",
      "email_address"
    ]),
    phone_number: getFirstAvailableString(upload, privateFields, [
      "phone_number",
      "phone",
      "mobile_phone"
    ]),
    fiscal_or_tax_identifier_ref: getFirstAvailableString(upload, privateFields, [
      "fiscal_code_ref",
      "tax_identifier_ref",
      "national_tax_identifier_ref",
      "fiscal_code_hash",
      "tax_identifier_hash"
    ]),
    document_ref: getFirstAvailableString(upload, privateFields, [
      "document_ref",
      "document_hash",
      "identity_document_hash",
      "document_identifier_ref"
    ]),
    phone_verified: getFirstAvailableBoolean(upload, privateFields, [
      "phone_verified",
      "is_phone_verified"
    ]),
    email_verified: getFirstAvailableBoolean(upload, privateFields, [
      "email_verified",
      "is_email_verified"
    ]),
    document_verified: getFirstAvailableBoolean(upload, privateFields, [
      "document_verified",
      "identity_document_verified",
      "is_document_verified"
    ]),
    liveness_verified: getFirstAvailableBoolean(upload, privateFields, [
      "liveness_verified",
      "selfie_verified",
      "video_verified",
      "is_liveness_verified"
    ]),
    compliance_review_status: getFirstAvailableString(upload, privateFields, [
      "compliance_review_status",
      "kyc_status",
      "review_status"
    ])
  };
}

function buildCustodyFieldPresence(
  upload: ActiveJokerC2CertificateUpload | null,
  privateFields: JsonObject | null
): Record<string, boolean> {
  const hasValue = (keys: readonly string[]) =>
    getFirstAvailableString(upload, privateFields, keys) !== null ||
    getFirstAvailableBoolean(upload, privateFields, keys);

  return {
    identity_name: hasValue([
      "display_name",
      "full_name",
      "legal_name",
      "subject_name",
      "first_name",
      "last_name"
    ]),
    birth_data: hasValue(["birth_date", "date_of_birth", "birth_place"]),
    contact_data: hasValue(["email", "email_address", "phone_number", "phone"]),
    fiscal_or_tax_identifier_reference: hasValue([
      "fiscal_code_ref",
      "tax_identifier_ref",
      "national_tax_identifier_ref",
      "fiscal_code_hash",
      "tax_identifier_hash"
    ]),
    document_reference: hasValue([
      "document_ref",
      "document_hash",
      "identity_document_hash",
      "document_identifier_ref"
    ]),
    phone_verification: hasValue(["phone_verified", "is_phone_verified"]),
    email_verification: hasValue(["email_verified", "is_email_verified"]),
    document_verification: hasValue([
      "document_verified",
      "identity_document_verified",
      "is_document_verified"
    ]),
    liveness_verification: hasValue([
      "liveness_verified",
      "selfie_verified",
      "video_verified",
      "is_liveness_verified"
    ]),
    compliance_review: hasValue([
      "compliance_review_status",
      "kyc_status",
      "review_status"
    ])
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
  const issuerHallmark = getRecordString(upload.certificate.issuer, "hallmark");
  const issuerJurisdiction = getRecordString(
    upload.certificate.issuer,
    "jurisdiction"
  );
  const biologicalIdentity = buildBiologicalIdentitySnapshot(
    upload,
    privateFields
  );

  return {
    handoff_version: "HBCE-JOKER-C2-IPR-HANDOFF-v1",
    handoff_id: buildSafeHandoffId(),
    issued_at: handoffIssuedAt,
    expires_at: addMinutesToIso(handoffIssuedAt, HANDOFF_VALIDITY_MINUTES),
    issuer: {
      legal_name: upload.certificate.issuer.legal_name,
      hallmark: issuerHallmark,
      jurisdiction: issuerJurisdiction
    },
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
      certificate_status: certificateStatus,
      certificate_scope: certificateScope,
      ipr_id: iprId,
      subject_id: subjectId,
      card_serial: cardSerial,
      issued_at: issuedAt,
      valid_until: validUntil
    },
    biological_identity: biologicalIdentity,
    compliance_custody: {
      custody_statement:
        "AI JOKER-C2 is the controlled operational custodian for compliance data, bureaucratic procedure data, document references and identity-bound runtime continuity. This handoff transmits a minimized operational identity snapshot and custody references only.",
      full_data_custodian: "AI_JOKER_C2",
      custody_subject: biologicalIdentity.display_name,
      custody_ipr_id: iprId,
      custody_certificate_id: certificateId,
      custody_fields_present: buildCustodyFieldPresence(upload, privateFields),
      raw_documents_in_fragment: false,
      raw_document_images_in_fragment: false,
      raw_video_liveness_in_fragment: false,
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
  const issuedAt = getStringField(privateFields, "issued_at");
  const validUntil = getStringField(privateFields, "valid_until");

  const biologicalIdentity = useMemo(
    () => buildBiologicalIdentitySnapshot(acceptedUpload, privateFields),
    [acceptedUpload, privateFields]
  );

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

            <h2>IPR biological identity handoff prepared.</h2>

            <p>
              The access gate has prepared a minimized identity handoff for
              JOKER-C2. The runtime receives the IPR identity, certificate
              reference, custody context and hash continuity needed to start an
              identity-bound governed session.
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
              custody_mode:{" "}
              {jokerC2IdentityHandoff.gateway.custody_mode}
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

          <p>
            For the MVP test, this page sends a minimized IPR handoff to
            JOKER-C2 through a browser fragment. In production, the same logic
            must become a short-lived server-side signed token with revocation,
            expiry, encrypted custody storage and runtime-side verification.
          </p>
        </section>
      </main>
    </div>
  );
}
