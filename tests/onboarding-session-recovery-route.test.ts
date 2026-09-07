import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  NextRequest
} from "next/server";

const recoveryMock =
  vi.hoisted(
    () => ({
      recover:
        vi.fn()
    })
  );

vi.mock(
  "@/lib/server/onboarding-session-recovery-service",
  async (
    importOriginal
  ) => {
    const actual =
      await importOriginal<
        typeof import(
          "@/lib/server/onboarding-session-recovery-service"
        )
      >();

    return {
      ...actual,

      createOnboardingSessionRecoveryService:
        () => ({
          recover:
            recoveryMock.recover
        })
    };
  }
);

import {
  POST
} from "../app/api/onboarding/session/recover/route";

import {
  ONBOARDING_SESSION_COOKIE_NAME
} from "../lib/server/onboarding-session-cookie";

import {
  OnboardingSessionRecoveryError
} from "../lib/server/onboarding-session-recovery-service";

const APP_ORIGIN =
  "https://localhost:3000";

const ROUTE_URL =
  `${APP_ORIGIN}/api/onboarding/session/recover`;

const SOURCE_RAW_TOKEN =
  Buffer.alloc(
    32,
    41
  ).toString(
    "base64url"
  );

const SUCCESSOR_RAW_TOKEN =
  Buffer.alloc(
    32,
    53
  ).toString(
    "base64url"
  );

const SUCCESSOR_SESSION = {
  sessionId:
    "session_recovered_002",

  onboardingId:
    "onb_recovery_001",

  subjectId:
    "sub_recovery_001",

  tokenSha256:
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

  issuedState:
    "STARTED" as const,

  issuedAt:
    "2026-09-07T12:00:00.000Z",

  absoluteExpiresAt:
    "2026-09-07T20:00:00.000Z",

  rotatedFromSessionId:
    "session_expired_001",

  createdAt:
    "2026-09-07T12:00:00.000Z"
};

const ORIGINAL_APP_ORIGIN =
  process.env.HBCE_APP_ORIGIN;

type RequestOptions = {
  readonly origin?:
    string | null;

  readonly cookie?:
    string | null;

  readonly body?:
    string | null;
};

function makeRequest(
  options:
    RequestOptions = {}
): NextRequest {
  const headers =
    new Headers();

  const origin =
    options.origin === undefined
      ? APP_ORIGIN
      : options.origin;

  if (origin !== null) {
    headers.set(
      "Origin",
      origin
    );
  }

  const cookie =
    options.cookie === undefined
      ? `${ONBOARDING_SESSION_COOKIE_NAME}=${SOURCE_RAW_TOKEN}`
      : options.cookie;

  if (cookie !== null) {
    headers.set(
      "Cookie",
      cookie
    );
  }

  if (
    options.body !== undefined &&
    options.body !== null
  ) {
    headers.set(
      "Content-Type",
      "application/json"
    );

    return new NextRequest(
      ROUTE_URL,
      {
        method:
          "POST",
        headers,
        body:
          options.body
      }
    );
  }

  return new NextRequest(
    ROUTE_URL,
    {
      method:
        "POST",
      headers
    }
  );
}

function mockSuccess(): void {
  recoveryMock.recover
    .mockResolvedValue({
      rawToken:
        SUCCESSOR_RAW_TOKEN,

      session:
        SUCCESSOR_SESSION
    });
}

beforeEach(
  () => {
    process.env.HBCE_APP_ORIGIN =
      APP_ORIGIN;

    recoveryMock.recover
      .mockReset();
  }
);

afterAll(
  () => {
    if (
      ORIGINAL_APP_ORIGIN ===
      undefined
    ) {
      delete process.env
        .HBCE_APP_ORIGIN;
    } else {
      process.env.HBCE_APP_ORIGIN =
        ORIGINAL_APP_ORIGIN;
    }
  }
);

