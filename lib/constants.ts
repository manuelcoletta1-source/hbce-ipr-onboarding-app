import type { OnboardingStep } from "@/lib/types";

export const APP_NAME = "HBCE IPR Onboarding App";

export const APP_DESCRIPTION =
  "Operational IPR Onboarding Gateway for progressive HBCE-IPR certificate release, IPR Card issuance, operational certificate activation and governed JOKER-C2 access.";

export const ORG_NAME = "HERMETICUM B.C.E. S.r.l.";

export const CANONICAL_TRADEMARK =
  "HERMETICUM - BLINDATA · COMPUTABILE · EVOLUTIVA";

export const JOKER_C2_GATEWAY_URL =
  "https://hbce-ai-joker-c2.vercel.app/interface";

export const HBCE_PLATFORM_URL =
  "https://manuelcoletta1-source.github.io/hermeticum-bce-platform/";

export const CORE_PRODUCT_RULE =
  "No verified IPR, no governed JOKER-C2 access.";

export const PUBLIC_WEBSITE_FORMULA =
  "Access JOKER-C2 only through verified IPR. An email is not enough. A subscription is not enough. An operational identity is required: documented, traceable and verifiable.";

export const PRODUCT_FORMULA = [
  "HERMETICUM B.C.E. Platform is the access threshold.",
  "HBCE IPR Onboarding App is the operational identity gateway.",
  "IPR Card is the operational key.",
  "JOKER-C2 is the governed artificial intelligence runtime."
] as const;

export const LEGAL_BOUNDARY_TEXT =
  "IPR Card and HBCE-IPR certificates are internal operational identity credentials. They do not replace official identity documents, national identity cards, passports, CIE, SPID, EUDI Wallet credentials or qualified eIDAS certificates.";

export const CERTIFICATE_BOUNDARY_TEXT =
  "The HBCE operational certificate is internal to HBCE. It is not a qualified eIDAS certificate unless issued through a recognized and compliant trust service integration.";

export const PRIVACY_BOUNDARY_TEXT =
  "Sensitive identity material must remain protected. Portable HBCE-IPR certificates should expose only minimized metadata, operational states and hash references. Raw documents, photos, videos and fiscal identifiers must not be exposed inside public or portable files.";

export const SECURITY_BOUNDARY_TEXT =
  "The app follows a fail-closed access model. JOKER-C2 access is denied unless all required operational identity states and certificate conditions are valid.";

export const CORRECT_LEGAL_CLAIM =
  "HBCE issues a verifiable operational identity that can be linked to official European identity systems.";

export const INCORRECT_LEGAL_CLAIM =
  "HBCE issues an official European identity.";

