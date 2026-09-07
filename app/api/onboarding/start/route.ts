import {
  createHash,
  randomUUID
} from "node:crypto";

import {
  NextResponse,
  type NextRequest
} from "next/server";

import {
  NeonOnboardingStartRepositoryError,
  createNeonOnboardingStartRepository
} from "@/lib/server/neon-onboarding-start-repository";

import {
  OnboardingOriginPolicyError,
  validateStateChangingRequestOrigin
} from "@/lib/server/onboarding-origin-policy";

import {
  setOnboardingSessionCookie
} from "@/lib/server/onboarding-next-http-trust-adapter";

import {
  generateOnboardingSessionToken
} from "@/lib/server/onboarding-session-token";

export const runtime = "nodejs";

const IDEMPOTENCY_KEY_HEADER =
  "Idempotency-Key";

const IDEMPOTENCY_KEY_PATTERN =
  /^[A-Za-z0-9_-]{43}$/;

const START_BODY_FIELDS =
  new Set([
    "accept_terms",
    "accept_privacy"
  ]);

type StartBody = {
  readonly accept_terms?: unknown;
  readonly accept_privacy?: unknown;
};

function errorResponse(
  code: string,
  status: number
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code
      }
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

function hasOnlyAllowedStartFields(
  value: Record<string, unknown>
): boolean {
  return Object.keys(
    value
  ).every(
    (field) =>
      START_BODY_FIELDS.has(
        field
      )
  );
}

function isCanonicalIdempotencyKey(
  value: string
): boolean {
  if (
    !IDEMPOTENCY_KEY_PATTERN.test(
      value
    )
  ) {
    return false;
  }

  try {
    const decoded =
      Buffer.from(
        value,
        "base64url"
      );

    if (
      decoded.byteLength !== 32
    ) {
      return false;
    }

    return (
      decoded.toString(
        "base64url"
      ) === value
    );
  } catch {
    return false;
  }
}

function hashIdempotencyKey(
  rawKey: string
): string {
  return createHash(
    "sha256"
  )
    .update(
      rawKey,
      "utf8"
    )
    .digest(
      "hex"
    );
}

export async function GET() {
  return NextResponse.json({
    endpoint:
      "/api/onboarding/start",
    method:
      "POST",
    mode:
      "trust-backed",
    runtime:
      "nodejs",
    required_headers: [
      "Origin",
      IDEMPOTENCY_KEY_HEADER
    ],
    required_fields: [
      "accept_terms",
      "accept_privacy"
    ],
    deferred_fields: [
      "email",
      "first_name",
      "last_name",
      "country"
    ],
    joker_c2_access_status:
      "denied"
  });
}

export async function POST(
  request: NextRequest
) {
  try {
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
          return errorResponse(
            "ORIGIN_CONFIGURATION_FAILURE",
            503
          );
        }

        return errorResponse(
          "ORIGIN_FORBIDDEN",
          403
        );
      }

      return errorResponse(
        "START_DEPENDENCY_FAILURE",
        503
      );
    }

    const rawIdempotencyKey =
      request.headers.get(
        IDEMPOTENCY_KEY_HEADER
      );

    if (
      typeof rawIdempotencyKey !==
        "string" ||
      !isCanonicalIdempotencyKey(
        rawIdempotencyKey
      )
    ) {
      return errorResponse(
        "INVALID_IDEMPOTENCY_KEY",
        400
      );
    }

    const idempotencySha256 =
      hashIdempotencyKey(
        rawIdempotencyKey
      );

    let parsedBody: unknown;

    try {
      parsedBody =
        await request.json();
    } catch {
      return errorResponse(
        "INVALID_JSON",
        400
      );
    }

    if (
      !isPlainJsonObject(
        parsedBody
      ) ||
      !hasOnlyAllowedStartFields(
        parsedBody
      )
    ) {
      return errorResponse(
        "INVALID_BODY",
        400
      );
    }

    const body =
      parsedBody as StartBody;

    if (
      body.accept_terms !== true
    ) {
      return errorResponse(
        "TERMS_NOT_ACCEPTED",
        400
      );
    }

    if (
      body.accept_privacy !== true
    ) {
      return errorResponse(
        "PRIVACY_NOT_ACCEPTED",
        400
      );
    }

    const subjectId =
      `sub_${randomUUID()}`;

    const onboardingId =
      `onb_${randomUUID()}`;

    const sessionId =
      `session_${randomUUID()}`;

    const generatedToken =
      generateOnboardingSessionToken();

    const now =
      new Date().toISOString();

    const repository =
      createNeonOnboardingStartRepository();

    await repository.createAtomicStart({
      idempotencySha256,
      tokenSha256:
        generatedToken.tokenSha256,
      subjectId,
      onboardingId,
      sessionId,
      now
    });

    const response =
      NextResponse.json(
        {
          onboarding_status:
            "started",
          joker_c2_access_status:
            "denied",
          next_route:
            "/onboarding/identity"
        },
        {
          status: 201
        }
      );

    setOnboardingSessionCookie(
      response,
      generatedToken.rawToken
    );

    return response;
  } catch (error) {
    if (
      error instanceof
      NeonOnboardingStartRepositoryError
    ) {
      if (
        error.code ===
        "IDEMPOTENCY_CONFLICT"
      ) {
        return errorResponse(
          "IDEMPOTENCY_CONFLICT",
          409
        );
      }

      return errorResponse(
        "START_DEPENDENCY_FAILURE",
        503
      );
    }

    return errorResponse(
      "START_DEPENDENCY_FAILURE",
      503
    );
  }
}