describe(
  "POST /api/onboarding/session/recover",
  () => {
    it(
      "recovers with no request body and installs only the successor secure cookie",
      async () => {
        mockSuccess();

        const response =
          await POST(
            makeRequest()
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          recoveryMock.recover
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          recoveryMock.recover
        ).toHaveBeenCalledWith({
          rawToken:
            SOURCE_RAW_TOKEN
        });

        expect(
          await response.json()
        ).toEqual({
          ok:
            true,

          recovery_status:
            "recovered",

          onboarding_status:
            "started"
        });

        expect(
          response.cookies.get(
            ONBOARDING_SESSION_COOKIE_NAME
          )?.value
        ).toBe(
          SUCCESSOR_RAW_TOKEN
        );

        const setCookie =
          response.headers.get(
            "set-cookie"
          );

        expect(
          setCookie
        ).not.toBeNull();

        expect(
          setCookie
        ).toContain(
          `${ONBOARDING_SESSION_COOKIE_NAME}=${SUCCESSOR_RAW_TOKEN}`
        );

        expect(
          setCookie
        ).toContain(
          "HttpOnly"
        );

        expect(
          setCookie
        ).toContain(
          "Secure"
        );

        expect(
          setCookie
        ).toContain(
          "SameSite=strict"
        );

        expect(
          setCookie
        ).toContain(
          "Path=/"
        );

        expect(
          setCookie
        ).toContain(
          "Max-Age=28800"
        );
      }
    );

    it(
      "accepts an exact empty JSON object",
      async () => {
        mockSuccess();

        const response =
          await POST(
            makeRequest({
              body:
                "{}"
            })
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          recoveryMock.recover
        ).toHaveBeenCalledWith({
          rawToken:
            SOURCE_RAW_TOKEN
        });
      }
    );

    it(
      "rejects malformed JSON before recovery service access",
      async () => {
        const response =
          await POST(
            makeRequest({
              body:
                "{not-json"
            })
          );

        expect(
          response.status
        ).toBe(
          400
        );

        expect(
          await response.json()
        ).toEqual({
          ok:
            false,

          reason:
            "INVALID_JSON",

          message:
            "Invalid request body."
        });

        expect(
          recoveryMock.recover
        ).not.toHaveBeenCalled();

        expect(
          response.headers.get(
            "set-cookie"
          )
        ).toBeNull();
      }
    );

    it.each([
      '{"unexpected":true}',
      '[]',
      '"value"',
      'null'
    ])(
      "rejects non-empty or non-object recovery body %s",
      async (
        body
      ) => {
        const response =
          await POST(
            makeRequest({
              body
            })
          );

        expect(
          response.status
        ).toBe(
          400
        );

        expect(
          await response.json()
        ).toEqual({
          ok:
            false,

          reason:
            "INVALID_BODY",

          message:
            "Session recovery does not accept request body fields."
        });

        expect(
          recoveryMock.recover
        ).not.toHaveBeenCalled();

        expect(
          response.headers.get(
            "set-cookie"
          )
        ).toBeNull();
      }
    );

    it(
      "rejects Origin before malformed body and before service access",
      async () => {
        const response =
          await POST(
            makeRequest({
              origin:
                "https://evil.example",

              body:
                "{not-json"
            })
          );

        expect(
          response.status
        ).toBe(
          403
        );

        expect(
          await response.json()
        ).toEqual({
          ok:
            false,

          reason:
            "REQUEST_FORBIDDEN",

          message:
            "The onboarding request is not authorized."
        });

        expect(
          recoveryMock.recover
        ).not.toHaveBeenCalled();

        expect(
          response.headers.get(
            "set-cookie"
          )
        ).toBeNull();
      }
    );

    it(
      "fails closed when HBCE_APP_ORIGIN is unavailable",
      async () => {
        delete process.env
          .HBCE_APP_ORIGIN;

        const response =
          await POST(
            makeRequest({
              body:
                "{not-json"
            })
          );

        expect(
          response.status
        ).toBe(
          503
        );

        expect(
          await response.json()
        ).toEqual({
          ok:
            false,

          reason:
            "ORIGIN_CONFIGURATION_FAILURE",

          message:
            "Onboarding Origin policy configuration is unavailable."
        });

        expect(
          recoveryMock.recover
        ).not.toHaveBeenCalled();

        expect(
          response.headers.get(
            "set-cookie"
          )
        ).toBeNull();
      }
    );

    it(
      "maps missing cookie recovery authority to 401",
      async () => {
        recoveryMock.recover
          .mockRejectedValue(
            new OnboardingSessionRecoveryError(
              "UNAUTHORIZED",
              "missing cookie"
            )
          );

        const response =
          await POST(
            makeRequest({
              cookie:
                null
            })
          );

        expect(
          recoveryMock.recover
        ).toHaveBeenCalledWith({
          rawToken:
            undefined
        });

        expect(
          response.status
        ).toBe(
          401
        );

        expect(
          await response.json()
        ).toEqual({
          ok:
            false,

          reason:
            "SESSION_UNAUTHORIZED",

          message:
            "A valid onboarding session is required for recovery."
        });

        expect(
          response.headers.get(
            "set-cookie"
          )
        ).toBeNull();
      }
    );

    it(
      "maps invalid cookie recovery authority to 401",
      async () => {
        recoveryMock.recover
          .mockRejectedValue(
            new OnboardingSessionRecoveryError(
              "UNAUTHORIZED",
              "invalid cookie"
            )
          );

        const response =
          await POST(
            makeRequest({
              cookie:
                `${ONBOARDING_SESSION_COOKIE_NAME}=invalid`
            })
          );

        expect(
          recoveryMock.recover
        ).toHaveBeenCalledWith({
          rawToken:
            "invalid"
        });

        expect(
          response.status
        ).toBe(
          401
        );

        expect(
          response.headers.get(
            "set-cookie"
          )
        ).toBeNull();
      }
    );

    it(
      "maps non-recoverable canonical session to 409",
      async () => {
        recoveryMock.recover
          .mockRejectedValue(
            new OnboardingSessionRecoveryError(
              "NOT_RECOVERABLE",
              "not eligible"
            )
          );

        const response =
          await POST(
            makeRequest()
          );

        expect(
          response.status
        ).toBe(
          409
        );

        expect(
          await response.json()
        ).toEqual({
          ok:
            false,

          reason:
            "SESSION_NOT_RECOVERABLE",

          message:
            "The onboarding session is not eligible for recovery."
        });

        expect(
          response.headers.get(
            "set-cookie"
          )
        ).toBeNull();
      }
    );

    it(
      "maps recovery dependency failure to 503",
      async () => {
        recoveryMock.recover
          .mockRejectedValue(
            new OnboardingSessionRecoveryError(
              "DEPENDENCY_FAILURE",
              "dependency failure"
            )
          );

        const response =
          await POST(
            makeRequest()
          );

        expect(
          response.status
        ).toBe(
          503
        );

        expect(
          await response.json()
        ).toEqual({
          ok:
            false,

          reason:
            "RECOVERY_DEPENDENCY_FAILURE",

          message:
            "Onboarding session recovery dependencies are unavailable."
        });

        expect(
          response.headers.get(
            "set-cookie"
          )
        ).toBeNull();
      }
    );

    it(
      "maps unexpected recovery exception to 503",
      async () => {
        recoveryMock.recover
          .mockRejectedValue(
            new Error(
              "unexpected"
            )
          );

        const response =
          await POST(
            makeRequest()
          );

        expect(
          response.status
        ).toBe(
          503
        );

        expect(
          response.headers.get(
            "set-cookie"
          )
        ).toBeNull();
      }
    );

    it(
      "fails closed when successor raw token cannot be installed",
      async () => {
        recoveryMock.recover
          .mockResolvedValue({
            rawToken:
              "invalid",

            session:
              SUCCESSOR_SESSION
          });

        const response =
          await POST(
            makeRequest()
          );

        expect(
          response.status
        ).toBe(
          503
        );

        expect(
          await response.json()
        ).toEqual({
          ok:
            false,

          reason:
            "COOKIE_ROTATION_FAILURE",

          message:
            "Recovered onboarding session cookie could not be installed."
        });

        expect(
          response.headers.get(
            "set-cookie"
          )
        ).toBeNull();
      }
    );

    it(
      "never exposes raw token, digest, subject or onboarding identifiers in success JSON",
      async () => {
        mockSuccess();

        const response =
          await POST(
            makeRequest()
          );

        const body =
          await response.json();

        expect(
          body
        ).toEqual({
          ok:
            true,

          recovery_status:
            "recovered",

          onboarding_status:
            "started"
        });

        const serialized =
          JSON.stringify(
            body
          );

        expect(
          serialized
        ).not.toContain(
          SUCCESSOR_RAW_TOKEN
        );

        expect(
          serialized
        ).not.toContain(
          SUCCESSOR_SESSION
            .tokenSha256
        );

        expect(
          serialized
        ).not.toContain(
          SUCCESSOR_SESSION
            .subjectId
        );

        expect(
          serialized
        ).not.toContain(
          SUCCESSOR_SESSION
            .onboardingId
        );
      }
    );
  }
);
