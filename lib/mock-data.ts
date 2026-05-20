import type {
  AccessGateResult,
  AuditEventReference,
  DocumentRecord,
  FiscalIdentifierRecord,
  IdentityProfile,
  IprCardRecord,
  IprRecord,
  OnboardingRecord,
  OperationalCertificateRecord,
  PhotoVideoVerificationRecord,
  ReviewRecord,
  SubjectRecord
} from "@/lib/types";

import { JOKER_C2_GATEWAY_URL, ORG_NAME } from "@/lib/constants";

const DEMO_NOW = "2026-05-20T12:00:00+02:00";
const DEMO_EXPIRY = "2027-05-20T12:00:00+02:00";

const APPROVED_SUBJECT_ID = "sub_demo_approved_001";
const APPROVED_ONBOARDING_ID = "onb_demo_approved_001";
const APPROVED_IPR_ID = "IPR-HBCE-DEMO-APPROVED-001";
const APPROVED_CARD_ID = "CARD-HBCE-DEMO-APPROVED-001";
const APPROVED_CERTIFICATE_ID = "CERT-HBCE-DEMO-APPROVED-001";

export const approvedSubjectRecord: SubjectRecord = {
  subjectId: APPROVED_SUBJECT_ID,
  emailHash: "sha256_demo_email_hash_approved",
  firstName: "Demo",
  lastName: "Approved",
  country: "IT",
  preferredLanguage: "en",
  createdAt: DEMO_NOW,
  updatedAt: DEMO_NOW
};

export const approvedIdentityProfile: IdentityProfile = {
  identityProfileId: "identity_demo_approved_001",
  subjectId: APPROVED_SUBJECT_ID,
  firstName: "Demo",
  lastName: "Approved",
  dateOfBirth: "1990-01-01",
  placeOfBirth: "Demo City",
  country: "IT",
  nationality: "IT",
  residentialCountry: "IT",
  residentialRegion: "Demo Region",
  residentialCity: "Demo City",
  identityDataStatus: "approved",
  createdAt: DEMO_NOW,
  updatedAt: DEMO_NOW
};

export const approvedDocumentRecord: DocumentRecord = {
  documentRecordId: "doc_demo_approved_001",
  subjectId: APPROVED_SUBJECT_ID,
  onboardingId: APPROVED_ONBOARDING_ID,
  documentType: "identity_card",
  documentCountry: "IT",
  documentExpiryDate: "2035-01-01",
  documentNumberHash: "sha256_demo_document_number_hash_approved",
  documentFileHash: "sha256_demo_document_file_hash_approved",
  documentStorageReference: "protected_storage_reference_demo_approved",
  documentStatus: "approved",
  createdAt: DEMO_NOW,
  updatedAt: DEMO_NOW
};

export const approvedFiscalIdentifierRecord: FiscalIdentifierRecord = {
  fiscalIdentifierId: "fiscal_demo_approved_001",
  subjectId: APPROVED_SUBJECT_ID,
  onboardingId: APPROVED_ONBOARDING_ID,
  fiscalIdentifierType: "fiscal_code",
  fiscalIdentifierCountry: "IT",
  fiscalIdentifierHash: "sha256_demo_fiscal_identifier_hash_approved",
  fiscalIdentifierMasked: "DEM*********VED",
  fiscalIdentifierStatus: "approved",
  createdAt: DEMO_NOW,
  updatedAt: DEMO_NOW
};

export const approvedPhotoVideoRecord: PhotoVideoVerificationRecord = {
  photoVideoVerificationId: "photo_video_demo_approved_001",
  subjectId: APPROVED_SUBJECT_ID,
  onboardingId: APPROVED_ONBOARDING_ID,
  photoReference: "protected_photo_reference_demo_approved",
  videoReference: "protected_video_reference_demo_approved",
  photoHash: "sha256_demo_photo_hash_approved",
  videoHash: "sha256_demo_video_hash_approved",
  photoVerificationStatus: "approved",
  videoVerificationStatus: "approved",
  livenessStatus: "approved",
  createdAt: DEMO_NOW,
  updatedAt: DEMO_NOW
};

