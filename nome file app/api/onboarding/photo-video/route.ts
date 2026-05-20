import { NextResponse, type NextRequest } from "next/server";

import type { VerificationStatus } from "@/lib/types";

const allowedVerificationStatuses: VerificationStatus[] = [
  "not_started",
  "pending",
  "submitted",
  "in_review",
  "manual_review",
  "approved",
  "rejected",
  "expired",
  "needs_more_information"
];

const forbiddenFields = [
  "raw_photo",
  "raw_video",
  "biometric_template",
  "liveness_recording",
  "face_template",
  "raw_face_image",
  "raw_liveness_video"
] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isVerificationStatus(value: unknown): value is VerificationStatus {
  return (
    typeof value === "string" &&
    allowedVerificationStatuses.includes(value as VerificationStatus)
  );
}

function containsForbiddenFields(body: Record<string, unknown>): string[] {
  return forbiddenFields.filter((field) => field in body);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "success",
    message: "Onboarding photo/video endpoint is available.",
    data: {
      endpoint: "/api/onboarding/photo-video",
      method: "POST",
      mode: "mvp",
      required_fields: [
        "onboarding_id",
        "photo_reference",
        "video_reference",
        "photo_hash",
        "video_hash",
        "photo_verification_status",
        "video_verification_status",
        "liveness_status"
      ],
      forbidden_fields: forbiddenFields,
      generated_status:
        "photo_verification_status and video_verification_status submitted",
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
          message: "Forbidden photo/video or biometric material detected.",
          data: null,
          error: {
            code: "FORBIDDEN_PHOTO_VIDEO_MATERIAL",
            details:
              "Raw photos, raw videos, biometric templates, liveness recordings and face templates are not accepted in the MVP endpoint.",
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

    if (!isNonEmptyString(body.photo_reference)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing protected photo reference.",
          data: null,
          error: {
            code: "MISSING_PHOTO_REFERENCE",
            details: "photo_reference is required."
          }
        },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(body.video_reference)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing protected video reference.",
          data: null,
          error: {
            code: "MISSING_VIDEO_REFERENCE",
            details: "video_reference is required."
          }
        },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(body.photo_hash)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing photo hash.",
          data: null,
          error: {
            code: "MISSING_PHOTO_HASH",
            details: "photo_hash is required."
          }
        },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(body.video_hash)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing video hash.",
          data: null,
          error: {
            code: "MISSING_VIDEO_HASH",
            details: "video_hash is required."
          }
        },
        { status: 400 }
      );
    }

    if (!isVerificationStatus(body.photo_verification_status)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Invalid photo verification status.",
          data: null,
          error: {
            code: "INVALID_PHOTO_VERIFICATION_STATUS",
            details:
              "photo_verification_status must be a valid onboarding verification status."
          }
        },
        { status: 400 }
      );
    }

    if (!isVerificationStatus(body.video_verification_status)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Invalid video verification status.",
          data: null,
          error: {
            code: "INVALID_VIDEO_VERIFICATION_STATUS",
            details:
              "video_verification_status must be a valid onboarding verification status."
          }
        },
        { status: 400 }
      );
    }

    if (!isVerificationStatus(body.liveness_status)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Invalid liveness status.",
          data: null,
          error: {
            code: "INVALID_LIVENESS_STATUS",
            details:
              "liveness_status must be a valid onboarding verification status."
          }
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    return NextResponse.json({
      ok: true,
      status: "success",
      message: "Demo photo/video verification state submitted.",
      data: {
        photo_video_verification_id: `photo_video_demo_${crypto.randomUUID()}`,
        onboarding_id: body.onboarding_id,
        photo_reference: body.photo_reference,
        video_reference: body.video_reference,
        photo_hash: body.photo_hash,
        video_hash: body.video_hash,
        photo_verification_status: body.photo_verification_status,
        video_verification_status: body.video_verification_status,
        liveness_status: body.liveness_status,
        review_status: "pending_review",
        ipr_status: "pending",
        ipr_card_status: "pending",
        certificate_status: "pending",
        joker_c2_access_status: "denied",
        created_at: now,
        updated_at: now,
        next_route: "/onboarding/review"
      },
      error: null
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message:
          "Invalid request body. Photo/video verification state was not submitted and JOKER-C2 access remains denied.",
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
