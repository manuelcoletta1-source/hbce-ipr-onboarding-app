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

type Phase2FiscalPrivateFields = JsonObject & {
  tax_id: string;
  citizenship: string;
  fiscal_country: string;
  fiscal_document_type: string;
  fiscal_or_tax_identifier_ref?: string;
  tax_id_value_hash?: string;
  tax_id_metadata_hash?: string;
  tax_id_document_front_sha256?: string;
  tax_id_document_back_sha256?: string;
  tax_id_document_sha256?: string;
  fiscal_identity_collected?: true;
  fiscal_identity_verified?: false;
  identity_snapshot?: HbceJokerC2BiologicalIdentitySnapshot;
  biological_identity_snapshot?: HbceJokerC2BiologicalIdentitySnapshot;
};

type Phase2FiscalHashFields = JsonObject & {
  tax_id_value_hash: string;
  citizenship_hash: string;
  fiscal_country_hash: string;
  fiscal_document_type_hash: string;
};

type Phase2FiscalEvidenceHashes = JsonObject & {
  tax_id_document_front_sha256?: string;
  tax_id_document_back_sha256?: string;
  tax_id_document_sha256?: string;
};

type Phase2FiscalIdentitySnapshot = JsonObject & {
  fiscal_or_tax_identifier_ref: string;
  tax_id_value_hash: string;
  tax_id_metadata_hash: string;
  tax_id_document_front_sha256: string | null;
  tax_id_document_back_sha256: string | null;
  tax_id_document_sha256: string | null;
  citizenship: string;
  fiscal_country: string;
  fiscal_document_type: string;
  fiscal_identity_collected: true;
  fiscal_identity_verified: false;
  raw_fiscal_documents_in_certificate: false;
  raw_fiscal_document_images_in_certificate: false;
  public_registry_mode: "HASH_ONLY";
};

const phase = getPhaseDefinitionByNumber(2);

const fields: IprPhaseFieldDefinition[] = [
  {
    name: "tax_id",
    label: "Codice fiscale / Tax ID / National Tax Identifier",
    type: "text",
    placeholder: "RSSMRA88B05A944X",
    helperText:
      "Fiscal identity value. It is included in the private HBCE-IPR certificate and hashed for audit verification."
  },
  {
    name: "citizenship",
    label: "Citizenship",
    type: "text",
    placeholder: "IT",
    helperText:
      "Citizenship value declared by the subject. It is included in the private certificate and hashed."
  },
  {
    name: "fiscal_country",
    label: "Fiscal country",
    type: "text",
    placeholder: "IT",
    helperText:
      "Fiscal jurisdiction declared by the subject. It is included in the private certificate and hashed."
  },
  {
    name: "fiscal_document_type",
    label: "Fiscal document type",
    type: "select",
    options: [
      {
        label: "Italian tessera sanitaria / codice fiscale",
        value: "ITALIAN_TESSERA_SANITARIA"
      },
      {
        label: "Italian codice fiscale certificate",
        value: "ITALIAN_CODICE_FISCALE"
      },
      {
        label: "EU tax ID document",
        value: "EU_TAX_ID_DOCUMENT"
      },
      {
        label: "National fiscal document",
        value: "NATIONAL_FISCAL_DOCUMENT"
      },
      {
        label: "Other authorized fiscal document",
        value: "OTHER_AUTHORIZED_FISCAL_DOCUMENT"
      }
    ],
    helperText:
      "The selected fiscal evidence type is included in the private certificate. Uploaded documents are represented only by SHA-256 hashes."
  }
];