export const ROUTES = {
  home: "/",

  onboarding: "/onboarding",
  onboardingPhase1: "/onboarding/phase-1",
  onboardingPhase2: "/onboarding/phase-2",
  onboardingPhase3: "/onboarding/phase-3",
  onboardingPhase4: "/onboarding/phase-4",
  onboardingPhase5: "/onboarding/phase-5",
  onboardingReview: "/onboarding/review",

  adminReview: "/admin/review",

  iprCard: "/ipr-card",
  certificate: "/certificate",
  jokerC2Access: "/access/joker-c2",

  legal: "/legal",
  privacy: "/privacy",
  security: "/security",

  onboardingStart: "/onboarding/phase-1",
  onboardingIdentity: "/onboarding/phase-1",
  onboardingFiscal: "/onboarding/phase-2",
  onboardingDocuments: "/onboarding/phase-3",
  onboardingPhotoVideo: "/onboarding/phase-4"
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

export type OnboardingStepDefinition = {
  id: OnboardingStep;
  number: string;
  title: string;
  route: AppRoute;
  purpose: string;
};

export const ONBOARDING_STEPS: readonly OnboardingStepDefinition[] = [
  {
    id: "phase_1_subject",
    number: "01",
    title: "Subject Created",
    route: ROUTES.onboardingPhase1,
    purpose:
      "Collect email, phone, name, country and date of birth, then release hbce-ipr-01-subject-created.hbce.json."
  },
  {
    id: "phase_2_fiscal_identity",
    number: "02",
    title: "Fiscal Identity",
    route: ROUTES.onboardingPhase2,
    purpose:
      "Upload certificate 01, collect codice fiscale / tax ID / national tax identifier and fiscal evidence, then release hbce-ipr-02-fiscal-identity.hbce.json."
  },
  {
    id: "phase_3_official_document",
    number: "03",
    title: "Official ID Document",
    route: ROUTES.onboardingPhase3,
    purpose:
      "Upload certificate 02, collect CIE, driving licence, passport or official ID evidence, then release hbce-ipr-03-official-document.hbce.json."
  },
  {
    id: "phase_4_liveness",
    number: "04",
    title: "Liveness Check",
    route: ROUTES.onboardingPhase4,
    purpose:
      "Upload certificate 03, collect selfie and video verification, then release hbce-ipr-04-liveness-submitted.hbce.json."
  },
  {
    id: "phase_5_privacy_compliance",
    number: "05",
    title: "Privacy & Compliance",
    route: ROUTES.onboardingPhase5,
    purpose:
      "Upload certificate 04, collect privacy and compliance acceptance, then release hbce-ipr-05-privacy-compliance.hbce.json."
  },
  {
    id: "phase_6_review_pending",
    number: "06",
    title: "Review Pending",
    route: ROUTES.onboardingReview,
    purpose:
      "Upload certificate 05 and submit the onboarding package for HBCE review, then release hbce-ipr-06-review-pending.hbce.json."
  },
  {
    id: "phase_7_ipr_approved",
    number: "07",
    title: "IPR Approved",
    route: ROUTES.adminReview,
    purpose:
      "HBCE operator approval phase. Upload certificate 06 and release hbce-ipr-07-ipr-approved.hbce.json."
  },
  {
    id: "phase_8_ipr_card",
    number: "08",
    title: "IPR Card",
    route: ROUTES.iprCard,
    purpose:
      "Upload certificate 07 and issue the virtual IPR Card file hbce-ipr-08-ipr-card.hbce.json."
  },
  {
    id: "phase_9_operational_certificate",
    number: "09",
    title: "Operational Certificate",
    route: ROUTES.certificate,
    purpose:
      "Upload certificate 08 and issue hbce-ipr-09-operational-certificate.hbce.json with JOKER_C2_ACCESS scope."
  },
  {
    id: "joker_c2_access",
    number: "10",
    title: "JOKER-C2 Access",
    route: ROUTES.jokerC2Access,
    purpose:
      "Upload the final operational certificate and allow or deny governed JOKER-C2 access."
  }
];

export const HBCE_IPR_CERTIFICATE_FILES = [
  "hbce-ipr-01-subject-created.hbce.json",
  "hbce-ipr-02-fiscal-identity.hbce.json",
  "hbce-ipr-03-official-document.hbce.json",
  "hbce-ipr-04-liveness-submitted.hbce.json",
  "hbce-ipr-05-privacy-compliance.hbce.json",
  "hbce-ipr-06-review-pending.hbce.json",
  "hbce-ipr-07-ipr-approved.hbce.json",
  "hbce-ipr-08-ipr-card.hbce.json",
  "hbce-ipr-09-operational-certificate.hbce.json"
] as const;

export const ACCESS_REQUIRED_CONDITIONS = [
  "Protocol must be HBCE-IPR-RELEASE-v3",
  "Issuer must be HERMETICUM B.C.E. S.r.l.",
  "Certificate kind must be IPR_OPERATIONAL_CERTIFICATE",
  "Phase code must be IPR_VERIFIED",
  "Certificate status must be ACTIVE",
  "Certificate scope must be JOKER_C2_ACCESS",
  "Previous payload hash must be present",
  "Payload hash must match the canonical certificate payload"
] as const;

export const CLASSIC_AI_ACCESS_MODEL = [
  "Email registration",
  "Password or OAuth",
  "Subscription or payment",
  "Direct model access"
] as const;

export const HBCE_GOVERNED_ACCESS_MODEL = [
  "Subject creation",
  "Fiscal identity evidence",
  "Official identity document evidence",
  "Selfie and video verification",
  "Privacy and compliance acceptance",
  "HBCE review submission",
  "HBCE approval",
  "IPR Card issuance",
  "Operational certificate activation",
  "Governed JOKER-C2 certificate gate"
] as const;

export const HBCE_IPR_CHAIN_MODEL = [
  "Certificate 01 unlocks Fiscal Identity",
  "Certificate 02 unlocks Official ID Document",
  "Certificate 03 unlocks Liveness Check",
  "Certificate 04 unlocks Privacy & Compliance",
  "Certificate 05 unlocks Review Submission",
  "Certificate 06 unlocks HBCE Approval",
  "Certificate 07 unlocks IPR Card issuance",
  "Certificate 08 unlocks Operational Certificate issuance",
  "Certificate 09 unlocks JOKER-C2 access evaluation"
] as const;

export const NON_REPLACEMENT_BOUNDARY = [
  "National identity card",
  "Passport",
  "Driving licence",
  "CIE",
  "SPID",
  "EUDI Wallet",
  "Qualified eIDAS certificate",
  "Bank account",
  "IBAN",
  "Regulated financial identity service",
  "Regulated trust service"
] as const;

export const FORBIDDEN_REPOSITORY_DATA = [
  "Raw identity documents",
  "Raw fiscal identifiers",
  "Raw document numbers",
  "Raw photos",
  "Raw videos",
  "Biometric material",
  "Production secrets",
  "Private keys",
  "API credentials",
  "Unencrypted private records",
  "Real onboarding evidence"
] as const;

export const PUBLIC_SAFE_FIELDS = [
  "IPR identifier",
  "IPR Card status",
  "Certificate status",
  "Issuer",
  "Issue date",
  "Expiry date",
  "Access scope",
  "Revocation state",
  "Access decision",
  "Decision reason",
  "Hash reference",
  "Payload SHA-256",
  "Previous payload SHA-256",
  "EVT reference"
] as const;

export const EVENT_TYPES = [
  "ONBOARDING_STARTED",
  "SUBJECT_CREATED",
  "FISCAL_IDENTITY_COLLECTED",
  "OFFICIAL_DOCUMENT_SUBMITTED",
  "LIVENESS_SUBMITTED",
  "PRIVACY_COMPLIANCE_ACCEPTED",
  "REVIEW_SUBMITTED",
  "REVIEW_APPROVED",
  "REVIEW_REJECTED",
  "REVIEW_NEEDS_MORE_INFORMATION",
  "IPR_APPROVED",
  "IPR_CARD_ISSUED",
  "OPERATIONAL_CERTIFICATE_CREATED",
  "IPR_VERIFIED",
  "JOKER_C2_ACCESS_ENABLED",
  "JOKER_C2_ACCESS_DENIED",
  "IPR_SUSPENDED",
  "IPR_REVOKED"
] as const;

export const ACCESS_DECISION_LABELS = {
  allow: "ACCESS ENABLED",
  deny: "ACCESS DENIED",
  pending: "ACCESS PENDING",
  granted: "ACCESS_GRANTED",
  denied: "ACCESS_DENIED"
} as const;

export const FAIL_CLOSED_REASONS = [
  "Previous certificate is missing",
  "Uploaded file is not valid JSON",
  "Protocol is invalid",
  "Certificate kind is invalid",
  "Issuer is invalid",
  "Previous phase is invalid",
  "Next phase is invalid",
  "Payload hash is missing",
  "Previous payload hash is missing",
  "Payload hash mismatch",
  "Required field is missing",
  "Required upload is missing",
  "Certificate is revoked",
  "Certificate is suspended",
  "Certificate is expired",
  "Certificate is under review",
  "Certificate is not an operational certificate",
  "Certificate scope is invalid"
] as const;

export const REQUIRED_FISCAL_EVIDENCE = [
  "Tessera sanitaria front",
  "Tessera sanitaria back",
  "Codice fiscale document",
  "EU tax ID document",
  "National fiscal document"
] as const;

export const REQUIRED_OFFICIAL_DOCUMENT_EVIDENCE = [
  "CIE front",
  "CIE back",
  "Driving licence front",
  "Driving licence back",
  "Passport data page",
  "EU identity card front",
  "EU identity card back"
] as const;

export const REQUIRED_LIVENESS_EVIDENCE = [
  "Front selfie",
  "Video verification",
  "Liveness declaration"
] as const;
