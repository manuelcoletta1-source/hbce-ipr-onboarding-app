import { NextResponse, type NextRequest } from "next/server";

import { EVENT_TYPES } from "@/lib/constants";
import { demoAuditEvents } from "@/lib/mock-onboarding";

import type { EventType } from "@/lib/types";

function isEventType(value: string | undefined): value is EventType {
  return (
    value !== undefined &&
    (EVENT_TYPES as readonly string[]).includes(value)
  );
}

function createDemoHashReference(input: string): string {
  const normalized = input.trim().toLowerCase().replaceAll(" ", "_");

  return `sha256_demo_${normalized}_hash`;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "success",
    message: "Demo EVT-ready event references returned.",
    data: {
      events: demoAuditEvents
    },
    error: null
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      event_type?: string;
      subject_id?: string;
      ipr_id?: string;
      onboarding_id?: string;
      previous_event_reference?: string;
      decision_state?: string;
    };

    if (!isEventType(body.event_type)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Invalid event type.",
          data: null,
          error: {
            code: "INVALID_EVENT_TYPE",
            details:
              "The event_type field must match one of the canonical HBCE onboarding event types."
          }
        },
        { status: 400 }
      );
    }

    const eventTimestamp = new Date().toISOString();
    const eventReferenceId = `evt_demo_${crypto.randomUUID()}`;
    const eventHash = createDemoHashReference(
      `${body.event_type}_${body.subject_id ?? "subject"}_${eventTimestamp}`
    );

    const event = {
      eventReferenceId,
      eventType: body.event_type,
      subjectId: body.subject_id ?? "sub_demo_unknown",
      iprId: body.ipr_id ?? "IPR-HBCE-DEMO-UNKNOWN",
      onboardingId: body.onboarding_id ?? "onb_demo_unknown",
      previousEventReference: body.previous_event_reference,
      eventHash,
      eventTimestamp,
      decisionState: body.decision_state ?? "demo_state",
      createdAt: eventTimestamp
    };

    return NextResponse.json({
      ok: true,
      status: "success",
      message: "Demo EVT-ready event reference created.",
      data: {
        event
      },
      error: null
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message: "Invalid request body. Event reference was not created.",
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
