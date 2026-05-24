"use client";

import IprPhaseForm from "@/components/IprPhaseForm";

import { sha256Canonical } from "@/lib/ipr-certificate-chain";
import { getPhaseDefinitionByNumber } from "@/lib/ipr-phase-map";

import type {
  IprPhaseEvidenceInputDefinition,
  IprPhaseFieldDefinition,
  IprPhaseFormBuildDataContext
} from "@/components/IprPhaseForm";

import type {
  HbceIprCertificate,
  HbceJokerC2BiologicalIdentitySnapshot,
  JsonObject
} from "@/lib/types";

type Phase3OfficialDocumentPrivateFields = JsonObject & {
  document_type: string;
  document_number: string;
  document_country: string;
  document_issuer: string;
  document_issue_date: string;
  document_expiry_date: string;
  document_ref?: string;
  document_hash?: string;
  identity_document_hash?: string;
  document_front_sha256?: string;
  document_back_sha256?: string;
  document_passport_page_sha256?: string;
  document_metadata_hash?: string;
  official_document_uploaded?: true;
  official_document_verified?: false;
  identity_snapshot?: HbceJokerC2BiologicalIdentitySnapshot;
  biological_identity_snapshot?: HbceJokerC2BiologicalIdentitySnapshot;
};

type Phase3OfficialDocumentHashFields = JsonObject & {
  document_type_hash: string;
  document_number_hash: string;
  document_country_hash: string;
  document_issuer_hash: string;
  document_issue_date_hash: string;
  document_expiry_date_hash: string;
};

type Phase3OfficialDocumentEvidenceHashes = JsonObject & {
  document_front_sha256?: string;
  document_back_sha256?: string;
  document_passport_page_sha256?: string;
};

type Phase3OfficialDocumentSnapshot = JsonObject & {
  document_type: string;
  document_country: string;
  document_issuer: string;
  document_issue_date: string;
  document_expiry_date: string;
  document_ref: string;
  document_hash: string;
  identity_document_hash: string;
  document_number_hash: string;
  document_front_sha256: string | null;
  document_back_sha256: string | null;
  document_passport_page_sha256: string | null;
  document_metadata_hash: string;
  official_document_uploaded: true;
  official_document_verified: false;
  raw_document_files_in_certificate: false;
  raw_document_images_in_certificate: false;
  public_registry_mode: "HASH_ONLY";
};

const phase = getPhaseDefinitionByNumber(3);

const fields: IprPhaseFieldDefinition[] = [
  {
    name: "document_type",
    label: "Official document type",
    type: "select",
    options: [
      {
        label: "Carta d’Identità Elettronica — CIE",
        value: "ITALIAN_CIE"
      },
      {
        label: "Driving licence / Patente di guida",
        value: "DRIVING_LICENCE"
      },
      {
        label: "Passport / Passaporto",
        value: "PASSPORT"
      },
      {
        label: "EU national identity card",
        value: "EU_IDENTITY_CARD"
      },
      {
        label: "Other authorized official document",
        value: "OTHER_AUTHORIZED_OFFICIAL_DOCUMENT"
      }
    ],
    helperText:
      "Official document type declared by the subject. It is included in the private certificate and hashed for audit verification."
  },
  {
    name: "document_number",
    label: "Document number",
    type: "text",
    placeholder: "CA000000X",
    helperText:
      "Official document number. It is included in the private certificate and hashed for audit verification."
  },
  {
    name: "document_country",
    label: "Document country",
    type: "text",
    placeholder: "IT",
    helperText:
      "Country or jurisdiction of the official document. It is included in the private certificate and hashed."
  },
  {
    name: "document_issuer",
    label: "Issuing authority",
    type: "text",
    placeholder: "Comune / Ministry / Issuing authority",
    helperText:
      "Authority that issued the document. It is included in the private certificate and hashed."
  },
  {
    name: "document_issue_date",
    label: "Issue date",
    type: "date",
    helperText:
      "Document issue date. It is included in the private certificate and hashed."
  },
  {
    name: "document_expiry_date",
    label: "Expiry date",
    type: "date",
    helperText:
      "Document expiry date. It is included in the private certificate and hashed."
  }
];

