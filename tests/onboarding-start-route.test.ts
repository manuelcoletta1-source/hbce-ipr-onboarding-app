import {
  createHash
} from "node:crypto";

import {
  NextRequest
} from "next/server";

import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

const {
  neonMock,
  queryMock
} = vi.hoisted(
  () => {
    const queryMock =
      vi.fn();

    const neonMock =
      vi.fn(
        () => ({
          query:
            queryMock
        })
      );

    return {
      neonMock,
      queryMock
    };
  }
);

vi.mock(
  "@neondatabase/serverless",
  () => ({
    neon:
      neonMock
  })
);

import {
  GET,
  POST
} from "../app/api/onboarding/start/route";

const APP_ORIGIN =
  "https://hbce.example";

const DATABASE_URL =
  "postgresql://test.invalid/hbce";

function idempotencyKey(
  fill: number = 7
): string {
  return Buffer.alloc(
    32,
    fill
  ).toString(
    "base64url"
  );
}

function makeRequest(
  options: {
    readonly origin?: string;
    readonly key?: string;
    readonly body?: string;
    readonly cookie?: string;
  } = {}
): NextRequest {
  const headers =
    new Headers();

  if (
    options.origin !== undefined
  ) {
    headers.set(
      "Origin",
      options.origin
    );
  }

  if (
    options.key !== undefined
  ) {
    headers.set(
      "Idempotency-Key",
      options.key
    );
  }

  if (
    options.cookie !== undefined
  ) {
    headers.set(
      "Cookie",
      options.cookie
    );
  }

  headers.set(
    "Content-Type",
    "application/json"
  );

  return new NextRequest(
    `${APP_ORIGIN}/api/onboarding/start`,
    {
      method:
        "POST",
      headers,
      body:
        options.body ??
        JSON.stringify({
          accept_terms:
            true,
          accept_privacy:
            true
        })
    }
  );
}

function installSuccessfulQuery() {
  queryMock.mockImplementation(
    async (
      _query: string,
      parameters:
        readonly unknown[]
    ) => [
      {
        start_result: {
          subjectId:
            parameters[2],
          onboardingId:
            parameters[3],
          sessionId:
            parameters[4],
          issuedState:
            "STARTED",
          issuedAt:
            parameters[5],
          absoluteExpiresAt:
            parameters[14]
        }
      }
    ]
  );
}

beforeEach(
  () => {
    process.env.HBCE_APP_ORIGIN =
      APP_ORIGIN;

    process.env.DATABASE_URL =
      DATABASE_URL;

    queryMock.mockReset();
    neonMock.mockClear();

    installSuccessfulQuery();
  }
);

afterAll(
  () => {
    delete process.env.HBCE_APP_ORIGIN;
    delete process.env.DATABASE_URL;
  }
);

