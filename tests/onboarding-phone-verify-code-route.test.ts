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
  consumeRateWindowMock,
  recordChallengeAttemptMock,
  consumeChallengeSuccessMock,
  getByTokenSha256Mock,
  recordActivityMock,
  verifyChallengeMock,
  contactServiceFactoryMock,
  recordFactorMock,
  finalizeContactMock,
  fetchMock
} = vi.hoisted(
  () => ({
    repositoryFactoryMock:
      vi.fn(),

    lifecycleFactoryMock:
      vi.fn(),

    abuseRepositoryFactoryMock:
      vi.fn(),

    consumeRateWindowMock:
      vi.fn(),

    recordChallengeAttemptMock:
      vi.fn(),

    consumeChallengeSuccessMock:
      vi.fn(),

    getByTokenSha256Mock:
      vi.fn(),

    recordActivityMock:
      vi.fn(),

    verifyChallengeMock:
      vi.fn(),

    contactServiceFactoryMock:
      vi.fn(),

    recordFactorMock:
      vi.fn(),

    finalizeContactMock:
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
  async (
    importOriginal
  ) => {
    const actual =
      await importOriginal<
        typeof import(
          "../lib/server/onboarding-otp-challenge-binding"
        )
      >();

    return {
      ...actual,

      verifyOnboardingOtpChallengeBinding:
        verifyChallengeMock
    };
  }
);

vi.mock(
  "@/lib/server/onboarding-contact-verification-service",
  async (
    importOriginal
  ) => {
    const actual =
      await importOriginal<
        typeof import(
          "../lib/server/onboarding-contact-verification-service"
        )
      >();

    return {
      ...actual,

      createOnboardingContactVerificationService:
        contactServiceFactoryMock
    };
  }
);

import {
  OnboardingContactVerificationServiceError
} from "../lib/server/onboarding-contact-verification-service";

import {
  computePhoneVerificationEvidenceSha256,
  derivePhoneOtpV2Code
} from "../lib/server/onboarding-phone-otp-v2";

import {
  derivePhoneChallengeUsageKey,
  derivePhoneRateLimitPhoneKey,
  derivePhoneRateLimitSessionKey
} from "../lib/server/onboarding-phone-abuse-control";

import {
  ONBOARDING_SESSION_COOKIE_NAME
} from "../lib/server/onboarding-session-cookie";

import {
  OnboardingOtpChallengeBindingError
} from "../lib/server/onboarding-otp-challenge-binding";

import {
  POST
} from "../app/api/onboarding/phone/verify-code/route";

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

const ROTATED_RAW_TOKEN =
  Buffer.alloc(
    32,
    57
  ).toString(
    "base64url"
  );

const SESSION_ID =
  "session_started_phone_001";

const NORMALIZED_PHONE =
  "+393515724982";

const NONCE =
  "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE";

const ISSUED_AT =
  1788602400;

const EXPIRES_AT =
  ISSUED_AT + 600;

const CHALLENGE_TOKEN =
  "signed.phone.challenge.token";

const NOW =
  "2026-09-05T14:45:00.000Z";

function otpContext() {
  return {
    sessionId:
      SESSION_ID,

    normalizedPhone:
      NORMALIZED_PHONE,

    challengeNonce:
      NONCE,

    issuedAtEpochSeconds:
      ISSUED_AT,

    expiresAtEpochSeconds:
      EXPIRES_AT
  };
}

function validCode():
  string
{
  return derivePhoneOtpV2Code(
    otpContext(),
    SECRET
  );
}

function invalidCode():
  string
{
  return validCode() ===
    "000000"
    ? "000001"
    : "000000";
}

function expectedEvidence():
  string
{
  return computePhoneVerificationEvidenceSha256({
    sessionId:
      SESSION_ID,

    normalizedPhone:
      NORMALIZED_PHONE,

    challengeToken:
      CHALLENGE_TOKEN,

    verifiedAtIso:
      NOW
  });
}

function buildTrustState(
  issuedState:
    "STARTED" |
    "CONTACT_VERIFIED" =
      "STARTED"
) {
  const now =
    new Date(
      NOW
    ).getTime();

  return {
    session: {
      sessionId:
        SESSION_ID,

      onboardingId:
        "onb_phone_001",

      subjectId:
        "sub_phone_001",

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
      true,

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

function approvedProviderResponse():
  Response
{
  return new Response(
    JSON.stringify({
      sid:
        "VE_PROVIDER_SHOULD_NOT_ESCAPE",

      status:
        "approved",

      to:
        NORMALIZED_PHONE,

      channel:
        "sms",

      valid:
        true
    }),
    {
      status:
        200,

      headers: {
        "Content-Type":
          "application/json"
      }
    }
  );
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
    `${APP_ORIGIN}/api/onboarding/phone/verify-code`,
    {
      method:
        "POST",

      headers,

      body:
        options.body ??
        JSON.stringify({
          phone_number:
            " +39 351 572 4982 ",

          code:
            validCode(),

          challenge_token:
            CHALLENGE_TOKEN
        })
    }
  );
}

beforeEach(
  () => {
    vi.useFakeTimers();

    vi.setSystemTime(
      new Date(
        NOW
      )
    );

    vi.stubEnv(
      "NODE_ENV",
      "test"
    );

    process.env.HBCE_APP_ORIGIN =
      APP_ORIGIN;

    process.env.HBCE_PHONE_OTP_SECRET =
      SECRET;

    process.env.HBCE_PHONE_RATE_LIMIT_SECRET =
      SECRET;

    process.env.HBCE_OTP_DEV_ECHO =
      "true";

    process.env.HBCE_SMS_PROVIDER =
      "twilio_verify";

    process.env.TWILIO_ACCOUNT_SID =
      "AC_TEST_ACCOUNT";

    process.env.TWILIO_AUTH_TOKEN =
      "TWILIO_TEST_AUTH_TOKEN_SECRET";

    process.env.TWILIO_VERIFY_SERVICE_SID =
      "VA_TEST_SERVICE";

    repositoryFactoryMock
      .mockReset();

    lifecycleFactoryMock
      .mockReset();

    abuseRepositoryFactoryMock
      .mockReset();

    consumeRateWindowMock
      .mockReset();

    recordChallengeAttemptMock
      .mockReset();

    consumeChallengeSuccessMock
      .mockReset();

    getByTokenSha256Mock
      .mockReset();

    recordActivityMock
      .mockReset();

    verifyChallengeMock
      .mockReset();

    contactServiceFactoryMock
      .mockReset();

    recordFactorMock
      .mockReset();

    finalizeContactMock
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
        consumeRateWindow:
          consumeRateWindowMock,

        recordChallengeAttempt:
          recordChallengeAttemptMock,

        consumeChallengeSuccess:
          consumeChallengeSuccessMock
      });

    consumeRateWindowMock
      .mockResolvedValue({
        status:
          "ALLOWED",
        requestCount:
          1,
        windowStartedAt:
          NOW,
        expiresAt:
          new Date(
            new Date(
              NOW
            ).getTime() +
              600000
          ).toISOString()
      });

    recordChallengeAttemptMock
      .mockResolvedValue({
        status:
          "ATTEMPT_RECORDED",
        attemptCount:
          1,
        expiresAt:
          new Date(
            EXPIRES_AT *
              1000
          ).toISOString()
      });

    consumeChallengeSuccessMock
      .mockResolvedValue({
        status:
          "CONSUMED",
        consumedAt:
          NOW
      });

    verifyChallengeMock
      .mockReturnValue({
        nonce:
          NONCE,

        issuedAtEpochSeconds:
          ISSUED_AT,

        expiresAtEpochSeconds:
          EXPIRES_AT
      });

    recordFactorMock
      .mockResolvedValue({
        status:
          "FACTOR_RECORDED"
      });

    finalizeContactMock
      .mockResolvedValue({
        status:
          "CONTACT_NOT_READY"
      });

    contactServiceFactoryMock
      .mockReturnValue({
        recordFactor:
          recordFactorMock,

        finalizeContact:
          finalizeContactMock
      });

    fetchMock
      .mockResolvedValue(
        approvedProviderResponse()
      );

    vi.stubGlobal(
      "fetch",
      fetchMock
    );
  }
);

afterEach(
  () => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();

    delete process.env
      .HBCE_APP_ORIGIN;

    delete process.env
      .HBCE_PHONE_OTP_SECRET;

    delete process.env
      .HBCE_PHONE_RATE_LIMIT_SECRET;

    delete process.env
      .HBCE_OTP_DEV_ECHO;

    delete process.env
      .HBCE_SMS_PROVIDER;

    delete process.env
      .TWILIO_ACCOUNT_SID;

    delete process.env
      .TWILIO_AUTH_TOKEN;

    delete process.env
      .TWILIO_VERIFY_SERVICE_SID;
  }
);

describe(
  "P003-D083R4R7R3R1R3 phone verify-code v2 route",
  () => {
    it(
      "rejects Origin before malformed JSON and before runtime challenge provider or contact access",
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
          verifyChallengeMock
        ).not.toHaveBeenCalled();

        expect(
          fetchMock
        ).not.toHaveBeenCalled();

        expect(
          contactServiceFactoryMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "requires opaque onboarding session before body parsing",
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
          verifyChallengeMock
        ).not.toHaveBeenCalled();

        expect(
          fetchMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "requires exact STARTED authority",
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
          verifyChallengeMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects client authority fields",
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
                    NORMALIZED_PHONE,

                  code:
                    validCode(),

                  challenge_token:
                    CHALLENGE_TOKEN,

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
          body.reason
        ).toBe(
          "INVALID_BODY"
        );

        expect(
          verifyChallengeMock
        ).not.toHaveBeenCalled();

        expect(
          fetchMock
        ).not.toHaveBeenCalled();

        expect(
          recordFactorMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "binds PHONE challenge to server authority and normalized phone",
      async () => {
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
          verifyChallengeMock
        ).toHaveBeenCalledWith({
          token:
            CHALLENGE_TOKEN,

          channel:
            "PHONE",

          sessionId:
            SESSION_ID,

          normalizedContact:
            NORMALIZED_PHONE
        });

        expect(
          fetchMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects invalid challenge before OTP provider or factor",
      async () => {
        verifyChallengeMock
          .mockImplementation(
            () => {
              throw new OnboardingOtpChallengeBindingError(
                "INVALID_CHALLENGE",
                "invalid"
              );
            }
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
          400
        );

        const body =
          await response.json();

        expect(
          body.reason
        ).toBe(
          "INVALID_CHALLENGE"
        );

        expect(
          fetchMock
        ).not.toHaveBeenCalled();

        expect(
          recordFactorMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "maps expired challenge distinctly",
      async () => {
        verifyChallengeMock
          .mockImplementation(
            () => {
              throw new OnboardingOtpChallengeBindingError(
                "EXPIRED_CHALLENGE",
                "expired"
              );
            }
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
          400
        );

        const body =
          await response.json();

        expect(
          body.reason
        ).toBe(
          "CHALLENGE_EXPIRED"
        );

        expect(
          fetchMock
        ).not.toHaveBeenCalled();

        expect(
          recordFactorMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects wrong local deterministic OTP before Twilio",
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
                    NORMALIZED_PHONE,

                  code:
                    invalidCode(),

                  challenge_token:
                    CHALLENGE_TOKEN
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
          body.reason
        ).toBe(
          "INVALID_OTP"
        );

        expect(
          fetchMock
        ).not.toHaveBeenCalled();

        expect(
          recordFactorMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "requires Twilio approval in production after local OTP validation",
      async () => {
        vi.stubEnv(
          "NODE_ENV",
          "production"
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
            "Expected Twilio VerificationCheck."
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
          "https://verify.twilio.com/v2/Services/VA_TEST_SERVICE/VerificationCheck"
        );

        if (
          init ===
            undefined
        ) {
          throw new Error(
            "Expected provider request init."
          );
        }

        const params =
          new URLSearchParams(
            String(
              (
                init as RequestInit
              ).body
            )
          );

        expect(
          params.get(
            "To"
          )
        ).toBe(
          NORMALIZED_PHONE
        );

        expect(
          params.get(
            "Code"
          )
        ).toBe(
          validCode()
        );

        const providerOrder =
          fetchMock
            .mock
            .invocationCallOrder[0];

        const factorOrder =
          recordFactorMock
            .mock
            .invocationCallOrder[0];

        expect(
          providerOrder
        ).toBeDefined();

        expect(
          factorOrder
        ).toBeDefined();

        if (
          providerOrder ===
            undefined ||
          factorOrder ===
            undefined
        ) {
          throw new Error(
            "Expected provider/factor ordering."
          );
        }

        expect(
          providerOrder
        ).toBeLessThan(
          factorOrder
        );
      }
    );

    it(
      "denies non-approved Twilio result before factor recording",
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
                  "pending",

                sid:
                  "VE_DO_NOT_EXPOSE"
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
          400
        );

        const body =
          await response.json();

        expect(
          body.reason
        ).toBe(
          "PHONE_CODE_NOT_APPROVED"
        );

        expect(
          JSON.stringify(
            body
          )
        ).not.toContain(
          "VE_DO_NOT_EXPOSE"
        );

        expect(
          recordFactorMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "fails closed on invalid successful provider structure",
      async () => {
        vi.stubEnv(
          "NODE_ENV",
          "production"
        );

        fetchMock
          .mockResolvedValue(
            new Response(
              JSON.stringify({
                sid:
                  "VE_INVALID"
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
          ).mockImplementation(
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
          body.reason
        ).toBe(
          "TWILIO_VERIFY_INVALID_RESPONSE"
        );

        expect(
          JSON.stringify(
            body
          )
        ).not.toContain(
          "VE_INVALID"
        );

        expect(
          recordFactorMock
        ).not.toHaveBeenCalled();

        expect(
          consoleSpy
        ).toHaveBeenCalled();
      }
    );

    it(
      "never exposes raw Twilio provider error or credentials",
      async () => {
        vi.stubEnv(
          "NODE_ENV",
          "production"
        );

        const providerLeak =
          [
            "provider-error",
            process.env.TWILIO_AUTH_TOKEN,
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_VERIFY_SERVICE_SID
          ].join(
            ":"
          );

        fetchMock
          .mockResolvedValue(
            new Response(
              providerLeak,
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
          ).mockImplementation(
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
            "TWILIO_VERIFY_CHECK_REJECTED",

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
          providerLeak
        );

        expect(
          "provider_error" in
            body
        ).toBe(
          false
        );

        const diagnostic =
          JSON.stringify(
            consoleSpy
              .mock
              .calls
          );

        expect(
          diagnostic
        ).not.toContain(
          process.env
            .TWILIO_AUTH_TOKEN
        );

        expect(
          diagnostic
        ).not.toContain(
          process.env
            .TWILIO_ACCOUNT_SID
        );

        expect(
          diagnostic
        ).not.toContain(
          process.env
            .TWILIO_VERIFY_SERVICE_SID
        );
      }
    );

    it(
      "records minimized PHONE_VERIFIED evidence and returns CONTACT_NOT_READY without cookie rotation",
      async () => {
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
          recordFactorMock
        ).toHaveBeenCalledWith(
          {
            sessionId:
              SESSION_ID,

            onboardingId:
              "onb_phone_001",

            subjectId:
              "sub_phone_001",

            issuedState:
              "STARTED"
          },
          {
            factor:
              "PHONE_VERIFIED",

            verificationEvidenceSha256:
              expectedEvidence()
          }
        );

        expect(
          finalizeContactMock
        ).toHaveBeenCalledWith({
          sessionId:
            SESSION_ID,

          onboardingId:
            "onb_phone_001",

          subjectId:
            "sub_phone_001",

          issuedState:
            "STARTED"
        });

        const factorArgument =
          recordFactorMock
            .mock
            .calls[0]?.[1];

        const serializedFactor =
          JSON.stringify(
            factorArgument
          );

        expect(
          serializedFactor
        ).not.toContain(
          NORMALIZED_PHONE
        );

        expect(
          serializedFactor
        ).not.toContain(
          validCode()
        );

        expect(
          serializedFactor
        ).not.toContain(
          CHALLENGE_TOKEN
        );

        expect(
          response.cookies.has(
            ONBOARDING_SESSION_COOKIE_NAME
          )
        ).toBe(
          false
        );

        const body =
          await response.json();

        expect(
          body
        ).toEqual({
          ok:
            true,

          phone_verified:
            true,

          phone_verified_at:
            NOW,

          phone_verification_channel:
            "SMS_OTP",

          phone_verification_hash:
            expectedEvidence(),

          contact_state:
            "CONTACT_NOT_READY"
        });

        expect(
          "phone_number" in
            body
        ).toBe(
          false
        );

        expect(
          "challenge_token" in
            body
        ).toBe(
          false
        );
      }
    );

    it(
      "continues finalization after FACTOR_ALREADY_RECORDED",
      async () => {
        recordFactorMock
          .mockResolvedValue({
            status:
              "FACTOR_ALREADY_RECORDED"
          });

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
          finalizeContactMock
        ).toHaveBeenCalledTimes(
          1
        );
      }
    );

    it(
      "installs rotated opaque cookie only for CONTACT_VERIFIED",
      async () => {
        finalizeContactMock
          .mockResolvedValue({
            status:
              "CONTACT_VERIFIED",

            rawToken:
              ROTATED_RAW_TOKEN
          });

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
          response.cookies.get(
            ONBOARDING_SESSION_COOKIE_NAME
          )
        ).toMatchObject({
          name:
            ONBOARDING_SESSION_COOKIE_NAME,

          value:
            ROTATED_RAW_TOKEN,

          httpOnly:
            true,

          secure:
            true,

          sameSite:
            "strict",

          path:
            "/",

          maxAge:
            28800
        });

        const body =
          await response.json();

        const serialized =
          JSON.stringify(
            body
          );

        expect(
          body.contact_state
        ).toBe(
          "CONTACT_VERIFIED"
        );

        expect(
          serialized
        ).not.toContain(
          ROTATED_RAW_TOKEN
        );

        expect(
          serialized
        ).not.toContain(
          SESSION_ID
        );

        expect(
          serialized
        ).not.toContain(
          NORMALIZED_PHONE
        );

        expect(
          serialized
        ).not.toContain(
          CHALLENGE_TOKEN
        );

        expect(
          "rawToken" in
            body
        ).toBe(
          false
        );

        expect(
          "tokenSha256" in
            body
        ).toBe(
          false
        );

        expect(
          "phone_number" in
            body
        ).toBe(
          false
        );
      }
    );

    it(
      "maps PHONE factor denial fail closed",
      async () => {
        recordFactorMock
          .mockRejectedValue(
            new OnboardingContactVerificationServiceError(
              "FACTOR_DENIED",
              "denied"
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
          409
        );

        const body =
          await response.json();

        expect(
          body.reason
        ).toBe(
          "PHONE_FACTOR_DENIED"
        );

        expect(
          finalizeContactMock
        ).not.toHaveBeenCalled();

        expect(
          fetchMock
        ).not.toHaveBeenCalled();
      }
    );
  }
);

describe(
  "PHONE VERIFY abuse-control integration",
  () => {
    const NORMALIZED_PHONE =
      "+393515724982";

    function buildVerifyAbuseRequest(
      options: {
        readonly phone?:
          string;
        readonly code?:
          string;
        readonly challengeToken?:
          string;
        readonly includeCookie?:
          boolean;
        readonly extraBody?:
          Record<string, unknown>;
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
        `${APP_ORIGIN}/api/onboarding/phone/verify-code`,
        {
          method:
            "POST",
          headers,
          body:
            JSON.stringify({
              phone_number:
                options.phone ??
                NORMALIZED_PHONE,
              code:
                options.code ??
                validCode(),
              challenge_token:
                options.challengeToken ??
                CHALLENGE_TOKEN,
              ...(
                options.extraBody ??
                {}
              )
            })
        }
      );
    }

    it(
      "consumes VERIFY_SESSION with only the canonical session digest before signed challenge verification",
      async () => {
        const response =
          await POST(
            buildVerifyAbuseRequest()
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          consumeRateWindowMock
        ).toHaveBeenCalledTimes(
          1
        );

        const call =
          consumeRateWindowMock
            .mock.calls[0];

        expect(call).toBeDefined();

        const input =
          call![0] as {
            scope:
              string;
            keyDigest:
              string;
            now:
              string;
            limit:
              number;
          };

        expect(
          input.scope
        ).toBe(
          "VERIFY_SESSION"
        );

        expect(
          input.keyDigest
        ).toBe(
          derivePhoneRateLimitSessionKey(
            SESSION_ID
          )
        );

        expect(
          input.limit
        ).toBe(
          10
        );

        expect(
          input.now
        ).toBe(
          NOW
        );

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
          CHALLENGE_TOKEN
        );

        expect(
          serialized
        ).not.toContain(
          RAW_TOKEN
        );
      }
    );

    it(
      "returns generic VERIFY 429 with exact Retry-After before challenge attempt OTP provider or factor access",
      async () => {
        consumeRateWindowMock
          .mockResolvedValueOnce({
            status:
              "RATE_LIMITED",
            retryAfterSeconds:
              411
          });

        const response =
          await POST(
            buildVerifyAbuseRequest()
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
          "411"
        );

        const body =
          await response.json();

        expect(body).toEqual({
          ok:
            false,
          reason:
            "PHONE_VERIFY_RATE_LIMITED",
          message:
            "Too many phone verification attempts. Retry later."
        });

        expect(
          verifyChallengeMock
        ).not.toHaveBeenCalled();

        expect(
          recordChallengeAttemptMock
        ).not.toHaveBeenCalled();

        expect(
          consumeChallengeSuccessMock
        ).not.toHaveBeenCalled();

        expect(
          fetchMock
        ).not.toHaveBeenCalled();

        expect(
          recordFactorMock
        ).not.toHaveBeenCalled();

        expect(
          JSON.stringify(
            body
          )
        ).not.toContain(
          "VERIFY_SESSION"
        );
      }
    );

    it(
      "fails closed on malformed repository Retry-After",
      async () => {
        consumeRateWindowMock
          .mockResolvedValueOnce({
            status:
              "RATE_LIMITED",
            retryAfterSeconds:
              0
          });

        const response =
          await POST(
            buildVerifyAbuseRequest()
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

        expect(
          (
            await response.json()
          ).reason
        ).toBe(
          "PHONE_RATE_LIMIT_DEPENDENCY_FAILURE"
        );

        expect(
          verifyChallengeMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "consumes the session window for an invalid signed challenge but never records trusted challenge usage",
      async () => {
        verifyChallengeMock
          .mockImplementationOnce(
            () => {
              throw new OnboardingOtpChallengeBindingError(
                "INVALID_CHALLENGE",
                "invalid"
              );
            }
          );

        const response =
          await POST(
            buildVerifyAbuseRequest()
          );

        expect(
          response.status
        ).toBe(
          400
        );

        expect(
          consumeRateWindowMock
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          recordChallengeAttemptMock
        ).not.toHaveBeenCalled();

        expect(
          consumeChallengeSuccessMock
        ).not.toHaveBeenCalled();

        expect(
          fetchMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "records challenge usage with digests only after signed binding becomes trusted",
      async () => {
        const response =
          await POST(
            buildVerifyAbuseRequest()
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          recordChallengeAttemptMock
        ).toHaveBeenCalledTimes(
          1
        );

        const call =
          recordChallengeAttemptMock
            .mock.calls[0];

        expect(call).toBeDefined();

        const input =
          call![0] as {
            challengeDigest:
              string;
            sessionId:
              string;
            phoneKeyDigest:
              string;
            expiresAt:
              string;
            now:
              string;
          };

        expect(
          input.challengeDigest
        ).toBe(
          derivePhoneChallengeUsageKey(
            CHALLENGE_TOKEN
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
          input.sessionId
        ).toBe(
          SESSION_ID
        );

        expect(
          input.expiresAt
        ).toBe(
          new Date(
            EXPIRES_AT *
              1000
          ).toISOString()
        );

        expect(
          input.now
        ).toBe(
          NOW
        );

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
          CHALLENGE_TOKEN
        );

        expect(
          serialized
        ).not.toContain(
          RAW_TOKEN
        );
      }
    );

    it(
      "returns generic 429 when the trusted challenge attempt limit is exhausted",
      async () => {
        recordChallengeAttemptMock
          .mockResolvedValueOnce({
            status:
              "ATTEMPT_LIMITED",
            retryAfterSeconds:
              222
          });

        const response =
          await POST(
            buildVerifyAbuseRequest()
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
          "222"
        );

        expect(
          (
            await response.json()
          ).reason
        ).toBe(
          "PHONE_VERIFY_RATE_LIMITED"
        );

        expect(
          consumeChallengeSuccessMock
        ).not.toHaveBeenCalled();

        expect(
          fetchMock
        ).not.toHaveBeenCalled();

        expect(
          recordFactorMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "maps an already consumed challenge attempt to generic INVALID_CHALLENGE",
      async () => {
        recordChallengeAttemptMock
          .mockResolvedValueOnce({
            status:
              "CHALLENGE_CONSUMED"
          });

        const response =
          await POST(
            buildVerifyAbuseRequest()
          );

        expect(
          response.status
        ).toBe(
          400
        );

        expect(
          (
            await response.json()
          ).reason
        ).toBe(
          "INVALID_CHALLENGE"
        );

        expect(
          fetchMock
        ).not.toHaveBeenCalled();

        expect(
          consumeChallengeSuccessMock
        ).not.toHaveBeenCalled();

        expect(
          recordFactorMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "maps durable challenge binding mismatch to generic INVALID_CHALLENGE",
      async () => {
        recordChallengeAttemptMock
          .mockResolvedValueOnce({
            status:
              "CHALLENGE_BINDING_MISMATCH"
          });

        const response =
          await POST(
            buildVerifyAbuseRequest()
          );

        expect(
          response.status
        ).toBe(
          400
        );

        const body =
          await response.json();

        expect(
          body.reason
        ).toBe(
          "INVALID_CHALLENGE"
        );

        expect(
          JSON.stringify(
            body
          )
        ).not.toContain(
          "CHALLENGE_BINDING_MISMATCH"
        );
      }
    );

    it(
      "consumes a challenge attempt for an invalid local OTP without calling provider or success consumption",
      async () => {
        const current =
          validCode();

        const invalidCode =
          current ===
            "000000"
            ? "111111"
            : "000000";

        const response =
          await POST(
            buildVerifyAbuseRequest({
              code:
                invalidCode
            })
          );

        expect(
          response.status
        ).toBe(
          400
        );

        expect(
          recordChallengeAttemptMock
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          fetchMock
        ).not.toHaveBeenCalled();

        expect(
          consumeChallengeSuccessMock
        ).not.toHaveBeenCalled();

        expect(
          recordFactorMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "keeps the recorded attempt consumed when production provider returns non-approved status",
      async () => {
        vi.stubEnv(
          "NODE_ENV",
          "production"
        );

        fetchMock
          .mockResolvedValueOnce(
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

        const response =
          await POST(
            buildVerifyAbuseRequest()
          );

        expect(
          response.status
        ).toBe(
          400
        );

        expect(
          recordChallengeAttemptMock
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          fetchMock
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          consumeChallengeSuccessMock
        ).not.toHaveBeenCalled();

        expect(
          recordFactorMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "keeps the recorded attempt consumed when production provider dependency fails",
      async () => {
        vi.stubEnv(
          "NODE_ENV",
          "production"
        );

        fetchMock
          .mockRejectedValueOnce(
            new Error(
              "provider unavailable"
            )
          );

        const response =
          await POST(
            buildVerifyAbuseRequest()
          );

        expect(
          response.status
        ).toBe(
          502
        );

        expect(
          recordChallengeAttemptMock
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          consumeChallengeSuccessMock
        ).not.toHaveBeenCalled();

        expect(
          recordFactorMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "does not allow dev echo to bypass attempt recording or one-time success consumption",
      async () => {
        expect(
          process.env
            .HBCE_OTP_DEV_ECHO
        ).toBe(
          "true"
        );

        const response =
          await POST(
            buildVerifyAbuseRequest()
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          recordChallengeAttemptMock
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          consumeChallengeSuccessMock
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          fetchMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "consumes one-time challenge success before PHONE evidence and factor recording",
      async () => {
        vi.stubEnv(
          "NODE_ENV",
          "production"
        );

        const order:
          string[] =
          [];

        recordChallengeAttemptMock
          .mockImplementationOnce(
            async () => {
              order.push(
                "attempt"
              );

              return {
                status:
                  "ATTEMPT_RECORDED",
                attemptCount:
                  1,
                expiresAt:
                  new Date(
                    EXPIRES_AT *
                      1000
                  ).toISOString()
              };
            }
          );

        fetchMock
          .mockImplementationOnce(
            async () => {
              order.push(
                "provider"
              );

              return approvedProviderResponse();
            }
          );

        consumeChallengeSuccessMock
          .mockImplementationOnce(
            async () => {
              order.push(
                "success"
              );

              return {
                status:
                  "CONSUMED",
                consumedAt:
                  NOW
              };
            }
          );

        recordFactorMock
          .mockImplementationOnce(
            async () => {
              order.push(
                "factor"
              );

              return {
                status:
                  "FACTOR_RECORDED"
              };
            }
          );

        const response =
          await POST(
            buildVerifyAbuseRequest()
          );

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          order
        ).toEqual([
          "attempt",
          "provider",
          "success",
          "factor"
        ]);
      }
    );

    it(
      "returns INVALID_CHALLENGE when one-time success loses the durable race before evidence factor or finalization",
      async () => {
        consumeChallengeSuccessMock
          .mockResolvedValueOnce({
            status:
              "DENIED"
          });

        const response =
          await POST(
            buildVerifyAbuseRequest()
          );

        expect(
          response.status
        ).toBe(
          400
        );

        expect(
          (
            await response.json()
          ).reason
        ).toBe(
          "INVALID_CHALLENGE"
        );

        expect(
          recordFactorMock
        ).not.toHaveBeenCalled();

        expect(
          finalizeContactMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "uses repository consumedAt as the canonical phone_verified_at timestamp",
      async () => {
        const consumedAt =
          "2026-09-05T18:00:00.123Z";

        consumeChallengeSuccessMock
          .mockResolvedValueOnce({
            status:
              "CONSUMED",
            consumedAt
          });

        const response =
          await POST(
            buildVerifyAbuseRequest()
          );

        expect(
          response.status
        ).toBe(
          200
        );

        const body =
          await response.json();

        expect(
          body.phone_verified_at
        ).toBe(
          consumedAt
        );

        const expectedEvidence =
          computePhoneVerificationEvidenceSha256({
            sessionId:
              SESSION_ID,
            normalizedPhone:
              NORMALIZED_PHONE,
            challengeToken:
              CHALLENGE_TOKEN,
            verifiedAtIso:
              consumedAt
          });

        expect(
          body.phone_verification_hash
        ).toBe(
          expectedEvidence
        );

        expect(
          recordFactorMock
        ).toHaveBeenCalledWith(
          expect.anything(),
          {
            factor:
              "PHONE_VERIFIED",
            verificationEvidenceSha256:
              expectedEvidence
          }
        );
      }
    );

    it(
      "fails closed on dedicated PHONE rate secret failure after trusted challenge and before OTP provider or success",
      async () => {
        delete process.env
          .HBCE_PHONE_RATE_LIMIT_SECRET;

        const response =
          await POST(
            buildVerifyAbuseRequest()
          );

        expect(
          response.status
        ).toBe(
          503
        );

        expect(
          (
            await response.json()
          ).reason
        ).toBe(
          "PHONE_RATE_LIMIT_DEPENDENCY_FAILURE"
        );

        expect(
          recordChallengeAttemptMock
        ).not.toHaveBeenCalled();

        expect(
          fetchMock
        ).not.toHaveBeenCalled();

        expect(
          consumeChallengeSuccessMock
        ).not.toHaveBeenCalled();

        expect(
          recordFactorMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "does not consume VERIFY_SESSION for authority body or phone validation failures",
      async () => {
        const missingSession =
          await POST(
            buildVerifyAbuseRequest({
              includeCookie:
                false
            })
          );

        expect(
          missingSession.status
        ).toBe(
          401
        );

        expect(
          consumeRateWindowMock
        ).not.toHaveBeenCalled();

        const invalidPhone =
          await POST(
            buildVerifyAbuseRequest({
              phone:
                "not-e164"
            })
          );

        expect(
          invalidPhone.status
        ).toBe(
          400
        );

        expect(
          consumeRateWindowMock
        ).not.toHaveBeenCalled();

        const invalidBody =
          await POST(
            buildVerifyAbuseRequest({
              extraBody: {
                session_id:
                  "client-invented"
              }
            })
          );

        expect(
          invalidBody.status
        ).toBe(
          400
        );

        expect(
          consumeRateWindowMock
        ).not.toHaveBeenCalled();
      }
    );
  }
);

describe(
  "PHONE VERIFY provider timeout",
  () => {
    it(
      "returns sanitized 504 after exactly one 8000ms provider check while preserving the recorded challenge attempt and preventing success consumption",
      async () => {
        vi.stubEnv(
          "NODE_ENV",
          "production"
        );

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
            `${APP_ORIGIN}/api/onboarding/phone/verify-code`,
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
                    "+393515724982",

                  code:
                    validCode(),

                  challenge_token:
                    CHALLENGE_TOKEN
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
            "SMS verification provider request timed out."
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
          consumeRateWindowMock
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          recordChallengeAttemptMock
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          consumeChallengeSuccessMock
        ).not.toHaveBeenCalled();

        expect(
          recordFactorMock
        ).not.toHaveBeenCalled();

        expect(
          finalizeContactMock
        ).not.toHaveBeenCalled();
      }
    );
  }
);
