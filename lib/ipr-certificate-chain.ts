import type {
  HbceCertificateGenerationInput,
  HbceCertificateValidationResult,
  HbceFailClosedReason,
  HbceGeneratedCertificate,
  HbceIprCertificate,
  HbceIprCertificateFileName,
  HbceIprCertificateKind,
  HbceIprCertificatePhaseCode,
  HbceIprNextPhaseCode,
  HbceIprOperationalCertificate,
  HbceIprPhaseCertificate,
  HbceIprPolicy,
  HbceIssuer,
  HbceJokerC2AccessGateResult,
  HbceJokerC2BiologicalIdentitySnapshot,
  HbceJokerC2BiometricLivenessSnapshot,
  HbceJokerC2ComplianceCustody,
  HbceJokerC2CustodyFieldPresence,
  HbceJokerC2OperationalCertificatePrivateFields,
  HbcePhysicalDescriptorProfile,
  HashReference,
  IsoDateTime,
  JsonObject,
  JsonValue
} from "./types";

export const HBCE_ISSUER: HbceIssuer = {
  hallmark: "HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA",
  legal_name: "HERMETICUM B.C.E. S.r.l.",
  jurisdiction: "EU"
};

export const HBCE_IPR_POLICY: HbceIprPolicy = {
  UE_FIRST: true,
  AUDIT_FIRST: true,
  FAIL_CLOSED: true,
  HASH_ONLY: true,
  GDPR_MIN: true,
  APPEND_ONLY: true,
  NO_PUBLIC_IDENTITY_CUSTODY: true
};

const HBCE_TIMEZONE = "Europe/Rome" as const;

export type HbcePreviousCertificateValidationInput = {
  certificate: unknown;
  expected_previous_phase: HbceIprCertificatePhaseCode | null;
  expected_next_phase: HbceIprNextPhaseCode;
  checked_at?: IsoDateTime;
};

export type HbceCertificateParseResult = {
  certificate: HbceIprCertificate | null;
  validation: HbceCertificateValidationResult;
};

export function nowIso(): IsoDateTime {
  return new Date().toISOString();
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function canonicalize(value: unknown): JsonValue {
  if (value === null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      if (
        item === undefined ||
        typeof item === "function" ||
        typeof item === "symbol"
      ) {
        return null;
      }

      return canonicalize(item);
    });
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (isPlainRecord(value)) {
    const output: JsonObject = {};

    for (const key of Object.keys(value).sort()) {
      const item = value[key];

      if (
        item === undefined ||
        typeof item === "function" ||
        typeof item === "symbol"
      ) {
        continue;
      }

      output[key] = canonicalize(item);
    }

    return output;
  }

  return null;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function copyUint8ArrayToArrayBuffer(input: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(input.byteLength);
  copy.set(input);

  return copy.buffer as ArrayBuffer;
}

function assertValidDate(value: IsoDateTime): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid ISO timestamp supplied to HBCE IPR certificate.");
  }

  return date;
}

function getTimeZoneParts(date: Date): Record<string, string> {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: HBCE_TIMEZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  const parts: Record<string, string> = {};

  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") {
      parts[part.type] = part.value;
    }
  }

  return parts;
}

function getEuropeRomeOffsetMinutes(date: Date): number {
  const parts = getTimeZoneParts(date);

  const localAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );

  return Math.round((localAsUtc - date.getTime()) / 60000);
}

function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (absolute % 60).toString().padStart(2, "0");

  return `${sign}${hours}:${minutes}`;
}

