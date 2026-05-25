"use client";

import IprPhaseForm from "@/components/IprPhaseForm";

import { sha256Canonical } from "@/lib/ipr-certificate-chain";
import { getPhaseDefinitionByNumber } from "@/lib/ipr-phase-map";

import type {
  IprPhaseFieldDefinition,
  IprPhaseFormBuildDataContext
} from "@/components/IprPhaseForm";

import type {
  HbceIprCertificate,
  HbceJokerC2BiologicalIdentitySnapshot,
  HbceJokerC2BiometricLivenessSnapshot,
  HbcePhysicalDescriptorProfile,
  JsonObject
} from "@/lib/types";

const phase = getPhaseDefinitionByNumber(5);

const CONSENT_LABELS = {
  privacy_consent: "I accept data processing for IPR verification.",
  hash_only_acknowledgement:
    "I accept the hash-only portable certificate logic.",
  data_accuracy_confirmation:
    "I confirm that the inserted data are correct.",
  document_authenticity_confirmation:
    "I confirm that the uploaded documents are authentic.",
  hbce_policy_acceptance: "I accept the HBCE operational policy.",
  biometric_liveness_verification_consent:
    "I accept photo, face and video liveness references for HBCE IPR verification and anti-impersonation review.",
  joker_c2_custody_acknowledgement:
    "I accept that AI JOKER-C2 is the controlled operational custodian for minimized identity, compliance and liveness references inside the HBCE governed runtime.",
  no_state_identity_claim_acknowledgement:
    "I accept that IPR does not replace CIE, SPID, EUDI Wallet or official state identity.",
  internal_operational_identity_acknowledgement:
    "I accept that the HBCE-IPR certificate is an internal HBCE operational identity certificate."
} as const;

type ConsentFieldName = keyof typeof CONSENT_LABELS;

type Phase5ConsentRecord = JsonObject & {
  label: string;
  accepted: boolean;
};

type Phase5ConsentPrivateFields = JsonObject & {
  privacy_consent: Phase5ConsentRecord;
  hash_only_acknowledgement: Phase5ConsentRecord;
  data_accuracy_confirmation: Phase5ConsentRecord;
  document_authenticity_confirmation: Phase5ConsentRecord;
  hbce_policy_acceptance: Phase5ConsentRecord;
  biometric_liveness_verification_consent: Phase5ConsentRecord;
  joker_c2_custody_acknowledgement: Phase5ConsentRecord;
  no_state_identity_claim_acknowledgement: Phase5ConsentRecord;
  internal_operational_identity_acknowledgement: Phase5ConsentRecord;
  accepted_at: string;
  identity_snapshot?: HbceJokerC2BiologicalIdentitySnapshot;
  biological_identity_snapshot?: HbceJokerC2BiologicalIdentitySnapshot;
  physical_descriptor_profile?: HbcePhysicalDescriptorProfile;
  biometric_liveness_snapshot?: HbceJokerC2BiometricLivenessSnapshot;
};

type Phase5ConsentHashFields = JsonObject & {
  privacy_consent_hash: string;
  hash_only_acknowledgement_hash: string;
  data_accuracy_confirmation_hash: string;
  document_authenticity_confirmation_hash: string;
  hbce_policy_acceptance_hash: string;
  biometric_liveness_verification_consent_hash: string;
  joker_c2_custody_acknowledgement_hash: string;
  no_state_identity_claim_acknowledgement_hash: string;
  internal_operational_identity_acknowledgement_hash: string;
};

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

