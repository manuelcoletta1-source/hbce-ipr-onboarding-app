export type HashReference = string;
export type IsoDateTime = string;
export type StorageReference = string;
export type RouteReference = string;

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export type JsonObject = {
  [key: string]: JsonValue;
};

/**
 * HBCE IPR canonical protocols.
 *
 * These types define the portable certificate chain used by the
 * HBCE IPR Onboarding App.
 *
 * The application releases progressive `.hbce.json` certificates.
 * Each certificate contains the hash of the previous certificate and
 * becomes the required input for the next onboarding phase.
 */
export type HbceIprReleaseProtocol = "HBCE-IPR-RELEASE-v3";

export type HbceIprPayloadProtocol = "HBCE-IPR-PAYLOAD-v3";

export type HbceIprCertificateKind =
  | "IPR_PHASE_CERTIFICATE"
  | "IPR_OPERATIONAL_CERTIFICATE";

export type HbceJurisdiction = "EU";

export type HbceHashAlgorithm = "SHA-256";

export type HbceCanonicalization = "stableStringify(keys-sorted)";

export type HbceTimezone = "Europe/Rome";

export type HbceIssuer = {
  hallmark: "HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA";
  legal_name: "HERMETICUM B.C.E. S.r.l.";
  jurisdiction: HbceJurisdiction;
};

export type HbceIprPolicy = {
  UE_FIRST: true;
  AUDIT_FIRST: true;
  FAIL_CLOSED: true;
  HASH_ONLY: true;
  GDPR_MIN: true;
  APPEND_ONLY: true;
  NO_PUBLIC_IDENTITY_CUSTODY: true;
};

export type HbceIprPhaseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type HbceIprCertificatePhaseCode =
  | "SUBJECT_CREATED"
  | "FISCAL_IDENTITY_COLLECTED"
  | "OFFICIAL_DOCUMENT_SUBMITTED"
  | "LIVENESS_SUBMITTED"
  | "COMPLIANCE_ACCEPTED"
  | "PENDING_REVIEW"
  | "IPR_APPROVED"
  | "IPR_CARD_ISSUED"
  | "IPR_VERIFIED";

export type HbceIprNextPhaseCode =
  | "FISCAL_IDENTITY"
  | "OFFICIAL_ID_DOCUMENT"
  | "LIVENESS_CHECK"
  | "PRIVACY_COMPLIANCE"
  | "REVIEW_SUBMISSION"
  | "HBCE_APPROVAL"
  | "IPR_CARD_ISSUANCE"
  | "OPERATIONAL_CERTIFICATE"
  | "JOKER_C2_ACCESS"
  | "COMPLETED";

export type HbceIprPhaseRuntimeStatus =
  | "ACTIVE"
  | "PENDING"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "REQUEST_MORE_DATA"
  | "EXPIRED"
  | "REVOKED"
  | "SUSPENDED"
  | "COMPLETED";

export type HbceIprPhase = {
  number: HbceIprPhaseNumber;
  code: HbceIprCertificatePhaseCode;
  status: HbceIprPhaseRuntimeStatus;
  next_required_phase: HbceIprNextPhaseCode;
};

export type HbceSubjectEntityType =
  | "HUMAN"
  | "AI_SOFTWARE"
  | "ORGANIZATION"
  | "OPERATOR"
  | "SERVICE";

export type HbceIprSubject = {
  entity_type: HbceSubjectEntityType;
  subject_ref: HashReference;
  subject_id?: string;
};

export type HbceIprHashIntegrity = {
  algo: HbceHashAlgorithm;
  canonicalization: HbceCanonicalization;
  previous_payload_sha256: HashReference | null;
  payload_sha256: HashReference;
};

export type HbceIprPayloadEnvelope<
  TPhaseData extends JsonObject = JsonObject
> = {
  proto: HbceIprPayloadProtocol;
  jurisdiction: HbceJurisdiction;
  policy: HbceIprPolicy;
  phase_data: TPhaseData;
};

export type HbceIprRegistryKind =
  | "HASH_ONLY_PUBLIC_ENTRY"
  | "HASH_ONLY_PRIVATE_OR_PUBLIC_ENTRY";

export type HbceIprRegistryPublicEntry = {
  payload_sha256: HashReference;
  timestamp: IsoDateTime;
  phase: HbceIprCertificatePhaseCode;
};

export type HbceIprRegistry = {
  kind: HbceIprRegistryKind;
  public_entry: HbceIprRegistryPublicEntry;
};

export type HbceIprNext = {
  upload_required: boolean;
  next_phase: HbceIprNextPhaseCode;
};

export type HbceIprCertificateBase<
  TPhaseData extends JsonObject = JsonObject
> = {
  proto: HbceIprReleaseProtocol;
  kind: HbceIprCertificateKind;
  issuer: HbceIssuer;
  phase: HbceIprPhase;
  subject: HbceIprSubject;
  hash_integrity: HbceIprHashIntegrity;
  payload: HbceIprPayloadEnvelope<TPhaseData>;
  registry: HbceIprRegistry;
  next: HbceIprNext;
  issued_at: IsoDateTime;
};

export type HbceIprPhaseCertificate<
  TPhaseData extends JsonObject = JsonObject
> = HbceIprCertificateBase<TPhaseData> & {
  kind: "IPR_PHASE_CERTIFICATE";
};

export type HbceIprOperationalCertificate<
  TPhaseData extends JsonObject = JsonObject
