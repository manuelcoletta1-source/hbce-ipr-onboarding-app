import { NextResponse } from "next/server";

import {
  APP_NAME,
  CORE_PRODUCT_RULE,
  ORG_NAME
} from "@/lib/constants";

function readDeploymentRevision():
  string | null {
  const revision =
    process.env.VERCEL_GIT_COMMIT_SHA;

  if (
    typeof revision !==
      "string" ||
    !/^[0-9a-f]{40}$/.test(
      revision
    )
  ) {
    return null;
  }

  return revision;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "healthy",
    message:
      "HBCE IPR Onboarding App health check passed.",
    data: {
      app: APP_NAME,
      organization: ORG_NAME,
      mode: "mvp",
      operational_rule:
        CORE_PRODUCT_RULE,
      sensitive_data_exposed:
        false,
      production_identity_verification:
        false,
      joker_c2_access_default:
        "deny_access",
      deployment_revision:
        readDeploymentRevision(),
      timestamp:
        new Date().toISOString()
    },
    error: null
  });
}
