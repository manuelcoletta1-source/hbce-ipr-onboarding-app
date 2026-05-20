import { NextResponse } from "next/server";

import {
  APP_DESCRIPTION,
  APP_NAME,
  CORE_PRODUCT_RULE,
  ORG_NAME,
  ROUTES
} from "@/lib/constants";

const pageRoutes = [
  ROUTES.home,
  ROUTES.onboarding,
  ROUTES.onboardingStart,
  ROUTES.onboardingIdentity,
  ROUTES.onboardingDocuments,
  ROUTES.onboardingFiscal,
  ROUTES.onboardingPhotoVideo,
  ROUTES.onboardingReview,
  ROUTES.iprCard,
  ROUTES.certificate,
  ROUTES.jokerC2Access,
  ROUTES.legal,
  ROUTES.privacy,
  ROUTES.security
];

const apiRoutes = [
  "/api/health",
  "/api/manifest",
  "/api/onboarding/status",
  "/api/ipr-card/status",
  "/api/certificate/status",
  "/api/access/joker-c2",
  "/api/events",
  "/api/opc/proof",
  "/api/revocation"
];

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "success",
    message: "HBCE IPR Onboarding App manifest returned.",
    data: {
      app: APP_NAME,
      description: APP_DESCRIPTION,
      organization: ORG_NAME,
      mode: "mvp",
      operational_rule: CORE_PRODUCT_RULE,
      production_identity_verification: false,
      official_identity_issuance: false,
      banking_service: false,
      qualified_eidas_certificate_issuance: false,
      sensitive_data_exposed: false,
      joker_c2_access_default: "deny_access",
      page_routes: pageRoutes,
      api_routes: apiRoutes,
      supported_demo_modes: ["approved", "pending", "denied", "revoked"],
      required_access_conditions: [
        "ipr_status = verified",
        "ipr_card_status = issued",
        "certificate_status = active",
        "revocation_state = clear"
      ],
      timestamp: new Date().toISOString()
    },
    error: null
  });
}
