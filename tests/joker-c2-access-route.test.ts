import {
  NextRequest
} from "next/server";

import {
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

const mocks = vi.hoisted(() => ({
  authorize:
    vi.fn(),

  getBySubjectId:
    vi.fn(),

  buildEvidence:
    vi.fn(),

  evaluateAccess:
    vi.fn()
}));

vi.mock(
  "@/lib/server/onboarding-session-runtime",
  () => ({
    OnboardingSessionRuntimeOrchestrator:
      class {
        authorize = mocks.authorize;
      }
  })
);

vi.mock(
  "@/lib/server/neon-onboarding-session-repository",
  () => ({
    createNeonOnboardingSessionRepository:
      () => ({})
  })
);

vi.mock(
  "@/lib/server/neon-onboarding-session-lifecycle-commands",
  () => ({
    createNeonOnboardingSessionLifecycleCommands:
      () => ({})
  })
);

vi.mock(
  "@/lib/server/neon-canonical-subject-state-repository",
  () => ({
    createNeonCanonicalSubjectStateRepository:
      () => ({
        getBySubjectId:
          mocks.getBySubjectId
      })
  })
);

vi.mock(
  "@/lib/onboarding-canonical-subject-state",
  () => ({
    buildOnboardingTrustedIngressEvidence:
      mocks.buildEvidence
  })
);

vi.mock(
  "@/lib/access-decision",
  () => ({
    evaluateJokerC2Access:
      mocks.evaluateAccess
  })
);

vi.mock(
  "@/lib/server/onboarding-next-http-trust-adapter",
  () => {
    class MockTrustAdapterError
      extends Error
    {
      readonly httpStatus:
        401 | 403 | 503;

      constructor(
        httpStatus:
          401 | 403 | 503,
        message: string
      ) {
        super(message);
        this.name =
          "OnboardingNextHttpTrustAdapterError";
        this.httpStatus =
          httpStatus;
      }
    }

    class MockTrustAdapter {
      async authorize(
        input: unknown
      ) {
        return mocks.authorize(
          input
        );
      }
    }

    return {
      OnboardingNextHttpTrustAdapter:
        MockTrustAdapter,

      OnboardingNextHttpTrustAdapterError:
        MockTrustAdapterError
    };
  }
);

import {
  OnboardingNextHttpTrustAdapterError
} from "@/lib/server/onboarding-next-http-trust-adapter";

import {
  GET,
  POST
} from "../app/api/access/joker-c2/route";

type RouteResponse = {
  ok: boolean;
  status: string;
  data: {
    result?: {
      decision?: string;
      jokerC2AccessStatus?: string;
    };
  } | null;
  error: {
    code?: string;
    details?: string;
  } | null;
};

const authority = {
  sessionId:
    "session-001",
  onboardingId:
    "onboarding-001",
  subjectId:
    "subject-001",
  issuedState:
    "CONTACT_VERIFIED"
} as const;

const canonicalState = {
  subjectId:
    "subject-001",
  onboardingId:
    "onboarding-001"
};

const evidence = {
  iprId:
    "IPR-001",
  subjectId:
    "subject-001",
  iprStatus:
    "verified",
  iprCardStatus:
    "issued",
  certificateStatus:
    "active",
  revocationState:
    "clear",
  jokerC2AccessStatus:
    "enabled",
  latestPhaseNumber:
    9,
  latestPhaseCertificateHash:
    "a".repeat(64),
  certificateId:
    "certificate-001",
  certificateHash:
    "b".repeat(64),
  certificateScope:
    "JOKER_C2_ACCESS",
  cardSerial:
    "card-001"
};

const accessResult = {
  decision:
    "ALLOW",
  jokerC2AccessStatus:
    "enabled"
};

async function readJson(
  response: Response
): Promise<RouteResponse> {
  return (
    await response.json()
  ) as RouteResponse;
}

function buildGetRequest(): NextRequest {
  return new NextRequest(
    "http://localhost/api/access/joker-c2?mode=approved"
  );
}

function buildPostRequest(
  body = '{"mode":"revoked"}'
): NextRequest {
  return new NextRequest(
    "http://localhost/api/access/joker-c2",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json"
      },
      body
    }
  );
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.authorize.mockResolvedValue(
    authority
  );

  mocks.getBySubjectId.mockResolvedValue(
    canonicalState
  );

  mocks.buildEvidence.mockReturnValue({
    ok: true,
    evidence
  });

  mocks.evaluateAccess.mockReturnValue(
    accessResult
  );
});

