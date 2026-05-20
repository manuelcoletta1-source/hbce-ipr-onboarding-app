import { NextResponse, type NextRequest } from "next/server";

import { LEGAL_BOUNDARY_TEXT, ORG_NAME } from "@/lib/constants";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isVerified(value: unknown): boolean {
  return value === "verified";
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
    message: "IPR Card issue endpoint is available.",
    data: {
      endpoint: "/api/ipr-card/issue",
      method: "POST",
      mode: "mvp",
      required_fields: ["ipr_id", "subject_id", "ipr_status"],
      required_conditions: [
        "ipr_status = verified",
        "revocation_state = clear"
      ],
      generated_status: "ipr_card_status = issued",
      joker_c2_access_status: "denied",
      legal_boundary: LEGAL_BOUNDARY_TEXT,
      access_note:
        "IPR Card issuance does not open JOKER-C2 by itself. Active operational certificate is still required."
    },
    error: null
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      ipr_id?: unknown;
      subject_id?: unknown;
      ipr_status?: unknown;
      revocation_state?: unknown;
      access_scope?: unknown;
    };

    if (!isNonEmptyString(body.ipr_id)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing IPR identifier.",
          data: null,
          error: {
            code: "MISSING_IPR_ID",
            details: "ipr_id is required."
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

    if (!isVerified(body.ipr_status)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "IPR status is not verified.",
          data: {
            ipr_id: body.ipr_id,
            ipr_card_status: "not_issued",
            certificate_status: "not_created",
            joker_c2_access_status: "denied"
          },
          error: {
            code: "IPR_NOT_VERIFIED",
            details:
              "IPR Card can be issued only when ipr_status is verified."
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
            ipr_id: body.ipr_id,
            ipr_card_status: "revoked",
            certificate_status: "revoked",
            joker_c2_access_status: "denied"
          },
          error: {
            code: "REVOCATION_STATE_NOT_CLEAR",
            details:
              "IPR Card cannot be issued when revocation_state is not clear."
          }
        },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      .toISOString();
    const iprCardId = `CARD-HBCE-DEMO-${crypto.randomUUID()}`;
    const certificateReference = `CERT-HBCE-DEMO-PENDING-${crypto.randomUUID()}`;
    const accessScope = isNonEmptyString(body.access_scope)
      ? body.access_scope
      : "JOKER-C2-GOVERNED-RUNTIME";

    return NextResponse.json({
      ok: true,
      status: "success",
      message: "Demo IPR Card issued.",
      data: {
        ipr_card_id: iprCardId,
        ipr_id: body.ipr_id,
        subject_id: body.subject_id,
        card_status: "issued",
        issuer: ORG_NAME,
        issued_at: now,
        expires_at: expiresAt,
        access_scope: accessScope,
        certificate_reference: certificateReference,
        revocation_state: "clear",
        card_hash_reference: createDemoHashReference(
          `${iprCardId}_${body.ipr_id}`
        ),
        certificate_status: "pending",
        joker_c2_access_status: "denied",
        event_type: "IPR_CARD_ISSUED",
        legal_boundary: LEGAL_BOUNDARY_TEXT,
        next_route: "/certificate",
        access_note:
          "IPR Card has been issued. JOKER-C2 remains denied until the operational certificate is active and revocation state is clear."
      },
      error: null
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message:
          "Invalid request body. IPR Card was not issued and JOKER-C2 access remains denied.",
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
