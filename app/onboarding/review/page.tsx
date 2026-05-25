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

const phase = getPhaseDefinitionByNumber(6);

const REVIEW_STATEMENT =
  "The subject submits the HBCE-IPR onboarding package for HBCE review. This certificate does not approve the IPR and does not authorize IPR Card issuance.";

const SUBMIT_FOR_REVIEW_LABEL =
  "Submit this HBCE-IPR onboarding package for HBCE review.";

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

type Phase6ReviewPrivateFields = JsonObject & {
  submit_for_review: boolean;
  review_statement: string;
  review_status: "PENDING_REVIEW";
  submitted_at: string;
  user_self_approval_allowed: false;
  backend_or_admin_review_required: true;
  hbce_operator_decision_required: true;
  ipr_approval_granted: false;
  ipr_card_issuance_authorized: false;
  joker_c2_access_authorized: false;
  next_required_phase: "HBCE_APPROVAL";
  identity_snapshot?: HbceJokerC2BiologicalIdentitySnapshot;
  biological_identity_snapshot?: HbceJokerC2BiologicalIdentitySnapshot;
  physical_descriptor_profile?: HbcePhysicalDescriptorProfile;
  biometric_liveness_snapshot?: HbceJokerC2BiometricLivenessSnapshot;
};

type Phase6ReviewHashFields = JsonObject & {
  submit_for_review_hash: string;
  review_statement_hash: string;
  review_status_hash: string;
  review_boundary_hash: string;
};

const fields: IprPhaseFieldDefinition[] = [
  {
    name: "submit_for_review",
    label: SUBMIT_FOR_REVIEW_LABEL,
    type: "checkbox",
    helperText:
      "This value is included in the private HBCE-IPR certificate. It does not approve the IPR. It only creates the pending review certificate."
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
  const approvalFields = getJsonObjectField(phaseData, "approval_fields");
  const cardFields = getJsonObjectField(phaseData, "card_fields");

  const explicitBiologicalSnapshot = getFirstNestedObjectFromSources(
    [
      phaseData,
      privateFields,
      certificateFields,
      reviewFields,
      complianceFields,
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

function getSubmitForReviewValue(
  context: IprPhaseFormBuildDataContext
): boolean {
  return Boolean(context.values.submit_for_review);
}

function assertReviewSubmissionAccepted(
  context: IprPhaseFormBuildDataContext
): void {
  if (!getSubmitForReviewValue(context)) {
    throw new Error(
      "HBCE fail-closed: Certificate 06 cannot be generated until the subject explicitly submits the onboarding package for HBCE review."
    );
  }
}

function buildPrivateFields(
  context: IprPhaseFormBuildDataContext,
  identitySnapshot: HbceJokerC2BiologicalIdentitySnapshot | null
): Phase6ReviewPrivateFields {
  const physicalDescriptorProfile =
    identitySnapshot?.physical_descriptor_profile ?? null;
  const biometricLivenessSnapshot =
    identitySnapshot?.biometric_liveness_snapshot ?? null;

  return {
    submit_for_review: getSubmitForReviewValue(context),
    review_statement: REVIEW_STATEMENT,
    review_status: "PENDING_REVIEW",
    submitted_at: context.issuedAt,
    user_self_approval_allowed: false,
    backend_or_admin_review_required: true,
    hbce_operator_decision_required: true,
    ipr_approval_granted: false,
    ipr_card_issuance_authorized: false,
    joker_c2_access_authorized: false,
    next_required_phase: "HBCE_APPROVAL",
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

async function buildHashFields(
  privateFields: Phase6ReviewPrivateFields,
  previousPayloadSha256: string | null,
  issuedAt: string
): Promise<Phase6ReviewHashFields> {
  const submitForReviewHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_6_SUBMIT_FOR_REVIEW",
    phase: "PENDING_REVIEW",
    label: SUBMIT_FOR_REVIEW_LABEL,
    accepted: privateFields.submit_for_review,
    statement: REVIEW_STATEMENT,
    previous_payload_sha256: previousPayloadSha256,
    submitted_at: issuedAt
  });

  const reviewStatementHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_6_REVIEW_STATEMENT",
    phase: "PENDING_REVIEW",
    statement: REVIEW_STATEMENT,
    previous_payload_sha256: previousPayloadSha256,
    submitted_at: issuedAt
  });

  const reviewStatusHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_6_REVIEW_STATUS",
    phase: "PENDING_REVIEW",
    review_status: privateFields.review_status,
    user_self_approval_allowed: privateFields.user_self_approval_allowed,
    backend_or_admin_review_required:
      privateFields.backend_or_admin_review_required,
    hbce_operator_decision_required:
      privateFields.hbce_operator_decision_required,
    previous_payload_sha256: previousPayloadSha256,
    submitted_at: issuedAt
  });

  const reviewBoundaryHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_6_REVIEW_BOUNDARY",
    phase: "PENDING_REVIEW",
    ipr_approval_granted: privateFields.ipr_approval_granted,
    ipr_card_issuance_authorized:
      privateFields.ipr_card_issuance_authorized,
    joker_c2_access_authorized: privateFields.joker_c2_access_authorized,
    next_required_phase: privateFields.next_required_phase,
    previous_payload_sha256: previousPayloadSha256,
    submitted_at: issuedAt
  });

  return {
    submit_for_review_hash: submitForReviewHash,
    review_statement_hash: reviewStatementHash,
    review_status_hash: reviewStatusHash,
    review_boundary_hash: reviewBoundaryHash
  };
}