const evidenceInputs: IprPhaseEvidenceInputDefinition[] = [
  {
    kind: "OFFICIAL_DOCUMENT_FRONT",
    label: "Upload official document front / CIE front / licence front",
    description:
      "Upload the front side of the CIE, driving licence, EU identity card or other official document. The file itself is not embedded in the certificate; only its SHA-256 hash is stored.",
    accept: "image/*,.pdf",
    required: true
  },
  {
    kind: "OFFICIAL_DOCUMENT_BACK",
    label: "Upload official document back / CIE back / licence back",
    description:
      "Upload the back side when the selected document has two sides. The file itself is not embedded in the certificate; only its SHA-256 hash is stored.",
    accept: "image/*,.pdf",
    required: false
  },
  {
    kind: "PASSPORT_DATA_PAGE",
    label: "Upload passport data page",
    description:
      "Use this field when the selected official document is a passport. The file itself is not embedded in the certificate; only its SHA-256 hash is stored.",
    accept: "image/*,.pdf",
    required: false
  }
];

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

function getIdentitySourcesFromCertificate(
  certificate: HbceIprCertificate | null | undefined
): JsonObject[] {
  if (!certificate) {
    return [];
  }

  const phaseData = certificate.payload.phase_data;
  const privateFields = getJsonObjectField(phaseData, "private_fields");
  const certificateFields = getJsonObjectField(phaseData, "certificate_fields");
  const fiscalFields = getJsonObjectField(phaseData, "fiscal_fields");
  const identityFields = getJsonObjectField(phaseData, "identity_fields");
  const contactFields = getJsonObjectField(phaseData, "contact_fields");
  const verificationState = getJsonObjectField(phaseData, "verification_state");

  const explicitBiologicalSnapshot = getFirstNestedObjectFromSources(
    [
      phaseData,
      privateFields,
      certificateFields,
      fiscalFields,
      identityFields,
      contactFields,
      verificationState
    ],
    ["biological_identity_snapshot"]
  );

  const explicitIdentitySnapshot = getFirstNestedObjectFromSources(
    [
      phaseData,
      privateFields,
      certificateFields,
      fiscalFields,
      identityFields,
      contactFields,
      verificationState
    ],
    ["identity_snapshot"]
  );

  return [
    explicitBiologicalSnapshot,
    explicitIdentitySnapshot,
    privateFields,
    certificateFields,
    fiscalFields,
    identityFields,
    contactFields,
    verificationState,
    phaseData
  ].filter(isJsonObject);
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

function getRawStringValue(
  context: IprPhaseFormBuildDataContext,
  fieldName: string
): string {
  const value = context.values[fieldName];

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value ?? "").trim();
}

