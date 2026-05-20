import { NextResponse, type NextRequest } from "next/server";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidDate(value: unknown): value is string {
  if (!isNonEmptyString(value)) {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "success",
    message: "Onboarding identity endpoint is available.",
    data: {
      endpoint: "/api/onboarding/identity",
      method: "POST",
      mode: "mvp",
      required_fields: [
        "onboarding_id",
        "first_name",
        "last_name",
        "date_of_birth",
        "place_of_birth",
        "country",
        "nationality",
        "residential_country"
      ],
      generated_status: "identity_data_status = submitted",
      joker_c2_access_status: "denied"
    },
    error: null
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      onboarding_id?: unknown;
      first_name?: unknown;
      last_name?: unknown;
      date_of_birth?: unknown;
      place_of_birth?: unknown;
      country?: unknown;
      nationality?: unknown;
      residential_country?: unknown;
      residential_region?: unknown;
      residential_city?: unknown;
    };

    if (!isNonEmptyString(body.onboarding_id)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing onboarding identifier.",
          data: null,
          error: {
            code: "MISSING_ONBOARDING_ID",
            details: "onboarding_id is required."
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

    if (!isValidDate(body.date_of_birth)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Invalid date of birth.",
          data: null,
          error: {
            code: "INVALID_DATE_OF_BIRTH",
            details: "date_of_birth must be a valid date."
          }
        },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(body.place_of_birth)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing place of birth.",
          data: null,
          error: {
            code: "MISSING_PLACE_OF_BIRTH",
            details: "place_of_birth is required."
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

    if (!isNonEmptyString(body.nationality)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing nationality.",
          data: null,
          error: {
            code: "MISSING_NATIONALITY",
            details: "nationality is required."
          }
        },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(body.residential_country)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing residential country.",
          data: null,
          error: {
            code: "MISSING_RESIDENTIAL_COUNTRY",
            details: "residential_country is required."
          }
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    return NextResponse.json({
      ok: true,
      status: "success",
      message: "Demo identity data submitted.",
      data: {
        identity_profile_id: `identity_demo_${crypto.randomUUID()}`,
        onboarding_id: body.onboarding_id,
        first_name: body.first_name,
        last_name: body.last_name,
        date_of_birth: body.date_of_birth,
        place_of_birth: body.place_of_birth,
        country: body.country,
        nationality: body.nationality,
        residential_country: body.residential_country,
        residential_region: isNonEmptyString(body.residential_region)
          ? body.residential_region
          : null,
        residential_city: isNonEmptyString(body.residential_city)
          ? body.residential_city
          : null,
        identity_data_status: "submitted",
        document_status: "not_started",
        fiscal_identifier_status: "not_started",
        review_status: "not_started",
        ipr_status: "not_created",
        joker_c2_access_status: "denied",
        created_at: now,
        updated_at: now,
        next_route: "/onboarding/documents"
      },
      error: null
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message:
          "Invalid request body. Identity data was not submitted and JOKER-C2 access remains denied.",
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
