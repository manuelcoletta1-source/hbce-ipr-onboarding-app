import { NextResponse, type NextRequest } from "next/server";

import { ORG_NAME } from "@/lib/constants";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isApproved(value: unknown): boolean {
  return value === "approved";
}

function isClearRevocation(value: unknown): boolean {
  return value === "clear" || value === undefined || value === null;
}

function createDemoHashReference(input: string): string {
  const normalized = input.trim().toLowerCase().replaceAll(" ", "_");

  return `sha256_demo_${normalized}_hash`;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "success",
    message: "IPR verification endpoint is available.",
    data: {
      endpoint: "/api/ipr/verify",
      method: "POST",
      mode: "mvp",
      required_fields: ["onboarding_id", "subject_id", "review_status"],
      required_conditions: [
        "review_status = approved",
        "revocation_state = clear"
      ],
      generated_status: "ipr_status = verified",
      joker_c2_access_status: "denied",
      access_note:
        "IPR Verified does not open JOKER-C2 by itself. IPR Card and operational certificate are still required."
    },
    error: null
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      onboarding_id?: unknown;
      subject_id?: unknown;
      review_status?: unknown;
      revocation_state?: unknown;
      scope?: unknown;
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

    if (!isNonEmptyString(body.subject_id)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing subject identifier.",
          data: null,
          error: {
            code: "MISSING_SUBJECT_ID",
            details: "subject_id is required."
          }
        },
        { status: 400 }
      );
    }

    if (!isApproved(body.review_status)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Review is not approved.",
          data: {
            ipr_status: "pending",
            ipr_card_status: "not_issued",
            certificate_status: "not_created",
            joker_c2_access_status: "denied"
          },
          error: {
            code: "REVIEW_NOT_APPROVED",
            details:
              "IPR Verified can be created only when review_status is approved."
          }
        },
        { status: 403 }
      );
    }

    if (!isClearRevocation(body.revocation_state)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Revocation state is not clear.",
          data: {
            ipr_status: "revoked",
            ipr_card_status: "revoked",
            certificate_status: "revoked",
            joker_c2_access_status: "denied"
          },
          error: {
            code: "REVOCATION_STATE_NOT_CLEAR",
            details:
              "IPR Verified cannot be created when revocation_state is not clear."
          }
        },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      .toISOString();
    const iprId = `IPR-HBCE-DEMO-${crypto.randomUUID()}`;
    const scope = isNonEmptyString(body.scope)
      ? body.scope
      : "JOKER-C2-GOVERNED-RUNTIME";

    return NextResponse.json({
      ok: true,
      status: "success",
      message: "Demo IPR Verified status created.",
      data: {
        ipr_id: iprId,
        subject_id: body.subject_id,
        onboarding_id: body.onboarding_id,
        ipr_status: "verified",
        issuer: ORG_NAME,
        issued_at: now,
        expires_at: expiresAt,
        scope,
        hash_reference: createDemoHashReference(`${iprId}_${body.subject_id}`),
        ipr_card_status: "pending",
        certificate_status: "pending",
        revocation_state: "clear",
        joker_c2_access_status: "denied",
        event_type: "IPR_VERIFIED",
        next_route: "/ipr-card",
        access_note:
          "IPR Verified has been created. JOKER-C2 remains denied until IPR Card is issued, certificate is active and revocation state is clear."
      },
      error: null
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message:
          "Invalid request body. IPR Verified was not created and JOKER-C2 access remains denied.",
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
