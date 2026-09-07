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
  computeEmailVerificationEvidenceSha256,
  deriveEmailOtpV2Code
} from "../lib/server/onboarding-email-otp-v2";

import {
  ONBOARDING_SESSION_COOKIE_NAME
} from "../lib/server/onboarding-session-cookie";

import {
  OnboardingOtpChallengeBindingError
} from "../lib/server/onboarding-otp-challenge-binding";

import {
  POST
} from "../app/api/onboarding/email/verify-code/route";

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
  "session_started_email_001";

const NORMALIZED_EMAIL =
  "test@example.com";

const NONCE =
  "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE";

const ISSUED_AT =
  1788602400;

const EXPIRES_AT =
  ISSUED_AT + 600;

const CHALLENGE_TOKEN =
  "signed.challenge.token";

const NOW =
  "2026-09-05T14:05:00.000Z";

function otpContext() {
  return {
    sessionId:
      SESSION_ID,

    normalizedEmail:
      NORMALIZED_EMAIL,

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
  return deriveEmailOtpV2Code(
    otpContext(),
    SECRET
  );
}

function expectedEvidence():
  string
{
  return computeEmailVerificationEvidenceSha256({
    sessionId:
      SESSION_ID,

    normalizedEmail:
      NORMALIZED_EMAIL,

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
    `${APP_ORIGIN}/api/onboarding/email/verify-code`,
    {
      method:
        "POST",

      headers,

      body:
        options.body ??
        JSON.stringify({
          email:
            " Test@Example.COM ",

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

    process.env.HBCE_APP_ORIGIN =
      APP_ORIGIN;

    process.env.HBCE_OTP_SECRET =
      SECRET;

    repositoryFactoryMock
      .mockReset();

    lifecycleFactoryMock
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

    vi.restoreAllMocks();

    delete process.env
      .HBCE_APP_ORIGIN;

    delete process.env
      .HBCE_OTP_SECRET;
  }
);

describe(
  "P003-D083R4R5 email verify-code v2 route",
  () => {
    it(
      "rejects Origin before malformed JSON and before runtime challenge or contact service access",
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
          verifyChallengeMock
        ).not.toHaveBeenCalled();

        expect(
          contactServiceFactoryMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "requires an opaque onboarding session before body parsing",
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
          verifyChallengeMock
        ).not.toHaveBeenCalled();

        expect(
          contactServiceFactoryMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "requires exact STARTED authority before verification",
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

        expect(
          contactServiceFactoryMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects client authority fields in the verify body",
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
                    NORMALIZED_EMAIL,

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

        expect(
          verifyChallengeMock
        ).not.toHaveBeenCalled();

        expect(
          recordFactorMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "verifies the challenge only against server authority and normalized email",
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
            "EMAIL",

          sessionId:
            SESSION_ID,

          normalizedContact:
            NORMALIZED_EMAIL
        });
      }
    );

    it(
      "rejects an invalid signed challenge before OTP factor recording",
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
          recordFactorMock
        ).not.toHaveBeenCalled();

        expect(
          finalizeContactMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects the wrong OTP before creating canonical factor evidence",
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
                    NORMALIZED_EMAIL,

                  code:
                    "000000",

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
          recordFactorMock
        ).not.toHaveBeenCalled();

        expect(
          finalizeContactMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "records only minimized EMAIL_VERIFIED evidence and finalizes contact",
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
              "onb_email_001",

            subjectId:
              "sub_email_001",

            issuedState:
              "STARTED"
          },
          {
            factor:
              "EMAIL_VERIFIED",

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
            "onb_email_001",

          subjectId:
            "sub_email_001",

          issuedState:
            "STARTED"
        });

        const factorArgument =
          recordFactorMock
            .mock
            .calls[0]?.[1];

        expect(
          JSON.stringify(
            factorArgument
          )
        ).not.toContain(
          NORMALIZED_EMAIL
        );

        expect(
          JSON.stringify(
            factorArgument
          )
        ).not.toContain(
          validCode()
        );

        expect(
          JSON.stringify(
            factorArgument
          )
        ).not.toContain(
          CHALLENGE_TOKEN
        );
      }
    );

    it(
      "returns CONTACT_NOT_READY without cookie rotation",
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

          email_verified:
            true,

          email_verified_at:
            NOW,

          email_verification_channel:
            "EMAIL_OTP",

          email_verification_hash:
            expectedEvidence(),

          contact_state:
            "CONTACT_NOT_READY"
        });

        expect(
          "email" in body
        ).toBe(
          false
        );
      }
    );

    it(
      "continues to finalization after FACTOR_ALREADY_RECORDED",
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
          recordFactorMock
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          finalizeContactMock
        ).toHaveBeenCalledTimes(
          1
        );
      }
    );

    it(
      "rotates only the opaque cookie for CONTACT_VERIFIED and never serializes raw token",
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

        expect(
          body.contact_state
        ).toBe(
          "CONTACT_VERIFIED"
        );

        const serialized =
          JSON.stringify(
            body
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
          "onb_email_001"
        );

        expect(
          serialized
        ).not.toContain(
          "sub_email_001"
        );

        expect(
          "rawToken" in body
        ).toBe(
          false
        );

        expect(
          "tokenSha256" in body
        ).toBe(
          false
        );
      }
    );

    it(
      "maps contact-service denial fail-closed and never calls any email provider",
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
          "EMAIL_FACTOR_DENIED"
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