export const approvedReviewRecord: ReviewRecord = {
  reviewId: "review_demo_approved_001",
  subjectId: APPROVED_SUBJECT_ID,
  onboardingId: APPROVED_ONBOARDING_ID,
  reviewStatus: "approved",
  riskFlags: [],
  reviewDecision: "approve",
  reviewerReference: "operator_demo_hbce",
  decisionTimestamp: DEMO_NOW,
  createdAt: DEMO_NOW,
  updatedAt: DEMO_NOW
};

export const approvedIprRecord: IprRecord = {
  iprId: APPROVED_IPR_ID,
  subjectId: APPROVED_SUBJECT_ID,
  onboardingId: APPROVED_ONBOARDING_ID,
  iprStatus: "verified",
  issuer: ORG_NAME,
  issuedAt: DEMO_NOW,
  expiresAt: DEMO_EXPIRY,
  scope: "JOKER-C2-GOVERNED-RUNTIME",
  hashReference: "sha256_demo_ipr_hash_approved",
  createdAt: DEMO_NOW,
  updatedAt: DEMO_NOW
};

export const approvedIprCardRecord: IprCardRecord = {
  iprCardId: APPROVED_CARD_ID,
  iprId: APPROVED_IPR_ID,
  subjectId: APPROVED_SUBJECT_ID,
  cardStatus: "issued",
  issuer: ORG_NAME,
  issuedAt: DEMO_NOW,
  expiresAt: DEMO_EXPIRY,
  accessScope: "JOKER-C2-GOVERNED-RUNTIME",
  certificateReference: APPROVED_CERTIFICATE_ID,
  revocationState: "clear",
  cardHashReference: "sha256_demo_ipr_card_hash_approved",
  createdAt: DEMO_NOW,
  updatedAt: DEMO_NOW
};

export const approvedCertificateRecord: OperationalCertificateRecord = {
  certificateId: APPROVED_CERTIFICATE_ID,
  iprId: APPROVED_IPR_ID,
  subjectId: APPROVED_SUBJECT_ID,
  certificateStatus: "active",
  issuer: ORG_NAME,
  issuedAt: DEMO_NOW,
  expiresAt: DEMO_EXPIRY,
  scope: "JOKER-C2-GOVERNED-RUNTIME",
  hashReference: "sha256_demo_certificate_hash_approved",
  revocationState: "clear",
  createdAt: DEMO_NOW,
  updatedAt: DEMO_NOW
};

export const approvedOnboardingRecord: OnboardingRecord = {
  subjectId: APPROVED_SUBJECT_ID,
  onboardingId: APPROVED_ONBOARDING_ID,
  iprId: APPROVED_IPR_ID,
  currentStep: "completed",
  onboardingStatus: "completed",
  emailStatus: "approved",
  identityDataStatus: "approved",
  documentStatus: "approved",
  fiscalIdentifierStatus: "approved",
  photoVerificationStatus: "approved",
  videoVerificationStatus: "approved",
  reviewStatus: "approved",
  iprStatus: "verified",
  iprCardStatus: "issued",
  certificateStatus: "active",
  revocationState: "clear",
  jokerC2AccessStatus: "enabled",
  createdAt: DEMO_NOW,
  updatedAt: DEMO_NOW
};

export const pendingOnboardingRecord: OnboardingRecord = {
  subjectId: "sub_demo_pending_001",
  onboardingId: "onb_demo_pending_001",
  iprId: "IPR-HBCE-DEMO-PENDING-001",
  currentStep: "review",
  onboardingStatus: "pending_review",
  emailStatus: "approved",
  identityDataStatus: "submitted",
  documentStatus: "submitted",
  fiscalIdentifierStatus: "submitted",
  photoVerificationStatus: "manual_review",
  videoVerificationStatus: "manual_review",
  reviewStatus: "pending",
  iprStatus: "pending",
  iprCardStatus: "pending",
  certificateStatus: "pending",
  revocationState: "clear",
  jokerC2AccessStatus: "denied",
  createdAt: DEMO_NOW,
  updatedAt: DEMO_NOW
};

export const deniedOnboardingRecord: OnboardingRecord = {
  subjectId: "sub_demo_denied_001",
  onboardingId: "onb_demo_denied_001",
  iprId: "IPR-HBCE-DEMO-DENIED-001",
  currentStep: "blocked",
  onboardingStatus: "rejected",
  emailStatus: "approved",
  identityDataStatus: "approved",
  documentStatus: "rejected",
  fiscalIdentifierStatus: "submitted",
  photoVerificationStatus: "rejected",
  videoVerificationStatus: "rejected",
  reviewStatus: "rejected",
  iprStatus: "rejected",
  iprCardStatus: "not_issued",
  certificateStatus: "not_created",
  revocationState: "clear",
  jokerC2AccessStatus: "denied",
  createdAt: DEMO_NOW,
  updatedAt: DEMO_NOW
};