> = HbceIprCertificateBase<TPhaseData> & {
  kind: "IPR_OPERATIONAL_CERTIFICATE";
  certificate_status: "ACTIVE" | "EXPIRED" | "REVOKED" | "SUSPENDED";
  certificate_scope: "JOKER_C2_ACCESS";
};

export type HbceIprCertificate<TPhaseData extends JsonObject = JsonObject> =
  | HbceIprPhaseCertificate<TPhaseData>
  | HbceIprOperationalCertificate<TPhaseData>;

export type HbceIprCertificateFileName =
  | "hbce-ipr-01-subject-created.hbce.json"
  | "hbce-ipr-02-fiscal-identity.hbce.json"
  | "hbce-ipr-03-official-document.hbce.json"
  | "hbce-ipr-04-liveness-submitted.hbce.json"
  | "hbce-ipr-05-privacy-compliance.hbce.json"
  | "hbce-ipr-06-review-pending.hbce.json"
  | "hbce-ipr-07-ipr-approved.hbce.json"
  | "hbce-ipr-08-ipr-card.hbce.json"
  | "hbce-ipr-09-operational-certificate.hbce.json";

export type HbceIprRoute =
  | "/"
  | "/onboarding"
  | "/onboarding/phase-1"
  | "/onboarding/phase-2"
  | "/onboarding/phase-3"
  | "/onboarding/photo-video"
  | "/onboarding/phase-4"
  | "/onboarding/phase-5"
  | "/onboarding/review"
  | "/admin/review"
  | "/ipr-card"
  | "/certificate"
  | "/access/joker-c2"
  | "/legal"
  | "/privacy"
  | "/security";

export type HbceIprPhaseDefinition = {
  phase_number: HbceIprPhaseNumber;
  phase_code: HbceIprCertificatePhaseCode;
  route: HbceIprRoute;
  file_name: HbceIprCertificateFileName;
  expected_previous_phase: HbceIprCertificatePhaseCode | null;
  expected_previous_file_name: HbceIprCertificateFileName | null;
  next_required_phase: HbceIprNextPhaseCode;
  title: string;
  description: string;
  requires_previous_certificate: boolean;
  requires_hbce_operator: boolean;
  required_fields: string[];
  required_uploads: HbceEvidenceUploadKind[];
};

export type HbcePrivateCustomerFields = JsonObject & {
  email: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  country: string;
  date_of_birth: string;
};

export type HbceSubjectCreatedHashFields = JsonObject & {
  email_hash: HashReference;
  phone_hash: HashReference;
  first_name_hash: HashReference;
  last_name_hash: HashReference;
  country_hash: HashReference;
  date_of_birth_hash: HashReference;
};

export type HbceLocalTimestamp = JsonObject & {
  utc: IsoDateTime;
  local: IsoDateTime;
  timezone: HbceTimezone;
};

export type HbceInitialVerificationState = JsonObject & {
  email_verified: false;
  phone_verified: false;
  fiscal_identity_verified: false;
  official_document_uploaded: false;
  official_document_verified: false;
  liveness_verified: false;
  privacy_compliance_accepted: false;
  hbce_review_status: "NOT_STARTED";
  ipr_approved: false;
  ipr_card_issued: false;
  operational_certificate_issued: false;
  joker_c2_access: "DENIED";
};

/**
 * HBCE physical descriptor and liveness verification types.
 *
 * These types do not store raw biometric media. They describe the minimized
 * operational layer used by the onboarding certificate chain.
 */
export type HbceFaceMatchStatus =
  | "NOT_STARTED"
  | "PENDING"
  | "MATCHED"
  | "FAILED"
  | "MANUAL_REVIEW";

export type HbceLivenessChallenge =
  | "HEAD_TURN_LEFT_RIGHT"
  | "HEAD_TURN_RIGHT_LEFT"
  | "RANDOM_PROMPT"
  | "MANUAL_OPERATOR_PROMPT"
  | "MANUAL";

export type HbceLivenessReviewStatus =
  | "submitted"
  | "manual_review"
  | "approved"
  | "rejected";

export type HbcePhysicalDescriptorProfile = JsonObject & {
  height_cm: number | null;
  weight_kg: number | null;
  body_build: string | null;
  eye_color: string | null;
  hair_color: string | null;
  hair_type: string | null;
  visible_scars: string | null;
  tattoos: string | null;
  piercings: string | null;
  distinctive_marks: string | null;
  descriptor_accuracy_declaration: boolean;
};

export type HbceJokerC2BiometricLivenessSnapshot = JsonObject & {
  document_face_reference: StorageReference | null;
  selfie_reference: StorageReference | null;
  liveness_video_reference: StorageReference | null;
  document_face_sha256: HashReference | null;
  selfie_sha256: HashReference | null;
  video_sha256: HashReference | null;
  liveness_declaration_sha256: HashReference | null;
  face_match_status: HbceFaceMatchStatus;
  face_match_method: string | null;
  liveness_challenge: HbceLivenessChallenge;
  liveness_verified: boolean;
  liveness_timestamp: IsoDateTime | null;
  photo_verification_status: HbceLivenessReviewStatus | null;
  video_verification_status: HbceLivenessReviewStatus | null;
  liveness_status: HbceLivenessReviewStatus | null;
  biometric_verification_consent: boolean;
  manual_review_required: boolean;
  raw_photo_in_certificate: false;
  raw_video_in_certificate: false;
  raw_media_in_public_registry?: false;
  biometric_template_generated: false;
  face_template_generated: false;
  custody_mode: "JOKER_C2_CONTROLLED_CUSTODY";
};

