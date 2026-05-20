import { NextResponse, type NextRequest } from "next/server";

import { evaluateJokerC2Access } from "@/lib/access-decision";
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

function isDemoMode(value: string | null): value is DemoOnboardingMode {
  return value !== null && allowedModes.includes(value as DemoOnboardingMode);
}

function getRecordByMode(mode: DemoOnboardingMode) {
  return demoOnboardingRecords[mode];
}

export async function GET(request: NextRequest) {
  const modeParam = request.nextUrl.searchParams.get("mode");
  const mode = isDemoMode(modeParam) ? modeParam : "approved";
  const record = getRecordByMode(mode);
  const result = evaluateJokerC2Access(record);

  return NextResponse.json({
    ok: true,
    status: "success",
    message: "JOKER-C2 access decision evaluated.",
    data: {
      mode,
      result
    },
    error: null
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { mode?: string };
    const mode = isDemoMode(body.mode ?? null) ? body.mode : "approved";
    const record = getRecordByMode(mode);
    const result = evaluateJokerC2Access(record);

    return NextResponse.json({
      ok: true,
      status: "success",
      message: "JOKER-C2 access decision evaluated.",
      data: {
        mode,
        result
      },
      error: null
    });
  } catch {
    const record = getRecordByMode("approved");
    const result = evaluateJokerC2Access(record);

    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message:
          "Invalid request body. Default fail-closed access decision returned.",
        data: {
          mode: "approved",
          result
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
