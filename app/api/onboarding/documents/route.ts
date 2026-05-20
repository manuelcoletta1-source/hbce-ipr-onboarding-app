import { NextResponse, type NextRequest } from "next/server";

import type { DocumentType } from "@/lib/types";

const allowedDocumentTypes: DocumentType[] = [
  "identity_card",
  "passport",
  "driving_license",
  "residence_document",
  "other_official_document"
];

const forbiddenFields = [
  "raw_document_image",
  "raw_document_scan",
  "raw_document_number",
  "unprotected_document_url"
] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDocumentType(value: unknown): value is DocumentType {
  return (
    typeof value === "string" &&
    allowedDocumentTypes.includes(value as DocumentType)
  );
}

function isValidDate(value: unknown): value is string {
  if (!isNonEmptyString(value)) {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
}

function isExpiredDate(value: string): boolean {
  const expiryDate = new Date(value);
  const today = new Date();

  expiryDate.setHours(23, 59, 59, 999);

  return expiryDate.getTime() < today.getTime();
}

function containsForbiddenFields(body: Record<string, unknown>): string[] {
  return forbiddenFields.filter((field) => field in body);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "success",
    message: "Onboarding documents endpoint is available.",
    data: {
      endpoint: "/api/onboarding/documents",
      method: "POST",
      mode: "mvp",
      required_fields: [
        "onboarding_id",
        "document_type",
        "document_country",
        "document_expiry_date",
        "document_number_hash",
        "document_file_hash",
        "document_storage_reference"
      ],
      forbidden_fields: forbiddenFields,
      generated_status: "document_status = submitted",
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
          message: "Forbidden raw document material detected.",
          data: null,
          error: {
            code: "FORBIDDEN_DOCUMENT_MATERIAL",
            details:
              "Raw document images, scans, raw document numbers and unprotected document URLs are not accepted.",
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

    if (!isDocumentType(body.document_type)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Invalid document type.",
          data: null,
          error: {
            code: "INVALID_DOCUMENT_TYPE",
            details:
              "document_type must be one of: identity_card, passport, driving_license, residence_document, other_official_document."
          }
        },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(body.document_country)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing document country.",
          data: null,
          error: {
            code: "MISSING_DOCUMENT_COUNTRY",
            details: "document_country is required."
          }
        },
        { status: 400 }
      );
    }

    if (!isValidDate(body.document_expiry_date)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Invalid document expiry date.",
          data: null,
          error: {
            code: "INVALID_DOCUMENT_EXPIRY_DATE",
            details: "document_expiry_date must be a valid date."
          }
        },
        { status: 400 }
      );
    }

    if (isExpiredDate(body.document_expiry_date)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Expired document.",
          data: null,
          error: {
            code: "EXPIRED_DOCUMENT",
            details:
              "The submitted document expiry date is in the past. The onboarding document state cannot be accepted."
          }
        },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(body.document_number_hash)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing document number hash.",
          data: null,
          error: {
            code: "MISSING_DOCUMENT_NUMBER_HASH",
            details: "document_number_hash is required."
          }
        },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(body.document_file_hash)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing document file hash.",
          data: null,
          error: {
            code: "MISSING_DOCUMENT_FILE_HASH",
            details: "document_file_hash is required."
          }
        },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(body.document_storage_reference)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing protected storage reference.",
          data: null,
          error: {
            code: "MISSING_DOCUMENT_STORAGE_REFERENCE",
            details: "document_storage_reference is required."
          }
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    return NextResponse.json({
      ok: true,
      status: "success",
      message: "Demo document metadata submitted.",
      data: {
        document_record_id: `doc_demo_${crypto.randomUUID()}`,
        onboarding_id: body.onboarding_id,
        document_type: body.document_type,
        document_country: body.document_country,
        document_expiry_date: body.document_expiry_date,
        document_number_hash: body.document_number_hash,
        document_file_hash: body.document_file_hash,
        document_storage_reference: body.document_storage_reference,
        document_status: "submitted",
        fiscal_identifier_status: "not_started",
        photo_verification_status: "not_started",
        video_verification_status: "not_started",
        review_status: "not_started",
        ipr_status: "not_created",
        joker_c2_access_status: "denied",
        created_at: now,
        updated_at: now,
        next_route: "/onboarding/fiscal"
      },
      error: null
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message:
          "Invalid request body. Document metadata was not submitted and JOKER-C2 access remains denied.",
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
