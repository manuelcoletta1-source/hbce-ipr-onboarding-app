import { NextResponse, type NextRequest } from "next/server";

import type { FiscalIdentifierType } from "@/lib/types";

const allowedFiscalIdentifierTypes: FiscalIdentifierType[] = [
  "fiscal_code",
  "tax_identifier",
  "national_identification_number",
  "social_security_style_number",
  "other_public_identifier"
];

const forbiddenFields = [
  "raw_fiscal_identifier",
  "raw_tax_identifier",
  "raw_national_identifier",
  "raw_social_security_number"
] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiscalIdentifierType(value: unknown): value is FiscalIdentifierType {
  return (
    typeof value === "string" &&
    allowedFiscalIdentifierTypes.includes(value as FiscalIdentifierType)
  );
}

function containsForbiddenFields(body: Record<string, unknown>): string[] {
  return forbiddenFields.filter((field) => field in body);
}

function looksMasked(value: string): boolean {
  return value.includes("*") && value.length >= 6;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "success",
    message: "Onboarding fiscal identifier endpoint is available.",
    data: {
      endpoint: "/api/onboarding/fiscal",
      method: "POST",
      mode: "mvp",
      required_fields: [
        "onboarding_id",
        "fiscal_identifier_type",
        "fiscal_identifier_country",
        "fiscal_identifier_hash",
        "fiscal_identifier_masked"
      ],
      forbidden_fields: forbiddenFields,
      generated_status: "fiscal_identifier_status = submitted",
      joker_c2_access_status: "denied"
    },
    error: null
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const detectedForbiddenFields = containsForbiddenFields(body);

    if (detectedForbiddenFields.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Forbidden raw fiscal identifier material detected.",
          data: null,
          error: {
            code: "FORBIDDEN_FISCAL_IDENTIFIER_MATERIAL",
            details:
              "Raw fiscal codes, tax identifiers, national identifiers and social security style numbers are not accepted.",
            fields: detectedForbiddenFields
          }
        },
        { status: 400 }
      );
    }

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

    if (!isFiscalIdentifierType(body.fiscal_identifier_type)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Invalid fiscal identifier type.",
          data: null,
          error: {
            code: "INVALID_FISCAL_IDENTIFIER_TYPE",
            details:
              "fiscal_identifier_type must be one of: fiscal_code, tax_identifier, national_identification_number, social_security_style_number, other_public_identifier."
          }
        },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(body.fiscal_identifier_country)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing fiscal identifier country.",
          data: null,
          error: {
            code: "MISSING_FISCAL_IDENTIFIER_COUNTRY",
            details: "fiscal_identifier_country is required."
          }
        },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(body.fiscal_identifier_hash)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing fiscal identifier hash.",
          data: null,
          error: {
            code: "MISSING_FISCAL_IDENTIFIER_HASH",
            details: "fiscal_identifier_hash is required."
          }
        },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(body.fiscal_identifier_masked)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing masked fiscal identifier.",
          data: null,
          error: {
            code: "MISSING_FISCAL_IDENTIFIER_MASKED",
            details: "fiscal_identifier_masked is required."
          }
        },
        { status: 400 }
      );
    }

    if (!looksMasked(body.fiscal_identifier_masked)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Fiscal identifier must be masked.",
          data: null,
          error: {
            code: "UNMASKED_FISCAL_IDENTIFIER",
            details:
              "fiscal_identifier_masked must contain a masked display value, for example DEM*********VED."
          }
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    return NextResponse.json({
      ok: true,
      status: "success",
      message: "Demo fiscal identifier metadata submitted.",
      data: {
        fiscal_identifier_id: `fiscal_demo_${crypto.randomUUID()}`,
        onboarding_id: body.onboarding_id,
        fiscal_identifier_type: body.fiscal_identifier_type,
        fiscal_identifier_country: body.fiscal_identifier_country,
        fiscal_identifier_hash: body.fiscal_identifier_hash,
        fiscal_identifier_masked: body.fiscal_identifier_masked,
        fiscal_identifier_status: "submitted",
        photo_verification_status: "not_started",
        video_verification_status: "not_started",
        review_status: "not_started",
        ipr_status: "not_created",
        joker_c2_access_status: "denied",
        created_at: now,
        updated_at: now,
        next_route: "/onboarding/photo-video"
      },
      error: null
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message:
          "Invalid request body. Fiscal identifier metadata was not submitted and JOKER-C2 access remains denied.",
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