export type HbceJokerC2CustodyReference = JsonObject & {
  custodian: "AI_JOKER_C2";
  custody_mode: "JOKER_C2_CONTROLLED_CUSTODY";
  raw_photo_in_certificate: false;
  raw_video_in_certificate: false;
  raw_media_in_public_registry: false;
  certificate_contains: "hashes_references_states_only";
};

/**
 * JOKER-C2 identity handoff types.
 *
 * These types define the controlled identity bridge between the HBCE IPR
 * Onboarding App and the AI JOKER-C2 runtime.
 *
 * The public registry remains hash-only. The browser handoff must remain
 * minimized. Full compliance data custody belongs to the controlled JOKER-C2
 * runtime/backend layer, not to public routes or public registry records.
 */
export type HbceJokerC2HandoffVersion = "HBCE-JOKER-C2-IPR-HANDOFF-v1";

export type HbceJokerC2HandoffTransport = "URL_FRAGMENT_BASE64URL_JSON";

export type HbceJokerC2CustodyMode = "JOKER_C2_CONTROLLED_CUSTODY";

export type HbceJokerC2FragmentPolicy = "MINIMIZED_HANDOFF_ONLY";

export type HbceJokerC2RuntimeTarget = "AI_JOKER_C2";

export type HbceJokerC2SourceApp = "HBCE_IPR_ONBOARDING_APP";

export type HbceJokerC2SourceRoute = "/access/joker-c2";

export type HbceJokerC2IssuerHandoff = JsonObject & {
  hallmark: string | null;
  legal_name: "HERMETICUM B.C.E. S.r.l.";
  jurisdiction: HbceJurisdiction | null;
};

export type HbceJokerC2BiologicalIdentitySnapshot = JsonObject & {
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
  physical_descriptor_profile?: HbcePhysicalDescriptorProfile;
  biometric_liveness_snapshot?: HbceJokerC2BiometricLivenessSnapshot;
};

export type HbceJokerC2CustodyFieldPresence = JsonObject & {
  identity_name: boolean;
  birth_data: boolean;
  contact_data: boolean;
  fiscal_or_tax_identifier_reference: boolean;
  document_reference: boolean;
  phone_verification: boolean;
  email_verification: boolean;
  document_verification: boolean;
  liveness_verification: boolean;
  compliance_review: boolean;
  physical_descriptors?: boolean;
  biometric_liveness_media?: boolean;
  face_match_verification?: boolean;
  document_face_comparison?: boolean;
};

export type HbceJokerC2ComplianceCustody = JsonObject & {
  custody_statement: string;
  full_data_custodian: HbceJokerC2RuntimeTarget;
  custody_subject: string | null;
  custody_ipr_id: string | null;
  custody_certificate_id: string | null;
  custody_fields_present: HbceJokerC2CustodyFieldPresence;
  raw_documents_in_fragment: false;
  raw_document_images_in_fragment: false;
  raw_video_liveness_in_fragment: false;
  raw_biometric_templates_in_fragment?: false;
  raw_face_templates_in_fragment?: false;
  fragment_policy: HbceJokerC2FragmentPolicy;
};

export type HbceJokerC2GatewayHandoff = JsonObject & {
  source_app: HbceJokerC2SourceApp;
  source_route: HbceJokerC2SourceRoute;
  target_runtime: HbceJokerC2RuntimeTarget;
  target_url: string;
  transport: HbceJokerC2HandoffTransport;
  custody_mode: HbceJokerC2CustodyMode;
};

export type HbceJokerC2AccessHandoffDecision = JsonObject & {
  decision: "ACCESS_GRANTED";
  checked_at: IsoDateTime;
  reason: string;
};

export type HbceJokerC2CertificateHandoffReference = JsonObject & {
  file_name: string;
  proto: HbceIprReleaseProtocol;
  kind: HbceIprCertificateKind;
  phase_code: HbceIprCertificatePhaseCode;
  phase_status: HbceIprPhaseRuntimeStatus;
  certificate_id: string | null;
  certificate_status: "ACTIVE" | "EXPIRED" | "REVOKED" | "SUSPENDED" | null;
  certificate_scope: "JOKER_C2_ACCESS" | null;
  ipr_id: string | null;
  subject_id: string | null;
  card_serial: string | null;
  issued_at: IsoDateTime | null;
  valid_until: IsoDateTime | null;
};

export type HbceJokerC2HandoffIntegrity = JsonObject & {
  payload_sha256: HashReference;
  previous_payload_sha256: HashReference | null;
  handoff_payload_canonicalization: "JSON_STRINGIFY_BASE64URL_CLIENT_MVP";
};

export type HbceJokerC2RuntimeClaims = JsonObject & {
  no_simple_email_access: true;
  no_simple_subscription_access: true;
  ipr_verified_required: true;
  joker_c2_identity_bound_session: true;
  governed_runtime_required: true;
};

export type HbceJokerC2HandoffBoundary = JsonObject & {
  statement: string;
  production_upgrade: string;
};

export type HbceJokerC2IdentityHandoff = JsonObject & {
  handoff_version: HbceJokerC2HandoffVersion;
  handoff_id: string;
  issued_at: IsoDateTime;
  expires_at: IsoDateTime;
  issuer: HbceJokerC2IssuerHandoff;
  gateway: HbceJokerC2GatewayHandoff;
  access: HbceJokerC2AccessHandoffDecision;
  certificate: HbceJokerC2CertificateHandoffReference;
  biological_identity: HbceJokerC2BiologicalIdentitySnapshot;
  compliance_custody: HbceJokerC2ComplianceCustody;
  integrity: HbceJokerC2HandoffIntegrity;
  runtime_claims: HbceJokerC2RuntimeClaims;
  boundary: HbceJokerC2HandoffBoundary;
};

