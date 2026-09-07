import {
  afterEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  NextRequest,
  NextResponse
} from "next/server";

import {
  ONBOARDING_SESSION_COOKIE_NAME,
  OnboardingSessionCookieError
} from "../lib/server/onboarding-session-cookie";

import {
  OnboardingSessionRuntimeError
} from "../lib/server/onboarding-session-runtime";

import {
  OnboardingNextHttpTrustAdapter,
  OnboardingNextHttpTrustAdapterError,
  setOnboardingSessionCookie,
  type OnboardingSessionRuntimeDependency
} from "../lib/server/onboarding-next-http-trust-adapter";

const ORIGIN =
  "https://hbce-ipr-onboarding-app.vercel.app";

const ORIGINAL_ORIGIN =
  process.env.HBCE_APP_ORIGIN;

function rawToken(): string {
  return Buffer.alloc(
    32,
    19
  ).toString(
    "base64url"
  );
}

function authority() {
  return {
    sessionId:
      "session_server_001",
    onboardingId:
      "onb_server_001",
    subjectId:
      "sub_server_001",
    issuedState:
      "STARTED" as const
  };
}

function createRuntime() {
  const authorize =
    vi.fn<
      OnboardingSessionRuntimeDependency[
        "authorize"
      ]
    >();

  authorize.mockResolvedValue(
    authority()
  );

  const runtime = {
    authorize
  } satisfies OnboardingSessionRuntimeDependency;

  return {
    runtime,
    authorize
  };
}

function createRequest(
  options: {
    origin?: string | undefined;
    token?: string | undefined;
  } = {}
): NextRequest {
  const headers =
    new Headers();

  if (
    options.origin !== undefined
  ) {
    headers.set(
      "origin",
      options.origin
    );
  }

  if (
    options.token !== undefined
  ) {
    headers.set(
      "cookie",
      `${ONBOARDING_SESSION_COOKIE_NAME}=${options.token}`
    );
  }

  return new NextRequest(
    `${ORIGIN}/api/onboarding/example`,
    {
      method: "POST",
      headers
    }
  );
}

afterEach(
  () => {
    if (
      ORIGINAL_ORIGIN === undefined
    ) {
      delete process.env.HBCE_APP_ORIGIN;
    } else {
      process.env.HBCE_APP_ORIGIN =
        ORIGINAL_ORIGIN;
    }
  }
);

