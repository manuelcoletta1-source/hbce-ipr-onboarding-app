import { NextResponse, type NextRequest } from "next/server";

import { CERTIFICATE_BOUNDARY_TEXT, ORG_NAME } from "@/lib/constants";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isVerified(value: unknown): boolean {
  return value === "verified";
}

function isIssued(value: unknown): boolean {
  return value === "issued";
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
    message: "Operational certificate activation endpoint is available.",
    data: {
      endpoint: "/api/certificate/activate",
      method: "POST",
      mode: "mvp",
      required_fields: [
        "ipr_id",
        "ipr_card_id",
        "subject_id",
        "ipr_status",
        "ipr_card_status"
      ],
      required_conditions: [
        "ipr_status = verified",
        "ipr_card_status = issued",
        "revocation_state = clear"
      ],
      generated_status: "certificate_status = active",
      joker_c2_access_status: "pending",
      certificate_boundary: CERTIFICATE_BOUNDARY_TEXT,
      access_note:
        "Certificate activation does not open JOKER-C2 by itself. The access gate must still evaluate verified IPR, issued IPR Card, active certificate and clear revocation state."
    },
    error: null
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      ipr_id?: unknown;
      ipr_card_id?: unknown;
      subject_id?: unknown;
      ipr_status?: unknown;
      ipr_card_status?: unknown;
      revocation_state?: unknown;
      scope?: unknown;
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

    if (!isNonEmptyString(body.ipr_card_id)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing IPR Card identifier.",
          data: null,
          error: {
            code: "MISSING_IPR_CARD_ID",
            details: "ipr_card_id is required."
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
            ipr_card_id: body.ipr_card_id,
            certificate_status: "not_created",
            joker_c2_access_status: "denied"
          },
          error: {
            code: "IPR_NOT_VERIFIED",
            details:
              "Operational certificate can be activated only when ipr_status is verified."
          }
        },
        { status: 403 }
      );
    }

    if (!isIssued(body.ipr_card_status)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "IPR Card status is not issued.",
          data: {
            ipr_id: body.ipr_id,
            ipr_card_id: body.ipr_card_id,
            certificate_status: "not_created",
            joker_c2_access_status: "denied"
          },
          error: {
            code: "IPR_CARD_NOT_ISSUED",
            details:
              "Operational certificate can be activated only when ipr_card_status is issued."
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
            ipr_card_id: body.ipr_card_id,
            certificate_status: "revoked",
            joker_c2_access_status: "denied"
          },
          error: {
            code: "REVOCATION_STATE_NOT_CLEAR",
            details:
              "Operational certificate cannot be activated when revocation_state is not clear."
          }
        },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      .toISOString();
    const certificateId = `CERT-HBCE-DEMO-${crypto.randomUUID()}`;
    const scope = isNonEmptyString(body.scope)
      ? body.scope
      : "JOKER-C2-GOVERNED-RUNTIME";

    return NextResponse.json({
      ok: true,
      status: "success",
      message: "Demo operational certificate activated.",
      data: {
        certificate_id: certificateId,
        ipr_id: body.ipr_id,
        ipr_card_id: body.ipr_card_id,
        subject_id: body.subject_id,
        certificate_status: "active",
        issuer: ORG_NAME,
        issued_at: now,
        expires_at: expiresAt,
        scope,
        hash_reference: createDemoHashReference(
          `${certificateId}_${body.ipr_id}_${body.ipr_card_id}`
        ),
        revocation_state: "clear",
        joker_c2_access_status: "pending",
        event_type: "CERTIFICATE_CREATED",
        certificate_boundary: CERTIFICATE_BOUNDARY_TEXT,
        next_route: "/access/joker-c2",
        access_note:
          "Operational certificate is active. JOKER-C2 still requires final access gate evaluation."
      },
      error: null
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message:
          "Invalid request body. Operational certificate was not activated and JOKER-C2 access remains denied.",
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