export type HbceJokerC2OperationalCertificatePrivateFields = JsonObject & {
  certificate_id: string;
  ipr_id: string;
  subject_id: string;
  card_serial: string;
  certificate_status: "ACTIVE";
  certificate_scope: "JOKER_C2_ACCESS";
  issuer: "HERMETICUM B.C.E. S.r.l.";
  issued_at: IsoDateTime;
  valid_until: IsoDateTime;
  identity_snapshot?: HbceJokerC2BiologicalIdentitySnapshot;
  biological_identity_snapshot?: HbceJokerC2BiologicalIdentitySnapshot;
  physical_descriptor_profile?: HbcePhysicalDescriptorProfile;
  biometric_liveness_snapshot?: HbceJokerC2BiometricLivenessSnapshot;
  joker_c2_custody?: HbceJokerC2ComplianceCustody;
};

/**
 * Phase 1 payload.
 *
 * This is the first HBCE IPR step.
 * It records customer profile creation and client intake.
 * It does not certify verified identity, it does not issue an IPR Card
 * and it does not grant JOKER-C2 access.
 */
export type HbcePhase1SubjectCreatedData = JsonObject &
  HbceSubjectCreatedHashFields & {
    certificate_role?: "STEP_1_CLIENT_INTAKE";
    certificate_visibility?: "PRIVATE_PORTABLE_CERTIFICATE";
    certificate_boundary?: string;
    privacy_boundary?: string;
    public_registry_mode?: "HASH_ONLY";
    subject_creation_mode?: "SELF_INITIATED_IPR_REQUEST";
    ipr_status?: "NOT_YET_ISSUED";
    ipr_card_status?: "NOT_ISSUED";
    joker_c2_access?: "DENIED";
    issued_at?: IsoDateTime;
    issued_at_utc?: IsoDateTime;
    issued_at_local?: IsoDateTime;
    created_at?: HbceLocalTimestamp;
    created_at_utc?: IsoDateTime;
    created_at_local?: IsoDateTime;
    timezone?: HbceTimezone;
    previous_payload_sha256?: HashReference | null;
    next_required_phase?: HbceIprNextPhaseCode;
    private_fields?: HbcePrivateCustomerFields;
    client_private_data?: HbcePrivateCustomerFields | JsonValue;
    client_private_data_included?: boolean;
    hash_fields?: HbceSubjectCreatedHashFields;
    verification_state?: HbceInitialVerificationState;
  };

/**
 * Phase 2 payload.
 */
export type HbcePhase2FiscalIdentityData = JsonObject & {
  tax_id_value_hash: HashReference;
  tax_id_document_front_sha256?: HashReference;
  tax_id_document_back_sha256?: HashReference;
  tax_id_document_sha256?: HashReference;
  tax_id_metadata_hash: HashReference;
  citizenship_hash: HashReference;
  fiscal_country_hash: HashReference;
  issued_at?: IsoDateTime;
  issued_at_utc?: IsoDateTime;
  issued_at_local?: IsoDateTime;
  timezone?: HbceTimezone;
  previous_payload_sha256?: HashReference | null;
  next_required_phase?: HbceIprNextPhaseCode;
};

/**
 * Phase 3 payload.
 */
export type HbcePhase3OfficialDocumentData = JsonObject & {
  document_type: HbceOfficialDocumentType;
  document_country: string;
  document_number_hash: HashReference;
  document_issuer_hash: HashReference;
  document_issue_date_hash: HashReference;
  document_expiry_date_hash: HashReference;
  document_front_sha256?: HashReference;
  document_back_sha256?: HashReference;
  document_passport_page_sha256?: HashReference;
  document_metadata_hash: HashReference;
  issued_at?: IsoDateTime;
  issued_at_utc?: IsoDateTime;
  issued_at_local?: IsoDateTime;
  timezone?: HbceTimezone;
  previous_payload_sha256?: HashReference | null;
  next_required_phase?: HbceIprNextPhaseCode;
};

/**
 * Phase 4 payload.
 *
 * This phase stores protected references, SHA-256 hashes, verification states
 * and custody boundaries for face/photo/video liveness. It must not contain raw
 * photo files, raw video files, face templates or biometric templates.
 */
export type HbcePhase4LivenessData = JsonObject & {
  selfie_sha256: HashReference;
  video_sha256: HashReference;
  liveness_declaration_sha256: HashReference;
  liveness_timestamp: IsoDateTime;
  document_face_reference?: StorageReference;
  selfie_reference?: StorageReference;
  liveness_video_reference?: StorageReference;
  document_face_sha256?: HashReference;
  photo_reference?: StorageReference;
  video_reference?: StorageReference;
  photo_hash?: HashReference;
  video_hash?: HashReference;
  photo_verification_status?: HbceLivenessReviewStatus;
  video_verification_status?: HbceLivenessReviewStatus;
  liveness_status?: HbceLivenessReviewStatus;
  face_match_status?: HbceFaceMatchStatus;
  face_match_method?: string;
  liveness_challenge?: HbceLivenessChallenge;
  liveness_verified?: boolean;
  biometric_verification_consent?: boolean;
  manual_review_required?: boolean;
  physical_descriptor_profile?: HbcePhysicalDescriptorProfile;
  biometric_liveness_snapshot?: HbceJokerC2BiometricLivenessSnapshot;
  joker_c2_custody_reference?: HbceJokerC2CustodyReference;
  issued_at?: IsoDateTime;
  issued_at_utc?: IsoDateTime;
  issued_at_local?: IsoDateTime;
  timezone?: HbceTimezone;
  previous_payload_sha256?: HashReference | null;
  next_required_phase?: HbceIprNextPhaseCode;
};