const fields: IprPhaseFieldDefinition[] = [
  {
    name: "privacy_consent",
    label: CONSENT_LABELS.privacy_consent,
    type: "checkbox",
    helperText:
      "This consent is included in the private HBCE-IPR certificate and hashed for audit verification."
  },
  {
    name: "hash_only_acknowledgement",
    label: CONSENT_LABELS.hash_only_acknowledgement,
    type: "checkbox",
    helperText:
      "The downloadable certificate may contain private fields, hashes and metadata. Public registry references remain hash-only."
  },
  {
    name: "data_accuracy_confirmation",
    label: CONSENT_LABELS.data_accuracy_confirmation,
    type: "checkbox",
    helperText:
      "This confirmation is included in the private HBCE-IPR certificate and hashed for audit verification."
  },
  {
    name: "document_authenticity_confirmation",
    label: CONSENT_LABELS.document_authenticity_confirmation,
    type: "checkbox",
    helperText:
      "This confirmation is included in the private HBCE-IPR certificate and hashed for audit verification."
  },
  {
    name: "hbce_policy_acceptance",
    label: CONSENT_LABELS.hbce_policy_acceptance,
    type: "checkbox",
    helperText:
      "This acceptance is included in the private HBCE-IPR certificate and hashed for audit verification."
  },
  {
    name: "biometric_liveness_verification_consent",
    label: CONSENT_LABELS.biometric_liveness_verification_consent,
    type: "checkbox",
    helperText:
      "This consent covers minimized photo, face and liveness references only. Raw photos, raw videos and biometric templates are not stored in the portable certificate."
  },
  {
    name: "joker_c2_custody_acknowledgement",
    label: CONSENT_LABELS.joker_c2_custody_acknowledgement,
    type: "checkbox",
    helperText:
      "This acknowledgement records that JOKER-C2 acts as the controlled operational custodian for minimized identity and liveness references in governed runtime workflows."
  },
  {
    name: "no_state_identity_claim_acknowledgement",
    label: CONSENT_LABELS.no_state_identity_claim_acknowledgement,
    type: "checkbox",
    helperText:
      "This boundary is included in the private HBCE-IPR certificate and hashed for audit verification."
  },
  {
    name: "internal_operational_identity_acknowledgement",
    label: CONSENT_LABELS.internal_operational_identity_acknowledgement,
    type: "checkbox",
    helperText:
      "This boundary is included in the private HBCE-IPR certificate and hashed for audit verification."
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

function getIdentitySourcesFromCertificate(
  certificate: HbceIprCertificate | null | undefined
): JsonObject[] {
  if (!certificate) {
    return [];
  }

  const phaseData = certificate.payload.phase_data;
  const privateFields = getJsonObjectField(phaseData, "private_fields");
  const certificateFields = getJsonObjectField(phaseData, "certificate_fields");
  const reviewFields = getJsonObjectField(phaseData, "review_fields");
  const complianceFields = getJsonObjectField(phaseData, "compliance_fields");
  const consentFields = getJsonObjectField(phaseData, "consent_fields");
  const approvalFields = getJsonObjectField(phaseData, "approval_fields");
  const cardFields = getJsonObjectField(phaseData, "card_fields");

  const explicitBiologicalSnapshot = getFirstNestedObjectFromSources(
    [
      phaseData,
      privateFields,
      certificateFields,
      reviewFields,
      complianceFields,
      consentFields,
      approvalFields,
      cardFields
    ],
    ["biological_identity_snapshot"]
  );

  const explicitIdentitySnapshot = getFirstNestedObjectFromSources(
    [
      phaseData,
      privateFields,
      certificateFields,
      reviewFields,
      complianceFields,
      consentFields,
      approvalFields,
      cardFields
    ],
    ["identity_snapshot"]
  );

  return [
    explicitBiologicalSnapshot,
    explicitIdentitySnapshot,
    privateFields,
    certificateFields,
    reviewFields,
    complianceFields,
    consentFields,
    approvalFields,
    cardFields,
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
  certificate: HbceIprCertificate | null | undefined
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
  certificate: HbceIprCertificate | null | undefined
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
  certificate: HbceIprCertificate | null | undefined
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

function getConsentLabel(fieldName: ConsentFieldName): string {
  return CONSENT_LABELS[fieldName];
}

function getBooleanValue(
  context: IprPhaseFormBuildDataContext,
  fieldName: ConsentFieldName
): boolean {
  return Boolean(context.values[fieldName]);
}

function buildConsentRecord(
  context: IprPhaseFormBuildDataContext,
  fieldName: ConsentFieldName
): Phase5ConsentRecord {
  return {
    label: getConsentLabel(fieldName),
    accepted: getBooleanValue(context, fieldName)
  };
}

function assertRequiredConsentsAccepted(
  context: IprPhaseFormBuildDataContext
): void {
  const missingConsents = (Object.keys(CONSENT_LABELS) as ConsentFieldName[])
    .filter((fieldName) => !getBooleanValue(context, fieldName))
    .map(getConsentLabel);

  if (missingConsents.length > 0) {
    throw new Error(
      `HBCE fail-closed: Certificate 05 requires every privacy, compliance, liveness and operational custody acknowledgement. Missing: ${missingConsents.join(
        " | "
      )}`
    );
  }
}

function buildPrivateFields(
  context: IprPhaseFormBuildDataContext,
  identitySnapshot: HbceJokerC2BiologicalIdentitySnapshot | null
): Phase5ConsentPrivateFields {
  const physicalDescriptorProfile =
    identitySnapshot?.physical_descriptor_profile ?? null;
  const biometricLivenessSnapshot =
    identitySnapshot?.biometric_liveness_snapshot ?? null;

  return {
    privacy_consent: buildConsentRecord(context, "privacy_consent"),
    hash_only_acknowledgement: buildConsentRecord(
      context,
      "hash_only_acknowledgement"
    ),
    data_accuracy_confirmation: buildConsentRecord(
      context,
      "data_accuracy_confirmation"
    ),
    document_authenticity_confirmation: buildConsentRecord(
      context,
      "document_authenticity_confirmation"
    ),
    hbce_policy_acceptance: buildConsentRecord(
      context,
      "hbce_policy_acceptance"
    ),
    biometric_liveness_verification_consent: buildConsentRecord(
      context,
      "biometric_liveness_verification_consent"
    ),
    joker_c2_custody_acknowledgement: buildConsentRecord(
      context,
      "joker_c2_custody_acknowledgement"
    ),
    no_state_identity_claim_acknowledgement: buildConsentRecord(
      context,
      "no_state_identity_claim_acknowledgement"
    ),
    internal_operational_identity_acknowledgement: buildConsentRecord(
      context,
      "internal_operational_identity_acknowledgement"
    ),
    accepted_at: context.issuedAt,
    ...(identitySnapshot
      ? {
          identity_snapshot: identitySnapshot,
          biological_identity_snapshot: identitySnapshot
        }
      : {}),
    ...(physicalDescriptorProfile
      ? { physical_descriptor_profile: physicalDescriptorProfile }
      : {}),
    ...(biometricLivenessSnapshot
      ? { biometric_liveness_snapshot: biometricLivenessSnapshot }
      : {})
  };
}

async function hashConsent(
  context: IprPhaseFormBuildDataContext,
  fieldName: ConsentFieldName
): Promise<string> {
  return sha256Canonical({
    kind: "HBCE_IPR_PHASE_5_PRIVACY_COMPLIANCE_CONSENT",
    phase: "COMPLIANCE_ACCEPTED",
    field: fieldName,
    label: getConsentLabel(fieldName),
    accepted: getBooleanValue(context, fieldName),
    previous_payload_sha256:
      context.previousCertificate?.hash_integrity.payload_sha256 ?? null,
    issued_at: context.issuedAt
  });
}

async function buildHashFields(
  context: IprPhaseFormBuildDataContext
): Promise<Phase5ConsentHashFields> {
  return {
    privacy_consent_hash: await hashConsent(context, "privacy_consent"),
    hash_only_acknowledgement_hash: await hashConsent(
      context,
      "hash_only_acknowledgement"
    ),
    data_accuracy_confirmation_hash: await hashConsent(
      context,
      "data_accuracy_confirmation"
    ),
    document_authenticity_confirmation_hash: await hashConsent(
      context,
      "document_authenticity_confirmation"
    ),
    hbce_policy_acceptance_hash: await hashConsent(
      context,
      "hbce_policy_acceptance"
    ),
    biometric_liveness_verification_consent_hash: await hashConsent(
      context,
      "biometric_liveness_verification_consent"
    ),
    joker_c2_custody_acknowledgement_hash: await hashConsent(
      context,
      "joker_c2_custody_acknowledgement"
    ),
    no_state_identity_claim_acknowledgement_hash: await hashConsent(
      context,
      "no_state_identity_claim_acknowledgement"
    ),
    internal_operational_identity_acknowledgement_hash: await hashConsent(
      context,
      "internal_operational_identity_acknowledgement"
    )
  };
}

async function buildPhase5PrivacyComplianceData(
  context: IprPhaseFormBuildDataContext
): Promise<JsonObject> {
  assertRequiredConsentsAccepted(context);

  const previousPayloadSha256 =
    context.previousCertificate?.hash_integrity.payload_sha256 ?? null;

  const identitySnapshot = buildIdentitySnapshotFromCertificate(
    context.previousCertificate
  );
  const physicalDescriptorProfile =
    identitySnapshot?.physical_descriptor_profile ?? null;
  const biometricLivenessSnapshot =
    identitySnapshot?.biometric_liveness_snapshot ?? null;

  const privateFields = buildPrivateFields(context, identitySnapshot);
  const hashFields = await buildHashFields(context);

  const termsConsentHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_5_TERMS_CONSENT",
    phase: "COMPLIANCE_ACCEPTED",
    private_fields: privateFields,
    hash_fields: hashFields,
    identity_snapshot: identitySnapshot,
    physical_descriptor_profile: physicalDescriptorProfile,
    biometric_liveness_snapshot: biometricLivenessSnapshot,
    previous_payload_sha256: previousPayloadSha256,
    issued_at: context.issuedAt
  });

  const identityVerificationConsentHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_5_IDENTITY_VERIFICATION_CONSENT",
    phase: "COMPLIANCE_ACCEPTED",
    data_accuracy_confirmation:
      privateFields.data_accuracy_confirmation.accepted,
    document_authenticity_confirmation:
      privateFields.document_authenticity_confirmation.accepted,
    privacy_consent: privateFields.privacy_consent.accepted,
    biometric_liveness_verification_consent:
      privateFields.biometric_liveness_verification_consent.accepted,
    joker_c2_custody_acknowledgement:
      privateFields.joker_c2_custody_acknowledgement.accepted,
    biometric_liveness_snapshot: biometricLivenessSnapshot,
    previous_payload_sha256: previousPayloadSha256,
    issued_at: context.issuedAt
  });

  const biometricLivenessConsentHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_5_BIOMETRIC_LIVENESS_CONSENT",
    phase: "COMPLIANCE_ACCEPTED",
    biometric_liveness_verification_consent:
      privateFields.biometric_liveness_verification_consent.accepted,
    biometric_verification_consent:
      privateFields.biometric_liveness_verification_consent.accepted,
    joker_c2_custody_acknowledgement:
      privateFields.joker_c2_custody_acknowledgement.accepted,
    raw_photo_in_certificate: false,
    raw_video_in_certificate: false,
    raw_media_in_public_registry: false,
    biometric_template_generated: false,
    face_template_generated: false,
    biometric_liveness_snapshot: biometricLivenessSnapshot,
    previous_payload_sha256: previousPayloadSha256,
    issued_at: context.issuedAt
  });

  const jokerC2CustodyAcknowledgementHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_5_JOKER_C2_CUSTODY_ACKNOWLEDGEMENT",
    phase: "COMPLIANCE_ACCEPTED",
    accepted:
      privateFields.joker_c2_custody_acknowledgement.accepted,
    custody_mode: "JOKER_C2_CONTROLLED_CUSTODY",
    full_data_custodian: "AI_JOKER_C2",
    fragment_policy: "MINIMIZED_HANDOFF_ONLY",
    raw_documents_in_fragment: false,
    raw_document_images_in_fragment: false,
    raw_video_liveness_in_fragment: false,
    raw_biometric_templates_in_fragment: false,
    raw_face_templates_in_fragment: false,
    previous_payload_sha256: previousPayloadSha256,
    issued_at: context.issuedAt
  });

  return {
    certificate_role: "STEP_5_PRIVACY_COMPLIANCE_ACCEPTANCE",
    certificate_visibility: "PRIVATE_PORTABLE_CERTIFICATE",
    public_registry_mode: "HASH_ONLY",
    phase_scope: "PRIVACY_COMPLIANCE",

    private_fields: privateFields,
    consent_fields: privateFields,
    consent_private_data: privateFields,
    consent_private_data_included: true,

    ...(identitySnapshot
      ? {
          identity_snapshot: identitySnapshot,
          biological_identity_snapshot: identitySnapshot
        }
      : {}),
    ...(physicalDescriptorProfile
      ? { physical_descriptor_profile: physicalDescriptorProfile }
      : {}),
    ...(biometricLivenessSnapshot
      ? { biometric_liveness_snapshot: biometricLivenessSnapshot }
      : {}),

    hash_fields: hashFields,

    privacy_consent_hash: hashFields.privacy_consent_hash,
    hash_only_acknowledgement_hash:
      hashFields.hash_only_acknowledgement_hash,
    data_accuracy_confirmation_hash:
      hashFields.data_accuracy_confirmation_hash,
    document_authenticity_confirmation_hash:
      hashFields.document_authenticity_confirmation_hash,
    hbce_policy_acceptance_hash:
      hashFields.hbce_policy_acceptance_hash,
    biometric_liveness_verification_consent_hash:
      hashFields.biometric_liveness_verification_consent_hash,
    joker_c2_custody_acknowledgement_hash:
      hashFields.joker_c2_custody_acknowledgement_hash,
    no_state_identity_claim_acknowledgement_hash:
      hashFields.no_state_identity_claim_acknowledgement_hash,
    internal_operational_identity_acknowledgement_hash:
      hashFields.internal_operational_identity_acknowledgement_hash,

    terms_consent_hash: termsConsentHash,
    identity_verification_consent_hash: identityVerificationConsentHash,
    biometric_liveness_consent_hash: biometricLivenessConsentHash,
    joker_c2_custody_acknowledgement_record_hash:
      jokerC2CustodyAcknowledgementHash,

    gdpr_min_acknowledgement:
      privateFields.privacy_consent.accepted &&
      privateFields.hash_only_acknowledgement.accepted,
    hash_only_acknowledgement:
      privateFields.hash_only_acknowledgement.accepted,
    data_accuracy_confirmation:
      privateFields.data_accuracy_confirmation.accepted,
    document_authenticity_confirmation:
      privateFields.document_authenticity_confirmation.accepted,
    hbce_policy_acceptance: privateFields.hbce_policy_acceptance.accepted,
    biometric_liveness_verification_consent:
      privateFields.biometric_liveness_verification_consent.accepted,
    biometric_verification_consent:
      privateFields.biometric_liveness_verification_consent.accepted,
    joker_c2_custody_acknowledgement:
      privateFields.joker_c2_custody_acknowledgement.accepted,
    no_state_identity_claim_acknowledgement:
      privateFields.no_state_identity_claim_acknowledgement.accepted,
    internal_operational_identity_acknowledgement:
      privateFields.internal_operational_identity_acknowledgement.accepted,

    fiscal_identity_collected: true,
    fiscal_identity_verified: false,
    official_document_uploaded: true,
    official_document_verified: false,
    liveness_submitted: true,
    liveness_verified: Boolean(
      identitySnapshot?.liveness_verified ||
        biometricLivenessSnapshot?.liveness_verified
    ),
    privacy_compliance_accepted: true,
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
      liveness_verified: Boolean(
        identitySnapshot?.liveness_verified ||
          biometricLivenessSnapshot?.liveness_verified
      ),
      biometric_verification_consent:
        privateFields.biometric_liveness_verification_consent.accepted,
      joker_c2_custody_acknowledgement:
        privateFields.joker_c2_custody_acknowledgement.accepted,
      privacy_compliance_accepted: true,
      hbce_review_status: "NOT_STARTED",
      ipr_approved: false,
      ipr_card_issued: false,
      operational_certificate_issued: false,
      joker_c2_access: "DENIED"
    },

    joker_c2_custody: {
      custody_statement:
        "AI JOKER-C2 is the controlled operational custodian for minimized identity, compliance, document-reference and liveness-reference data inside HBCE governed runtime workflows.",
      full_data_custodian: "AI_JOKER_C2",
      custody_subject: identitySnapshot?.display_name ?? null,
      custody_ipr_id: null,
      custody_certificate_id: null,
      custody_fields_present: {
        identity_snapshot: Boolean(identitySnapshot),
        physical_descriptors: Boolean(physicalDescriptorProfile),
        biometric_liveness_media: Boolean(biometricLivenessSnapshot),
        biometric_liveness_consent:
          privateFields.biometric_liveness_verification_consent.accepted,
        joker_c2_custody_acknowledgement:
          privateFields.joker_c2_custody_acknowledgement.accepted
      },
      raw_documents_in_fragment: false,
      raw_document_images_in_fragment: false,
      raw_video_liveness_in_fragment: false,
      raw_biometric_templates_in_fragment: false,
      raw_face_templates_in_fragment: false,
      fragment_policy: "MINIMIZED_HANDOFF_ONLY"
    },

    previous_payload_sha256: previousPayloadSha256,
    next_required_phase: "REVIEW_SUBMISSION",
    issued_at: context.issuedAt,
    issued_at_utc: context.issuedAt,

    certificate_boundary:
      "This file records privacy, compliance, identity-verification, liveness-consent and JOKER-C2 custody acknowledgement for the HBCE IPR onboarding chain. It does not certify final identity verification, it does not issue an IPR Card and it does not grant JOKER-C2 access.",

    privacy_boundary:
      "This is a private portable HBCE-IPR certificate downloaded by the subject. It may contain consent statements, acceptance values and minimized identity/liveness snapshots. Public verification must expose hash-only references, not private consent fields or raw biometric media.",

    biometric_boundary:
      "The privacy and compliance certificate may carry minimized liveness references, hashes and verification states. It must not carry raw photos, raw videos, biometric templates or face templates.",

    trust_boundary:
      "Certificate 05 records privacy and compliance acceptance only. It does not approve the IPR, does not issue the IPR Card, does not activate the operational certificate and does not grant JOKER-C2 access."
  };
}

export default function Phase5PrivacyCompliancePage() {
  return (
    <div className="hbce-container">
      <IprPhaseForm
        phase={phase}
        fields={fields}
        buildPhaseData={buildPhase5PrivacyComplianceData}
        submitLabel="Generate HBCE IPR Certificate 05"
        successTitle="HBCE IPR Certificate 05 generated"
        successDescription="The private privacy and compliance certificate has been generated and downloaded. It links Certificate 04 to accepted consent statements, identity verification consent, biometric liveness consent, JOKER-C2 custody acknowledgement and their hash references. Use this file in Phase 6 — HBCE Review Submission."
      />
    </div>
  );
}