export function toEuropeRomeIso(value: IsoDateTime): IsoDateTime {
  const date = assertValidDate(value);
  const parts = getTimeZoneParts(date);
  const milliseconds = date.getUTCMilliseconds().toString().padStart(3, "0");
  const offset = formatOffset(getEuropeRomeOffsetMinutes(date));

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${milliseconds}${offset}`;
}

export function buildHbceTimestamp(value: IsoDateTime): JsonObject {
  return {
    utc: value,
    local: toEuropeRomeIso(value),
    timezone: HBCE_TIMEZONE
  };
}

export async function sha256Hex(
  input: string | ArrayBuffer | Uint8Array | Blob
): Promise<HashReference> {
  const subtle = globalThis.crypto?.subtle;

  if (!subtle) {
    throw new Error("SHA-256 is not available in this runtime.");
  }

  let data: ArrayBuffer;

  if (typeof input === "string") {
    data = copyUint8ArrayToArrayBuffer(new TextEncoder().encode(input));
  } else if (input instanceof Uint8Array) {
    data = copyUint8ArrayToArrayBuffer(input);
  } else if (input instanceof Blob) {
    data = await input.arrayBuffer();
  } else {
    data = input;
  }

  const digest = await subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(digest));

  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Canonical(value: unknown): Promise<HashReference> {
  return sha256Hex(stableStringify(value));
}

export async function sha256File(file: Blob): Promise<HashReference> {
  return sha256Hex(file);
}

export async function createHashOnlySubjectRef(
  input: JsonObject
): Promise<HashReference> {
  return sha256Canonical({
    kind: "HBCE_HASH_ONLY_SUBJECT_REF",
    input
  });
}

export async function createPayloadSha256(
  previousPayloadSha256: HashReference | null,
  payload: JsonObject
): Promise<HashReference> {
  return sha256Canonical({
    previous_payload_sha256: previousPayloadSha256,
    payload
  });
}

export function getCertificateFileName(
  phaseCode: HbceIprCertificatePhaseCode
): HbceIprCertificateFileName {
  switch (phaseCode) {
    case "SUBJECT_CREATED":
      return "hbce-ipr-01-subject-created.hbce.json";
    case "FISCAL_IDENTITY_COLLECTED":
      return "hbce-ipr-02-fiscal-identity.hbce.json";
    case "OFFICIAL_DOCUMENT_SUBMITTED":
      return "hbce-ipr-03-official-document.hbce.json";
    case "LIVENESS_SUBMITTED":
      return "hbce-ipr-04-liveness-submitted.hbce.json";
    case "COMPLIANCE_ACCEPTED":
      return "hbce-ipr-05-privacy-compliance.hbce.json";
    case "PENDING_REVIEW":
      return "hbce-ipr-06-review-pending.hbce.json";
    case "IPR_APPROVED":
      return "hbce-ipr-07-ipr-approved.hbce.json";
    case "IPR_CARD_ISSUED":
      return "hbce-ipr-08-ipr-card.hbce.json";
    case "IPR_VERIFIED":
      return "hbce-ipr-09-operational-certificate.hbce.json";
  }
}

export function getCertificateKind(
  phaseCode: HbceIprCertificatePhaseCode
): HbceIprCertificateKind {
  if (phaseCode === "IPR_VERIFIED") {
    return "IPR_OPERATIONAL_CERTIFICATE";
  }

  return "IPR_PHASE_CERTIFICATE";
}

function buildInitialVerificationState(): JsonObject {
  return {
    email_verified: false,
    phone_verified: false,
    fiscal_identity_verified: false,
    official_document_uploaded: false,
    official_document_verified: false,
    liveness_verified: false,
    privacy_compliance_accepted: false,
    hbce_review_status: "NOT_STARTED",
    ipr_approved: false,
    ipr_card_issued: false,
    operational_certificate_issued: false,
    joker_c2_access: "DENIED"
  };
}

function getVerificationStateForSubjectCreated(
  phaseData: JsonObject
): JsonObject {
  if (isPlainRecord(phaseData.verification_state)) {
    return canonicalize(phaseData.verification_state) as JsonObject;
  }

  return buildInitialVerificationState();
}

function toJsonObject(value: unknown): JsonObject | null {
  const canonicalValue = canonicalize(value);

  return isPlainRecord(canonicalValue) ? canonicalValue : null;
}

function getNestedJsonObject(
  source: JsonObject | null,
  key: string
): JsonObject | null {
  if (!source) {
    return null;
  }

  return toJsonObject(source[key]);
}

function getStringFromObject(
  source: JsonObject | null,
  keys: readonly string[]
): string | null {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function getNumberFromObject(
  source: JsonObject | null,
  keys: readonly string[]
): number | null {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value.trim());

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function getBooleanFromObject(
  source: JsonObject | null,
  keys: readonly string[]
): boolean {
  if (!source) {
    return false;
  }

  for (const key of keys) {
    if (source[key] === true) {
      return true;
    }
  }

  return false;
}

function getRequiredStringFromObject(
  source: JsonObject,
  key: string
): string {
  const value = source[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `HBCE IPR certificate generation failed: missing required field "${key}".`
    );
  }

  return value.trim();
}

function getAllowedString<TAllowed extends string>(
  source: JsonObject | null,
  keys: readonly string[],
  allowedValues: readonly TAllowed[],
  fallback: TAllowed
): TAllowed {
  const value = getStringFromObject(source, keys);

  if (value && allowedValues.includes(value as TAllowed)) {
    return value as TAllowed;
  }

  return fallback;
}

function buildDisplayNameFromSource(source: JsonObject | null): string | null {
  const explicitName = getStringFromObject(source, [
    "display_name",
    "full_name",
    "legal_name",
    "subject_name",
    "name"
  ]);

  if (explicitName) {
    return explicitName;
  }

  const firstName = getStringFromObject(source, ["first_name", "given_name"]);
  const lastName = getStringFromObject(source, [
    "last_name",
    "family_name",
    "surname"
  ]);

  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return displayName.length > 0 ? displayName : null;
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

function buildPhysicalDescriptorProfileFromSource(
  source: JsonObject | null
): HbcePhysicalDescriptorProfile | null {
  if (!source) {
    return null;
  }

  const profileSource =
    getNestedJsonObject(source, "physical_descriptor_profile") ?? source;

  const profile: HbcePhysicalDescriptorProfile = {
    height_cm: getNumberFromObject(profileSource, ["height_cm"]),
    weight_kg: getNumberFromObject(profileSource, ["weight_kg"]),
    body_build: getStringFromObject(profileSource, ["body_build"]),
    eye_color: getStringFromObject(profileSource, ["eye_color"]),
    hair_color: getStringFromObject(profileSource, ["hair_color"]),
    hair_type: getStringFromObject(profileSource, ["hair_type"]),
    visible_scars: getStringFromObject(profileSource, ["visible_scars"]),
    tattoos: getStringFromObject(profileSource, ["tattoos"]),
    piercings: getStringFromObject(profileSource, ["piercings"]),
    distinctive_marks: getStringFromObject(profileSource, [
      "distinctive_marks"
    ]),
    descriptor_accuracy_declaration: getBooleanFromObject(profileSource, [
      "descriptor_accuracy_declaration"
    ])
  };

  return hasPhysicalDescriptorProfileContent(profile) ? profile : null;
}

function mergePhysicalDescriptorProfiles(
  primary: HbcePhysicalDescriptorProfile | null,
  fallback: HbcePhysicalDescriptorProfile | null
): HbcePhysicalDescriptorProfile | null {
  if (
    !hasPhysicalDescriptorProfileContent(primary) &&
    !hasPhysicalDescriptorProfileContent(fallback)
  ) {
    return null;
  }

  return {
    height_cm: primary?.height_cm ?? fallback?.height_cm ?? null,
    weight_kg: primary?.weight_kg ?? fallback?.weight_kg ?? null,
    body_build: primary?.body_build ?? fallback?.body_build ?? null,
    eye_color: primary?.eye_color ?? fallback?.eye_color ?? null,
    hair_color: primary?.hair_color ?? fallback?.hair_color ?? null,
    hair_type: primary?.hair_type ?? fallback?.hair_type ?? null,
    visible_scars: primary?.visible_scars ?? fallback?.visible_scars ?? null,
    tattoos: primary?.tattoos ?? fallback?.tattoos ?? null,
    piercings: primary?.piercings ?? fallback?.piercings ?? null,
    distinctive_marks:
      primary?.distinctive_marks ?? fallback?.distinctive_marks ?? null,
    descriptor_accuracy_declaration: Boolean(
      primary?.descriptor_accuracy_declaration ||
        fallback?.descriptor_accuracy_declaration
    )
  };
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

function buildBiometricLivenessSnapshotFromSource(
  source: JsonObject | null
): HbceJokerC2BiometricLivenessSnapshot | null {
  if (!source) {
    return null;
  }

  const livenessSource =
    getNestedJsonObject(source, "biometric_liveness_snapshot") ?? source;

  const snapshot: HbceJokerC2BiometricLivenessSnapshot = {
    document_face_reference: getStringFromObject(livenessSource, [
      "document_face_reference"
    ]),
    selfie_reference: getStringFromObject(livenessSource, [
      "selfie_reference",
      "photo_reference"
    ]),
    liveness_video_reference: getStringFromObject(livenessSource, [
      "liveness_video_reference",
      "video_reference"
    ]),
    document_face_sha256: getStringFromObject(livenessSource, [
      "document_face_sha256"
    ]),
    selfie_sha256: getStringFromObject(livenessSource, [
      "selfie_sha256",
      "photo_hash"
    ]),
    video_sha256: getStringFromObject(livenessSource, [
      "video_sha256",
      "video_hash"
    ]),
    liveness_declaration_sha256: getStringFromObject(livenessSource, [
      "liveness_declaration_sha256"
    ]),
    face_match_status: getAllowedString(
      livenessSource,
      ["face_match_status"],
      ["NOT_STARTED", "PENDING", "MATCHED", "FAILED", "MANUAL_REVIEW"],
      "NOT_STARTED"
    ),
    face_match_method: getStringFromObject(livenessSource, [
      "face_match_method"
    ]),
    liveness_challenge: getAllowedString(
      livenessSource,
      ["liveness_challenge"],
      [
        "HEAD_TURN_LEFT_RIGHT",
        "HEAD_TURN_RIGHT_LEFT",
        "RANDOM_PROMPT",
        "MANUAL_OPERATOR_PROMPT",
        "MANUAL"
      ],
      "MANUAL"
    ),
    liveness_verified: getBooleanFromObject(livenessSource, [
      "liveness_verified"
    ]),
    liveness_timestamp: getStringFromObject(livenessSource, [
      "liveness_timestamp"
    ]),
    photo_verification_status: getAllowedString(
      livenessSource,
      ["photo_verification_status"],
      ["submitted", "manual_review", "approved", "rejected"],
      "manual_review"
    ),
    video_verification_status: getAllowedString(
      livenessSource,
      ["video_verification_status"],
      ["submitted", "manual_review", "approved", "rejected"],
      "manual_review"
    ),
    liveness_status: getAllowedString(
      livenessSource,
      ["liveness_status"],
      ["submitted", "manual_review", "approved", "rejected"],
      "manual_review"
    ),
    biometric_verification_consent: getBooleanFromObject(livenessSource, [
      "biometric_verification_consent"
    ]),
    manual_review_required:
      getBooleanFromObject(livenessSource, ["manual_review_required"]) ||
      getAllowedString(
        livenessSource,
        ["face_match_status"],
        ["NOT_STARTED", "PENDING", "MATCHED", "FAILED", "MANUAL_REVIEW"],
        "NOT_STARTED"
      ) !== "MATCHED",
    raw_photo_in_certificate: false,
    raw_video_in_certificate: false,
    raw_media_in_public_registry: false,
    biometric_template_generated: false,
    face_template_generated: false,
    custody_mode: "JOKER_C2_CONTROLLED_CUSTODY"
  };

  return hasBiometricLivenessSnapshotContent(snapshot) ? snapshot : null;
}

function mergeBiometricLivenessSnapshots(
  primary: HbceJokerC2BiometricLivenessSnapshot | null,
  fallback: HbceJokerC2BiometricLivenessSnapshot | null
): HbceJokerC2BiometricLivenessSnapshot | null {
  if (
    !hasBiometricLivenessSnapshotContent(primary) &&
    !hasBiometricLivenessSnapshotContent(fallback)
  ) {
    return null;
  }

  return {
    document_face_reference:
      primary?.document_face_reference ??
      fallback?.document_face_reference ??
      null,
    selfie_reference:
      primary?.selfie_reference ?? fallback?.selfie_reference ?? null,
    liveness_video_reference:
      primary?.liveness_video_reference ??
      fallback?.liveness_video_reference ??
      null,
    document_face_sha256:
      primary?.document_face_sha256 ??
      fallback?.document_face_sha256 ??
      null,
    selfie_sha256: primary?.selfie_sha256 ?? fallback?.selfie_sha256 ?? null,
    video_sha256: primary?.video_sha256 ?? fallback?.video_sha256 ?? null,
    liveness_declaration_sha256:
      primary?.liveness_declaration_sha256 ??
      fallback?.liveness_declaration_sha256 ??
      null,
    face_match_status:
      primary?.face_match_status ??
      fallback?.face_match_status ??
      "NOT_STARTED",
    face_match_method:
      primary?.face_match_method ?? fallback?.face_match_method ?? null,
    liveness_challenge:
      primary?.liveness_challenge ?? fallback?.liveness_challenge ?? "MANUAL",
    liveness_verified: Boolean(
      primary?.liveness_verified || fallback?.liveness_verified
    ),
    liveness_timestamp:
      primary?.liveness_timestamp ?? fallback?.liveness_timestamp ?? null,
    photo_verification_status:
      primary?.photo_verification_status ??
      fallback?.photo_verification_status ??
      null,
    video_verification_status:
      primary?.video_verification_status ??
      fallback?.video_verification_status ??
      null,
    liveness_status:
      primary?.liveness_status ?? fallback?.liveness_status ?? null,
    biometric_verification_consent: Boolean(
      primary?.biometric_verification_consent ||
        fallback?.biometric_verification_consent
    ),
    manual_review_required: Boolean(
      primary?.manual_review_required || fallback?.manual_review_required
    ),
    raw_photo_in_certificate: false,
    raw_video_in_certificate: false,
    raw_media_in_public_registry: false,
    biometric_template_generated: false,
    face_template_generated: false,
    custody_mode: "JOKER_C2_CONTROLLED_CUSTODY"
  };
}

function buildIdentitySnapshotFromSource(
  source: JsonObject | null
): HbceJokerC2BiologicalIdentitySnapshot {
  const physicalDescriptorProfile = buildPhysicalDescriptorProfileFromSource(
    source
  );
  const biometricLivenessSnapshot = buildBiometricLivenessSnapshotFromSource(
    source
  );

  return {
    display_name: buildDisplayNameFromSource(source),
    first_name: getStringFromObject(source, ["first_name", "given_name"]),
    last_name: getStringFromObject(source, [
      "last_name",
      "family_name",
      "surname"
    ]),
    birth_date: getStringFromObject(source, [
      "birth_date",
      "date_of_birth",
      "dob"
    ]),
    birth_place: getStringFromObject(source, [
      "birth_place",
      "place_of_birth"
    ]),
    nationality: getStringFromObject(source, ["nationality", "citizenship"]),
    country: getStringFromObject(source, [
      "country",
      "country_code",
      "residence_country",
      "fiscal_country"
    ]),
    email: getStringFromObject(source, ["email", "email_address"]),
    phone_number: getStringFromObject(source, [
      "phone_number",
      "phone",
      "mobile_phone"
    ]),
    fiscal_or_tax_identifier_ref: getStringFromObject(source, [
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
    document_ref: getStringFromObject(source, [
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
    phone_verified: getBooleanFromObject(source, [
      "phone_verified",
      "is_phone_verified"
    ]),
    email_verified: getBooleanFromObject(source, [
      "email_verified",
      "is_email_verified"
    ]),
    document_verified: getBooleanFromObject(source, [
      "document_verified",
      "identity_document_verified",
      "official_document_verified",
      "is_document_verified"
    ]),
    liveness_verified:
      getBooleanFromObject(source, [
        "liveness_verified",
        "selfie_verified",
        "video_verified",
        "is_liveness_verified"
      ]) || Boolean(biometricLivenessSnapshot?.liveness_verified),
    compliance_review_status:
      getStringFromObject(source, [
        "compliance_review_status",
        "kyc_status",
        "review_status",
        "hbce_review_status"
      ]) ??
      (getBooleanFromObject(source, [
        "privacy_compliance_accepted",
        "gdpr_min_acknowledgement",
        "hash_only_acknowledgement",
        "identity_verification_consent_hash"
      ])
        ? "COMPLIANCE_ACCEPTED"
        : null),
    ...(physicalDescriptorProfile
      ? { physical_descriptor_profile: physicalDescriptorProfile }
      : {}),
    ...(biometricLivenessSnapshot
      ? { biometric_liveness_snapshot: biometricLivenessSnapshot }
      : {})
  };
}

function hasIdentitySnapshotContent(
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

function mergeIdentitySnapshots(
  primary: HbceJokerC2BiologicalIdentitySnapshot | null,
  fallback: HbceJokerC2BiologicalIdentitySnapshot | null
): HbceJokerC2BiologicalIdentitySnapshot | null {
  if (
    !hasIdentitySnapshotContent(primary) &&
    !hasIdentitySnapshotContent(fallback)
  ) {
    return null;
  }

  const physicalDescriptorProfile = mergePhysicalDescriptorProfiles(
    primary?.physical_descriptor_profile ?? null,
    fallback?.physical_descriptor_profile ?? null
  );
  const biometricLivenessSnapshot = mergeBiometricLivenessSnapshots(
    primary?.biometric_liveness_snapshot ?? null,
    fallback?.biometric_liveness_snapshot ?? null
  );

  return {
    display_name: primary?.display_name ?? fallback?.display_name ?? null,
    first_name: primary?.first_name ?? fallback?.first_name ?? null,
    last_name: primary?.last_name ?? fallback?.last_name ?? null,
    birth_date: primary?.birth_date ?? fallback?.birth_date ?? null,
    birth_place: primary?.birth_place ?? fallback?.birth_place ?? null,
    nationality: primary?.nationality ?? fallback?.nationality ?? null,
    country: primary?.country ?? fallback?.country ?? null,
    email: primary?.email ?? fallback?.email ?? null,
    phone_number: primary?.phone_number ?? fallback?.phone_number ?? null,
    fiscal_or_tax_identifier_ref:
      primary?.fiscal_or_tax_identifier_ref ??
      fallback?.fiscal_or_tax_identifier_ref ??
      null,
    document_ref: primary?.document_ref ?? fallback?.document_ref ?? null,
    phone_verified: Boolean(
      primary?.phone_verified || fallback?.phone_verified
    ),
    email_verified: Boolean(
      primary?.email_verified || fallback?.email_verified
    ),
    document_verified: Boolean(
      primary?.document_verified || fallback?.document_verified
    ),
    liveness_verified: Boolean(
      primary?.liveness_verified ||
        fallback?.liveness_verified ||
        biometricLivenessSnapshot?.liveness_verified
    ),
    compliance_review_status:
      primary?.compliance_review_status ??
      fallback?.compliance_review_status ??
      null,
    ...(physicalDescriptorProfile
      ? { physical_descriptor_profile: physicalDescriptorProfile }
      : {}),
    ...(biometricLivenessSnapshot
      ? { biometric_liveness_snapshot: biometricLivenessSnapshot }
      : {})
  };
}

function extractIdentitySnapshotFromPhaseData(
  phaseData: JsonObject | null
): HbceJokerC2BiologicalIdentitySnapshot | null {
  if (!phaseData) {
    return null;
  }

  const privateFields = getNestedJsonObject(phaseData, "private_fields");
  const clientPrivateData = getNestedJsonObject(phaseData, "client_private_data");
  const certificateFields = getNestedJsonObject(phaseData, "certificate_fields");
  const explicitIdentitySnapshot = getNestedJsonObject(
    phaseData,
    "identity_snapshot"
  );
  const explicitBiologicalSnapshot = getNestedJsonObject(
    phaseData,
    "biological_identity_snapshot"
  );
  const privateIdentitySnapshot = getNestedJsonObject(
    privateFields,
    "identity_snapshot"
  );
  const privateBiologicalSnapshot = getNestedJsonObject(
    privateFields,
    "biological_identity_snapshot"
  );

  const candidates = [
    phaseData,
    clientPrivateData,
    privateFields,
    certificateFields,
    explicitIdentitySnapshot,
    explicitBiologicalSnapshot,
    privateIdentitySnapshot,
    privateBiologicalSnapshot
  ];

  let snapshot: HbceJokerC2BiologicalIdentitySnapshot | null = null;

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    snapshot = mergeIdentitySnapshots(
      buildIdentitySnapshotFromSource(candidate),
      snapshot
    );
  }

  return snapshot;
}

function extractIdentitySnapshotFromCertificate(
  certificate: HbceIprCertificate | null | undefined
): HbceJokerC2BiologicalIdentitySnapshot | null {
  if (!certificate) {
    return null;
  }

  return extractIdentitySnapshotFromPhaseData(certificate.payload.phase_data);
}

function buildCustodyFieldPresence(
  identitySnapshot: HbceJokerC2BiologicalIdentitySnapshot | null
): HbceJokerC2CustodyFieldPresence {
  const biometricSnapshot = identitySnapshot?.biometric_liveness_snapshot ?? null;
  const physicalProfile = identitySnapshot?.physical_descriptor_profile ?? null;

  return {
    identity_name: Boolean(
      identitySnapshot?.display_name ||
        identitySnapshot?.first_name ||
        identitySnapshot?.last_name
    ),
    birth_data: Boolean(
      identitySnapshot?.birth_date || identitySnapshot?.birth_place
    ),
    contact_data: Boolean(
      identitySnapshot?.email || identitySnapshot?.phone_number
    ),
    fiscal_or_tax_identifier_reference: Boolean(
      identitySnapshot?.fiscal_or_tax_identifier_ref
    ),
    document_reference: Boolean(identitySnapshot?.document_ref),
    phone_verification: Boolean(identitySnapshot?.phone_verified),
    email_verification: Boolean(identitySnapshot?.email_verified),
    document_verification: Boolean(identitySnapshot?.document_verified),
    liveness_verification: Boolean(
      identitySnapshot?.liveness_verified || biometricSnapshot?.liveness_verified
    ),
    compliance_review: Boolean(identitySnapshot?.compliance_review_status),
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

function buildJokerC2ComplianceCustody(params: {
  identitySnapshot: HbceJokerC2BiologicalIdentitySnapshot | null;
  iprId: string | null;
  certificateId: string | null;
}): HbceJokerC2ComplianceCustody {
  return {
    custody_statement:
      "AI JOKER-C2 is the controlled operational custodian for compliance data, bureaucratic procedure data, document references, face/photo/video liveness references and identity-bound runtime continuity. The portable certificate exposes minimized identity, hashes, references and verification states only.",
    full_data_custodian: "AI_JOKER_C2",
    custody_subject: params.identitySnapshot?.display_name ?? null,
    custody_ipr_id: params.iprId,
    custody_certificate_id: params.certificateId,
    custody_fields_present: buildCustodyFieldPresence(params.identitySnapshot),
    raw_documents_in_fragment: false,
    raw_document_images_in_fragment: false,
    raw_video_liveness_in_fragment: false,
    raw_biometric_templates_in_fragment: false,
    raw_face_templates_in_fragment: false,
    fragment_policy: "MINIMIZED_HANDOFF_ONLY"
  };
}

function buildOperationalCertificatePrivateFields(
  phaseData: JsonObject,
  identitySnapshot: HbceJokerC2BiologicalIdentitySnapshot | null
): HbceJokerC2OperationalCertificatePrivateFields {
  const certificateId = getRequiredStringFromObject(
    phaseData,
    "certificate_id"
  );
  const iprId = getRequiredStringFromObject(phaseData, "ipr_id");
  const physicalDescriptorProfile =
    identitySnapshot?.physical_descriptor_profile ?? undefined;
  const biometricLivenessSnapshot =
    identitySnapshot?.biometric_liveness_snapshot ?? undefined;

  return {
    certificate_id: certificateId,
    ipr_id: iprId,
    subject_id: getRequiredStringFromObject(phaseData, "subject_id"),
    card_serial: getRequiredStringFromObject(phaseData, "card_serial"),
    certificate_status: "ACTIVE",
    certificate_scope: "JOKER_C2_ACCESS",
    issuer: "HERMETICUM B.C.E. S.r.l.",
    issued_at: getRequiredStringFromObject(phaseData, "issued_at"),
    valid_until: getRequiredStringFromObject(phaseData, "valid_until"),
    ...(identitySnapshot
      ? {
          identity_snapshot: identitySnapshot,
          biological_identity_snapshot: identitySnapshot,
          ...(physicalDescriptorProfile
            ? { physical_descriptor_profile: physicalDescriptorProfile }
            : {}),
          ...(biometricLivenessSnapshot
            ? { biometric_liveness_snapshot: biometricLivenessSnapshot }
            : {}),
          joker_c2_custody: buildJokerC2ComplianceCustody({
            identitySnapshot,
            iprId,
            certificateId
          })
        }
      : {})
  };
}

function enrichSubjectCreatedPhaseData(params: {
  phaseData: JsonObject;
  issuedAt: IsoDateTime;
  nextRequiredPhase: HbceIprNextPhaseCode;
}): JsonObject {
  const output: JsonObject = {
    ...params.phaseData,
    certificate_role: "STEP_1_CLIENT_INTAKE",
    certificate_boundary:
      params.phaseData.certificate_boundary ??
      "This file records the creation of the HBCE IPR customer profile request. It does not certify verified identity, it does not issue an IPR Card and it does not grant JOKER-C2 access.",
    ipr_status: params.phaseData.ipr_status ?? "NOT_YET_ISSUED",
    ipr_card_status: params.phaseData.ipr_card_status ?? "NOT_ISSUED",
    joker_c2_access: params.phaseData.joker_c2_access ?? "DENIED",
    next_required_phase: params.nextRequiredPhase,
    created_at: buildHbceTimestamp(params.issuedAt),
    created_at_utc: params.issuedAt,
    created_at_local: toEuropeRomeIso(params.issuedAt),
    timezone: HBCE_TIMEZONE,
    verification_state: getVerificationStateForSubjectCreated(params.phaseData)
  };

  if (
    isPlainRecord(params.phaseData.private_fields) &&
    !isPlainRecord(params.phaseData.client_private_data)
  ) {
    output.client_private_data = canonicalize(params.phaseData.private_fields);
    output.client_private_data_included = true;
  }

  if (!output.subject_creation_mode) {
    output.subject_creation_mode = "SELF_INITIATED_IPR_REQUEST";
  }

  if (!output.certificate_visibility) {
    output.certificate_visibility = "PRIVATE_PORTABLE_CERTIFICATE";
  }

  if (!output.public_registry_mode) {
    output.public_registry_mode = "HASH_ONLY";
  }

  if (!output.privacy_boundary) {
    output.privacy_boundary =
      "The downloaded certificate may contain private customer intake fields. Public verification must expose hash-only references, not private identity fields.";
  }

  return output;
}

function enrichLivenessPhaseData(phaseData: JsonObject): JsonObject {
  const physicalDescriptorProfile = buildPhysicalDescriptorProfileFromSource(
    phaseData
  );
  const biometricLivenessSnapshot = buildBiometricLivenessSnapshotFromSource(
    phaseData
  );

  return {
    ...phaseData,
    certificate_role: "PHOTO_VIDEO_LIVENESS_EVIDENCE",
    certificate_visibility: "PRIVATE_PORTABLE_CERTIFICATE",
    public_registry_mode: "HASH_ONLY",
    raw_photo_in_certificate: false,
    raw_video_in_certificate: false,
    raw_media_in_public_registry: false,
    biometric_template_generated: false,
    face_template_generated: false,
    custody_mode: "JOKER_C2_CONTROLLED_CUSTODY",
    ...(physicalDescriptorProfile
      ? { physical_descriptor_profile: physicalDescriptorProfile }
      : {}),
    ...(biometricLivenessSnapshot
      ? { biometric_liveness_snapshot: biometricLivenessSnapshot }
      : {}),
    joker_c2_custody_reference: {
      custodian: "AI_JOKER_C2",
      custody_mode: "JOKER_C2_CONTROLLED_CUSTODY",
      raw_photo_in_certificate: false,
      raw_video_in_certificate: false,
      raw_media_in_public_registry: false,
      certificate_contains: "hashes_references_states_only"
    },
    liveness_boundary:
      "This certificate stores protected references, hashes, verification states and custody boundaries for face/photo/video liveness. It does not store raw photos, raw videos, biometric templates or face templates."
  };
}

function enrichOperationalCertificatePhaseData(params: {
  phaseData: JsonObject;
  identitySnapshot: HbceJokerC2BiologicalIdentitySnapshot | null;
}): JsonObject {
  const privateFields = buildOperationalCertificatePrivateFields(
    params.phaseData,
    params.identitySnapshot
  );

  const certificateId = privateFields.certificate_id;
  const iprId = privateFields.ipr_id;

  const jokerC2Custody =
    privateFields.joker_c2_custody ??
    buildJokerC2ComplianceCustody({
      identitySnapshot: params.identitySnapshot,
      iprId,
      certificateId
    });

  return {
    ...params.phaseData,
    certificate_role: "FINAL_OPERATIONAL_CERTIFICATE",
    certificate_visibility: "PRIVATE_PORTABLE_CERTIFICATE",
    public_registry_mode: "HASH_ONLY",
    joker_c2_access: "ACCESS_GRANTED",
    joker_c2_runtime_binding: "IPR_VERIFIED_BIOLOGICAL_SUBJECT",
    custody_mode: "JOKER_C2_CONTROLLED_CUSTODY",
    certificate_fields: privateFields,
    private_fields: privateFields,
    ...(params.identitySnapshot
      ? {
          identity_snapshot: params.identitySnapshot,
          biological_identity_snapshot: params.identitySnapshot,
          ...(params.identitySnapshot.physical_descriptor_profile
            ? {
                physical_descriptor_profile:
                  params.identitySnapshot.physical_descriptor_profile
              }
            : {}),
          ...(params.identitySnapshot.biometric_liveness_snapshot
            ? {
                biometric_liveness_snapshot:
                  params.identitySnapshot.biometric_liveness_snapshot
              }
            : {})
        }
      : {}),
    joker_c2_custody: jokerC2Custody,
    operational_boundary:
      "This operational certificate unlocks JOKER-C2 access evaluation only for an IPR-verified identity-bound governed runtime session. It does not replace public authority identity documents, regulated trust services or future server-side revocation checks."
  };
}

function enrichPhaseData<TPhaseData extends JsonObject>(
  input: HbceCertificateGenerationInput<TPhaseData>
): TPhaseData {
  const canonicalPhaseData = canonicalize(input.phase_data);
  const basePhaseData = isPlainRecord(canonicalPhaseData)
    ? canonicalPhaseData
    : {};

  const commonPhaseData: JsonObject = {
    ...basePhaseData,
    issued_at: input.issued_at,
    issued_at_utc: input.issued_at,
    issued_at_local: toEuropeRomeIso(input.issued_at),
    timezone: HBCE_TIMEZONE,
    previous_payload_sha256: input.previous_payload_sha256,
    next_required_phase: input.next_required_phase
  };

  let enrichedPhaseData: JsonObject =
    input.phase_code === "SUBJECT_CREATED"
      ? enrichSubjectCreatedPhaseData({
          phaseData: commonPhaseData,
          issuedAt: input.issued_at,
          nextRequiredPhase: input.next_required_phase
        })
      : commonPhaseData;

  if (input.phase_code === "LIVENESS_SUBMITTED") {
    enrichedPhaseData = enrichLivenessPhaseData(enrichedPhaseData);
  }

  const previousIdentitySnapshot = extractIdentitySnapshotFromCertificate(
    input.previous_certificate
  );
  const currentIdentitySnapshot =
    extractIdentitySnapshotFromPhaseData(enrichedPhaseData);
  const identitySnapshot = mergeIdentitySnapshots(
    currentIdentitySnapshot,
    previousIdentitySnapshot
  );

  if (identitySnapshot) {
    enrichedPhaseData = {
      ...enrichedPhaseData,
      identity_snapshot: identitySnapshot,
      biological_identity_snapshot: identitySnapshot,
      ...(identitySnapshot.physical_descriptor_profile
        ? {
            physical_descriptor_profile:
              identitySnapshot.physical_descriptor_profile
          }
        : {}),
      ...(identitySnapshot.biometric_liveness_snapshot
        ? {
            biometric_liveness_snapshot:
              identitySnapshot.biometric_liveness_snapshot
          }
        : {})
    };
  }

  if (input.phase_code === "IPR_VERIFIED") {
    enrichedPhaseData = enrichOperationalCertificatePhaseData({
      phaseData: enrichedPhaseData,
      identitySnapshot
    });
  }

  return canonicalize(enrichedPhaseData) as TPhaseData;
}

function buildPayload<TPhaseData extends JsonObject>(
  input: HbceCertificateGenerationInput<TPhaseData>
): {
  proto: "HBCE-IPR-PAYLOAD-v3";
  jurisdiction: "EU";
  policy: HbceIprPolicy;
  phase_data: TPhaseData;
} {
  const payload = {
    proto: "HBCE-IPR-PAYLOAD-v3",
    jurisdiction: "EU",
    policy: HBCE_IPR_POLICY,
    phase_data: enrichPhaseData(input)
  } as const;

  return canonicalize(payload) as {
    proto: "HBCE-IPR-PAYLOAD-v3";
    jurisdiction: "EU";
    policy: HbceIprPolicy;
    phase_data: TPhaseData;
  };
}

export function isExpectedIssuer(value: unknown): value is HbceIssuer {
  if (!isPlainRecord(value)) {
    return false;
  }

  return (
    value.hallmark === HBCE_ISSUER.hallmark &&
    value.legal_name === HBCE_ISSUER.legal_name &&
    value.jurisdiction === HBCE_ISSUER.jurisdiction
  );
}

export function isHbceIprCertificate(
  value: unknown
): value is HbceIprCertificate {
  if (!isPlainRecord(value)) {
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

  if (!isExpectedIssuer(value.issuer)) {
    return false;
  }

  if (!isPlainRecord(value.phase)) {
    return false;
  }

  if (typeof value.phase.code !== "string") {
    return false;
  }

  if (typeof value.phase.number !== "number") {
    return false;
  }

  if (typeof value.phase.status !== "string") {
    return false;
  }

  if (typeof value.phase.next_required_phase !== "string") {
    return false;
  }

  if (!isPlainRecord(value.hash_integrity)) {
    return false;
  }

  if (value.hash_integrity.algo !== "SHA-256") {
    return false;
  }

  if (value.hash_integrity.canonicalization !== "stableStringify(keys-sorted)") {
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

  if (!isPlainRecord(value.payload)) {
    return false;
  }

  if (value.payload.proto !== "HBCE-IPR-PAYLOAD-v3") {
    return false;
  }

  if (value.payload.jurisdiction !== "EU") {
    return false;
  }

  if (!isPlainRecord(value.payload.policy)) {
    return false;
  }

  if (!isPlainRecord(value.payload.phase_data)) {
    return false;
  }

  if (!isPlainRecord(value.registry)) {
    return false;
  }

  if (
    value.registry.kind !== "HASH_ONLY_PUBLIC_ENTRY" &&
    value.registry.kind !== "HASH_ONLY_PRIVATE_OR_PUBLIC_ENTRY"
  ) {
    return false;
  }

  if (!isPlainRecord(value.registry.public_entry)) {
    return false;
  }

  if (typeof value.registry.public_entry.payload_sha256 !== "string") {
    return false;
  }

  if (typeof value.registry.public_entry.phase !== "string") {
    return false;
  }

  if (typeof value.registry.public_entry.timestamp !== "string") {
    return false;
  }

  if (
    value.registry.public_entry.payload_sha256 !==
    value.hash_integrity.payload_sha256
  ) {
    return false;
  }

  if (value.registry.public_entry.phase !== value.phase.code) {
    return false;
  }

  if (!isPlainRecord(value.next)) {
    return false;
  }

  if (typeof value.next.upload_required !== "boolean") {
    return false;
  }

  if (typeof value.next.next_phase !== "string") {
    return false;
  }

  if (value.next.next_phase !== value.phase.next_required_phase) {
    return false;
  }

  return typeof value.issued_at === "string";
}

export async function recomputeCertificatePayloadSha256(
  certificate: HbceIprCertificate
): Promise<HashReference> {
  return createPayloadSha256(
    certificate.hash_integrity.previous_payload_sha256,
    certificate.payload as JsonObject
  );
}

export async function generateHbceIprCertificate<TPhaseData extends JsonObject>(
  input: HbceCertificateGenerationInput<TPhaseData>
): Promise<HbceGeneratedCertificate<TPhaseData>> {
  const payload = buildPayload(input);

  const payloadSha256 = await createPayloadSha256(
    input.previous_payload_sha256,
    payload
  );

  const fileName = getCertificateFileName(input.phase_code);

  if (input.phase_code === "IPR_VERIFIED") {
    const certificate: HbceIprOperationalCertificate<TPhaseData> = {
      proto: "HBCE-IPR-RELEASE-v3",
      kind: "IPR_OPERATIONAL_CERTIFICATE",
      issuer: HBCE_ISSUER,
      phase: {
        number: input.phase_number,
        code: input.phase_code,
        status: input.phase_status,
        next_required_phase: input.next_required_phase
      },
      subject: input.subject,
      hash_integrity: {
        algo: "SHA-256",
        canonicalization: "stableStringify(keys-sorted)",
        previous_payload_sha256: input.previous_payload_sha256,
        payload_sha256: payloadSha256
      },
      payload,
      registry: {
        kind: "HASH_ONLY_PUBLIC_ENTRY",
        public_entry: {
          payload_sha256: payloadSha256,
          timestamp: input.issued_at,
          phase: input.phase_code
        }
      },
      next: {
        upload_required: input.next_required_phase !== "COMPLETED",
        next_phase: input.next_required_phase
      },
      issued_at: input.issued_at,
      certificate_status: "ACTIVE",
      certificate_scope: "JOKER_C2_ACCESS"
    };

    return {
      file_name: fileName,
      certificate,
      payload_sha256: payloadSha256,
      previous_payload_sha256: input.previous_payload_sha256,
      generated_at: input.issued_at
    };
  }

  const certificate: HbceIprPhaseCertificate<TPhaseData> = {
    proto: "HBCE-IPR-RELEASE-v3",
    kind: "IPR_PHASE_CERTIFICATE",
    issuer: HBCE_ISSUER,
    phase: {
      number: input.phase_number,
      code: input.phase_code,
      status: input.phase_status,
      next_required_phase: input.next_required_phase
    },
    subject: input.subject,
    hash_integrity: {
      algo: "SHA-256",
      canonicalization: "stableStringify(keys-sorted)",
      previous_payload_sha256: input.previous_payload_sha256,
      payload_sha256: payloadSha256
    },
    payload,
    registry: {
      kind: "HASH_ONLY_PUBLIC_ENTRY",
      public_entry: {
        payload_sha256: payloadSha256,
        timestamp: input.issued_at,
        phase: input.phase_code
      }
    },
    next: {
      upload_required: input.next_required_phase !== "COMPLETED",
      next_phase: input.next_required_phase
    },
    issued_at: input.issued_at
  };

  return {
    file_name: fileName,
    certificate,
    payload_sha256: payloadSha256,
    previous_payload_sha256: input.previous_payload_sha256,
    generated_at: input.issued_at
  };
}

export function createValidationResult(params: {
  valid: boolean;
  reason?: HbceFailClosedReason;
  message: string;
  expected_phase?: HbceIprCertificatePhaseCode;
  received_phase?: HbceIprCertificatePhaseCode;
  expected_next_phase?: HbceIprNextPhaseCode;
  received_next_phase?: HbceIprNextPhaseCode;
  payload_sha256?: HashReference;
  previous_payload_sha256?: HashReference | null;
  checked_at?: IsoDateTime;
}): HbceCertificateValidationResult {
  return {
    decision: params.valid ? "VALID" : "FAIL_CLOSED",
    valid: params.valid,
    message: params.message,
    checked_at: params.checked_at ?? nowIso(),
    ...(params.reason ? { reason: params.reason } : {}),
    ...(params.expected_phase ? { expected_phase: params.expected_phase } : {}),
    ...(params.received_phase ? { received_phase: params.received_phase } : {}),
    ...(params.expected_next_phase
      ? { expected_next_phase: params.expected_next_phase }
      : {}),
    ...(params.received_next_phase
      ? { received_next_phase: params.received_next_phase }
      : {}),
    ...(params.payload_sha256 ? { payload_sha256: params.payload_sha256 } : {}),
    ...(params.previous_payload_sha256 !== undefined
      ? { previous_payload_sha256: params.previous_payload_sha256 }
      : {})
  };
}

export async function validatePreviousHbceIprCertificate(
  input: HbcePreviousCertificateValidationInput
): Promise<HbceCertificateValidationResult> {
  const checkedAt = input.checked_at ?? nowIso();

  if (input.expected_previous_phase === null) {
    return createValidationResult({
      valid: true,
      message: "No previous HBCE IPR certificate is required for this phase.",
      expected_next_phase: input.expected_next_phase,
      checked_at: checkedAt
    });
  }

  if (!input.certificate) {
    return createValidationResult({
      valid: false,
      reason: "MISSING_PREVIOUS_CERTIFICATE",
      message:
        "Certificate rejected. A previous HBCE IPR certificate is required.",
      expected_phase: input.expected_previous_phase,
      expected_next_phase: input.expected_next_phase,
      checked_at: checkedAt
    });
  }

  if (!isPlainRecord(input.certificate)) {
    return createValidationResult({
      valid: false,
      reason: "INVALID_JSON",
      message:
        "Certificate rejected. The uploaded file is not a valid HBCE IPR JSON object.",
      expected_phase: input.expected_previous_phase,
      expected_next_phase: input.expected_next_phase,
      checked_at: checkedAt
    });
  }

  if (input.certificate.proto !== "HBCE-IPR-RELEASE-v3") {
    return createValidationResult({
      valid: false,
      reason: "INVALID_PROTO",
      message:
        "Certificate rejected. The uploaded HBCE IPR certificate uses an invalid protocol.",
      expected_phase: input.expected_previous_phase,
      expected_next_phase: input.expected_next_phase,
      checked_at: checkedAt
    });
  }

  if (
    input.certificate.kind !== "IPR_PHASE_CERTIFICATE" &&
    input.certificate.kind !== "IPR_OPERATIONAL_CERTIFICATE"
  ) {
    return createValidationResult({
      valid: false,
      reason: "INVALID_KIND",
      message:
        "Certificate rejected. The uploaded HBCE IPR certificate has an invalid kind.",
      expected_phase: input.expected_previous_phase,
      expected_next_phase: input.expected_next_phase,
      checked_at: checkedAt
    });
  }

  if (!isExpectedIssuer(input.certificate.issuer)) {
    return createValidationResult({
      valid: false,
      reason: "INVALID_ISSUER",
      message:
        "Certificate rejected. The uploaded HBCE IPR certificate was not issued by HERMETICUM B.C.E. S.r.l.",
      expected_phase: input.expected_previous_phase,
      expected_next_phase: input.expected_next_phase,
      checked_at: checkedAt
    });
  }

  if (!isHbceIprCertificate(input.certificate)) {
    return createValidationResult({
      valid: false,
      reason: "INVALID_JSON",
      message:
        "Certificate rejected. The uploaded HBCE IPR certificate is incomplete, malformed or internally inconsistent.",
      expected_phase: input.expected_previous_phase,
      expected_next_phase: input.expected_next_phase,
      checked_at: checkedAt
    });
  }

  const receivedPhase = input.certificate.phase.code;
  const receivedNextPhase = input.certificate.next.next_phase;

  if (receivedPhase !== input.expected_previous_phase) {
    return createValidationResult({
      valid: false,
      reason: "INVALID_PHASE",
      message:
        "Certificate rejected. The uploaded HBCE IPR certificate does not match the required previous phase.",
      expected_phase: input.expected_previous_phase,
      received_phase: receivedPhase,
      expected_next_phase: input.expected_next_phase,
      received_next_phase: receivedNextPhase,
      payload_sha256: input.certificate.hash_integrity.payload_sha256,
      previous_payload_sha256:
        input.certificate.hash_integrity.previous_payload_sha256,
      checked_at: checkedAt
    });
  }

  if (receivedNextPhase !== input.expected_next_phase) {
    return createValidationResult({
      valid: false,
      reason: "INVALID_NEXT_PHASE",
      message:
        "Certificate rejected. The uploaded HBCE IPR certificate does not unlock the requested next phase.",
      expected_phase: input.expected_previous_phase,
      received_phase: receivedPhase,
      expected_next_phase: input.expected_next_phase,
      received_next_phase: receivedNextPhase,
      payload_sha256: input.certificate.hash_integrity.payload_sha256,
      previous_payload_sha256:
        input.certificate.hash_integrity.previous_payload_sha256,
      checked_at: checkedAt
    });
  }

  if (!input.certificate.hash_integrity.payload_sha256) {
    return createValidationResult({
      valid: false,
      reason: "MISSING_PAYLOAD_HASH",
      message:
        "Certificate rejected. The uploaded HBCE IPR certificate has no payload hash.",
      expected_phase: input.expected_previous_phase,
      received_phase: receivedPhase,
      expected_next_phase: input.expected_next_phase,
      received_next_phase: receivedNextPhase,
      checked_at: checkedAt
    });
  }

  const recomputedHash = await recomputeCertificatePayloadSha256(
    input.certificate
  );

  if (recomputedHash !== input.certificate.hash_integrity.payload_sha256) {
    return createValidationResult({
      valid: false,
      reason: "HASH_MISMATCH",
      message:
        "Certificate rejected. The uploaded HBCE IPR certificate payload hash does not match its canonical payload.",
      expected_phase: input.expected_previous_phase,
      received_phase: receivedPhase,
      expected_next_phase: input.expected_next_phase,
      received_next_phase: receivedNextPhase,
      payload_sha256: input.certificate.hash_integrity.payload_sha256,
      previous_payload_sha256:
        input.certificate.hash_integrity.previous_payload_sha256,
      checked_at: checkedAt
    });
  }

  return createValidationResult({
    valid: true,
    message: "HBCE IPR certificate accepted. Previous phase is valid.",
    expected_phase: input.expected_previous_phase,
    received_phase: receivedPhase,
    expected_next_phase: input.expected_next_phase,
    received_next_phase: receivedNextPhase,
    payload_sha256: input.certificate.hash_integrity.payload_sha256,
    previous_payload_sha256:
      input.certificate.hash_integrity.previous_payload_sha256,
    checked_at: checkedAt
  });
}

export async function parseHbceIprCertificateJson(
  raw: string,
  expected_previous_phase: HbceIprCertificatePhaseCode | null,
  expected_next_phase: HbceIprNextPhaseCode
): Promise<HbceCertificateParseResult> {
  try {
    const parsed = JSON.parse(raw) as unknown;

    const validation = await validatePreviousHbceIprCertificate({
      certificate: parsed,
      expected_previous_phase,
      expected_next_phase
    });

    return {
      certificate:
        validation.valid && isHbceIprCertificate(parsed) ? parsed : null,
      validation
    };
  } catch {
    return {
      certificate: null,
      validation: createValidationResult({
        valid: false,
        reason: "INVALID_JSON",
        message: "Certificate rejected. The uploaded file is not valid JSON.",
        ...(expected_previous_phase
          ? { expected_phase: expected_previous_phase }
          : {}),
        expected_next_phase
      })
    };
  }
}

export async function readHbceIprCertificateFile(
  file: Blob,
  expected_previous_phase: HbceIprCertificatePhaseCode | null,
  expected_next_phase: HbceIprNextPhaseCode
): Promise<HbceCertificateParseResult> {
  const raw = await file.text();

  return parseHbceIprCertificateJson(
    raw,
    expected_previous_phase,
    expected_next_phase
  );
}

export function buildCertificateJson(certificate: HbceIprCertificate): string {
  return `${stableStringify(certificate)}\n`;
}

export function buildCertificateBlob(certificate: HbceIprCertificate): Blob {
  return new Blob([buildCertificateJson(certificate)], {
    type: "application/json"
  });
}

export function downloadHbceIprCertificate(
  certificate: HbceIprCertificate,
  fileName: HbceIprCertificateFileName
): void {
  if (typeof document === "undefined") {
    throw new Error("Certificate download is available only in the browser.");
  }

  const blob = buildCertificateBlob(certificate);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function getOperationalCertificateString(
  certificate: HbceIprCertificate,
  keys: readonly string[]
): string | null {
  const phaseData = certificate.payload.phase_data;
  const privateFields = getNestedJsonObject(phaseData, "private_fields");
  const certificateFields = getNestedJsonObject(phaseData, "certificate_fields");

  return (
    getStringFromObject(phaseData, keys) ??
    getStringFromObject(privateFields, keys) ??
    getStringFromObject(certificateFields, keys)
  );
}

export async function validateJokerC2OperationalCertificate(
  certificate: unknown
): Promise<HbceJokerC2AccessGateResult> {
  const checkedAt = nowIso();

  if (!isHbceIprCertificate(certificate)) {
    return {
      decision: "ACCESS_DENIED",
      reason:
        "ACCESS_DENIED: uploaded file is not a valid HBCE IPR certificate.",
      checked_at: checkedAt
    };
  }

  if (certificate.kind !== "IPR_OPERATIONAL_CERTIFICATE") {
    return {
      decision: "ACCESS_DENIED",
      reason:
        "ACCESS_DENIED: JOKER-C2 requires an HBCE operational certificate.",
      payload_sha256: certificate.hash_integrity.payload_sha256,
      previous_payload_sha256:
        certificate.hash_integrity.previous_payload_sha256,
      checked_at: checkedAt
    };
  }

  if (certificate.phase.code !== "IPR_VERIFIED") {
    return {
      decision: "ACCESS_DENIED",
      reason: "ACCESS_DENIED: certificate phase is not IPR_VERIFIED.",
      certificate_status: certificate.certificate_status,
      certificate_scope: certificate.certificate_scope,
      payload_sha256: certificate.hash_integrity.payload_sha256,
      previous_payload_sha256:
        certificate.hash_integrity.previous_payload_sha256,
      checked_at: checkedAt
    };
  }

  if (certificate.certificate_status !== "ACTIVE") {
    return {
      decision: "ACCESS_DENIED",
      reason: "ACCESS_DENIED: operational certificate is not active.",
      certificate_status: certificate.certificate_status,
      certificate_scope: certificate.certificate_scope,
      payload_sha256: certificate.hash_integrity.payload_sha256,
      previous_payload_sha256:
        certificate.hash_integrity.previous_payload_sha256,
      checked_at: checkedAt
    };
  }

  if (certificate.certificate_scope !== "JOKER_C2_ACCESS") {
    return {
      decision: "ACCESS_DENIED",
      reason:
        "ACCESS_DENIED: operational certificate scope does not allow JOKER-C2 access.",
      certificate_status: certificate.certificate_status,
      certificate_scope: certificate.certificate_scope,
      payload_sha256: certificate.hash_integrity.payload_sha256,
      previous_payload_sha256:
        certificate.hash_integrity.previous_payload_sha256,
      checked_at: checkedAt
    };
  }

  if (!certificate.hash_integrity.previous_payload_sha256) {
    return {
      decision: "ACCESS_DENIED",
      reason:
        "ACCESS_DENIED: operational certificate has no previous payload hash.",
      certificate_status: certificate.certificate_status,
      certificate_scope: certificate.certificate_scope,
      payload_sha256: certificate.hash_integrity.payload_sha256,
      previous_payload_sha256:
        certificate.hash_integrity.previous_payload_sha256,
      checked_at: checkedAt
    };
  }

  const recomputedHash = await recomputeCertificatePayloadSha256(certificate);

  if (recomputedHash !== certificate.hash_integrity.payload_sha256) {
    return {
      decision: "ACCESS_DENIED",
      reason: "ACCESS_DENIED: operational certificate payload hash mismatch.",
      certificate_status: certificate.certificate_status,
      certificate_scope: certificate.certificate_scope,
      payload_sha256: certificate.hash_integrity.payload_sha256,
      previous_payload_sha256:
        certificate.hash_integrity.previous_payload_sha256,
      checked_at: checkedAt
    };
  }

  const certificateId = getOperationalCertificateString(certificate, [
    "certificate_id"
  ]);
  const iprId = getOperationalCertificateString(certificate, ["ipr_id"]);
  const subjectId = getOperationalCertificateString(certificate, ["subject_id"]);
  const cardSerial = getOperationalCertificateString(certificate, [
    "card_serial"
  ]);
  const certificateStatus = getOperationalCertificateString(certificate, [
    "certificate_status"
  ]);
  const certificateScope = getOperationalCertificateString(certificate, [
    "certificate_scope"
  ]);
  const identitySnapshot = extractIdentitySnapshotFromCertificate(certificate);
  const biometricLivenessSnapshot =
    identitySnapshot?.biometric_liveness_snapshot ?? null;

  if (!certificateId || !iprId || !subjectId || !cardSerial) {
    return {
      decision: "ACCESS_DENIED",
      reason:
        "ACCESS_DENIED: operational certificate is missing certificate_id, ipr_id, subject_id or card_serial.",
      certificate_status: certificate.certificate_status,
      certificate_scope: certificate.certificate_scope,
      payload_sha256: certificate.hash_integrity.payload_sha256,
      previous_payload_sha256:
        certificate.hash_integrity.previous_payload_sha256,
      checked_at: checkedAt
    };
  }

  if (certificateStatus !== "ACTIVE") {
    return {
      decision: "ACCESS_DENIED",
      reason:
        "ACCESS_DENIED: operational certificate payload does not confirm ACTIVE status.",
      certificate_status: certificate.certificate_status,
      certificate_scope: certificate.certificate_scope,
      payload_sha256: certificate.hash_integrity.payload_sha256,
      previous_payload_sha256:
        certificate.hash_integrity.previous_payload_sha256,
      checked_at: checkedAt
    };
  }

  if (certificateScope !== "JOKER_C2_ACCESS") {
    return {
      decision: "ACCESS_DENIED",
      reason:
        "ACCESS_DENIED: operational certificate payload does not confirm JOKER_C2_ACCESS scope.",
      certificate_status: certificate.certificate_status,
      certificate_scope: certificate.certificate_scope,
      payload_sha256: certificate.hash_integrity.payload_sha256,
      previous_payload_sha256:
        certificate.hash_integrity.previous_payload_sha256,
      checked_at: checkedAt
    };
  }

  if (!hasIdentitySnapshotContent(identitySnapshot)) {
    return {
      decision: "ACCESS_DENIED",
      reason:
        "ACCESS_DENIED: operational certificate does not contain the required IPR biological identity snapshot for JOKER-C2 identity-bound access.",
      certificate_status: certificate.certificate_status,
      certificate_scope: certificate.certificate_scope,
      payload_sha256: certificate.hash_integrity.payload_sha256,
      previous_payload_sha256:
        certificate.hash_integrity.previous_payload_sha256,
      checked_at: checkedAt
    };
  }

  if (!hasBiometricLivenessSnapshotContent(biometricLivenessSnapshot)) {
    return {
      decision: "ACCESS_DENIED",
      reason:
        "ACCESS_DENIED: operational certificate does not contain the required photo/video liveness snapshot for JOKER-C2 identity-bound access.",
      certificate_status: certificate.certificate_status,
      certificate_scope: certificate.certificate_scope,
      payload_sha256: certificate.hash_integrity.payload_sha256,
      previous_payload_sha256:
        certificate.hash_integrity.previous_payload_sha256,
      checked_at: checkedAt
    };
  }

  if (!biometricLivenessSnapshot?.biometric_verification_consent) {
    return {
      decision: "ACCESS_DENIED",
      reason:
        "ACCESS_DENIED: operational certificate does not confirm biometric/liveness verification consent.",
      certificate_status: certificate.certificate_status,
      certificate_scope: certificate.certificate_scope,
      payload_sha256: certificate.hash_integrity.payload_sha256,
      previous_payload_sha256:
        certificate.hash_integrity.previous_payload_sha256,
      checked_at: checkedAt
    };
  }

  return {
    decision: "ACCESS_GRANTED",
    reason:
      "ACCESS_GRANTED: HBCE operational certificate is active, identity-bound, liveness-bound and valid for JOKER-C2 governed access.",
    certificate_status: certificate.certificate_status,
    certificate_scope: certificate.certificate_scope,
    payload_sha256: certificate.hash_integrity.payload_sha256,
    previous_payload_sha256:
      certificate.hash_integrity.previous_payload_sha256,
    checked_at: checkedAt
  };
}