/**
 * Phase 5 payload.
 */
export type HbcePhase5PrivacyComplianceData = JsonObject & {
  privacy_consent_hash: HashReference;
  terms_consent_hash: HashReference;
  identity_verification_consent_hash: HashReference;
  gdpr_min_acknowledgement: true;
  hash_only_acknowledgement: true;
  no_state_identity_claim_acknowledgement: true;
  internal_operational_identity_acknowledgement: true;
  biometric_liveness_consent_hash?: HashReference;
  photo_video_liveness_consent_hash?: HashReference;
  joker_c2_custody_acknowledgement?: true;
  issued_at?: IsoDateTime;
  issued_at_utc?: IsoDateTime;
  issued_at_local?: IsoDateTime;
  timezone?: HbceTimezone;
  previous_payload_sha256?: HashReference | null;
  next_required_phase?: HbceIprNextPhaseCode;
};

/**
 * Phase 6 payload.
 */
export type HbcePhase6ReviewPendingData = JsonObject & {
  review_package_hash: HashReference;
  submitted_at: IsoDateTime;
  issued_at?: IsoDateTime;
  issued_at_utc?: IsoDateTime;
  issued_at_local?: IsoDateTime;
  timezone?: HbceTimezone;
  previous_payload_sha256?: HashReference | null;
  next_required_phase?: HbceIprNextPhaseCode;
};

/**
 * Phase 7 payload.
 */
export type HbcePhase7IprApprovedData = JsonObject & {
  approved_by: string;
  approved_at: IsoDateTime;
  approval_decision_hash: HashReference;
  approval_decision: "APPROVE";
  issued_at?: IsoDateTime;
  issued_at_utc?: IsoDateTime;
  issued_at_local?: IsoDateTime;
  timezone?: HbceTimezone;
  previous_payload_sha256?: HashReference | null;
  next_required_phase?: HbceIprNextPhaseCode;
};

/**
 * Phase 8 payload.
 */
export type HbcePhase8IprCardData = JsonObject & {
  ipr_id: string;
  subject_id: string;
  card_serial: string;
  card_status: "ACTIVE";
  issuer: "HERMETICUM B.C.E. S.r.l.";
  issued_at: IsoDateTime;
  issued_at_utc?: IsoDateTime;
  issued_at_local?: IsoDateTime;
  timezone?: HbceTimezone;
  valid_until: IsoDateTime;
  previous_payload_sha256?: HashReference | null;
  next_required_phase?: HbceIprNextPhaseCode;
};

/**
 * Phase 9 payload.
 *
 * The operational certificate is the final portable certificate used by the
 * JOKER-C2 access gate. It carries the operational IPR references and may also
 * carry a minimized private identity snapshot for controlled JOKER-C2 custody.
 */
export type HbcePhase9OperationalCertificateData = JsonObject & {
  certificate_id: string;
  ipr_id: string;
  subject_id: string;
  card_serial: string;
  certificate_status: "ACTIVE";
  certificate_scope: "JOKER_C2_ACCESS";
  issuer: "HERMETICUM B.C.E. S.r.l.";
  issued_at: IsoDateTime;
  issued_at_utc?: IsoDateTime;
  issued_at_local?: IsoDateTime;
  timezone?: HbceTimezone;
  valid_until: IsoDateTime;
  previous_payload_sha256?: HashReference | null;
  next_required_phase?: HbceIprNextPhaseCode;
  private_fields?: HbceJokerC2OperationalCertificatePrivateFields;
  certificate_fields?: HbceJokerC2OperationalCertificatePrivateFields;
  identity_snapshot?: HbceJokerC2BiologicalIdentitySnapshot;
  biological_identity_snapshot?: HbceJokerC2BiologicalIdentitySnapshot;
  physical_descriptor_profile?: HbcePhysicalDescriptorProfile;
  biometric_liveness_snapshot?: HbceJokerC2BiometricLivenessSnapshot;
  joker_c2_custody?: HbceJokerC2ComplianceCustody;
};

export type HbceIprPhaseData =
  | HbcePhase1SubjectCreatedData
  | HbcePhase2FiscalIdentityData
  | HbcePhase3OfficialDocumentData
  | HbcePhase4LivenessData
  | HbcePhase5PrivacyComplianceData
  | HbcePhase6ReviewPendingData
  | HbcePhase7IprApprovedData
  | HbcePhase8IprCardData
  | HbcePhase9OperationalCertificateData;

export type HbceOfficialDocumentType =
  | "ITALIAN_CIE"
  | "EU_IDENTITY_CARD"
  | "DRIVING_LICENCE"
  | "PASSPORT"
  | "RESIDENCE_DOCUMENT"
  | "OTHER_AUTHORIZED_OFFICIAL_DOCUMENT";