export const revokedOnboardingRecord: OnboardingRecord = {
  subjectId: "sub_demo_revoked_001",
  onboardingId: "onb_demo_revoked_001",
  iprId: "IPR-HBCE-DEMO-REVOKED-001",
  currentStep: "blocked",
  onboardingStatus: "revoked",
  emailStatus: "approved",
  identityDataStatus: "approved",
  documentStatus: "approved",
  fiscalIdentifierStatus: "approved",
  photoVerificationStatus: "approved",
  videoVerificationStatus: "approved",
  reviewStatus: "approved",
  iprStatus: "revoked",
  iprCardStatus: "revoked",
  certificateStatus: "revoked",
  revocationState: "revoked",
  jokerC2AccessStatus: "revoked",
  createdAt: DEMO_NOW,
  updatedAt: DEMO_NOW
};

export const demoOnboardingRecords = {
  approved: approvedOnboardingRecord,
  pending: pendingOnboardingRecord,
  denied: deniedOnboardingRecord,
  revoked: revokedOnboardingRecord
} as const;

export type DemoOnboardingMode = keyof typeof demoOnboardingRecords;

export const approvedAccessGateResult: AccessGateResult = {
  subjectId: APPROVED_SUBJECT_ID,
  iprId: APPROVED_IPR_ID,
  iprStatus: "verified",
  iprCardStatus: "issued",
  certificateStatus: "active",
  revocationState: "clear",
  jokerC2AccessStatus: "enabled",
  decision: "allow_governed_access",
  decisionReason:
    "All required operational identity states are valid. Governed JOKER-C2 access can be enabled.",
  requiredConditions: [
    "IPR status must be verified",
    "IPR Card status must be issued",
    "Operational certificate status must be active",
    "Revocation state must be clear"
  ],
  currentConditions: [
    "IPR status is verified",
    "IPR Card status is issued",
    "Operational certificate status is active",
    "Revocation state is clear"
  ],
  gatewayReference: JOKER_C2_GATEWAY_URL,
  decidedAt: DEMO_NOW
};

export const pendingAccessGateResult: AccessGateResult = {
  subjectId: pendingOnboardingRecord.subjectId,
  iprId: pendingOnboardingRecord.iprId,
  iprStatus: "pending",
  iprCardStatus: "pending",
  certificateStatus: "pending",
  revocationState: "clear",
  jokerC2AccessStatus: "denied",
  decision: "deny_access",
  decisionReason:
    "The onboarding case is still under review. Fail-closed policy keeps JOKER-C2 access denied.",
  requiredConditions: [
    "IPR status must be verified",
    "IPR Card status must be issued",
    "Operational certificate status must be active",
    "Revocation state must be clear"
  ],
  currentConditions: [
    "IPR status is pending",
    "IPR Card status is pending",
    "Operational certificate status is pending",
    "Revocation state is clear"
  ],
  gatewayReference: JOKER_C2_GATEWAY_URL,
  decidedAt: DEMO_NOW
};

export const deniedAccessGateResult: AccessGateResult = {
  subjectId: deniedOnboardingRecord.subjectId,
  iprId: deniedOnboardingRecord.iprId,
  iprStatus: "rejected",
  iprCardStatus: "not_issued",
  certificateStatus: "not_created",
  revocationState: "clear",
  jokerC2AccessStatus: "denied",
  decision: "deny_access",
  decisionReason:
    "The onboarding case was rejected. IPR Card and operational certificate were not issued.",
  requiredConditions: [
    "IPR status must be verified",
    "IPR Card status must be issued",
    "Operational certificate status must be active",
    "Revocation state must be clear"
  ],
  currentConditions: [
    "IPR status is rejected",
    "IPR Card status is not issued",
    "Operational certificate status is not created",
    "Revocation state is clear"
  ],
  gatewayReference: JOKER_C2_GATEWAY_URL,
  decidedAt: DEMO_NOW
};

