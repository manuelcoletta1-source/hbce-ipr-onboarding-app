import {
  NextResponse,
  type NextRequest
} from "next/server";

import {
  evaluateJokerC2Access
} from "@/lib/access-decision";

import {
  buildOnboardingTrustedIngressEvidence
} from "@/lib/onboarding-canonical-subject-state";

import {
  createNeonCanonicalSubjectStateRepository
} from "@/lib/server/neon-canonical-subject-state-repository";

import {
  createNeonOnboardingSessionRepository
} from "@/lib/server/neon-onboarding-session-repository";

import {
  createNeonOnboardingSessionLifecycleCommands
} from "@/lib/server/neon-onboarding-session-lifecycle-commands";

import {
  OnboardingSessionRuntimeOrchestrator
} from "@/lib/server/onboarding-session-runtime";

import {
  OnboardingNextHttpTrustAdapter,
  OnboardingNextHttpTrustAdapterError
} from "@/lib/server/onboarding-next-http-trust-adapter";

type JokerC2BridgeFailureCode =
  | "SESSION_TRUST_FAILURE"
  | "CANONICAL_REPOSITORY_FAILURE"
  | "CANONICAL_STATE_NOT_FOUND"
  | "CANONICAL_BINDING_MISMATCH"
  | "TRUSTED_INGRESS_PROJECTION_FAILURE";

const sessionRuntime =
  new OnboardingSessionRuntimeOrchestrator(
    createNeonOnboardingSessionRepository(),
    createNeonOnboardingSessionLifecycleCommands()
  );

const httpTrustAdapter =
  new OnboardingNextHttpTrustAdapter(
    sessionRuntime
  );

const canonicalRepository =
  createNeonCanonicalSubjectStateRepository();

function buildBridgeFailure(
  httpStatus: 401 | 403 | 503,
  code: JokerC2BridgeFailureCode,
  details: string
) {
  return NextResponse.json(
    {
      ok: false,
      status: "error",
      message:
        "JOKER-C2 trusted access evaluation failed closed.",
      data: null,
      error: {
        code,
        details
      }
    },
    {
      status: httpStatus
    }
  );
}

async function evaluateTrustedRequest(
  request: NextRequest
) {
  let authority;

  try {
    authority =
      await httpTrustAdapter.authorize({
        request,
        requestPolicy: "SAFE_READ",
        requiredState: "CONTACT_VERIFIED"
      });
  } catch (error) {
    if (
      error instanceof
      OnboardingNextHttpTrustAdapterError
    ) {
      return buildBridgeFailure(
        error.httpStatus,
        "SESSION_TRUST_FAILURE",
        "Server-owned onboarding session trust did not authorize this request."
      );
    }

    return buildBridgeFailure(
      503,
      "SESSION_TRUST_FAILURE",
      "Onboarding session trust dependency failed."
    );
  }

  let canonicalState;

  try {
    canonicalState =
      await canonicalRepository.getBySubjectId(
        authority.subjectId
      );
  } catch {
    return buildBridgeFailure(
      503,
      "CANONICAL_REPOSITORY_FAILURE",
      "Canonical onboarding state could not be loaded."
    );
  }

  if (!canonicalState) {
    return buildBridgeFailure(
      503,
      "CANONICAL_STATE_NOT_FOUND",
      "Canonical onboarding state is unavailable."
    );
  }

  if (
    canonicalState.subjectId !==
      authority.subjectId ||
    canonicalState.onboardingId !==
      authority.onboardingId
  ) {
    return buildBridgeFailure(
      503,
      "CANONICAL_BINDING_MISMATCH",
      "Session authority does not match canonical onboarding state."
    );
  }

  const projection =
    buildOnboardingTrustedIngressEvidence(
      canonicalState
    );

  if (!projection.ok) {
    return buildBridgeFailure(
      503,
      "TRUSTED_INGRESS_PROJECTION_FAILURE",
      "Canonical onboarding state could not produce trusted ingress evidence."
    );
  }

  const result =
    evaluateJokerC2Access(
      projection.evidence
    );

  return NextResponse.json({
    ok: true,
    status: "success",
    message:
      "JOKER-C2 access decision evaluated from trusted onboarding evidence.",
    data: {
      result
    },
    error: null
  });
}

export async function GET(
  request: NextRequest
) {
  return evaluateTrustedRequest(
    request
  );
}

export async function POST(
  request: NextRequest
) {
  return evaluateTrustedRequest(
    request
  );
}