describe(
  "P003-D082R10 onboarding start HTTP boundary",
  () => {
    it(
      "publishes minimized trust-backed GET metadata",
      async () => {
        const response =
          await GET();

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          await response.json()
        ).toEqual({
          endpoint:
            "/api/onboarding/start",
          method:
            "POST",
          mode:
            "trust-backed",
          runtime:
            "nodejs",
          required_headers: [
            "Origin",
            "Idempotency-Key"
          ],
          required_fields: [
            "accept_terms",
            "accept_privacy"
          ],
          deferred_fields: [
            "email",
            "first_name",
            "last_name",
            "country"
          ],
          joker_c2_access_status:
            "denied"
        });
      }
    );

    it(
      "validates Origin before parsing malformed JSON",
      async () => {
        const response =
          await POST(
            makeRequest({
              origin:
                "https://attacker.example",
              key:
                idempotencyKey(),
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
          error: {
            code:
              "ORIGIN_FORBIDDEN"
          }
        });

        expect(
          queryMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "fails closed with 503 when HBCE_APP_ORIGIN is absent",
      async () => {
        delete process.env.HBCE_APP_ORIGIN;

        const response =
          await POST(
            makeRequest({
              origin:
                APP_ORIGIN,
              key:
                idempotencyKey()
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
          error: {
            code:
              "ORIGIN_CONFIGURATION_FAILURE"
          }
        });

        expect(
          queryMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "validates Idempotency-Key before parsing malformed JSON",
      async () => {
        const response =
          await POST(
            makeRequest({
              origin:
                APP_ORIGIN,
              key:
                "invalid",
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
          error: {
            code:
              "INVALID_IDEMPOTENCY_KEY"
          }
        });

        expect(
          queryMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects invalid JSON before any database call",
      async () => {
        const response =
          await POST(
            makeRequest({
              origin:
                APP_ORIGIN,
              key:
                idempotencyKey(),
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
          error: {
            code:
              "INVALID_JSON"
          }
        });

        expect(
          queryMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects PII and unknown fields at the start boundary",
      async () => {
        const response =
          await POST(
            makeRequest({
              origin:
                APP_ORIGIN,
              key:
                idempotencyKey(),
              body:
                JSON.stringify({
                  accept_terms:
                    true,
                  accept_privacy:
                    true,
                  email:
                    "person@example.com"
                })
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
          error: {
            code:
              "INVALID_BODY"
          }
        });

        expect(
          queryMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "requires terms before database access",
      async () => {
        const response =
          await POST(
            makeRequest({
              origin:
                APP_ORIGIN,
              key:
                idempotencyKey(),
              body:
                JSON.stringify({
                  accept_terms:
                    false,
                  accept_privacy:
                    true
                })
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
          error: {
            code:
              "TERMS_NOT_ACCEPTED"
          }
        });

        expect(
          queryMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "requires privacy acceptance before database access",
      async () => {
        const response =
          await POST(
            makeRequest({
              origin:
                APP_ORIGIN,
              key:
                idempotencyKey(),
              body:
                JSON.stringify({
                  accept_terms:
                    true,
                  accept_privacy:
                    false
                })
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
          error: {
            code:
              "PRIVACY_NOT_ACCEPTED"
          }
        });

        expect(
          queryMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "creates a server-authoritative atomic start and only then returns the session cookie",
      async () => {
        const rawKey =
          idempotencyKey(
            11
          );

        const response =
          await POST(
            makeRequest({
              origin:
                APP_ORIGIN,
              key:
                rawKey
            })
          );

        expect(
          response.status
        ).toBe(
          201
        );

        expect(
          queryMock
        ).toHaveBeenCalledTimes(
          1
        );

        const [
          query,
          parameters
        ] =
          queryMock.mock.calls[0] as [
            string,
            readonly unknown[]
          ];

        expect(
          query
        ).toContain(
          "WITH inserted_subject AS"
        );

        expect(
          parameters[0]
        ).toBe(
          createHash(
            "sha256"
          )
            .update(
              rawKey,
              "utf8"
            )
            .digest(
              "hex"
            )
        );

        expect(
          parameters[1]
        ).toMatch(
          /^[0-9a-f]{64}$/
        );

        expect(
          parameters[2]
        ).toMatch(
          /^sub_[0-9a-f-]{36}$/
        );

        expect(
          parameters[3]
        ).toMatch(
          /^onb_[0-9a-f-]{36}$/
        );

        expect(
          parameters[4]
        ).toMatch(
          /^session_[0-9a-f-]{36}$/
        );

        const body =
          await response.json();

        expect(
          body
        ).toEqual({
          onboarding_status:
            "started",
          joker_c2_access_status:
            "denied",
          next_route:
            "/onboarding/identity"
        });

        expect(
          JSON.stringify(
            body
          )
        ).not.toMatch(
          /subject|sessionId|onboardingId|token|sha256/i
        );

        const cookie =
          response.cookies.get(
            "__Host-hbce-onboarding-session"
          );

        expect(
          cookie?.value
        ).toMatch(
          /^[A-Za-z0-9_-]{43}$/
        );

        const setCookie =
          response.headers.get(
            "set-cookie"
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
      "maps duplicate suppression to 409 and does not issue or clear a cookie",
      async () => {
        queryMock.mockRejectedValueOnce(
          Object.assign(
            new Error(
              "duplicate"
            ),
            {
              code:
                "23505",
              constraint:
                "hbce_onboarding_start_requests_pkey"
            }
          )
        );

        const response =
          await POST(
            makeRequest({
              origin:
                APP_ORIGIN,
              key:
                idempotencyKey(
                  13
                ),
              cookie:
                "__Host-hbce-onboarding-session=existing_cookie_value"
            })
          );

        expect(
          response.status
        ).toBe(
          409
        );

        expect(
          await response.json()
        ).toEqual({
          error: {
            code:
              "IDEMPOTENCY_CONFLICT"
          }
        });

        expect(
          response.headers.get(
            "set-cookie"
          )
        ).toBeNull();
      }
    );

    it(
      "maps repository dependency failures to 503 without cookie issuance",
      async () => {
        queryMock.mockRejectedValueOnce(
          Object.assign(
            new Error(
              "database unavailable"
            ),
            {
              code:
                "08006"
            }
          )
        );

        const response =
          await POST(
            makeRequest({
              origin:
                APP_ORIGIN,
              key:
                idempotencyKey(
                  17
                )
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
          error: {
            code:
              "START_DEPENDENCY_FAILURE"
          }
        });

        expect(
          response.headers.get(
            "set-cookie"
          )
        ).toBeNull();
      }
    );
  }
);