export type HbceFiscalDocumentType =
  | "ITALIAN_TESSERA_SANITARIA"
  | "ITALIAN_CODICE_FISCALE"
  | "EU_TAX_ID_DOCUMENT"
  | "NATIONAL_FISCAL_DOCUMENT"
  | "NATIONAL_TAX_IDENTIFIER_CERTIFICATE"
  | "OTHER_AUTHORIZED_FISCAL_DOCUMENT";

export type HbceEvidenceUploadKind =
  | "TAX_ID_DOCUMENT_FRONT"
  | "TAX_ID_DOCUMENT_BACK"
  | "TAX_ID_DOCUMENT_SINGLE"
  | "CIE_FRONT"
  | "CIE_BACK"
  | "DRIVING_LICENCE_FRONT"
  | "DRIVING_LICENCE_BACK"
  | "PASSPORT_DATA_PAGE"
  | "OFFICIAL_DOCUMENT_FRONT"
  | "OFFICIAL_DOCUMENT_BACK"
  | "DOCUMENT_FACE_IMAGE"
  | "SELFIE"
  | "VIDEO_VERIFICATION"
  | "LIVENESS_VIDEO";

export type HbceEvidenceUpload = {
  kind: HbceEvidenceUploadKind;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  sha256: HashReference;
  storage_reference?: StorageReference;
  uploaded_at: IsoDateTime;
};

export type HbcePreviousCertificateUpload = {
  file_name: HbceIprCertificateFileName | string;
  certificate: HbceIprCertificate;
  uploaded_at: IsoDateTime;
};

export type HbceCertificateGenerationInput<
  TPhaseData extends JsonObject = JsonObject
> = {
  phase_number: HbceIprPhaseNumber;
  phase_code: HbceIprCertificatePhaseCode;
  phase_status: HbceIprPhaseRuntimeStatus;
  next_required_phase: HbceIprNextPhaseCode;
  subject: HbceIprSubject;
  previous_certificate?: HbceIprCertificate | null;
  previous_payload_sha256: HashReference | null;
  phase_data: TPhaseData;
  evidence_uploads?: HbceEvidenceUpload[];
  issued_at: IsoDateTime;
};

export type HbceGeneratedCertificate<
  TPhaseData extends JsonObject = JsonObject
> = {
  file_name: HbceIprCertificateFileName;
  certificate: HbceIprCertificate<TPhaseData>;
  payload_sha256: HashReference;
  previous_payload_sha256: HashReference | null;
  generated_at: IsoDateTime;
};

export type HbceFailClosedReason =
  | "MISSING_PREVIOUS_CERTIFICATE"
  | "INVALID_JSON"
  | "INVALID_PROTO"
  | "INVALID_KIND"
  | "INVALID_ISSUER"
  | "INVALID_PHASE"
  | "INVALID_NEXT_PHASE"
  | "MISSING_PAYLOAD_HASH"
  | "MISSING_PREVIOUS_HASH"
  | "HASH_MISMATCH"
  | "MISSING_REQUIRED_FIELD"
  | "MISSING_REQUIRED_UPLOAD"
  | "REVOKED"
  | "SUSPENDED"
  | "EXPIRED"
  | "UNDER_REVIEW"
  | "NOT_OPERATIONAL_CERTIFICATE"
  | "INVALID_CERTIFICATE_SCOPE"
  | "MISSING_IDENTITY_SNAPSHOT"
  | "MISSING_LIVENESS_SNAPSHOT"
  | "INVALID_BIOMETRIC_LIVENESS_SCOPE";

export type HbceCertificateValidationDecision = "VALID" | "FAIL_CLOSED";

export type HbceCertificateValidationResult = {
  decision: HbceCertificateValidationDecision;
  valid: boolean;
  reason?: HbceFailClosedReason;
  message: string;
  expected_phase?: HbceIprCertificatePhaseCode;
  received_phase?: HbceIprCertificatePhaseCode;
  expected_next_phase?: HbceIprNextPhaseCode;
  received_next_phase?: HbceIprNextPhaseCode;
  payload_sha256?: HashReference;
  previous_payload_sha256?: HashReference | null;
  checked_at: IsoDateTime;
};

export type HbceJokerC2AccessGateResult = {
  decision: "ACCESS_GRANTED" | "ACCESS_DENIED";
  certificate_status?: "ACTIVE" | "EXPIRED" | "REVOKED" | "SUSPENDED";
  certificate_scope?: "JOKER_C2_ACCESS";
  payload_sha256?: HashReference;
  previous_payload_sha256?: HashReference | null;
  reason: string;
  checked_at: IsoDateTime;
};

/**
 * Legacy application status types.
 *
 * These remain available because existing pages/components may already
 * depend on the lower-case runtime status model.
 */
export type OnboardingStatus =
  | "not_started"
  | "started"
  | "in_progress"
  | "pending_review"
  | "approved"
  | "rejected"
  | "needs_more_information"
  | "expired"
  | "revoked"
  | "suspended"
  | "completed";

export type VerificationStatus =
  | "not_started"
  | "pending"
  | "submitted"
  | "in_review"
  | "manual_review"
  | "approved"
  | "rejected"
  | "expired"
  | "needs_more_information";

export type IprStatus =
  | "not_created"
  | "pending"
  | "verified"
  | "rejected"
  | "expired"
  | "revoked"
  | "suspended";

export type IprCardStatus =
  | "not_issued"
  | "pending"
  | "issued"
  | "expired"
  | "revoked"
  | "suspended";

export type CertificateStatus =
  | "not_created"
  | "pending"
  | "active"
  | "expired"
  | "revoked"
  | "suspended";

