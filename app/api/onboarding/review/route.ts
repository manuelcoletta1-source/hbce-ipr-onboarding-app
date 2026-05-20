import { NextResponse, type NextRequest } from "next/server";

import { ORG_NAME } from "@/lib/constants";

import type { ReviewDecision } from "@/lib/types";

const allowedReviewDecisions: ReviewDecision[] = [
  "approve",
  "reject",
  "request_more_information",
  "expire",
  "revoke",
  "suspend"
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isReviewDecision(value: unknown): value is ReviewDecision {
  return (
    typeof value === "string" &&
    allowedReviewDecisions.includes(value as ReviewDecision)
  );
}

function mapDecisionToStates(decision: ReviewDecision) {
  if (decision === "approve") {
    return {
      review_status: "approved",
      ipr_status: "verified",
      ipr_card_status: "pending",
      certificate_status: "pending",
      revocation_state: "clear",
      joker_c2_access_status: "denied",
      next_route: "/ipr-card",
      event_type: "REVIEW_APPROVED"
    };
  }

  if (decision === "reject") {
    return {
      review_status: "rejected",
      ipr_status: "rejected",
      ipr_card_status: "not_issued",
      certificate_status: "not_created",
      revocation_state: "clear",
      joker_c2_access_status: "denied",
      next_route: "/onboarding/review",
      event_type: "REVIEW_REJECTED"
    };
  }

  if (decision === "request_more_information") {
    return {
      review_status: "needs_more_information",
      ipr_status: "pending",
      ipr_card_status: "pending",
      certificate_status: "pending",
      revocation_state: "clear",
      joker_c2_access_status: "denied",
      next_route: "/onboarding/identity",
      event_type: "REVIEW_NEEDS_MORE_INFORMATION"
    };
  }

  if (decision === "expire") {
    return {
      review_status: "expired",
      ipr_status: "expired",
      ipr_card_status: "expired",
      certificate_status: "expired",
      revocation_state: "expired",
      joker_c2_access_status: "denied",
      next_route: "/onboarding/start",
      event_type: "JOKER_C2_ACCESS_DENIED"
    };
  }

  if (decision === "suspend") {
    return {
      review_status: "in_review",
      ipr_status: "suspended",
      ipr_card_status: "suspended",
      certificate_status: "suspended",
      revocation_state: "suspended",
      joker_c2_access_status: "suspended",
      next_route: "/access/joker-c2",
      event_type: "IPR_SUSPENDED"
    };
  }

  return {
    review_status: "revoked",
    ipr_status: "revoked",
    ipr_card_status: "revoked",
    certificate_status: "revoked",
    revocation_state: "revoked",
    joker_c2_access_status: "revoked",
    next_route: "/access/joker-c2",
    event_type: "IPR_REVOKED"
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "success",
    message: "Onboarding review endpoint is available.",
    data: {
      endpoint: "/api/onboarding/review",
      method: "POST",
      mode: "mvp",
      required_fields: ["onboarding_id", "review_decision"],
      optional_fields: ["subject_id", "reviewer_reference", "reason_code"],
      allowed_review_decisions: allowedReviewDecisions,
      access_rule:
        "Only review_decision = approve may produce IPR Verified. JOKER-C2 access remains denied until IPR Card and certificate are also valid."
    },
    error: null
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      onboarding_id?: unknown;
      subject_id?: unknown;
      review_decision?: unknown;
      reviewer_reference?: unknown;
      reason_code?: unknown;
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

    if (!isReviewDecision(body.review_decision)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Invalid review decision.",
          data: null,
          error: {
            code: "INVALID_REVIEW_DECISION",
            details:
              "review_decision must be one of: approve, reject, request_more_information, expire, revoke, suspend."
          }
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const mappedState = mapDecisionToStates(body.review_decision);
    const subjectId = isNonEmptyString(body.subject_id)
      ? body.subject_id
      : `sub_demo_${crypto.randomUUID()}`;

    const iprId =
      body.review_decision === "approve"
        ? `IPR-HBCE-DEMO-${crypto.randomUUID()}`
        : "IPR-HBCE-DEMO-NOT-VERIFIED";

    return NextResponse.json({
      ok: true,
      status: "success",
      message: "Demo onboarding review decision recorded.",
      data: {
        review_id: `review_demo_${crypto.randomUUID()}`,
        onboarding_id: body.onboarding_id,
        subject_id: subjectId,
        ipr_id: iprId,
        review_decision: body.review_decision,
        reviewer_reference: isNonEmptyString(body.reviewer_reference)
          ? body.reviewer_reference
          : ORG_NAME,
        reason_code: isNonEmptyString(body.reason_code)
          ? body.reason_code
          : "demo_review_decision",
        ...mappedState,
        decision_timestamp: now,
        created_at: now,
        updated_at: now,
        access_note:
          "Review approval alone does not open JOKER-C2. Access still requires issued IPR Card, active operational certificate and clear revocation state."
      },
      error: null
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message:
          "Invalid request body. Review decision was not recorded and JOKER-C2 access remains denied.",
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
