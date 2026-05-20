import { NextResponse, type NextRequest } from "next/server";

import { ORG_NAME } from "@/lib/constants";

const demoProofs = [
  {
    proofId: "opc_demo_001",
    linkedEventId: "evt_demo_002",
    iprId: "IPR-HBCE-DEMO-APPROVED-001",
    operationScope: "IPR_VERIFICATION",
    inputHash: "sha256_demo_ipr_verification_input_hash",
    outputHash: "sha256_demo_ipr_verification_output_hash",
    decisionHash: "sha256_demo_ipr_verification_decision_hash",
    policySnapshotHash: "sha256_demo_ipr_verification_policy_hash",
    proofStatus: "created",
    issuer: ORG_NAME,
    createdAt: "2026-05-20T12:00:00+02:00"
  },
  {
    proofId: "opc_demo_002",
    linkedEventId: "evt_demo_003",
    iprId: "IPR-HBCE-DEMO-APPROVED-001",
    operationScope: "IPR_CARD_ISSUANCE",
    inputHash: "sha256_demo_ipr_card_input_hash",
    outputHash: "sha256_demo_ipr_card_output_hash",
    decisionHash: "sha256_demo_ipr_card_decision_hash",
    policySnapshotHash: "sha256_demo_ipr_card_policy_hash",
    proofStatus: "created",
    issuer: ORG_NAME,
    createdAt: "2026-05-20T12:00:00+02:00"
  },
  {
    proofId: "opc_demo_003",
    linkedEventId: "evt_demo_005",
    iprId: "IPR-HBCE-DEMO-APPROVED-001",
    operationScope: "JOKER_C2_ACCESS_DECISION",
    inputHash: "sha256_demo_joker_c2_access_input_hash",
    outputHash: "sha256_demo_joker_c2_access_output_hash",
    decisionHash: "sha256_demo_joker_c2_access_decision_hash",
    policySnapshotHash: "sha256_demo_joker_c2_access_policy_hash",
    proofStatus: "created",
    issuer: ORG_NAME,
    createdAt: "2026-05-20T12:00:00+02:00"
  }
];

function createDemoHashReference(input: string): string {
  const normalized = input.trim().toLowerCase().replaceAll(" ", "_");

  return `sha256_demo_${normalized}_hash`;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "success",
    message: "Demo OPC-ready proof references returned.",
    data: {
      proofs: demoProofs
    },
    error: null
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      linked_event_id?: unknown;
      ipr_id?: unknown;
      operation_scope?: unknown;
      input_hash?: unknown;
      output_hash?: unknown;
      decision_hash?: unknown;
      policy_snapshot_hash?: unknown;
    };

    if (!isNonEmptyString(body.linked_event_id)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing linked event reference.",
          data: null,
          error: {
            code: "MISSING_LINKED_EVENT",
            details: "linked_event_id is required."
          }
        },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(body.ipr_id)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing IPR reference.",
          data: null,
          error: {
            code: "MISSING_IPR_ID",
            details: "ipr_id is required."
          }
        },
        { status: 400 }
      );
    }

    if (!isNonEmptyString(body.operation_scope)) {
      return NextResponse.json(
        {
          ok: false,
          status: "error",
          message: "Missing operation scope.",
          data: null,
          error: {
            code: "MISSING_OPERATION_SCOPE",
            details: "operation_scope is required."
          }
        },
        { status: 400 }
      );
    }

    const createdAt = new Date().toISOString();
    const proofId = `opc_demo_${crypto.randomUUID()}`;

    const proof = {
      proofId,
      linkedEventId: body.linked_event_id,
      iprId: body.ipr_id,
      operationScope: body.operation_scope,
      inputHash: isNonEmptyString(body.input_hash)
        ? body.input_hash
        : createDemoHashReference(`${body.operation_scope}_input`),
      outputHash: isNonEmptyString(body.output_hash)
        ? body.output_hash
        : createDemoHashReference(`${body.operation_scope}_output`),
      decisionHash: isNonEmptyString(body.decision_hash)
        ? body.decision_hash
        : createDemoHashReference(`${body.operation_scope}_decision`),
      policySnapshotHash: isNonEmptyString(body.policy_snapshot_hash)
        ? body.policy_snapshot_hash
        : createDemoHashReference(`${body.operation_scope}_policy_snapshot`),
      proofStatus: "created",
      issuer: ORG_NAME,
      createdAt
    };

    return NextResponse.json({
      ok: true,
      status: "success",
      message: "Demo OPC-ready proof reference created.",
      data: {
        proof
      },
      error: null
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message: "Invalid request body. Proof reference was not created.",
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