async function buildPhase6ReviewPendingData(
  context: IprPhaseFormBuildDataContext
): Promise<JsonObject> {
  assertReviewSubmissionAccepted(context);

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

  const hashFields = await buildHashFields(
    privateFields,
    previousPayloadSha256,
    context.issuedAt
  );

  const reviewPackageHash = await sha256Canonical({
    kind: "HBCE_IPR_PHASE_6_REVIEW_PACKAGE",
    phase: "PENDING_REVIEW",
    private_fields: privateFields,
    hash_fields: hashFields,
    identity_snapshot: identitySnapshot,
    physical_descriptor_profile: physicalDescriptorProfile,
    biometric_liveness_snapshot: biometricLivenessSnapshot,
    previous_payload_sha256: previousPayloadSha256,
    submitted_at: context.issuedAt
  });

  return {
    certificate_role: "STEP_6_REVIEW_SUBMISSION",
    certificate_visibility: "PRIVATE_PORTABLE_CERTIFICATE",
    public_registry_mode: "HASH_ONLY",
    phase_scope: "REVIEW_SUBMISSION",

    private_fields: privateFields,
    review_fields: privateFields,
    review_private_data: privateFields,
    review_private_data_included: true,

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

    submit_for_review_hash: hashFields.submit_for_review_hash,
    review_statement_hash: hashFields.review_statement_hash,
    review_status_hash: hashFields.review_status_hash,
    review_boundary_hash: hashFields.review_boundary_hash,
    review_package_hash: reviewPackageHash,

    submitted_at: context.issuedAt,
    review_status: "PENDING_REVIEW",
    user_self_approval_allowed: false,
    backend_or_admin_review_required: true,
    hbce_operator_decision_required: true,

    fiscal_identity_collected: true,
    fiscal_identity_verified: false,
    official_document_uploaded: true,
    official_document_verified: false,
    liveness_submitted: true,
    liveness_verified: Boolean(
      identitySnapshot?.liveness_verified ||
        biometricLivenessSnapshot?.liveness_verified
    ),
    biometric_verification_consent: Boolean(
      biometricLivenessSnapshot?.biometric_verification_consent
    ),
    privacy_compliance_accepted: true,

    hbce_review_status: "PENDING_REVIEW",
    ipr_approved: false,
    ipr_status: "PENDING",
    ipr_card_status: "NOT_ISSUED",
    operational_certificate_issued: false,
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
      biometric_verification_consent: Boolean(
        biometricLivenessSnapshot?.biometric_verification_consent
      ),
      privacy_compliance_accepted: true,
      hbce_review_status: "PENDING_REVIEW",
      ipr_approved: false,
      ipr_card_issued: false,
      operational_certificate_issued: false,
      joker_c2_access: "DENIED"
    },

    previous_payload_sha256: previousPayloadSha256,
    next_required_phase: "HBCE_APPROVAL",
    issued_at: context.issuedAt,
    issued_at_utc: context.issuedAt,

    certificate_boundary:
      "This file records that the HBCE IPR onboarding package has been submitted for review. It does not approve the IPR, it does not issue an IPR Card and it does not grant JOKER-C2 access.",

    privacy_boundary:
      "This is a private portable HBCE-IPR certificate downloaded by the subject. Review submission fields and minimized identity/liveness snapshots are stored inside private_fields. Public verification must expose hash-only references, not private review fields or raw biometric media.",

    trust_boundary:
      "This certificate does not approve the IPR. It only records that the onboarding package has been submitted for HBCE review. IPR approval requires the next HBCE admin/backend phase.",

    biometric_boundary:
      "The review pending certificate may carry minimized liveness references, hashes and verification states. It must not carry raw photos, raw videos, biometric templates or face templates."
  };
}

export default function OnboardingReviewPage() {
  return (
    <div className="hbce-container">
      <IprPhaseForm
        phase={phase}
        fields={fields}
        buildPhaseData={buildPhase6ReviewPendingData}
        submitLabel="Generate HBCE IPR Certificate 06"
        successTitle="HBCE IPR Certificate 06 generated"
        successDescription="The private review pending certificate has been generated and downloaded. It links Certificate 05 to the HBCE review submission state and preserves the minimized identity/liveness snapshot for HBCE approval. HBCE approval is now required before IPR Card issuance."
      />
    </div>
  );
}
