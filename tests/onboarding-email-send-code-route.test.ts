import {
  NextRequest
} from "next/server";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

const {
  repositoryFactoryMock,
  lifecycleFactoryMock,
  getByTokenSha256Mock,
  recordActivityMock,
  createChallengeMock,
  fetchMock
} = vi.hoisted(
  () => ({
    repositoryFactoryMock:
      vi.fn(),

    lifecycleFactoryMock:
      vi.fn(),

    getByTokenSha256Mock:
      vi.fn(),

    recordActivityMock:
      vi.fn(),

    createChallengeMock:
      vi.fn(),

    fetchMock:
      vi.fn()
  })
);

vi.mock(
  "@/lib/server/neon-onboarding-session-repository",
  async (
    importOriginal
  ) => {
    const actual =
      await importOriginal<
        typeof import(
          "../lib/server/neon-onboarding-session-repository"
        )
      >();

    return {
      ...actual,

      createNeonOnboardingSessionRepository:
        repositoryFactoryMock
    };
  }
);

vi.mock(
  "@/lib/server/neon-onboarding-session-lifecycle-commands",
  async (
    importOriginal
  ) => {
    const actual =
      await importOriginal<
        typeof import(
          "../lib/server/neon-onboarding-session-lifecycle-commands"
        )
      >();

    return {
      ...actual,

      createNeonOnboardingSessionLifecycleCommands:
        lifecycleFactoryMock
    };
  }
);

vi.mock(
  "@/lib/server/onboarding-otp-challenge-binding",
  () => ({
    createOnboardingOtpChallengeBinding:
      createChallengeMock
  })
);

import {
  deriveEmailOtpV2Code
} from "../lib/server/onboarding-email-otp-v2";

import {
  ONBOARDING_SESSION_COOKIE_NAME
} from "../lib/server/onboarding-session-cookie";

import {
  POST
} from "../app/api/onboarding/email/send-code/route";

const APP_ORIGIN =
  "https://hbce.example";

const SECRET =
  "0123456789abcdef0123456789abcdef";

const RAW_TOKEN =
  Buffer.alloc(
    32,
    41
  ).toString(
    "base64url"
  );

const SESSION_ID =
  "session_started_email_001";

const NONCE =
  "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE";

const ISSUED_AT =
  1788602400;

const EXPIRES_AT =
  ISSUED_AT + 600;

const CHALLENGE_TOKEN =
  `${NONCE}.${ISSUED_AT}.${EXPIRES_AT}.mock-mac`;

function buildTrustState(
  issuedState:
    "STARTED" |
    "CONTACT_VERIFIED" =
      "STARTED"
) {
  const now =
    Date.now();

  return {
    session: {
      sessionId:
        SESSION_ID,

      onboardingId:
        "onb_email_001",

      subjectId:
        "sub_email_001",

      tokenSha256:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",

      issuedState,

      issuedAt:
        new Date(
          now - 60_000
        ).toISOString(),

      absoluteExpiresAt:
        new Date(
          now + 3_600_000
        ).toISOString(),

      rotatedFromSessionId:
        null,

      createdAt:
        new Date(
          now - 60_000
        ).toISOString()
    },

    emailVerified:
      false,

    phoneVerified:
      false,

    contactVerified:
      issuedState ===
        "CONTACT_VERIFIED",

    rotated:
      false,

    revoked:
      false,

    expiredEvent:
      false,

    lastActivityAt:
      new Date(
        now - 30_000
      ).toISOString()
  };
}

function makeRequest(
  options: {
    readonly origin?:
      string;

    readonly token?:
      string;

    readonly body?:
      string;
  } = {}
): NextRequest {
  const headers =
    new Headers();

  if (
    options.origin !==
      undefined
  ) {
    headers.set(
      "Origin",
      options.origin
    );
  }

  if (
    options.token !==
      undefined
  ) {
    headers.set(
      "Cookie",
      `${ONBOARDING_SESSION_COOKIE_NAME}=${options.token}`
    );
  }

  headers.set(
    "Content-Type",
    "application/json"
  );

  return new NextRequest(
    `${APP_ORIGIN}/api/onboarding/email/send-code`,
    {
      method:
        "POST",

      headers,

      body:
        options.body ??
        JSON.stringify({
          email:
            " Test@Example.COM "
        })
    }
  );
}

