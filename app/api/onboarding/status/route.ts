import { NextResponse, type NextRequest } from "next/server";

import {
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
  return value !== null && value !== undefined && allowedModes.includes(value as DemoOnboardingMode);
}

function getRecordByMode(mode: DemoOnboardingMode) {
  return demoOnboardingRecords[mode];
}

export async function GET(request: NextRequest) {
  const modeParam = request.nextUrl.searchParams.get("mode");
  const mode = isDemoMode(modeParam) ? modeParam : "pending";
  const record = getRecordByMode(mode);

  return NextResponse.json({
    ok: true,
    status: "success",
    message: "Onboarding status returned.",
    data: {
      mode,
      record
    },
    error: null
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { mode?: string };
    const mode = isDemoMode(body.mode) ? body.mode : "pending";
    const record = getRecordByMode(mode);

    return NextResponse.json({
      ok: true,
      status: "success",
      message: "Onboarding status returned.",
      data: {
        mode,
        record
      },
      error: null
    });
  } catch {
    const mode: DemoOnboardingMode = "pending";
    const record = getRecordByMode(mode);

    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message:
          "Invalid request body. Default pending onboarding status returned.",
        data: {
          mode,
          record
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
