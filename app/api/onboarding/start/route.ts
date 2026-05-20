import { NextResponse, type NextRequest } from "next/server";

import { CORE_PRODUCT_RULE } from "@/lib/constants";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isAccepted(value: unknown): boolean {
  return value === true;
}

function createDemoHashReference(input: string): string {
  const normalized = input.trim().toLowerCase().replaceAll(" ", "_");

  return `sha256_demo_${normalized}_hash`;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "success",
    message: "Onboarding start endpoint is available.",
    data: {
      endpoint: "/api/onboarding/start",
      method: "POST",
      mode: "mvp",
      operational_rule: CORE_PRODUCT_RULE,
      required_fields: [
        "email",
        "first_name",
        "last_name",
        "country",
        "accept_terms",
        "accept_privacy"
      ],
      default_joker_c2_access_status: "denied"
    },
    error: null
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: unknown;
      first_name?: unknown;
      last_name?: unknown;
      country?: unknown;
      accept_terms?: unknown;
      accept_privacy?: unknown;
    };

    if (!isNonEmptyString(body.email) || !body.email.includes("@")) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Invalid email.",
          data: null,
          error: {
            code: "INVALID_EMAIL",
            details: "A valid email is required to start onboarding."
          }
        },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(body.first_name)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing first name.",
          data: null,
          error: {
            code: "MISSING_FIRST_NAME",
            details: "first_name is required."
          }
        },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(body.last_name)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing last name.",
          data: null,
          error: {
            code: "MISSING_LAST_NAME",
            details: "last_name is required."
          }
        },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(body.country)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing country.",
          data: null,
          error: {
            code: "MISSING_COUNTRY",
            details: "country is required."
          }
        },
        { status: 400 }
      );
    }

    if (!isAccepted(body.accept_terms)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Terms not accepted.",
          data: null,
          error: {
            code: "TERMS_NOT_ACCEPTED",
            details: "accept_terms must be true."
          }
        },
        { status: 400 }
      );
    }

    if (!isAccepted(body.accept_privacy)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Privacy boundary not accepted.",
          data: null,
          error: {
            code: "PRIVACY_NOT_ACCEPTED",
            details: "accept_privacy must be true."
          }
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const subjectId = `sub_demo_${crypto.randomUUID()}`;
    const onboardingId = `onb_demo_${crypto.randomUUID()}`;

    return NextResponse.json({
      ok: true,
      status: "success",
      message: "Demo onboarding session started.",
      data: {
        subject_id: subjectId,
        onboarding_id: onboardingId,
        email_hash: createDemoHashReference(body.email),
        first_name: body.first_name,
        last_name: body.last_name,
        country: body.country,
        onboarding_status: "started",
        email_status: "pending",
        review_status: "not_started",
        ipr_status: "not_created",
        ipr_card_status: "not_issued",
        certificate_status: "not_created",
        revocation_state: "clear",
        joker_c2_access_status: "denied",
        created_at: now,
        updated_at: now,
        next_route: "/onboarding/identity"
      },
      error: null
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message:
          "Invalid request body. Onboarding was not started and JOKER-C2 access remains denied.",
        data: {
          joker_c2_access_status: "denied"
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
