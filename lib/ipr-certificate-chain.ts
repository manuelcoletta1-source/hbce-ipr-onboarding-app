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

function enrichSubjectCreatedPhaseData(params: {
  phaseData: JsonObject;
  issuedAt: IsoDateTime;
  nextRequiredPhase: HbceIprNextPhaseCode;
}): JsonObject {
  const output: JsonObject = {
    ...params.phaseData,
    certificate_role: "STEP_1_CLIENT_INTAKE",
    certificate_boundary:
      "This file records the creation of the HBCE IPR customer profile request. It does not certify verified identity, it does not issue an IPR Card and it does not grant JOKER-C2 access.",
    ipr_status: "NOT_YET_ISSUED",
    ipr_card_status: "NOT_ISSUED",
    joker_c2_access: "DENIED",
    next_required_phase: params.nextRequiredPhase,
    created_at: buildHbceTimestamp(params.issuedAt),
    created_at_utc: params.issuedAt,
    created_at_local: toEuropeRomeIso(params.issuedAt),
    timezone: HBCE_TIMEZONE,
    verification_state: buildInitialVerificationState()
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

  if (input.phase_code === "SUBJECT_CREATED") {
    return enrichSubjectCreatedPhaseData({
      phaseData: commonPhaseData,
      issuedAt: input.issued_at,
      nextRequiredPhase: input.next_required_phase
    }) as TPhaseData;
  }

  return commonPhaseData as TPhaseData;
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

  return {
    decision: "ACCESS_GRANTED",
    reason:
      "ACCESS_GRANTED: HBCE operational certificate is active and valid for JOKER-C2 governed access.",
    certificate_status: certificate.certificate_status,
    certificate_scope: certificate.certificate_scope,
    payload_sha256: certificate.hash_integrity.payload_sha256,
    previous_payload_sha256:
      certificate.hash_integrity.previous_payload_sha256,
    checked_at: checkedAt
  };
}