describe(
  "Next 16 onboarding HTTP trust adapter",
  () => {
    it(
      "authorizes a state-changing request only after exact Origin validation",
      async () => {
        process.env.HBCE_APP_ORIGIN =
          ORIGIN;

        const harness =
          createRuntime();

        const adapter =
          new OnboardingNextHttpTrustAdapter(
            harness.runtime
          );

        await expect(
          adapter.authorize({
            request:
              createRequest({
                origin:
                  ORIGIN,
                token:
                  rawToken()
              }),
            requestPolicy:
              "STATE_CHANGING",
            requiredState:
              "STARTED"
          })
        ).resolves.toEqual(
          authority()
        );

        expect(
          harness.authorize
        ).toHaveBeenCalledWith({
          rawToken:
            rawToken(),
          requiredState:
            "STARTED"
        });
      }
    );

    it.each([
      undefined,
      "https://evil.example"
    ])(
      "rejects invalid state-changing Origin %j before runtime invocation",
      async (origin) => {
        process.env.HBCE_APP_ORIGIN =
          ORIGIN;

        const harness =
          createRuntime();

        const adapter =
          new OnboardingNextHttpTrustAdapter(
            harness.runtime
          );

        await expect(
          adapter.authorize({
            request:
              createRequest({
                origin,
                token:
                  rawToken()
              }),
            requestPolicy:
              "STATE_CHANGING",
            requiredState:
              "STARTED"
          })
        ).rejects.toMatchObject({
          httpStatus: 403
        });

        expect(
          harness.authorize
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "fails closed with 503 when expected Origin configuration is absent",
      async () => {
        delete process.env.HBCE_APP_ORIGIN;

        const harness =
          createRuntime();

        const adapter =
          new OnboardingNextHttpTrustAdapter(
            harness.runtime
          );

        await expect(
          adapter.authorize({
            request:
              createRequest({
                origin:
                  ORIGIN,
                token:
                  rawToken()
              }),
            requestPolicy:
              "STATE_CHANGING",
            requiredState:
              "STARTED"
          })
        ).rejects.toMatchObject({
          httpStatus: 503
        });

        expect(
          harness.authorize
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "does not require Origin for SAFE_READ",
      async () => {
        delete process.env.HBCE_APP_ORIGIN;

        const harness =
          createRuntime();

        const adapter =
          new OnboardingNextHttpTrustAdapter(
            harness.runtime
          );

        await expect(
          adapter.authorize({
            request:
              createRequest({
                token:
                  rawToken()
              }),
            requestPolicy:
              "SAFE_READ",
            requiredState:
              "STARTED"
          })
        ).resolves.toEqual(
          authority()
        );
      }
    );

    it(
      "passes an absent cookie to runtime and maps unauthorized to 401",
      async () => {
        const harness =
          createRuntime();

        harness.authorize.mockRejectedValue(
          new OnboardingSessionRuntimeError(
            "UNAUTHORIZED",
            "missing cookie"
          )
        );

        const adapter =
          new OnboardingNextHttpTrustAdapter(
            harness.runtime
          );

        await expect(
          adapter.authorize({
            request:
              createRequest(),
            requestPolicy:
              "SAFE_READ",
            requiredState:
              "STARTED"
          })
        ).rejects.toMatchObject({
          httpStatus: 401
        });

        expect(
          harness.authorize
        ).toHaveBeenCalledWith({
          rawToken:
            undefined,
          requiredState:
            "STARTED"
        });
      }
    );

    it.each([
      {
        runtimeCode:
          "UNAUTHORIZED" as const,
        expectedStatus: 401
      },
      {
        runtimeCode:
          "FORBIDDEN" as const,
        expectedStatus: 403
      },
      {
        runtimeCode:
          "DEPENDENCY_FAILURE" as const,
        expectedStatus: 503
      }
    ])(
      "maps runtime $runtimeCode to HTTP $expectedStatus",
      async ({
        runtimeCode,
        expectedStatus
      }) => {
        const harness =
          createRuntime();

        harness.authorize.mockRejectedValue(
          new OnboardingSessionRuntimeError(
            runtimeCode,
            "runtime denial"
          )
        );

        const adapter =
          new OnboardingNextHttpTrustAdapter(
            harness.runtime
          );

        await expect(
          adapter.authorize({
            request:
              createRequest({
                token:
                  rawToken()
              }),
            requestPolicy:
              "SAFE_READ",
            requiredState:
              "STARTED"
          })
        ).rejects.toMatchObject({
          httpStatus:
            expectedStatus
        });
      }
    );

    it(
      "maps unknown runtime failure to 503",
      async () => {
        const harness =
          createRuntime();

        harness.authorize.mockRejectedValue(
          new Error(
            "unexpected failure"
          )
        );

        const adapter =
          new OnboardingNextHttpTrustAdapter(
            harness.runtime
          );

        await expect(
          adapter.authorize({
            request:
              createRequest({
                token:
                  rawToken()
              }),
            requestPolicy:
              "SAFE_READ",
            requiredState:
              "STARTED"
          })
        ).rejects.toMatchObject({
          httpStatus: 503
        });
      }
    );

    it(
      "fails closed before runtime on invalid request policy",
      async () => {
        const harness =
          createRuntime();

        const adapter =
          new OnboardingNextHttpTrustAdapter(
            harness.runtime
          );

        await expect(
          adapter.authorize({
            request:
              createRequest({
                token:
                  rawToken()
              }),
            requestPolicy:
              "INVALID" as never,
            requiredState:
              "STARTED"
          })
        ).rejects.toMatchObject({
          httpStatus: 503
        });

        expect(
          harness.authorize
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "fails closed before runtime on invalid required state",
      async () => {
        const harness =
          createRuntime();

        const adapter =
          new OnboardingNextHttpTrustAdapter(
            harness.runtime
          );

        await expect(
          adapter.authorize({
            request:
              createRequest({
                token:
                  rawToken()
              }),
            requestPolicy:
              "SAFE_READ",
            requiredState:
              "INVALID" as never
          })
        ).rejects.toMatchObject({
          httpStatus: 503
        });

        expect(
          harness.authorize
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns only server-derived runtime authority",
      async () => {
        const harness =
          createRuntime();

        const adapter =
          new OnboardingNextHttpTrustAdapter(
            harness.runtime
          );

        const result =
          await adapter.authorize({
            request:
              createRequest({
                token:
                  rawToken()
              }),
            requestPolicy:
              "SAFE_READ",
            requiredState:
              "STARTED"
          });

        expect(
          result
        ).toEqual({
          sessionId:
            "session_server_001",
          onboardingId:
            "onb_server_001",
          subjectId:
            "sub_server_001",
          issuedState:
            "STARTED"
        });

        expect(
          "rawToken" in result
        ).toBe(false);

        expect(
          "tokenSha256" in result
        ).toBe(false);

        expect(
          "contactVerified" in result
        ).toBe(false);
      }
    );

    it(
      "sets frozen session cookie through NextResponse.cookies and returns same response",
      () => {
        const response =
          NextResponse.json({
            ok: true
          });

        const returned =
          setOnboardingSessionCookie(
            response,
            rawToken()
          );

        expect(
          returned
        ).toBe(
          response
        );

        expect(
          response.cookies.get(
            ONBOARDING_SESSION_COOKIE_NAME
          )
        ).toMatchObject({
          name:
            ONBOARDING_SESSION_COOKIE_NAME,
          value:
            rawToken(),
          httpOnly: true,
          secure: true,
          sameSite:
            "strict",
          path: "/",
          maxAge: 28800
        });
      }
    );

    it(
      "refuses malformed session token",
      () => {
        const response =
          NextResponse.json({
            ok: true
          });

        expect(
          () =>
            setOnboardingSessionCookie(
              response,
              "invalid"
            )
        ).toThrow(
          OnboardingSessionCookieError
        );

        expect(
          response.cookies.has(
            ONBOARDING_SESSION_COOKIE_NAME
          )
        ).toBe(false);
      }
    );

    it(
      "exposes only typed HTTP status on adapter errors",
      () => {
        const error =
          new OnboardingNextHttpTrustAdapterError(
            401,
            "denied"
          );

        expect(
          error.httpStatus
        ).toBe(401);

        expect(
          "rawToken" in error
        ).toBe(false);

        expect(
          "tokenSha256" in error
        ).toBe(false);
      }
    );
  }
);
