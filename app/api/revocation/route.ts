import { NextResponse, type NextRequest } from "next/server";

import { ORG_NAME } from "@/lib/constants";

import type { RevocationState } from "@/lib/types";

type RevocationTargetType =
  | "ipr"
  | "ipr_card"
  | "certificate"
  | "joker_c2_access"
  | "onboarding_record";

const allowedTargetTypes: RevocationTargetType[] = [
  "ipr",
  "ipr_card",
  "certificate",
  "joker_c2_access",
  "onboarding_record"
];

const allowedRevocationStates: RevocationState[] = [
  "clear",
  "suspended",
  "revoked",
  "expired",
  "under_review"
];

const demoRevocationRecords = [
  {
    revocationId: "rev_demo_001",
    subjectId: "sub_demo_revoked_001",
    iprId: "IPR-HBCE-DEMO-REVOKED-001",
    targetType: "ipr",
    targetId: "IPR-HBCE-DEMO-REVOKED-001",
    revocationState: "revoked",
    reasonCode: "manual_operator_revocation",
    issuedBy: ORG_NAME,
    issuedAt: "2026-05-20T12:00:00+02:00",
    createdAt: "2026-05-20T12:00:00+02:00",
    updatedAt: "2026-05-20T12:00:00+02:00"
  },
  {
    revocationId: "rev_demo_002",
    subjectId: "sub_demo_suspended_001",
    iprId: "IPR-HBCE-DEMO-SUSPENDED-001",
    targetType: "joker_c2_access",
    targetId: "JOKER-C2-ACCESS-DEMO-SUSPENDED-001",
    revocationState: "suspended",
    reasonCode: "access_under_review",
    issuedBy: ORG_NAME,
    issuedAt: "2026-05-20T12:00:00+02:00",
    createdAt: "2026-05-20T12:00:00+02:00",
    updatedAt: "2026-05-20T12:00:00+02:00"
  }
] as const;

function isTargetType(value: unknown): value is RevocationTargetType {
  return (
    typeof value === "string" &&
    allowedTargetTypes.includes(value as RevocationTargetType)
  );
}

function isRevocationState(value: unknown): value is RevocationState {
  return (
    typeof value === "string" &&
    allowedRevocationStates.includes(value as RevocationState)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function createsAccessBlock(state: RevocationState): boolean {
  return state !== "clear";
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "success",
    message: "Demo revocation records returned.",
    data: {
      records: demoRevocationRecords
    },
    error: null
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      subject_id?: unknown;
      ipr_id?: unknown;
      target_type?: unknown;
      target_id?: unknown;
      revocation_state?: unknown;
      reason_code?: unknown;
      issued_by?: unknown;
    };

    if (!isTargetType(body.target_type)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Invalid revocation target type.",
          data: null,
          error: {
            code: "INVALID_TARGET_TYPE",
            details:
              "target_type must be one of: ipr, ipr_card, certificate, joker_c2_access, onboarding_record."
          }
        },
        { status: 400 }
      );
    }

    if (!isRevocationState(body.revocation_state)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Invalid revocation state.",
          data: null,
          error: {
            code: "INVALID_REVOCATION_STATE",
            details:
              "revocation_state must be one of: clear, suspended, revoked, expired, under_review."
          }
        },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(body.target_id)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing target identifier.",
          data: null,
          error: {
            code: "MISSING_TARGET_ID",
            details: "target_id is required."
          }
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const revocationRecord = {
      revocationId: `rev_demo_${crypto.randomUUID()}`,
      subjectId: isNonEmptyString(body.subject_id)
        ? body.subject_id
        : "sub_demo_unknown",
      iprId: isNonEmptyString(body.ipr_id)
        ? body.ipr_id
        : "IPR-HBCE-DEMO-UNKNOWN",
      targetType: body.target_type,
      targetId: body.target_id,
      revocationState: body.revocation_state,
      reasonCode: isNonEmptyString(body.reason_code)
        ? body.reason_code
        : "demo_revocation_reason",
      issuedBy: isNonEmptyString(body.issued_by) ? body.issued_by : ORG_NAME,
      issuedAt: now,
      createdAt: now,
      updatedAt: now
    };

    return NextResponse.json({
      ok: true,
      status: "success",
      message: "Demo revocation record created.",
      data: {
        record: revocationRecord,
        joker_c2_access_blocked: createsAccessBlock(
          revocationRecord.revocationState
        ),
        access_rule:
          revocationRecord.revocationState === "clear"
            ? "Revocation state is clear. Access may still require verified IPR, issued IPR Card and active certificate."
            : "Revocation state is not clear. JOKER-C2 access must be denied."
      },
      error: null
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message: "Invalid request body. Revocation record was not created.",
        data: null,
        error: {
          code: "INVALID_JSON",
          details: "Request body must be valid JSON."
        }
      },
      { status: 400 }
    );
  }
}