function normalizeDocumentType(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeDocumentNumber(value: string): string {
  return value.replace(/\s+/g, "").trim().toUpperCase();
}

function normalizeCountryCode(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeIssuer(value: string): string {
  return value.trim();
}

function normalizeDate(value: string): string {
  return value.trim();
}

function getNormalizedPhase3Value(
  context: IprPhaseFormBuildDataContext,
  fieldName: string
): string {
  const rawValue = getRawStringValue(context, fieldName);

  switch (fieldName) {
    case "document_type":
      return normalizeDocumentType(rawValue);
    case "document_number":
      return normalizeDocumentNumber(rawValue);
    case "document_country":
      return normalizeCountryCode(rawValue);
    case "document_issuer":
      return normalizeIssuer(rawValue);
    case "document_issue_date":
    case "document_expiry_date":
      return normalizeDate(rawValue);
    default:
      return rawValue;
  }
}

async function hashPhaseValue(
  context: IprPhaseFormBuildDataContext,
  fieldName: string
): Promise<string> {
  return sha256Canonical({
    kind: "HBCE_IPR_PHASE_3_OFFICIAL_DOCUMENT_FIELD",
    phase: "OFFICIAL_DOCUMENT_SUBMITTED",
    field: fieldName,
    value: getNormalizedPhase3Value(context, fieldName),
    previous_payload_sha256:
      context.previousCertificate?.hash_integrity.payload_sha256 ?? null,
    issued_at: context.issuedAt
  });
}

function getUploadHash(
  context: IprPhaseFormBuildDataContext,
  kind:
    | "OFFICIAL_DOCUMENT_FRONT"
    | "OFFICIAL_DOCUMENT_BACK"
    | "PASSPORT_DATA_PAGE"
): string | null {
  return context.uploads.find((upload) => upload.kind === kind)?.sha256 ?? null;
}

function buildSubmittedPrivateFields(
  context: IprPhaseFormBuildDataContext
): Phase3OfficialDocumentPrivateFields {
  return {
    document_type: getRawStringValue(context, "document_type"),
    document_number: getRawStringValue(context, "document_number"),
    document_country: getRawStringValue(context, "document_country"),
    document_issuer: getRawStringValue(context, "document_issuer"),
    document_issue_date: getRawStringValue(context, "document_issue_date"),
    document_expiry_date: getRawStringValue(context, "document_expiry_date")
  };
}

function buildNormalizedPrivateFields(
  context: IprPhaseFormBuildDataContext
): Phase3OfficialDocumentPrivateFields {
  return {
    document_type: getNormalizedPhase3Value(context, "document_type"),
    document_number: getNormalizedPhase3Value(context, "document_number"),
    document_country: getNormalizedPhase3Value(context, "document_country"),
    document_issuer: getNormalizedPhase3Value(context, "document_issuer"),
    document_issue_date: getNormalizedPhase3Value(
      context,
      "document_issue_date"
    ),
    document_expiry_date: getNormalizedPhase3Value(
      context,
      "document_expiry_date"
    )
  };
}

async function buildHashFields(
  context: IprPhaseFormBuildDataContext
): Promise<Phase3OfficialDocumentHashFields> {
  return {
    document_type_hash: await hashPhaseValue(context, "document_type"),
    document_number_hash: await hashPhaseValue(context, "document_number"),
    document_country_hash: await hashPhaseValue(context, "document_country"),
    document_issuer_hash: await hashPhaseValue(context, "document_issuer"),
    document_issue_date_hash: await hashPhaseValue(
      context,
      "document_issue_date"
    ),
    document_expiry_date_hash: await hashPhaseValue(
      context,
      "document_expiry_date"
    )
  };
}

function buildEvidenceHashes(
  context: IprPhaseFormBuildDataContext
): Phase3OfficialDocumentEvidenceHashes {
  const documentFrontSha256 = getUploadHash(
    context,
    "OFFICIAL_DOCUMENT_FRONT"
  );
  const documentBackSha256 = getUploadHash(context, "OFFICIAL_DOCUMENT_BACK");
  const passportPageSha256 = getUploadHash(context, "PASSPORT_DATA_PAGE");

  return {
    ...(documentFrontSha256
      ? { document_front_sha256: documentFrontSha256 }
      : {}),
    ...(documentBackSha256
      ? { document_back_sha256: documentBackSha256 }
      : {}),
    ...(passportPageSha256
      ? { document_passport_page_sha256: passportPageSha256 }
      : {})
  };
}

function buildOfficialDocumentSnapshot(params: {
  privateFields: Phase3OfficialDocumentPrivateFields;
  hashFields: Phase3OfficialDocumentHashFields;
  evidenceHashes: Phase3OfficialDocumentEvidenceHashes;
  documentMetadataHash: string;
}): Phase3OfficialDocumentSnapshot {
  return {
    document_type: params.privateFields.document_type,
    document_country: params.privateFields.document_country,
    document_issuer: params.privateFields.document_issuer,
    document_issue_date: params.privateFields.document_issue_date,
    document_expiry_date: params.privateFields.document_expiry_date,
    document_ref: params.documentMetadataHash,
    document_hash: params.documentMetadataHash,
    identity_document_hash: params.documentMetadataHash,
    document_number_hash: params.hashFields.document_number_hash,
    document_front_sha256: params.evidenceHashes.document_front_sha256 ?? null,
    document_back_sha256: params.evidenceHashes.document_back_sha256 ?? null,
    document_passport_page_sha256:
      params.evidenceHashes.document_passport_page_sha256 ?? null,
    document_metadata_hash: params.documentMetadataHash,
    official_document_uploaded: true,
    official_document_verified: false,
    raw_document_files_in_certificate: false,
    raw_document_images_in_certificate: false,
    public_registry_mode: "HASH_ONLY"
  };
}

function buildIdentitySnapshot(params: {
  previousCertificate: HbceIprCertificate | null | undefined;
  officialDocumentSnapshot: Phase3OfficialDocumentSnapshot;
}): HbceJokerC2BiologicalIdentitySnapshot {
  const sources = getIdentitySourcesFromCertificate(params.previousCertificate);

  return {
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
    country:
      params.officialDocumentSnapshot.document_country ||
      getStringFromSources(sources, [
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
    document_ref: params.officialDocumentSnapshot.document_ref,
    phone_verified: getBooleanFromSources(sources, [
      "phone_verified",
      "is_phone_verified"
    ]),
    email_verified: getBooleanFromSources(sources, [
      "email_verified",
      "is_email_verified"
    ]),
    document_verified: false,
    liveness_verified: false,
    compliance_review_status: "OFFICIAL_DOCUMENT_SUBMITTED"
  };
}

async function buildPhase3OfficialDocumentData(
  context: IprPhaseFormBuildDataContext
): Promise<JsonObject> {
  const submittedPrivateFields = buildSubmittedPrivateFields(context);
  const privateFields = buildNormalizedPrivateFields(context);
  const hashFields = await buildHashFields(context);
  const evidenceHashes = buildEvidenceHashes(context);

  const previousPayloadSha256 =
    context.previousCertificate?.hash_integrity.payload_sha256 ?? null;

  const documentMetadataHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_3_DOCUMENT_METADATA",
    phase: "OFFICIAL_DOCUMENT_SUBMITTED",
    private_fields: privateFields,
    hash_fields: hashFields,
    evidence_hashes: evidenceHashes,
    previous_payload_sha256: previousPayloadSha256,
    issued_at: context.issuedAt
  });

  const officialDocumentSnapshot = buildOfficialDocumentSnapshot({
    privateFields,
    hashFields,
    evidenceHashes,
    documentMetadataHash
  });

  const identitySnapshot = buildIdentitySnapshot({
    previousCertificate: context.previousCertificate,
    officialDocumentSnapshot
  });

  const identitySnapshotHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_3_IDENTITY_SNAPSHOT",
    phase: "OFFICIAL_DOCUMENT_SUBMITTED",
    identity_snapshot: identitySnapshot,
    official_document_snapshot: officialDocumentSnapshot,
    previous_payload_sha256: previousPayloadSha256,
    issued_at: context.issuedAt
  });

  const enrichedPrivateFields: Phase3OfficialDocumentPrivateFields = {
    ...privateFields,
    document_ref: officialDocumentSnapshot.document_ref,
    document_hash: officialDocumentSnapshot.document_hash,
    identity_document_hash: officialDocumentSnapshot.identity_document_hash,
    document_front_sha256:
      officialDocumentSnapshot.document_front_sha256 ?? undefined,
    document_back_sha256:
      officialDocumentSnapshot.document_back_sha256 ?? undefined,
    document_passport_page_sha256:
      officialDocumentSnapshot.document_passport_page_sha256 ?? undefined,
    document_metadata_hash: officialDocumentSnapshot.document_metadata_hash,
    official_document_uploaded: true,
    official_document_verified: false,
    identity_snapshot: identitySnapshot,
    biological_identity_snapshot: identitySnapshot
  };

  return {
    certificate_role: "STEP_3_OFFICIAL_DOCUMENT_COLLECTION",
    certificate_visibility: "PRIVATE_PORTABLE_CERTIFICATE",
    public_registry_mode: "HASH_ONLY",
    phase_scope: "OFFICIAL_ID_DOCUMENT",

    private_fields: enrichedPrivateFields,
    submitted_private_fields: submittedPrivateFields,
    official_document_private_data: enrichedPrivateFields,
    official_document_private_data_included: true,

    official_document_snapshot: officialDocumentSnapshot,
    identity_snapshot: identitySnapshot,
    biological_identity_snapshot: identitySnapshot,

    hash_fields: hashFields,
    evidence_hashes: evidenceHashes,

    document_type: privateFields.document_type,
    document_country: privateFields.document_country,
    document_issuer: privateFields.document_issuer,
    document_issue_date: privateFields.document_issue_date,
    document_expiry_date: privateFields.document_expiry_date,

    document_ref: officialDocumentSnapshot.document_ref,
    document_hash: officialDocumentSnapshot.document_hash,
    identity_document_hash: officialDocumentSnapshot.identity_document_hash,
    document_metadata_hash: documentMetadataHash,
    identity_snapshot_hash: identitySnapshotHash,

    document_type_hash: hashFields.document_type_hash,
    document_number_hash: hashFields.document_number_hash,
    document_country_hash: hashFields.document_country_hash,
    document_issuer_hash: hashFields.document_issuer_hash,
    document_issue_date_hash: hashFields.document_issue_date_hash,
    document_expiry_date_hash: hashFields.document_expiry_date_hash,

    fiscal_identity_collected: true,
    fiscal_identity_verified: false,
    official_document_uploaded: true,
    official_document_verified: false,
    liveness_submitted: false,
    liveness_verified: false,
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
      liveness_submitted: false,
      liveness_verified: false,
      privacy_compliance_accepted: false,
      hbce_review_status: "NOT_STARTED",
      ipr_approved: false,
      ipr_card_issued: false,
      operational_certificate_issued: false,
      joker_c2_access: "DENIED"
    },

    joker_c2_custody: {
      custody_statement:
        "AI JOKER-C2 is the future controlled operational custodian for minimized document references, identity references and onboarding continuity inside HBCE governed runtime workflows.",
      full_data_custodian: "AI_JOKER_C2",
      custody_subject: identitySnapshot.display_name,
      custody_ipr_id: null,
      custody_certificate_id: null,
      custody_fields_present: {
        identity_snapshot: true,
        official_document_metadata: true,
        official_document_hashes: true,
        raw_document_files: false,
        raw_document_images: false
      },
      raw_documents_in_fragment: false,
      raw_document_images_in_fragment: false,
      raw_video_liveness_in_fragment: false,
      raw_biometric_templates_in_fragment: false,
      raw_face_templates_in_fragment: false,
      fragment_policy: "MINIMIZED_HANDOFF_ONLY"
    },

    previous_payload_sha256: previousPayloadSha256,
    next_required_phase: "LIVENESS_CHECK",
    issued_at: context.issuedAt,
    issued_at_utc: context.issuedAt,

    certificate_boundary:
      "This file records official document submission for the HBCE IPR onboarding chain. It does not certify final identity verification, it does not issue an IPR Card and it does not grant JOKER-C2 access.",

    privacy_boundary:
      "This is a private portable HBCE-IPR certificate downloaded by the subject. It may contain official document metadata and minimized identity references. Uploaded document files are represented only by SHA-256 hashes and must be stored in protected backend storage in production.",

    biometric_boundary:
      "This certificate does not perform liveness verification and does not store biometric templates. It prepares the document reference required for the next photo/video liveness phase.",

    trust_boundary:
      "Certificate 03 submits official document metadata and document evidence hashes only. HBCE review, IPR approval, IPR Card issuance, operational certificate activation and JOKER-C2 access remain denied.",

    raw_document_files_in_certificate: false,
    raw_document_images_in_certificate: false,

    ...evidenceHashes
  };
}

export default function Phase3OfficialDocumentPage() {
  return (
    <div className="hbce-container">
      <IprPhaseForm
        phase={phase}
        fields={fields}
        evidenceInputs={evidenceInputs}
        buildPhaseData={buildPhase3OfficialDocumentData}
        submitLabel="Generate HBCE IPR Certificate 03"
        successTitle="HBCE IPR Certificate 03 generated"
        successDescription="The private official document certificate has been generated and downloaded. It links Certificate 02 to the submitted official document metadata, document hashes, minimized identity snapshot and protected evidence references. Use this file in Phase 4 — Liveness Check."
      />
    </div>
  );
}
