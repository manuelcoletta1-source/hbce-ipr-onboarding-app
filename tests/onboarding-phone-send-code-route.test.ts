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
  abuseRepositoryFactoryMock,
  consumeSendRateWindowsMock,
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

    abuseRepositoryFactoryMock:
      vi.fn(),

    consumeSendRateWindowsMock:
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
  "@/lib/server/neon-phone-abuse-control-repository",
  async (
    importOriginal
  ) => {
    const actual =
      await importOriginal<
        typeof import(
          "../lib/server/neon-phone-abuse-control-repository"
        )
      >();

    return {
      ...actual,

      createNeonPhoneAbuseControlRepository:
        abuseRepositoryFactoryMock
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
  derivePhoneOtpV2Code
} from "../lib/server/onboarding-phone-otp-v2";

import {
  derivePhoneRateLimitPhoneKey,
  derivePhoneRateLimitSessionKey
} from "../lib/server/onboarding-phone-abuse-control";

import {
  ONBOARDING_SESSION_COOKIE_NAME
} from "../lib/server/onboarding-session-cookie";

import {
  POST
} from "../app/api/onboarding/phone/send-code/route";

const APP_ORIGIN =
  "https://hbce.example";

const SECRET =
  "0123456789abcdef0123456789abcdef";

const RAW_TOKEN =
  Buffer.alloc(
    32,
    42
  ).toString(
    "base64url"
  );

const SESSION_ID =
  "session_started_phone_001";

const NONCE =
  "AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI";

const ISSUED_AT =
  1788602400;

const EXPIRES_AT =
  ISSUED_AT + 600;

const CHALLENGE_TOKEN =
  `${NONCE}.${ISSUED_AT}.${EXPIRES_AT}.mock-mac`;

const ACCOUNT_SID =
  "AC_TEST_ACCOUNT_SID";

const AUTH_TOKEN =
  "twilio_test_secret";

const VERIFY_SERVICE_SID =
  "VA0123456789abcdef0123456789abcdef";

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
        "onb_phone_001",

      subjectId:
        "sub_phone_001",

      tokenSha256:
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",

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
    `${APP_ORIGIN}/api/onboarding/phone/send-code`,
    {
      method:
        "POST",

      headers,

      body:
        options.body ??
        JSON.stringify({
          phone_number:
            " +39 351 572 4982 "
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

    process.env
      .HBCE_PHONE_RATE_LIMIT_SECRET =
      SECRET;

    delete process.env
      .HBCE_PHONE_OTP_SECRET;

    process.env.HBCE_SMS_PROVIDER =
      "twilio_verify";

    process.env.TWILIO_ACCOUNT_SID =
      ACCOUNT_SID;

    process.env.TWILIO_AUTH_TOKEN =
      AUTH_TOKEN;

    process.env.TWILIO_VERIFY_SERVICE_SID =
      VERIFY_SERVICE_SID;

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

    abuseRepositoryFactoryMock
      .mockReset();

    consumeSendRateWindowsMock
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

    abuseRepositoryFactoryMock
      .mockReturnValue({
        consumeSendRateWindows:
          consumeSendRateWindowsMock
      });

    consumeSendRateWindowsMock
      .mockResolvedValue({
        status:
          "ALLOWED"
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
          JSON.stringify({
            sid:
              "VE0123456789abcdef",

            status:
              "pending"
          }),
          {
            status:
              200,

            headers: {
              "Content-Type":
                "application/json"
            }
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
      .HBCE_PHONE_RATE_LIMIT_SECRET;

    delete process.env
      .HBCE_PHONE_OTP_SECRET;

    delete process.env
      .HBCE_SMS_PROVIDER;

    delete process.env
      .TWILIO_ACCOUNT_SID;

    delete process.env
      .TWILIO_AUTH_TOKEN;

    delete process.env
      .TWILIO_VERIFY_SERVICE_SID;

    delete process.env
      .HBCE_OTP_DEV_ECHO;
  }
);

describe(
  "P003-D083R4R7R2R1 phone send-code v2 route",
  () => {
    it(
      "rejects Origin before malformed JSON parsing and before runtime or provider access",
      async () => {
        const response =
          await POST(
            makeRequest({
              origin:
                "https://evil.example",

              token:
                RAW_TOKEN,

              body:
                '{"phone_number":'
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
      "returns 401 for a missing opaque session before body and provider processing",
      async () => {
        const response =
          await POST(
            makeRequest({
              origin:
                APP_ORIGIN,

              body:
                '{"phone_number":'
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
                  phone_number:
                    "+393515724982",

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
      "rejects a non-E164 phone before challenge creation",
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
                  phone_number:
                    "3515724982"
                })
            })
          );

        expect(
          response.status
        ).toBe(
          400
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
      "creates a PHONE challenge bound only to server authority and normalized E164 phone",
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
            "PHONE",

          sessionId:
            SESSION_ID,

          normalizedContact:
            "+393515724982"
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
          derivePhoneOtpV2Code(
            {
              sessionId:
                SESSION_ID,

              normalizedPhone:
                "+393515724982",

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
          "phone_number" in body
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
      "forces dev echo off in production and sends the exact deterministic code as Twilio CustomCode",
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
            "Expected one Twilio provider fetch call."
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
          `https://verify.twilio.com/v2/Services/${VERIFY_SERVICE_SID}/Verifications`
        );

        if (
          init ===
            undefined
        ) {
          throw new Error(
            "Expected Twilio provider request init."
          );
        }

        const requestInit =
          init as
            RequestInit;

        const headers =
          requestInit.headers as
            Record<
              string,
              string
            >;

        expect(
          headers.Authorization
        ).toBe(
          `Basic ${Buffer.from(
            `${ACCOUNT_SID}:${AUTH_TOKEN}`
          ).toString(
            "base64"
          )}`
        );

        expect(
          requestInit.body
        ).toBeInstanceOf(
          URLSearchParams
        );

        const providerBody =
          requestInit.body as
            URLSearchParams;

        const expectedCode =
          derivePhoneOtpV2Code(
            {
              sessionId:
                SESSION_ID,

              normalizedPhone:
                "+393515724982",

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
          providerBody.get(
            "To"
          )
        ).toBe(
          "+393515724982"
        );

        expect(
          providerBody.get(
            "Channel"
          )
        ).toBe(
          "sms"
        );

        expect(
          providerBody.get(
            "CustomCode"
          )
        ).toBe(
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
            "SMS verification code sent.",

          challenge_token:
            CHALLENGE_TOKEN,

          expires_at:
            EXPIRES_AT,

          dev_echo:
            false
        });

        expect(
          "phone_number" in body
        ).toBe(
          false
        );

        expect(
          "dev_code" in body
        ).toBe(
          false
        );
      }
    );

    it(
      "never exposes raw Twilio provider errors or credentials in JSON",
      async () => {
        vi.stubEnv(
          "NODE_ENV",
          "production"
        );

        fetchMock
          .mockResolvedValue(
            new Response(
              `provider leaked ${AUTH_TOKEN} ${ACCOUNT_SID} ${VERIFY_SERVICE_SID}`,
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
            "TWILIO_VERIFY_SEND_REJECTED",

          provider_status:
            429
        });

        const serialized =
          JSON.stringify(
            body
          );

        expect(
          serialized
        ).not.toContain(
          AUTH_TOKEN
        );

        expect(
          serialized
        ).not.toContain(
          ACCOUNT_SID
        );

        expect(
          serialized
        ).not.toContain(
          VERIFY_SERVICE_SID
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
      "fails closed on an invalid successful Twilio response",
      async () => {
        vi.stubEnv(
          "NODE_ENV",
          "production"
        );

        fetchMock
          .mockResolvedValue(
            new Response(
              JSON.stringify({
                status:
                  "pending"
              }),
              {
                status:
                  200,

                headers: {
                  "Content-Type":
                    "application/json"
                }
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
            "TWILIO_VERIFY_INVALID_RESPONSE"
        });

        expect(
          consoleSpy
        ).toHaveBeenCalled();
      }
    );

    it(
      "records authenticated activity before PHONE challenge creation",
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
            "Expected authenticated activity before PHONE challenge creation."
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

describe(
  "PHONE SEND rate-limit integration",
  () => {
    const NORMALIZED_PHONE =
      "+393515724982";

    function buildPhoneSendRateLimitRequest(
      options: {
        readonly body?:
          string;
        readonly includeCookie?:
          boolean;
      } = {}
    ): NextRequest {
      const headers =
        new Headers();

      headers.set(
        "Origin",
        APP_ORIGIN
      );

      headers.set(
        "Content-Type",
        "application/json"
      );

      if (
        options.includeCookie !==
          false
      ) {
        headers.set(
          "Cookie",
          `${ONBOARDING_SESSION_COOKIE_NAME}=${RAW_TOKEN}`
        );
      }

      return new NextRequest(
        `${APP_ORIGIN}/api/onboarding/phone/send-code`,
        {
          method:
            "POST",
          headers,
          body:
            options.body ??
            JSON.stringify({
              phone_number:
                " +39 351 572 4982 "
            })
        }
      );
    }

    it(
      "derives privacy keys and sends only digests plus one canonical server timestamp to the atomic repository",
      async () => {
        const response =
          await POST(
            buildPhoneSendRateLimitRequest()
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          abuseRepositoryFactoryMock
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          consumeSendRateWindowsMock
        ).toHaveBeenCalledTimes(
          1
        );

        const call =
          consumeSendRateWindowsMock
            .mock.calls[0];

        expect(call).toBeDefined();

        const input =
          call![0] as {
            sessionKeyDigest:
              string;
            phoneKeyDigest:
              string;
            now:
              string;
          };

        expect(
          input.sessionKeyDigest
        ).toBe(
          derivePhoneRateLimitSessionKey(
            SESSION_ID
          )
        );

        expect(
          input.phoneKeyDigest
        ).toBe(
          derivePhoneRateLimitPhoneKey(
            NORMALIZED_PHONE,
            SECRET
          )
        );

        expect(
          input.now
        ).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
        );

        expect(
          Object.keys(
            input
          ).sort()
        ).toEqual([
          "now",
          "phoneKeyDigest",
          "sessionKeyDigest"
        ]);

        const serialized =
          JSON.stringify(
            input
          );

        expect(
          serialized
        ).not.toContain(
          NORMALIZED_PHONE
        );

        expect(
          serialized
        ).not.toContain(
          SESSION_ID
        );

        expect(
          createChallengeMock
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          fetchMock
        ).toHaveBeenCalledTimes(
          1
        );
      }
    );

    it(
      "returns generic 429 with exact Retry-After and performs no downstream side effect",
      async () => {
        consumeSendRateWindowsMock
          .mockResolvedValueOnce({
            status:
              "RATE_LIMITED",
            retryAfterSeconds:
              317
          });

        const response =
          await POST(
            buildPhoneSendRateLimitRequest()
          );

        expect(
          response.status
        ).toBe(
          429
        );

        expect(
          response.headers.get(
            "Retry-After"
          )
        ).toBe(
          "317"
        );

        const body =
          await response.json();

        expect(body).toEqual({
          ok:
            false,
          reason:
            "PHONE_SEND_RATE_LIMITED",
          message:
            "Too many phone verification requests. Retry later."
        });

        const serialized =
          JSON.stringify(
            body
          );

        expect(
          serialized
        ).not.toContain(
          "SEND_SESSION"
        );

        expect(
          serialized
        ).not.toContain(
          "SEND_PHONE"
        );

        expect(
          serialized
        ).not.toContain(
          NORMALIZED_PHONE
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
      "does not permit dev echo to bypass the SEND rate limiter",
      async () => {
        process.env
          .HBCE_OTP_DEV_ECHO =
          "1";

        consumeSendRateWindowsMock
          .mockResolvedValueOnce({
            status:
              "RATE_LIMITED",
            retryAfterSeconds:
              600
          });

        const response =
          await POST(
            buildPhoneSendRateLimitRequest()
          );

        expect(
          response.status
        ).toBe(
          429
        );

        expect(
          response.headers.get(
            "Retry-After"
          )
        ).toBe(
          "600"
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
      "fails closed before repository access when the dedicated rate secret is missing even though the OTP secret exists",
      async () => {
        delete process.env
          .HBCE_PHONE_RATE_LIMIT_SECRET;

        expect(
          process.env
            .HBCE_OTP_SECRET
        ).toBe(
          SECRET
        );

        const response =
          await POST(
            buildPhoneSendRateLimitRequest()
          );

        expect(
          response.status
        ).toBe(
          503
        );

        const body =
          await response.json();

        expect(
          body.reason
        ).toBe(
          "PHONE_RATE_LIMIT_DEPENDENCY_FAILURE"
        );

        expect(
          abuseRepositoryFactoryMock
        ).not.toHaveBeenCalled();

        expect(
          consumeSendRateWindowsMock
        ).not.toHaveBeenCalled();

        expect(
          createChallengeMock
        ).not.toHaveBeenCalled();

        expect(
          fetchMock
        ).not.toHaveBeenCalled();

        expect(
          response.headers.get(
            "Retry-After"
          )
        ).toBeNull();
      }
    );

    it(
      "fails closed before repository access when the dedicated rate secret is invalid",
      async () => {
        process.env
          .HBCE_PHONE_RATE_LIMIT_SECRET =
          "short";

        const response =
          await POST(
            buildPhoneSendRateLimitRequest()
          );

        expect(
          response.status
        ).toBe(
          503
        );

        expect(
          abuseRepositoryFactoryMock
        ).not.toHaveBeenCalled();

        expect(
          consumeSendRateWindowsMock
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
      "maps repository dependency failure to sanitized 503 without Retry-After or downstream effects",
      async () => {
        consumeSendRateWindowsMock
          .mockRejectedValueOnce(
            new Error(
              "database-secret-detail"
            )
          );

        const response =
          await POST(
            buildPhoneSendRateLimitRequest()
          );

        expect(
          response.status
        ).toBe(
          503
        );

        expect(
          response.headers.get(
            "Retry-After"
          )
        ).toBeNull();

        const body =
          await response.json();

        expect(
          body.reason
        ).toBe(
          "PHONE_RATE_LIMIT_DEPENDENCY_FAILURE"
        );

        expect(
          JSON.stringify(
            body
          )
        ).not.toContain(
          "database-secret-detail"
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
      "does not consume rate state for an invalid phone",
      async () => {
        const response =
          await POST(
            buildPhoneSendRateLimitRequest({
              body:
                JSON.stringify({
                  phone_number:
                    "not-e164"
                })
            })
          );

        expect(
          response.status
        ).toBe(
          400
        );

        expect(
          consumeSendRateWindowsMock
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
      "does not consume rate state for a client authority field rejected by the strict body allowlist",
      async () => {
        const response =
          await POST(
            buildPhoneSendRateLimitRequest({
              body:
                JSON.stringify({
                  phone_number:
                    NORMALIZED_PHONE,
                  session_id:
                    "client-invented"
                })
            })
          );

        expect(
          response.status
        ).toBe(
          400
        );

        expect(
          consumeSendRateWindowsMock
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
      "does not consume rate state when canonical session authority is absent",
      async () => {
        const response =
          await POST(
            buildPhoneSendRateLimitRequest({
              includeCookie:
                false
            })
          );

        expect(
          response.status
        ).toBe(
          401
        );

        expect(
          consumeSendRateWindowsMock
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
      "does not roll back the accepted rate pair when the SMS provider later fails",
      async () => {
        fetchMock
          .mockRejectedValueOnce(
            new Error(
              "provider unavailable"
            )
          );

        const response =
          await POST(
            buildPhoneSendRateLimitRequest()
          );

        expect(
          response.status
        ).toBe(
          502
        );

        expect(
          consumeSendRateWindowsMock
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          createChallengeMock
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          fetchMock
        ).toHaveBeenCalledTimes(
          1
        );
      }
    );
  }
);

describe(
  "PHONE SEND provider timeout",
  () => {
    it(
      "returns sanitized 504 after exactly one 8000ms provider attempt without rolling back SEND rate consumption",
      async () => {
        vi.useFakeTimers();

        try {
          vi.stubEnv(
            "NODE_ENV",
            "production"
          );

          process.env
            .HBCE_PHONE_RATE_LIMIT_SECRET =
              SECRET;

          let markFetchStarted:
            (() => void) |
            undefined;

          const fetchStarted =
            new Promise<void>(
              (
                resolve
              ) => {
                markFetchStarted =
                  resolve;
              }
            );

          const timeoutSpy =
            vi.spyOn(
              AbortSignal,
              "timeout"
            )
              .mockImplementation(
                (
                  milliseconds:
                    number
                ) => {
                  const controller =
                    new AbortController();

                  setTimeout(
                    () => {
                      controller
                        .abort();
                    },
                    milliseconds
                  );

                  return controller
                    .signal;
                }
              );

          fetchMock
            .mockImplementationOnce(
              async (
                input:
                  string |
                  URL |
                  Request,
                init?:
                  RequestInit
              ) => {
                void input;

                const signal =
                  init?.signal;

                if (
                  !(
                    signal instanceof
                      AbortSignal
                  )
                ) {
                  throw new Error(
                    "Expected provider AbortSignal."
                  );
                }

                markFetchStarted?.();

                return await new Promise<Response>(
                  (
                    resolve,
                    reject
                  ) => {
                    void resolve;

                    const onAbort =
                      () => {
                        reject(
                          signal.reason ??
                          new Error(
                            "provider aborted"
                          )
                        );
                      };

                    if (
                      signal.aborted
                    ) {
                      onAbort();

                      return;
                    }

                    signal
                      .addEventListener(
                        "abort",
                        onAbort,
                        {
                          once:
                            true
                        }
                      );
                  }
                );
              }
            );

          const request =
            new NextRequest(
              `${APP_ORIGIN}/api/onboarding/phone/send-code`,
              {
                method:
                  "POST",

                headers: {
                  Origin:
                    APP_ORIGIN,

                  "Content-Type":
                    "application/json",

                  Cookie:
                    `${ONBOARDING_SESSION_COOKIE_NAME}=${RAW_TOKEN}`
                },

                body:
                  JSON.stringify({
                    phone_number:
                      "+393515724982"
                  })
              }
            );

          const responsePromise =
            POST(
              request
            );

          await fetchStarted;

          expect(
            timeoutSpy
          ).toHaveBeenCalledTimes(
            1
          );

          expect(
            timeoutSpy
          ).toHaveBeenCalledWith(
            8000
          );

          await vi
            .advanceTimersByTimeAsync(
              8000
            );

          const response =
            await responsePromise;

          expect(
            response.status
          ).toBe(
            504
          );

          const body =
            await response.json();

          expect(body).toEqual({
            ok:
              false,

            reason:
              "SMS_PROVIDER_TIMEOUT",

            message:
              "SMS provider request timed out."
          });

          expect(
            "provider_status" in
              body
          ).toBe(
            false
          );

          expect(
            fetchMock
          ).toHaveBeenCalledTimes(
            1
          );

          expect(
            consumeSendRateWindowsMock
          ).toHaveBeenCalledTimes(
            1
          );
        } finally {
          vi.useRealTimers();
        }
      }
    );
  }
);
