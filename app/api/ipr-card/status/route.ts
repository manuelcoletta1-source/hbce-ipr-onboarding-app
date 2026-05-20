import { NextResponse, type NextRequest } from "next/server";

import {
  approvedIprCardRecord,
  demoOnboardingRecords,
  type DemoOnboardingMode
} from "@/lib/mock-onboarding";

const allowedModes: DemoOnboardingMode[] = [
  "approved",
  "pending",
  "denied",
  "revoked"
];

function isDemoMode(value: string | null | undefined): value is DemoOnboardingMode {
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

  const card =
    mode === "approved" && onboardingRecord.iprCardStatus === "issued"
      ? approvedIprCardRecord
      : null;

  return NextResponse.json({
    ok: true,
    status: "success",
    message: "IPR Card status returned.",
    data: {
      mode,
      ipr_id: onboardingRecord.iprId,
      ipr_status: onboardingRecord.iprStatus,
      ipr_card_status: onboardingRecord.iprCardStatus,
      revocation_state: onboardingRecord.revocationState,
      card
    },
    error: null
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { mode?: string };
    const mode = isDemoMode(body.mode) ? body.mode : "pending";
    const onboardingRecord = demoOnboardingRecords[mode];

    const card =
      mode === "approved" && onboardingRecord.iprCardStatus === "issued"
        ? approvedIprCardRecord
        : null;

    return NextResponse.json({
      ok: true,
      status: "success",
      message: "IPR Card status returned.",
      data: {
        mode,
        ipr_id: onboardingRecord.iprId,
        ipr_status: onboardingRecord.iprStatus,
        ipr_card_status: onboardingRecord.iprCardStatus,
        revocation_state: onboardingRecord.revocationState,
        card
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
          "Invalid request body. Default pending IPR Card status returned.",
        data: {
          mode,
          ipr_id: onboardingRecord.iprId,
          ipr_status: onboardingRecord.iprStatus,
          ipr_card_status: onboardingRecord.iprCardStatus,
          revocation_state: onboardingRecord.revocationState,
          card: null
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