export type RevocationState =
  | "clear"
  | "suspended"
  | "revoked"
  | "expired"
  | "under_review";

export type JokerAccessStatus =
  | "denied"
  | "pending"
  | "enabled"
  | "disabled"
  | "revoked"
  | "suspended";

export type AccessDecision =
  | "deny_access"
  | "allow_governed_access"
  | "pending_access";

export type OnboardingStep =
  | "start"
  | "identity"
  | "documents"
  | "fiscal"
  | "photo_video"
  | "review"
  | "ipr_card"
  | "certificate"
  | "joker_c2_access"
  | "completed"
  | "blocked"
  | "phase_1_subject"
  | "phase_2_fiscal_identity"
  | "phase_3_official_document"
  | "phase_4_liveness"
  | "phase_5_privacy_compliance"
  | "phase_6_review_pending"
  | "phase_7_ipr_approved"
  | "phase_8_ipr_card"
  | "phase_9_operational_certificate";

export type DocumentType =
  | "identity_card"
  | "passport"
  | "driving_license"
  | "residence_document"
  | "other_official_document"
  | "italian_cie"
  | "eu_identity_card"
  | "national_identity_card";

export type FiscalIdentifierType =
  | "fiscal_code"
  | "tax_identifier"
  | "national_identification_number"
  | "social_security_style_number"
  | "other_public_identifier"
  | "italian_codice_fiscale"
  | "italian_tessera_sanitaria"
  | "eu_tax_id"
  | "national_tax_identifier";

export type ReviewDecision =
  | "none"
  | "approve"
  | "reject"
  | "request_more_information"
  | "expire"
  | "revoke"
  | "suspend";

export type EventType =
  | "ONBOARDING_STARTED"
  | "EMAIL_REGISTERED"
  | "EMAIL_VERIFIED"
  | "SUBJECT_CREATED"
  | "IDENTITY_DATA_SUBMITTED"
  | "FISCAL_IDENTIFIER_SUBMITTED"
  | "FISCAL_IDENTITY_COLLECTED"
  | "DOCUMENT_SUBMITTED"
  | "OFFICIAL_DOCUMENT_SUBMITTED"
  | "PHOTO_VIDEO_SUBMITTED"
  | "LIVENESS_SUBMITTED"
  | "PRIVACY_COMPLIANCE_ACCEPTED"
  | "REVIEW_STARTED"
  | "REVIEW_SUBMITTED"
  | "REVIEW_APPROVED"
  | "REVIEW_REJECTED"
  | "REVIEW_NEEDS_MORE_INFORMATION"
  | "IPR_VERIFIED"
  | "IPR_CARD_ISSUED"
  | "CERTIFICATE_CREATED"
  | "OPERATIONAL_CERTIFICATE_CREATED"
  | "JOKER_C2_ACCESS_ENABLED"
  | "JOKER_C2_ACCESS_DENIED"
  | "IPR_SUSPENDED"
  | "IPR_REVOKED";

export type RecordTargetType =
  | "ipr"
  | "ipr_card"
  | "certificate"
  | "joker_c2_access"
  | "onboarding_record"
  | "hbce_ipr_phase_certificate"
  | "hbce_ipr_operational_certificate";