export const revokedAccessGateResult: AccessGateResult = {
  subjectId: revokedOnboardingRecord.subjectId,
  iprId: revokedOnboardingRecord.iprId,
  iprStatus: "revoked",
  iprCardStatus: "revoked",
  certificateStatus: "revoked",
  revocationState: "revoked",
  jokerC2AccessStatus: "revoked",
  decision: "deny_access",
  decisionReason:
    "The operational identity state is revoked. Revocation overrides every previous access state.",
  requiredConditions: [
    "IPR status must be verified",
    "IPR Card status must be issued",
    "Operational certificate status must be active",
    "Revocation state must be clear"
  ],
  currentConditions: [
    "IPR status is revoked",
    "IPR Card status is revoked",
    "Operational certificate status is revoked",
    "Revocation state is revoked"
  ],
  gatewayReference: JOKER_C2_GATEWAY_URL,
  decidedAt: DEMO_NOW
};

export const demoAccessGateResults = {
  approved: approvedAccessGateResult,
  pending: pendingAccessGateResult,
  denied: deniedAccessGateResult,
  revoked: revokedAccessGateResult
} as const;

export const demoAuditEvents: AuditEventReference[] = [
  {
    eventReferenceId: "evt_demo_001",
    eventType: "ONBOARDING_STARTED",
    subjectId: APPROVED_SUBJECT_ID,
    iprId: APPROVED_IPR_ID,
    onboardingId: APPROVED_ONBOARDING_ID,
    eventHash: "sha256_demo_event_hash_onboarding_started",
    eventTimestamp: DEMO_NOW,
    decisionState: "started",
    createdAt: DEMO_NOW
  },
  {
    eventReferenceId: "evt_demo_002",
    eventType: "IPR_VERIFIED",
    subjectId: APPROVED_SUBJECT_ID,
    iprId: APPROVED_IPR_ID,
    onboardingId: APPROVED_ONBOARDING_ID,
    previousEventReference: "evt_demo_001",
    eventHash: "sha256_demo_event_hash_ipr_verified",
    eventTimestamp: DEMO_NOW,
    decisionState: "approved",
    createdAt: DEMO_NOW
  },
  {
    eventReferenceId: "evt_demo_003",
    eventType: "IPR_CARD_ISSUED",
    subjectId: APPROVED_SUBJECT_ID,
    iprId: APPROVED_IPR_ID,
    onboardingId: APPROVED_ONBOARDING_ID,
    previousEventReference: "evt_demo_002",
    eventHash: "sha256_demo_event_hash_ipr_card_issued",
    eventTimestamp: DEMO_NOW,
    decisionState: "issued",
    createdAt: DEMO_NOW
  },
  {
    eventReferenceId: "evt_demo_004",
    eventType: "CERTIFICATE_CREATED",
    subjectId: APPROVED_SUBJECT_ID,
    iprId: APPROVED_IPR_ID,
    onboardingId: APPROVED_ONBOARDING_ID,
    previousEventReference: "evt_demo_003",
    eventHash: "sha256_demo_event_hash_certificate_created",
    eventTimestamp: DEMO_NOW,
    decisionState: "active",
    createdAt: DEMO_NOW
  },
  {
    eventReferenceId: "evt_demo_005",
    eventType: "JOKER_C2_ACCESS_ENABLED",
    subjectId: APPROVED_SUBJECT_ID,
    iprId: APPROVED_IPR_ID,
    onboardingId: APPROVED_ONBOARDING_ID,
    previousEventReference: "evt_demo_004",
    eventHash: "sha256_demo_event_hash_joker_c2_access_enabled",
    eventTimestamp: DEMO_NOW,
    decisionState: "allow_governed_access",
    createdAt: DEMO_NOW
  }
];

export function getDemoOnboardingRecord(
  mode: DemoOnboardingMode = "approved"
): OnboardingRecord {
  return demoOnboardingRecords[mode];
}

export function getDemoAccessGateResult(
  mode: DemoOnboardingMode = "approved"
): AccessGateResult {
  return demoAccessGateResults[mode];
}

export function getDefaultIprCardRecord(): IprCardRecord {
  return approvedIprCardRecord;
}

export function getDefaultCertificateRecord(): OperationalCertificateRecord {
  return approvedCertificateRecord;
}

export function getJokerC2GatewayReference(): string {
  return JOKER_C2_GATEWAY_URL;
}
