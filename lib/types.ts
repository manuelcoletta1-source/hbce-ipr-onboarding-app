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
  | "blocked";

export type DocumentType =
  | "identity_card"
  | "passport"
  | "driving_license"
  | "residence_document"
  | "other_official_document";

export type FiscalIdentifierType =
  | "fiscal_code"
  | "tax_identifier"
  | "national_identification_number"
  | "social_security_style_number"
  | "other_public_identifier";

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
  | "IDENTITY_DATA_SUBMITTED"
  | "DOCUMENT_SUBMITTED"
  | "FISCAL_IDENTIFIER_SUBMITTED"
  | "PHOTO_VIDEO_SUBMITTED"
  | "REVIEW_STARTED"
  | "REVIEW_APPROVED"
  | "REVIEW_REJECTED"
  | "REVIEW_NEEDS_MORE_INFORMATION"
  | "IPR_VERIFIED"
  | "IPR_CARD_ISSUED"
  | "CERTIFICATE_CREATED"
  | "JOKER_C2_ACCESS_ENABLED"
  | "JOKER_C2_ACCESS_DENIED"
  | "IPR_SUSPENDED"
  | "IPR_REVOKED";

export type RecordTargetType =
  | "ipr"
  | "ipr_card"
  | "certificate"
  | "joker_c2_access"
  | "onboarding_record";

export type HashReference = string;
export type IsoDateTime = string;
export type StorageReference = string;

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