const evidenceInputs: IprPhaseEvidenceInputDefinition[] = [
  {
    kind: "TAX_ID_DOCUMENT_FRONT",
    label: "Upload tessera sanitaria / tax ID document front",
    description:
      "Upload the front side of the tessera sanitaria, codice fiscale card or equivalent fiscal document. The file itself is not embedded in the certificate; only its SHA-256 hash is stored.",
    accept: "image/*,.pdf",
    required: true
  },
  {
    kind: "TAX_ID_DOCUMENT_BACK",
    label: "Upload tessera sanitaria / tax ID document back",
    description:
      "Upload the back side of the tessera sanitaria, codice fiscale card or equivalent fiscal document. The file itself is not embedded in the certificate; only its SHA-256 hash is stored.",
    accept: "image/*,.pdf",
    required: true
  },
  {
    kind: "TAX_ID_DOCUMENT_SINGLE",
    label: "Optional single fiscal certificate",
    description:
      "Use this only when the fiscal evidence is a single-page certificate instead of a front/back card. The file itself is not embedded in the certificate; only its SHA-256 hash is stored.",
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
  const registrationFields = getJsonObjectField(phaseData, "registration_fields");
  const contactFields = getJsonObjectField(phaseData, "contact_fields");
  const identityFields = getJsonObjectField(phaseData, "identity_fields");
  const verificationState = getJsonObjectField(phaseData, "verification_state");

  const explicitBiologicalSnapshot = getFirstNestedObjectFromSources(
    [
      phaseData,
      privateFields,
      certificateFields,
      registrationFields,
      contactFields,
      identityFields,
      verificationState
    ],
    ["biological_identity_snapshot"]
  );

  const explicitIdentitySnapshot = getFirstNestedObjectFromSources(
    [
      phaseData,
      privateFields,
      certificateFields,
      registrationFields,
      contactFields,
      identityFields,
      verificationState
    ],
    ["identity_snapshot"]
  );

  return [
    explicitBiologicalSnapshot,
    explicitIdentitySnapshot,
    privateFields,
    certificateFields,
    registrationFields,
    contactFields,
    identityFields,
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

function normalizeTaxId(value: string): string {
  return value.replace(/\s+/g, "").trim().toUpperCase();
}

function normalizeCountryCode(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeDocumentType(value: string): string {
  return value.trim().toUpperCase();
}

function getNormalizedPhase2Value(
  context: IprPhaseFormBuildDataContext,
  fieldName: string
): string {
  const rawValue = getRawStringValue(context, fieldName);

  switch (fieldName) {
    case "tax_id":
      return normalizeTaxId(rawValue);
    case "citizenship":
    case "fiscal_country":
      return normalizeCountryCode(rawValue);
    case "fiscal_document_type":
      return normalizeDocumentType(rawValue);
    default:
      return rawValue;
  }
}

async function hashPhaseValue(
  context: IprPhaseFormBuildDataContext,
  fieldName: string
): Promise<string> {
  return sha256Canonical({
    kind: "HBCE_IPR_PHASE_2_FISCAL_FIELD",
    phase: "FISCAL_IDENTITY_COLLECTED",
    field: fieldName,
    value: getNormalizedPhase2Value(context, fieldName),
    previous_payload_sha256:
      context.previousCertificate?.hash_integrity.payload_sha256 ?? null,
    issued_at: context.issuedAt
  });
}

function getUploadHash(
  context: IprPhaseFormBuildDataContext,
  kind:
    | "TAX_ID_DOCUMENT_FRONT"
    | "TAX_ID_DOCUMENT_BACK"
    | "TAX_ID_DOCUMENT_SINGLE"
): string | null {
  return context.uploads.find((upload) => upload.kind === kind)?.sha256 ?? null;
}

function buildSubmittedPrivateFields(
  context: IprPhaseFormBuildDataContext
): Phase2FiscalPrivateFields {
  return {
    tax_id: getRawStringValue(context, "tax_id"),
    citizenship: getRawStringValue(context, "citizenship"),
    fiscal_country: getRawStringValue(context, "fiscal_country"),
    fiscal_document_type: getRawStringValue(context, "fiscal_document_type")
  };
}

function buildNormalizedPrivateFields(
  context: IprPhaseFormBuildDataContext
): Phase2FiscalPrivateFields {
  return {
    tax_id: getNormalizedPhase2Value(context, "tax_id"),
    citizenship: getNormalizedPhase2Value(context, "citizenship"),
    fiscal_country: getNormalizedPhase2Value(context, "fiscal_country"),
    fiscal_document_type: getNormalizedPhase2Value(
      context,
      "fiscal_document_type"
    )
  };
}

async function buildHashFields(
  context: IprPhaseFormBuildDataContext
): Promise<Phase2FiscalHashFields> {
  return {
    tax_id_value_hash: await hashPhaseValue(context, "tax_id"),
    citizenship_hash: await hashPhaseValue(context, "citizenship"),
    fiscal_country_hash: await hashPhaseValue(context, "fiscal_country"),
    fiscal_document_type_hash: await hashPhaseValue(
      context,
      "fiscal_document_type"
    )
  };
}

function buildEvidenceHashes(
  context: IprPhaseFormBuildDataContext
): Phase2FiscalEvidenceHashes {
  const taxIdDocumentFrontSha256 = getUploadHash(
    context,
    "TAX_ID_DOCUMENT_FRONT"
  );
  const taxIdDocumentBackSha256 = getUploadHash(
    context,
    "TAX_ID_DOCUMENT_BACK"
  );
  const taxIdDocumentSingleSha256 = getUploadHash(
    context,
    "TAX_ID_DOCUMENT_SINGLE"
  );

  return {
    ...(taxIdDocumentFrontSha256
      ? { tax_id_document_front_sha256: taxIdDocumentFrontSha256 }
      : {}),
    ...(taxIdDocumentBackSha256
      ? { tax_id_document_back_sha256: taxIdDocumentBackSha256 }
      : {}),
    ...(taxIdDocumentSingleSha256
      ? { tax_id_document_sha256: taxIdDocumentSingleSha256 }
      : {})
  };
}

function buildFiscalIdentitySnapshot(params: {
  privateFields: Phase2FiscalPrivateFields;
  hashFields: Phase2FiscalHashFields;
  evidenceHashes: Phase2FiscalEvidenceHashes;
  metadataHash: string;
}): Phase2FiscalIdentitySnapshot {
  return {
    fiscal_or_tax_identifier_ref: params.hashFields.tax_id_value_hash,
    tax_id_value_hash: params.hashFields.tax_id_value_hash,
    tax_id_metadata_hash: params.metadataHash,
    tax_id_document_front_sha256:
      params.evidenceHashes.tax_id_document_front_sha256 ?? null,
    tax_id_document_back_sha256:
      params.evidenceHashes.tax_id_document_back_sha256 ?? null,
    tax_id_document_sha256:
      params.evidenceHashes.tax_id_document_sha256 ?? null,
    citizenship: params.privateFields.citizenship,
    fiscal_country: params.privateFields.fiscal_country,
    fiscal_document_type: params.privateFields.fiscal_document_type,
    fiscal_identity_collected: true,
    fiscal_identity_verified: false,
    raw_fiscal_documents_in_certificate: false,
    raw_fiscal_document_images_in_certificate: false,
    public_registry_mode: "HASH_ONLY"
  };
}

function buildIdentitySnapshot(params: {
  previousCertificate: HbceIprCertificate | null | undefined;
  fiscalIdentitySnapshot: Phase2FiscalIdentitySnapshot;
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
    nationality:
      params.fiscalIdentitySnapshot.citizenship ||
      getStringFromSources(sources, ["nationality", "citizenship"]),
    country:
      params.fiscalIdentitySnapshot.fiscal_country ||
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
    fiscal_or_tax_identifier_ref:
      params.fiscalIdentitySnapshot.fiscal_or_tax_identifier_ref,
    document_ref: getStringFromSources(sources, [
      "document_ref",
      "document_hash",
      "identity_document_hash",
      "document_identifier_ref",
      "document_number_hash"
    ]),
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
    compliance_review_status: "FISCAL_IDENTITY_COLLECTED"
  };
}

async function buildPhase2FiscalIdentityData(
  context: IprPhaseFormBuildDataContext
): Promise<JsonObject> {
  const submittedPrivateFields = buildSubmittedPrivateFields(context);
  const privateFields = buildNormalizedPrivateFields(context);
  const hashFields = await buildHashFields(context);
  const evidenceHashes = buildEvidenceHashes(context);

  const previousPayloadSha256 =
    context.previousCertificate?.hash_integrity.payload_sha256 ?? null;

  const metadataHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_2_FISCAL_METADATA",
    phase: "FISCAL_IDENTITY_COLLECTED",
    private_fields: privateFields,
    hash_fields: hashFields,
    evidence_hashes: evidenceHashes,
    previous_payload_sha256: previousPayloadSha256,
    issued_at: context.issuedAt
  });

  const fiscalIdentitySnapshot = buildFiscalIdentitySnapshot({
    privateFields,
    hashFields,
    evidenceHashes,
    metadataHash
  });

  const identitySnapshot = buildIdentitySnapshot({
    previousCertificate: context.previousCertificate,
    fiscalIdentitySnapshot
  });

  const identitySnapshotHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_2_IDENTITY_SNAPSHOT",
    phase: "FISCAL_IDENTITY_COLLECTED",
    identity_snapshot: identitySnapshot,
    fiscal_identity_snapshot: fiscalIdentitySnapshot,
    previous_payload_sha256: previousPayloadSha256,
    issued_at: context.issuedAt
  });

  const enrichedPrivateFields: Phase2FiscalPrivateFields = {
    ...privateFields,
    fiscal_or_tax_identifier_ref:
      fiscalIdentitySnapshot.fiscal_or_tax_identifier_ref,
    tax_id_value_hash: fiscalIdentitySnapshot.tax_id_value_hash,
    tax_id_metadata_hash: fiscalIdentitySnapshot.tax_id_metadata_hash,
    tax_id_document_front_sha256:
      fiscalIdentitySnapshot.tax_id_document_front_sha256 ?? undefined,
    tax_id_document_back_sha256:
      fiscalIdentitySnapshot.tax_id_document_back_sha256 ?? undefined,
    tax_id_document_sha256:
      fiscalIdentitySnapshot.tax_id_document_sha256 ?? undefined,
    fiscal_identity_collected: true,
    fiscal_identity_verified: false,
    identity_snapshot: identitySnapshot,
    biological_identity_snapshot: identitySnapshot
  };

  return {
    certificate_role: "STEP_2_FISCAL_IDENTITY_COLLECTION",
    certificate_visibility: "PRIVATE_PORTABLE_CERTIFICATE",
    public_registry_mode: "HASH_ONLY",
    phase_scope: "FISCAL_IDENTITY",

    private_fields: enrichedPrivateFields,
    submitted_private_fields: submittedPrivateFields,
    fiscal_private_data: enrichedPrivateFields,
    fiscal_private_data_included: true,

    fiscal_identity_snapshot: fiscalIdentitySnapshot,
    identity_snapshot: identitySnapshot,
    biological_identity_snapshot: identitySnapshot,

    hash_fields: hashFields,
    evidence_hashes: evidenceHashes,

    tax_id_value_hash: hashFields.tax_id_value_hash,
    citizenship_hash: hashFields.citizenship_hash,
    fiscal_country_hash: hashFields.fiscal_country_hash,
    fiscal_document_type_hash: hashFields.fiscal_document_type_hash,
    tax_id_metadata_hash: metadataHash,
    identity_snapshot_hash: identitySnapshotHash,

    fiscal_or_tax_identifier_ref:
      fiscalIdentitySnapshot.fiscal_or_tax_identifier_ref,
    citizenship: privateFields.citizenship,
    fiscal_country: privateFields.fiscal_country,
    fiscal_document_type: privateFields.fiscal_document_type,

    fiscal_identity_collected: true,
    fiscal_identity_verified: false,
    official_document_uploaded: false,
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
      official_document_uploaded: false,
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
        "AI JOKER-C2 is the future controlled operational custodian for minimized fiscal identity references, identity references and onboarding continuity inside HBCE governed runtime workflows.",
      full_data_custodian: "AI_JOKER_C2",
      custody_subject: identitySnapshot.display_name,
      custody_ipr_id: null,
      custody_certificate_id: null,
      custody_fields_present: {
        identity_snapshot: true,
        fiscal_identity_metadata: true,
        fiscal_identity_hashes: true,
        raw_fiscal_documents: false,
        raw_fiscal_document_images: false
      },
      raw_documents_in_fragment: false,
      raw_document_images_in_fragment: false,
      raw_video_liveness_in_fragment: false,
      raw_biometric_templates_in_fragment: false,
      raw_face_templates_in_fragment: false,
      fragment_policy: "MINIMIZED_HANDOFF_ONLY"
    },

    previous_payload_sha256: previousPayloadSha256,
    next_required_phase: "OFFICIAL_ID_DOCUMENT",
    issued_at: context.issuedAt,
    issued_at_utc: context.issuedAt,

    certificate_boundary:
      "This file records fiscal identity collection for the HBCE IPR onboarding chain. It does not certify final identity verification, it does not issue an IPR Card and it does not grant JOKER-C2 access.",

    privacy_boundary:
      "This is a private portable HBCE-IPR certificate downloaded by the subject. It may contain fiscal identity values and minimized identity references. Uploaded fiscal evidence is represented only by SHA-256 hashes and must be stored in protected backend storage in production.",

    biometric_boundary:
      "This certificate does not perform liveness verification and does not store biometric templates. It prepares the fiscal identity reference required for official document and liveness phases.",

    trust_boundary:
      "Certificate 02 collects fiscal identity metadata and fiscal evidence hashes only. HBCE review, IPR approval, IPR Card issuance, operational certificate activation and JOKER-C2 access remain denied.",

    raw_fiscal_documents_in_certificate: false,
    raw_fiscal_document_images_in_certificate: false,

    ...evidenceHashes
  };
}

export default function Phase2FiscalIdentityPage() {
  return (
    <div className="hbce-container">
      <IprPhaseForm
        phase={phase}
        fields={fields}
        evidenceInputs={evidenceInputs}
        buildPhaseData={buildPhase2FiscalIdentityData}
        submitLabel="Generate HBCE IPR Certificate 02"
        successTitle="HBCE IPR Certificate 02 generated"
        successDescription="The private fiscal identity certificate has been generated and downloaded. It links Certificate 01 to the declared fiscal identity, minimized identity snapshot, fiscal evidence hashes and protected fiscal references. Use this file in Phase 3 — Official ID Document."
      />
    </div>
  );
}