beforeEach(
  () => {
    process.env.HBCE_APP_ORIGIN =
      APP_ORIGIN;

    process.env.HBCE_OTP_SECRET =
      SECRET;

    process.env.HBCE_EMAIL_PROVIDER =
      "resend";

    process.env.HBCE_EMAIL_FROM =
      "HBCE <no-reply@hbce.example>";

    process.env.RESEND_API_KEY =
      "resend_test_secret";

    delete process.env
      .HBCE_OTP_DEV_ECHO;

    vi.stubEnv(
      "NODE_ENV",
      "test"
    );

    getByTokenSha256Mock
      .mockReset();

    recordActivityMock
      .mockReset();

    repositoryFactoryMock
      .mockReset();

    lifecycleFactoryMock
      .mockReset();

    createChallengeMock
      .mockReset();

    fetchMock
      .mockReset();

    getByTokenSha256Mock
      .mockResolvedValue(
        buildTrustState()
      );

    recordActivityMock
      .mockResolvedValue({
        status:
          "SKIPPED_THROTTLE",

        event:
          null
      });

    repositoryFactoryMock
      .mockReturnValue({
        getByTokenSha256:
          getByTokenSha256Mock
      });

    lifecycleFactoryMock
      .mockReturnValue({
        recordActivity:
          recordActivityMock
      });

    createChallengeMock
      .mockReturnValue({
        token:
          CHALLENGE_TOKEN,

        nonce:
          NONCE,

        issuedAtEpochSeconds:
          ISSUED_AT,

        expiresAtEpochSeconds:
          EXPIRES_AT
      });

    fetchMock
      .mockResolvedValue(
        new Response(
          "",
          {
            status:
              200
          }
        )
      );

    vi.stubGlobal(
      "fetch",
      fetchMock
    );
  }
);

afterEach(
  () => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();

    delete process.env
      .HBCE_APP_ORIGIN;

    delete process.env
      .HBCE_OTP_SECRET;

    delete process.env
      .HBCE_EMAIL_PROVIDER;

    delete process.env
      .HBCE_EMAIL_FROM;

    delete process.env
      .RESEND_API_KEY;

    delete process.env
      .HBCE_OTP_DEV_ECHO;
  }
);

