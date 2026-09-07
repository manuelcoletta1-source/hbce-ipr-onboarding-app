import "server-only";

import {
  type NextRequest,
  NextResponse
} from "next/server";

import {
  ONBOARDING_SESSION_COOKIE_NAME
} from "@/lib/server/onboarding-session-cookie";

import {
  OnboardingOriginPolicyError,
  validateStateChangingRequestOrigin
} from "@/lib/server/onboarding-origin-policy";

import {
  setOnboardingSessionCookie
} from "@/lib/server/onboarding-next-http-trust-adapter";

import {
  OnboardingSessionRecoveryError,
  createOnboardingSessionRecoveryService
} from "@/lib/server/onboarding-session-recovery-service";

function jsonError(
  reason: string,
  status: number,
  message: string
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      reason,
      message
    },
    {
      status
    }
  );
}

function isPlainJsonObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

async function validateRecoveryBody(
  request: NextRequest
): Promise<NextResponse | null> {
  let rawBody: string;

  try {
    rawBody =
      await request.text();
  } catch {
    return jsonError(
      "INVALID_JSON",
      400,
      "Invalid request body."
    );
  }

  if (rawBody.length === 0) {
    return null;
  }

  let parsedBody: unknown;

  try {
    parsedBody =
      JSON.parse(rawBody);
  } catch {
    return jsonError(
      "INVALID_JSON",
      400,
      "Invalid request body."
    );
  }

  if (
    !isPlainJsonObject(
      parsedBody
    ) ||
    Object.keys(
      parsedBody
    ).length !== 0
  ) {
    return jsonError(
      "INVALID_BODY",
      400,
      "Session recovery does not accept request body fields."
    );
  }

  return null;
}

function mapRecoveryError(
  error:
    OnboardingSessionRecoveryError
): NextResponse {
  switch (error.code) {
    case "UNAUTHORIZED":
      return jsonError(
        "SESSION_UNAUTHORIZED",
        401,
        "A valid onboarding session is required for recovery."
      );

    case "NOT_RECOVERABLE":
      return jsonError(
        "SESSION_NOT_RECOVERABLE",
        409,
        "The onboarding session is not eligible for recovery."
      );

    case "DEPENDENCY_FAILURE":
      return jsonError(
        "RECOVERY_DEPENDENCY_FAILURE",
        503,
        "Onboarding session recovery dependencies are unavailable."
      );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    validateStateChangingRequestOrigin(
      request.headers.get(
        "origin"
      ),
      process.env.HBCE_APP_ORIGIN
    );
  } catch (error) {
    if (
      error instanceof
      OnboardingOriginPolicyError
    ) {
      if (
        error.code ===
        "DEPENDENCY_FAILURE"
      ) {
        return jsonError(
          "ORIGIN_CONFIGURATION_FAILURE",
          503,
          "Onboarding Origin policy configuration is unavailable."
        );
      }

      return jsonError(
        "REQUEST_FORBIDDEN",
        403,
        "The onboarding request is not authorized."
      );
    }

    return jsonError(
      "RECOVERY_DEPENDENCY_FAILURE",
      503,
      "Onboarding session recovery dependencies are unavailable."
    );
  }

  const bodyFailure =
    await validateRecoveryBody(
      request
    );

  if (bodyFailure) {
    return bodyFailure;
  }

  const rawToken =
    request.cookies.get(
      ONBOARDING_SESSION_COOKIE_NAME
    )?.value;

  let recovered;

  try {
    recovered =
      await createOnboardingSessionRecoveryService()
        .recover({
          rawToken
        });
  } catch (error) {
    if (
      error instanceof
      OnboardingSessionRecoveryError
    ) {
      return mapRecoveryError(
        error
      );
    }

    return jsonError(
      "RECOVERY_DEPENDENCY_FAILURE",
      503,
      "Onboarding session recovery dependencies are unavailable."
    );
  }

  const response =
    NextResponse.json(
      {
        ok: true,
        recovery_status:
          "recovered",
        onboarding_status:
          "started"
      },
      {
        status: 200
      }
    );

  try {
    setOnboardingSessionCookie(
      response,
      recovered.rawToken
    );
  } catch {
    return jsonError(
      "COOKIE_ROTATION_FAILURE",
      503,
      "Recovered onboarding session cookie could not be installed."
    );
  }

  return response;
}
