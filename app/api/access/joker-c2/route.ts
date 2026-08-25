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

function isDemoMode(
  value: string | null | undefined
): value is DemoOnboardingMode {
  return (
    value !== null &&
    value !== undefined &&
    allowedModes.includes(value as DemoOnboardingMode)
  );
}

function getRecordByMode(mode: DemoOnboardingMode) {
  return demoOnboardingRecords[mode];
}

function buildModeError(
  code: "MISSING_MODE" | "INVALID_MODE",
  details: string
) {
  return NextResponse.json(
    {
      ok: false,
      status: "error",
      message: "JOKER-C2 access evaluation request rejected.",
      data: null,
      error: {
        code,
        details
      }
    },
    { status: 400 }
  );
}

function evaluateExplicitMode(mode: DemoOnboardingMode) {
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

export async function GET(request: NextRequest) {
  const modeParam = request.nextUrl.searchParams.get("mode");

  if (modeParam === null || modeParam.trim().length === 0) {
    return buildModeError(
      "MISSING_MODE",
      "An explicit demo access mode is required."
    );
  }

  if (!isDemoMode(modeParam)) {
    return buildModeError(
      "INVALID_MODE",
      "The supplied demo access mode is not supported."
    );
  }

  return evaluateExplicitMode(modeParam);
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message: "Invalid request body.",
        data: null,
        error: {
          code: "INVALID_JSON",
          details: "Request body must be valid JSON."
        }
      },
      { status: 400 }
    );
  }

  const modeInput =
    typeof body === "object" &&
    body !== null &&
    !Array.isArray(body) &&
    "mode" in body
      ? (body as { mode?: unknown }).mode
      : undefined;

  if (
    modeInput === undefined ||
    (typeof modeInput === "string" &&
      modeInput.trim().length === 0)
  ) {
    return buildModeError(
      "MISSING_MODE",
      "An explicit demo access mode is required."
    );
  }

  if (
    typeof modeInput !== "string" ||
    !isDemoMode(modeInput)
  ) {
    return buildModeError(
      "INVALID_MODE",
      "The supplied demo access mode is not supported."
    );
  }

  return evaluateExplicitMode(modeInput);
}