export type SubjectRecord = {
  subjectId: string;
  emailHash: HashReference;
  firstName: string;
  lastName: string;
  country: string;
  preferredLanguage: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type IdentityProfile = {
  identityProfileId: string;
  subjectId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  country: string;
  nationality: string;
  residentialCountry: string;
  residentialRegion?: string;
  residentialCity?: string;
  identityDataStatus: VerificationStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type DocumentRecord = {
  documentRecordId: string;
  subjectId: string;
  onboardingId: string;
  documentType: DocumentType;
  documentCountry: string;
  documentExpiryDate: string;
  documentNumberHash: HashReference;
  documentFileHash: HashReference;
  documentStorageReference: StorageReference;
  documentFrontHash?: HashReference;
  documentBackHash?: HashReference;
  documentPassportPageHash?: HashReference;
  documentFrontStorageReference?: StorageReference;
  documentBackStorageReference?: StorageReference;
  documentPassportPageStorageReference?: StorageReference;
  documentStatus: VerificationStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type FiscalIdentifierRecord = {
  fiscalIdentifierId: string;
  subjectId: string;
  onboardingId: string;
  fiscalIdentifierType: FiscalIdentifierType;
  fiscalIdentifierCountry: string;
  fiscalIdentifierHash: HashReference;
  fiscalIdentifierMasked: string;
  fiscalDocumentFrontHash?: HashReference;
  fiscalDocumentBackHash?: HashReference;
  fiscalDocumentHash?: HashReference;
  fiscalDocumentFrontStorageReference?: StorageReference;
  fiscalDocumentBackStorageReference?: StorageReference;
  fiscalDocumentStorageReference?: StorageReference;
  fiscalIdentifierStatus: VerificationStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type PhotoVideoVerificationRecord = {
  photoVideoVerificationId: string;
  subjectId: string;
  onboardingId: string;
  photoReference: StorageReference;
  videoReference: StorageReference;
  photoHash: HashReference;
  videoHash: HashReference;
  documentFaceReference?: StorageReference;
  documentFaceHash?: HashReference;
  selfieReference?: StorageReference;
  selfieHash?: HashReference;
  livenessVideoReference?: StorageReference;
  livenessVideoHash?: HashReference;
  livenessDeclarationHash?: HashReference;
  faceMatchStatus?: HbceFaceMatchStatus;
  faceMatchMethod?: string;
  livenessChallenge?: HbceLivenessChallenge;
  livenessVerified?: boolean;
  biometricVerificationConsent?: boolean;
  physicalDescriptorProfile?: HbcePhysicalDescriptorProfile;
  biometricLivenessSnapshot?: HbceJokerC2BiometricLivenessSnapshot;
  photoVerificationStatus: VerificationStatus;
  videoVerificationStatus: VerificationStatus;
  livenessStatus: VerificationStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type ReviewRecord = {
  reviewId: string;
  subjectId: string;
  onboardingId: string;
  reviewStatus: VerificationStatus;
  riskFlags: string[];
  reviewDecision: ReviewDecision;
  reviewerReference: string;
  decisionTimestamp: IsoDateTime;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type IprRecord = {
  iprId: string;
  subjectId: string;
  onboardingId: string;
  iprStatus: IprStatus;
  issuer: string;
  issuedAt: IsoDateTime;
  expiresAt: IsoDateTime;
  scope: string;
  hashReference: HashReference;
  previousIprReference?: string;
  phaseCertificateHashReference?: HashReference;
  operationalCertificateHashReference?: HashReference;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type IprCardRecord = {
  iprCardId: string;
  iprId: string;
  subjectId: string;
  cardStatus: IprCardStatus;
  issuer: string;
  issuedAt: IsoDateTime;
  expiresAt: IsoDateTime;
  accessScope: string;
  certificateReference: string;
  revocationState: RevocationState;
  cardHashReference: HashReference;
  previousPayloadSha256?: HashReference;
  payloadSha256?: HashReference;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type OperationalCertificateRecord = {
  certificateId: string;
  iprId: string;
  subjectId: string;
  certificateStatus: CertificateStatus;
  issuer: string;
  issuedAt: IsoDateTime;
  expiresAt: IsoDateTime;
  scope: string;
  hashReference: HashReference;
  previousPayloadSha256?: HashReference;
  payloadSha256?: HashReference;
  revocationState: RevocationState;
  identitySnapshot?: HbceJokerC2BiologicalIdentitySnapshot;
  physicalDescriptorProfile?: HbcePhysicalDescriptorProfile;
  biometricLivenessSnapshot?: HbceJokerC2BiometricLivenessSnapshot;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type OnboardingRecord = {
  subjectId: string;
  onboardingId: string;
  iprId: string;
  currentStep: OnboardingStep;
  onboardingStatus: OnboardingStatus;
  emailStatus: VerificationStatus;
  identityDataStatus: VerificationStatus;
  documentStatus: VerificationStatus;
  fiscalIdentifierStatus: VerificationStatus;
  photoVerificationStatus: VerificationStatus;
  videoVerificationStatus: VerificationStatus;
  reviewStatus: VerificationStatus;
  iprStatus: IprStatus;
  iprCardStatus: IprCardStatus;
  certificateStatus: CertificateStatus;
  revocationState: RevocationState;
  jokerC2AccessStatus: JokerAccessStatus;
  latestPhaseCertificateHash?: HashReference;
  latestPhaseCertificateFileName?: HbceIprCertificateFileName;
  latestPhaseNumber?: HbceIprPhaseNumber;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type AccessGateResult = {
  subjectId: string;
  iprId: string;
  iprStatus: IprStatus;
  iprCardStatus: IprCardStatus;
  certificateStatus: CertificateStatus;
  revocationState: RevocationState;
  jokerC2AccessStatus: JokerAccessStatus;
  decision: AccessDecision;
  decisionReason: string;
  requiredConditions: string[];
  currentConditions: string[];
  gatewayReference: string;
  decidedAt: IsoDateTime;
};

export type AuditEventReference = {
  eventReferenceId: string;
  eventType: EventType;
  subjectId: string;
  iprId: string;
  onboardingId: string;
  previousEventReference?: string;
  eventHash: HashReference;
  eventTimestamp: IsoDateTime;
  decisionState: string;
  createdAt: IsoDateTime;
};

export type RevocationRecord = {
  revocationId: string;
  subjectId: string;
  iprId: string;
  targetType: RecordTargetType;
  targetId: string;
  revocationState: RevocationState;
  reasonCode: string;
  issuedBy: string;
  issuedAt: IsoDateTime;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type PublicIprCardView = {
  iprId: string;
  iprCardId: string;
  subjectId: string;
  issuer: string;
  cardStatus: IprCardStatus;
  certificateStatus: CertificateStatus;
  accessScope: string;
  revocationState: RevocationState;
  issuedAt: IsoDateTime;
  expiresAt: IsoDateTime;
  cardHashReference: HashReference;
};

export type PublicCertificateView = {
  certificateId: string;
  iprId: string;
  subjectId: string;
  issuer: string;
  certificateStatus: CertificateStatus;
  scope: string;
  revocationState: RevocationState;
  issuedAt: IsoDateTime;
  expiresAt: IsoDateTime;
  hashReference: HashReference;
};

export type PublicHbceIprCertificateView = {
  proto: HbceIprReleaseProtocol;
  kind: HbceIprCertificateKind;
  issuer: HbceIssuer;
  phase: HbceIprPhase;
  subject: HbceIprSubject;
  payload_sha256: HashReference;
  previous_payload_sha256: HashReference | null;
  issued_at: IsoDateTime;
  next_phase: HbceIprNextPhaseCode;
};
