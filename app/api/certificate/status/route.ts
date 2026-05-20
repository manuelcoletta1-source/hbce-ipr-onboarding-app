import { NextResponse, type NextRequest } from "next/server";

import {
  approvedCertificateRecord,
  demoOnboardingRecords,
  type DemoOnboardingMode
} from "@/lib/mock-onboarding";

const allowedModes: DemoOnboardingMode[] = [
  "approved",
  "pending",
  "denied",
  "revoked"
];

function isDemoMode(
  value: string | null | undefined
): value is DemoOnboardingMode {
  return (
    value !== null &&
    value !== undefined &&
    allowedModes.includes(value as DemoOnboardingMode)
  );
}

export async function GET(request: NextRequest) {
  const modeParam = request.nextUrl.searchParams.get("mode");
  const mode = isDemoMode(modeParam) ? modeParam : "pending";
  const onboardingRecord = demoOnboardingRecords[mode];

  const certificate =
    mode === "approved" && onboardingRecord.certificateStatus === "active"
      ? approvedCertificateRecord
      : null;

  return NextResponse.json({
    ok: true,
    status: "success",
    message: "Operational certificate status returned.",
    data: {
      mode,
      ipr_id: onboardingRecord.iprId,
      ipr_status: onboardingRecord.iprStatus,
      ipr_card_status: onboardingRecord.iprCardStatus,
      certificate_status: onboardingRecord.certificateStatus,
      revocation_state: onboardingRecord.revocationState,
      certificate
    },
    error: null
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { mode?: string };
    const mode = isDemoMode(body.mode) ? body.mode : "pending";
    const onboardingRecord = demoOnboardingRecords[mode];

    const certificate =
      mode === "approved" && onboardingRecord.certificateStatus === "active"
        ? approvedCertificateRecord
        : null;

    return NextResponse.json({
      ok: true,
      status: "success",
      message: "Operational certificate status returned.",
      data: {
        mode,
        ipr_id: onboardingRecord.iprId,
        ipr_status: onboardingRecord.iprStatus,
        ipr_card_status: onboardingRecord.iprCardStatus,
        certificate_status: onboardingRecord.certificateStatus,
        revocation_state: onboardingRecord.revocationState,
        certificate
      },
      error: null
    });
  } catch {
    const mode: DemoOnboardingMode = "pending";
    const onboardingRecord = demoOnboardingRecords[mode];

    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message:
          "Invalid request body. Default pending certificate status returned.",
        data: {
          mode,
          ipr_id: onboardingRecord.iprId,
          ipr_status: onboardingRecord.iprStatus,
          ipr_card_status: onboardingRecord.iprCardStatus,
          certificate_status: onboardingRecord.certificateStatus,
          revocation_state: onboardingRecord.revocationState,
          certificate: null
        },
        error: {
          code: "INVALID_JSON",
          details: "Request body must be valid JSON."
        }
      },
      { status: 400 }
    );
  }
}
