import type { OnboardingStep } from "@/lib/types";

export const APP_NAME = "HBCE IPR Onboarding App";

export const APP_DESCRIPTION =
  "IPR Onboarding Gateway for bank-grade operational identity verification, IPR Card issuance, operational certificate activation and governed JOKER-C2 access.";

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
  "IPR Card is the operational key.",
  "JOKER-C2 is the governed artificial intelligence runtime."
] as const;

export const LEGAL_BOUNDARY_TEXT =
  "IPR Card is an internal operational identity credential. It does not replace official identity documents, national identity cards, passports, CIE, SPID, EUDI Wallet credentials or qualified eIDAS certificates.";

export const CERTIFICATE_BOUNDARY_TEXT =
  "The operational certificate is internal to HBCE. It is not a qualified eIDAS certificate unless issued through a recognized and compliant trust service integration.";

export const PRIVACY_BOUNDARY_TEXT =
  "Sensitive identity material must remain protected. Public views should expose only minimized metadata, masked values, operational states and hash references where possible.";

export const SECURITY_BOUNDARY_TEXT =
  "The app follows a fail-closed access model. JOKER-C2 access is denied unless all required operational identity states are valid.";

export const CORRECT_LEGAL_CLAIM =
  "HBCE issues a verifiable operational identity that can be linked to official European identity systems.";

export const INCORRECT_LEGAL_CLAIM =
  "HBCE issues an official European identity.";

export const ROUTES = {
  home: "/",
  onboarding: "/onboarding",
  onboardingStart: "/onboarding/start",
  onboardingIdentity: "/onboarding/identity",
  onboardingDocuments: "/onboarding/documents",
  onboardingFiscal: "/onboarding/fiscal",
  onboardingPhotoVideo: "/onboarding/photo-video",
  onboardingReview: "/onboarding/review",
  iprCard: "/ipr-card",
  certificate: "/certificate",
  jokerC2Access: "/access/joker-c2",
  legal: "/legal",
  privacy: "/privacy",
  security: "/security"
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
    id: "start",
    number: "01",
    title: "Start",
    route: ROUTES.onboardingStart,
    purpose: "Create the initial onboarding session."
  },
  {
    id: "identity",
    number: "02",
    title: "Identity",
    route: ROUTES.onboardingIdentity,
    purpose: "Submit identity data for the operational identity record."
  },
  {
    id: "documents",
    number: "03",
    title: "Documents",
    route: ROUTES.onboardingDocuments,
    purpose: "Submit official document metadata and protected references."
  },
  {
    id: "fiscal",
    number: "04",
    title: "Fiscal Identifier",
    route: ROUTES.onboardingFiscal,
    purpose: "Link a fiscal code, tax identifier or national identifier."
  },
  {
    id: "photo_video",
    number: "05",
    title: "Photo / Video",
    route: ROUTES.onboardingPhotoVideo,
    purpose: "Complete photo and video verification placeholder."
  },
  {
    id: "review",
    number: "06",
    title: "Review",
    route: ROUTES.onboardingReview,
    purpose: "Evaluate the onboarding case before IPR Verified status."
  },
  {
    id: "ipr_card",
    number: "07",
    title: "IPR Card",
    route: ROUTES.iprCard,
    purpose: "Issue and display the internal operational identity card."
  },
  {
    id: "certificate",
    number: "08",
    title: "Certificate",
    route: ROUTES.certificate,
    purpose: "Activate the internal operational certificate reference."
  },
  {
    id: "joker_c2_access",
    number: "09",
    title: "JOKER-C2 Access",
    route: ROUTES.jokerC2Access,
    purpose: "Allow or deny governed runtime access."
  }
];

export const ACCESS_REQUIRED_CONDITIONS = [
  "IPR status must be verified",
  "IPR Card status must be issued",
  "Operational certificate status must be active",
  "Revocation state must be clear"
] as const;

export const CLASSIC_AI_ACCESS_MODEL = [
  "Email registration",
  "Password or OAuth",
  "Subscription or payment",
  "Direct model access"
] as const;

export const HBCE_GOVERNED_ACCESS_MODEL = [
  "Identity onboarding",
  "Official document metadata",
  "Fiscal or national identifier linkage",
  "Photo/video verification step",
  "Compliance-oriented review",
  "IPR Verified status",
  "IPR Card issuance",
  "Operational certificate activation",
  "Governed JOKER-C2 access"
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
  "EVT reference"
] as const;

export const EVENT_TYPES = [
  "ONBOARDING_STARTED",
  "EMAIL_REGISTERED",
  "EMAIL_VERIFIED",
  "IDENTITY_DATA_SUBMITTED",
  "DOCUMENT_SUBMITTED",
  "FISCAL_IDENTIFIER_SUBMITTED",
  "PHOTO_VIDEO_SUBMITTED",
  "REVIEW_STARTED",
  "REVIEW_APPROVED",
  "REVIEW_REJECTED",
  "REVIEW_NEEDS_MORE_INFORMATION",
  "IPR_VERIFIED",
  "IPR_CARD_ISSUED",
  "CERTIFICATE_CREATED",
  "JOKER_C2_ACCESS_ENABLED",
  "JOKER_C2_ACCESS_DENIED",
  "IPR_SUSPENDED",
  "IPR_REVOKED"
] as const;

export const ACCESS_DECISION_LABELS = {
  allow: "ACCESS ENABLED",
  deny: "ACCESS DENIED",
  pending: "ACCESS PENDING"
} as const;

export const FAIL_CLOSED_REASONS = [
  "Identity verification is incomplete",
  "Official document evidence is missing",
  "Fiscal or national identifier linkage is incomplete",
  "Photo/video verification is incomplete",
  "Review is pending",
  "IPR status is not verified",
  "IPR Card has not been issued",
  "Operational certificate is not active",
  "Revocation state is not clear"
] as const;