describe(
  "P003-D083R4R3R4 email send-code v2 route",
  () => {
    it(
      "rejects Origin before malformed JSON parsing and before runtime/provider access",
      async () => {
        const response =
          await POST(
            makeRequest({
              origin:
                "https://evil.example",

              token:
                RAW_TOKEN,

              body:
                '{"email":'
            })
          );

        expect(
          response.status
        ).toBe(
          403
        );

        expect(
          getByTokenSha256Mock
        ).not.toHaveBeenCalled();

        expect(
          recordActivityMock
        ).not.toHaveBeenCalled();

        expect(
          createChallengeMock
        ).not.toHaveBeenCalled();

        expect(
          fetchMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "returns 401 for a missing opaque session before body/provider processing",
      async () => {
        const response =
          await POST(
            makeRequest({
              origin:
                APP_ORIGIN,

              body:
                '{"email":'
            })
          );

        expect(
          response.status
        ).toBe(
          401
        );

        expect(
          getByTokenSha256Mock
        ).not.toHaveBeenCalled();

        expect(
          recordActivityMock
        ).not.toHaveBeenCalled();

        expect(
          createChallengeMock
        ).not.toHaveBeenCalled();

        expect(
          fetchMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "requires exact STARTED authority even though STARTED is the runtime minimum",
      async () => {
        getByTokenSha256Mock
          .mockResolvedValue(
            buildTrustState(
              "CONTACT_VERIFIED"
            )
          );

        const response =
          await POST(
            makeRequest({
              origin:
                APP_ORIGIN,

              token:
                RAW_TOKEN
            })
          );

        expect(
          response.status
        ).toBe(
          403
        );

        expect(
          recordActivityMock
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          createChallengeMock
        ).not.toHaveBeenCalled();

        expect(
          fetchMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects client authority fields in the send body",
      async () => {
        const response =
          await POST(
            makeRequest({
              origin:
                APP_ORIGIN,

              token:
                RAW_TOKEN,

              body:
                JSON.stringify({
                  email:
                    "test@example.com",

                  sessionId:
                    "client_session"
                })
            })
          );

        expect(
          response.status
        ).toBe(
          400
        );

        const body =
          await response.json();

        expect(
          body
        ).toMatchObject({
          ok:
            false,

          reason:
            "INVALID_BODY"
        });

        expect(
          createChallengeMock
        ).not.toHaveBeenCalled();

        expect(
          fetchMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "creates an EMAIL challenge bound only to server authority and normalized email",
      async () => {
        process.env
          .HBCE_OTP_DEV_ECHO =
            "true";

        const response =
          await POST(
            makeRequest({
              origin:
                APP_ORIGIN,

              token:
                RAW_TOKEN
            })
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          createChallengeMock
        ).toHaveBeenCalledWith({
          channel:
            "EMAIL",

          sessionId:
            SESSION_ID,

          normalizedContact:
            "test@example.com"
        });

        expect(
          fetchMock
        ).not.toHaveBeenCalled();

        const body =
          await response.json();

        expect(
          body
        ).toMatchObject({
          ok:
            true,

          challenge_token:
            CHALLENGE_TOKEN,

          expires_at:
            EXPIRES_AT,

          dev_echo:
            true
        });

        const expectedCode =
          deriveEmailOtpV2Code(
            {
              sessionId:
                SESSION_ID,

              normalizedEmail:
                "test@example.com",

              challengeNonce:
                NONCE,

              issuedAtEpochSeconds:
                ISSUED_AT,

              expiresAtEpochSeconds:
                EXPIRES_AT
            },
            SECRET
          );

        expect(
          body.dev_code
        ).toBe(
          expectedCode
        );

        expect(
          "email" in body
        ).toBe(
          false
        );

        expect(
          "sessionId" in body
        ).toBe(
          false
        );

        expect(
          "subjectId" in body
        ).toBe(
          false
        );

        expect(
          "onboardingId" in body
        ).toBe(
          false
        );
      }
    );

    it(
      "forces dev echo off in production and sends the exact v2 code through the provider",
      async () => {
        vi.stubEnv(
          "NODE_ENV",
          "production"
        );

        process.env
          .HBCE_OTP_DEV_ECHO =
            "true";

        const response =
          await POST(
            makeRequest({
              origin:
                APP_ORIGIN,

              token:
                RAW_TOKEN
            })
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          fetchMock
        ).toHaveBeenCalledTimes(
          1
        );

        const providerCall =
          fetchMock.mock.calls[0];

        expect(
          providerCall
        ).toBeDefined();

        if (
          providerCall ===
            undefined
        ) {
          throw new Error(
            "Expected one provider fetch call."
          );
        }

        const [
          url,
          init
        ] =
          providerCall;

        expect(
          url
        ).toBe(
          "https://api.resend.com/emails"
        );

        if (
          init ===
            undefined
        ) {
          throw new Error(
            "Expected provider request init."
          );
        }

        const providerBody =
          JSON.parse(
            String(
              (
                init as RequestInit
              ).body
            )
          );

        const expectedCode =
          deriveEmailOtpV2Code(
            {
              sessionId:
                SESSION_ID,

              normalizedEmail:
                "test@example.com",

              challengeNonce:
                NONCE,

              issuedAtEpochSeconds:
                ISSUED_AT,

              expiresAtEpochSeconds:
                EXPIRES_AT
            },
            SECRET
          );

        expect(
          providerBody.to
        ).toBe(
          "test@example.com"
        );

        expect(
          providerBody.text
        ).toContain(
          expectedCode
        );

        const body =
          await response.json();

        expect(
          body
        ).toEqual({
          ok:
            true,

          message:
            "Email verification code sent.",

          challenge_token:
            CHALLENGE_TOKEN,

          expires_at:
            EXPIRES_AT,

          dev_echo:
            false
        });

        expect(
          "dev_code" in body
        ).toBe(
          false
        );
      }
    );

    it(
      "never exposes raw provider errors in the JSON response",
      async () => {
        vi.stubEnv(
          "NODE_ENV",
          "production"
        );

        fetchMock
          .mockResolvedValue(
            new Response(
              `provider leaked ${process.env.RESEND_API_KEY}`,
              {
                status:
                  429
              }
            )
          );

        const consoleSpy =
          vi.spyOn(
            console,
            "error"
          )
            .mockImplementation(
              () =>
                undefined
            );

        const response =
          await POST(
            makeRequest({
              origin:
                APP_ORIGIN,

              token:
                RAW_TOKEN
            })
          );

        expect(
          response.status
        ).toBe(
          502
        );

        const body =
          await response.json();

        expect(
          body
        ).toMatchObject({
          ok:
            false,

          reason:
            "RESEND_SEND_REJECTED",

          provider_status:
            429
        });

        expect(
          JSON.stringify(
            body
          )
        ).not.toContain(
          process.env
            .RESEND_API_KEY
        );

        expect(
          "provider_error" in body
        ).toBe(
          false
        );

        expect(
          consoleSpy
        ).toHaveBeenCalled();
      }
    );

    it(
      "records authenticated activity before challenge creation",
      async () => {
        process.env
          .HBCE_OTP_DEV_ECHO =
            "true";

        await POST(
          makeRequest({
            origin:
              APP_ORIGIN,

            token:
              RAW_TOKEN
          })
        );

        expect(
          recordActivityMock
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          createChallengeMock
        ).toHaveBeenCalledTimes(
          1
        );

        const recordOrder =
          recordActivityMock
            .mock
            .invocationCallOrder[0];

        const challengeOrder =
          createChallengeMock
            .mock
            .invocationCallOrder[0];

        expect(
          recordOrder
        ).toBeDefined();

        expect(
          challengeOrder
        ).toBeDefined();

        if (
          recordOrder ===
            undefined ||
          challengeOrder ===
            undefined
        ) {
          throw new Error(
            "Expected authenticated activity and challenge invocation ordering."
          );
        }

        expect(
          recordOrder
        ).toBeLessThan(
          challengeOrder
        );
      }
    );
  }
);
