export type HashReference = string;
export type IsoDateTime = string;
export type StorageReference = string;
export type RouteReference = string;

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | JsonObject
  | JsonValue[];

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

export type HbceIprPhaseNumber =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9;

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

export type HbceIprPayloadEnvelope<TPhaseData extends JsonObject = JsonObject> = {
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

export type HbceIprCertificateBase<TPhaseData extends JsonObject = JsonObject> = {
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

export type HbceIprPhaseCertificate<TPhaseData extends JsonObject = JsonObject> =
  HbceIprCertificateBase<TPhaseData> & {
    kind: "IPR_PHASE_CERTIFICATE";
  };

export type HbceIprOperationalCertificate<TPhaseData extends JsonObject = JsonObject> =
  HbceIprCertificateBase<TPhaseData> & {
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
  | "/onboarding/phase-4"
  | "/onboarding/phase-5"
  | "/onboarding/review"
  | "/admin/review"
  | "/ipr-card"
  | "/certificate"
  | "/access/joker-c2";

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

/**
 * Phase 1 payload.
 */
export type HbcePhase1SubjectCreatedData = {
  email_hash: HashReference;
  phone_hash: HashReference;
  first_name_hash: HashReference;
  last_name_hash: HashReference;
  country_hash: HashReference;
  date_of_birth_hash: HashReference;
};

/**
 * Phase 2 payload.
 */
export type HbcePhase2FiscalIdentityData = {
  tax_id_value_hash: HashReference;
  tax_id_document_front_sha256?: HashReference;
  tax_id_document_back_sha256?: HashReference;
  tax_id_document_sha256?: HashReference;
  tax_id_metadata_hash: HashReference;
  citizenship_hash: HashReference;
  fiscal_country_hash: HashReference;
};

/**
 * Phase 3 payload.
 */
export type HbcePhase3OfficialDocumentData = {
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
};

/**
 * Phase 4 payload.
 */
export type HbcePhase4LivenessData = {
  selfie_sha256: HashReference;
  video_sha256: HashReference;
  liveness_declaration_sha256: HashReference;
  liveness_timestamp: IsoDateTime;
};

/**
 * Phase 5 payload.
 */
export type HbcePhase5PrivacyComplianceData = {
  privacy_consent_hash: HashReference;
  terms_consent_hash: HashReference;
  identity_verification_consent_hash: HashReference;
  gdpr_min_acknowledgement: true;
  hash_only_acknowledgement: true;
  no_state_identity_claim_acknowledgement: true;
  internal_operational_identity_acknowledgement: true;
};

/**
 * Phase 6 payload.
 */
export type HbcePhase6ReviewPendingData = {
  review_package_hash: HashReference;
  submitted_at: IsoDateTime;
};

/**
 * Phase 7 payload.
 */
export type HbcePhase7IprApprovedData = {
  approved_by: string;
  approved_at: IsoDateTime;
  approval_decision_hash: HashReference;
  approval_decision: "APPROVE";
};

/**
 * Phase 8 payload.
 */
export type HbcePhase8IprCardData = {
  ipr_id: string;
  subject_id: string;
  card_serial: string;
  card_status: "ACTIVE";
  issuer: "HERMETICUM B.C.E. S.r.l.";
  issued_at: IsoDateTime;
  valid_until: IsoDateTime;
};

/**
 * Phase 9 payload.
 */
export type HbcePhase9OperationalCertificateData = {
  certificate_id: string;
  ipr_id: string;
  subject_id: string;
  card_serial: string;
  certificate_status: "ACTIVE";
  certificate_scope: "JOKER_C2_ACCESS";
  issuer: "HERMETICUM B.C.E. S.r.l.";
  issued_at: IsoDateTime;
  valid_until: IsoDateTime;
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
  | "SELFIE"
  | "VIDEO_VERIFICATION";

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

export type HbceCertificateGenerationInput<TPhaseData extends JsonObject = JsonObject> = {
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

export type HbceGeneratedCertificate<TPhaseData extends JsonObject = JsonObject> = {
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
  | "INVALID_CERTIFICATE_SCOPE";

export type HbceCertificateValidationDecision =
  | "VALID"
  | "FAIL_CLOSED";

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
  livenessDeclarationHash?: HashReference;
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