describe(
  "JOKER-C2 trusted ingress access route",
  () => {
    it(
      "evaluates GET from server session authority and canonical evidence",
      async () => {
        const response =
          await GET(
            buildGetRequest()
          );

        const payload =
          await readJson(
            response
          );

        expect(response.status).toBe(
          200
        );

        expect(payload.ok).toBe(
          true
        );

        expect(
          mocks.authorize
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            requestPolicy:
              "SAFE_READ",
            requiredState:
              "CONTACT_VERIFIED"
          })
        );

        expect(
          mocks.getBySubjectId
        ).toHaveBeenCalledWith(
          "subject-001"
        );

        expect(
          mocks.buildEvidence
        ).toHaveBeenCalledWith(
          canonicalState
        );

        expect(
          mocks.evaluateAccess
        ).toHaveBeenCalledWith(
          evidence
        );

        expect(
          payload.data?.result?.decision
        ).toBe(
          "ALLOW"
        );

        expect(
          payload.error
        ).toBeNull();
      }
    );

    it(
      "does not use POST demo mode as authority",
      async () => {
        const response =
          await POST(
            buildPostRequest()
          );

        const payload =
          await readJson(
            response
          );

        expect(response.status).toBe(
          200
        );

        expect(
          mocks.evaluateAccess
        ).toHaveBeenCalledWith(
          evidence
        );

        expect(
          payload.data?.result
            ?.jokerC2AccessStatus
        ).toBe(
          "enabled"
        );
      }
    );

    it(
      "maps session trust denial fail closed",
      async () => {
        mocks.authorize.mockRejectedValue(
          new OnboardingNextHttpTrustAdapterError(
            401,
            "denied"
          )
        );

        const response =
          await GET(
            buildGetRequest()
          );

        const payload =
          await readJson(
            response
          );

        expect(response.status).toBe(
          401
        );

        expect(payload.ok).toBe(
          false
        );

        expect(payload.error?.code).toBe(
          "SESSION_TRUST_FAILURE"
        );

        expect(
          mocks.getBySubjectId
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "maps unexpected session trust dependency failure to 503",
      async () => {
        mocks.authorize.mockRejectedValue(
          new Error(
            "dependency failure"
          )
        );

        const response =
          await GET(
            buildGetRequest()
          );

        const payload =
          await readJson(
            response
          );

        expect(response.status).toBe(
          503
        );

        expect(payload.error?.code).toBe(
          "SESSION_TRUST_FAILURE"
        );
      }
    );

    it(
      "fails closed when canonical repository lookup fails",
      async () => {
        mocks.getBySubjectId.mockRejectedValue(
          new Error(
            "database unavailable"
          )
        );

        const response =
          await GET(
            buildGetRequest()
          );

        const payload =
          await readJson(
            response
          );

        expect(response.status).toBe(
          503
        );

        expect(payload.error?.code).toBe(
          "CANONICAL_REPOSITORY_FAILURE"
        );

        expect(
          mocks.buildEvidence
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "fails closed when canonical subject state is absent",
      async () => {
        mocks.getBySubjectId.mockResolvedValue(
          null
        );

        const response =
          await GET(
            buildGetRequest()
          );

        const payload =
          await readJson(
            response
          );

        expect(response.status).toBe(
          503
        );

        expect(payload.error?.code).toBe(
          "CANONICAL_STATE_NOT_FOUND"
        );
      }
    );

    it(
      "fails closed on canonical subject binding mismatch",
      async () => {
        mocks.getBySubjectId.mockResolvedValue({
          ...canonicalState,
          subjectId:
            "subject-other"
        });

        const response =
          await GET(
            buildGetRequest()
          );

        const payload =
          await readJson(
            response
          );

        expect(response.status).toBe(
          503
        );

        expect(payload.error?.code).toBe(
          "CANONICAL_BINDING_MISMATCH"
        );

        expect(
          mocks.buildEvidence
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "fails closed on canonical onboarding binding mismatch",
      async () => {
        mocks.getBySubjectId.mockResolvedValue({
          ...canonicalState,
          onboardingId:
            "onboarding-other"
        });

        const response =
          await GET(
            buildGetRequest()
          );

        const payload =
          await readJson(
            response
          );

        expect(response.status).toBe(
          503
        );

        expect(payload.error?.code).toBe(
          "CANONICAL_BINDING_MISMATCH"
        );

        expect(
          mocks.buildEvidence
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "fails closed when canonical state cannot project trusted evidence",
      async () => {
        mocks.buildEvidence.mockReturnValue({
          ok: false,
          code:
            "CERTIFICATE_HASH_MISMATCH",
          message:
            "projection denied"
        });

        const response =
          await POST(
            buildPostRequest(
              '{"mode":"approved"}'
            )
          );

        const payload =
          await readJson(
            response
          );

        expect(response.status).toBe(
          503
        );

        expect(payload.error?.code).toBe(
          "TRUSTED_INGRESS_PROJECTION_FAILURE"
        );

        expect(
          mocks.evaluateAccess
        ).not.toHaveBeenCalled();
      }
    );
  }
);
