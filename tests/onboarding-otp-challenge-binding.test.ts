import {
  createHmac
} from "node:crypto";

import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  ONBOARDING_OTP_CHALLENGE_BINDING_VERSION,
  ONBOARDING_OTP_CHALLENGE_NONCE_BYTES,
  ONBOARDING_OTP_CHALLENGE_TTL_SECONDS,
  OnboardingOtpChallengeBindingError,
  createOnboardingOtpChallengeBinding,
  verifyOnboardingOtpChallengeBinding
} from "../lib/server/onboarding-otp-challenge-binding";

const SECRET =
  "0123456789abcdefghijklmnopqrstuv";

const SESSION_ID =
  "session_started_001";

const EMAIL =
  "test@example.com";

const ISSUED_AT =
  "2026-09-04T16:00:00.000Z";

const ISSUED_AT_EPOCH =
  1788537600;

const EXPIRES_AT_EPOCH =
  1788538200;

const NONCE =
  "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";

const EXPECTED_TOKEN =
  "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8.1788537600.1788538200.IZg0Dk3ujto6T-6X8ykPPx39TS5jVeAeEZu-i2r3q-M";

function deterministicRandom(
  size: number
): Uint8Array {
  const bytes =
    new Uint8Array(
      size
    );

  for (
    let index = 0;
    index < bytes.length;
    index += 1
  ) {
    bytes[index] =
      index;
  }

  return bytes;
}

function secretSource():
  string
{
  return SECRET;
}

function clockAt(
  iso: string
): () => Date {
  return () =>
    new Date(
      iso
    );
}

function expectBindingError(
  fn: () => unknown,
  code:
    OnboardingOtpChallengeBindingError["code"]
): void {
  try {
    fn();
  } catch (error) {
    expect(
      error
    ).toBeInstanceOf(
      OnboardingOtpChallengeBindingError
    );

    expect(
      error
    ).toMatchObject({
      code
    });

    return;
  }

  throw new Error(
    `Expected onboarding OTP challenge error ${code}.`
  );
}

function signToken(
  params: {
    channel:
      "EMAIL" | "PHONE";

    sessionId:
      string;

    normalizedContact:
      string;

    nonce:
      string;

    issuedAtEpochSeconds:
      number;

    expiresAtEpochSeconds:
      number;
  }
): string {
  const preimage = [
    ONBOARDING_OTP_CHALLENGE_BINDING_VERSION,
    params.channel,
    params.sessionId,
    params.normalizedContact,
    params.nonce,
    String(
      params.issuedAtEpochSeconds
    ),
    String(
      params.expiresAtEpochSeconds
    )
  ].join(
    "\n"
  );

  const mac =
    createHmac(
      "sha256",
      SECRET
    )
      .update(
        preimage,
        "utf8"
      )
      .digest(
        "base64url"
      );

  return [
    params.nonce,
    String(
      params.issuedAtEpochSeconds
    ),
    String(
      params.expiresAtEpochSeconds
    ),
    mac
  ].join(
    "."
  );
}

describe(
  "P003-D083R2 onboarding OTP challenge binding",
  () => {
    it(
      "creates the frozen deterministic session-bound token vector",
      () => {
        const result =
          createOnboardingOtpChallengeBinding(
            {
              channel:
                "EMAIL",
              sessionId:
                SESSION_ID,
              normalizedContact:
                EMAIL
            },
            {
              randomBytesSource:
                deterministicRandom,
              clock:
                clockAt(
                  ISSUED_AT
                ),
              secretSource
            }
          );

        expect(
          result
        ).toEqual({
          token:
            EXPECTED_TOKEN,
          nonce:
            NONCE,
          issuedAtEpochSeconds:
            ISSUED_AT_EPOCH,
          expiresAtEpochSeconds:
            EXPIRES_AT_EPOCH
        });

        expect(
          result.expiresAtEpochSeconds -
          result.issuedAtEpochSeconds
        ).toBe(
          ONBOARDING_OTP_CHALLENGE_TTL_SECONDS
        );
      }
    );

    it(
      "requests exactly 32 bytes of cryptographic randomness",
      () => {
        const randomSource =
          vi.fn(
            (
              size: number
            ) =>
              deterministicRandom(
                size
              )
          );

        createOnboardingOtpChallengeBinding(
          {
            channel:
              "EMAIL",
            sessionId:
              SESSION_ID,
            normalizedContact:
              EMAIL
          },
          {
            randomBytesSource:
              randomSource,
            clock:
              clockAt(
                ISSUED_AT
              ),
            secretSource
          }
        );

        expect(
          randomSource
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          randomSource
        ).toHaveBeenCalledWith(
          ONBOARDING_OTP_CHALLENGE_NONCE_BYTES
        );

        expect(
          ONBOARDING_OTP_CHALLENGE_NONCE_BYTES
        ).toBe(
          32
        );
      }
    );

    it(
      "verifies the same challenge only for its bound session contact and channel",
      () => {
        const dependencies = {
          clock:
            clockAt(
              "2026-09-04T16:05:00.000Z"
            ),
          secretSource
        };

        expect(
          verifyOnboardingOtpChallengeBinding(
            {
              token:
                EXPECTED_TOKEN,
              channel:
                "EMAIL",
              sessionId:
                SESSION_ID,
              normalizedContact:
                EMAIL
            },
            dependencies
          )
        ).toEqual({
          nonce:
            NONCE,
          issuedAtEpochSeconds:
            ISSUED_AT_EPOCH,
          expiresAtEpochSeconds:
            EXPIRES_AT_EPOCH
        });

        expectBindingError(
          () =>
            verifyOnboardingOtpChallengeBinding(
              {
                token:
                  EXPECTED_TOKEN,
                channel:
                  "EMAIL",
                sessionId:
                  "session_started_999",
                normalizedContact:
                  EMAIL
              },
              dependencies
            ),
          "INVALID_CHALLENGE"
        );

        expectBindingError(
          () =>
            verifyOnboardingOtpChallengeBinding(
              {
                token:
                  EXPECTED_TOKEN,
                channel:
                  "EMAIL",
                sessionId:
                  SESSION_ID,
                normalizedContact:
                  "other@example.com"
              },
              dependencies
            ),
          "INVALID_CHALLENGE"
        );

        expectBindingError(
          () =>
            verifyOnboardingOtpChallengeBinding(
              {
                token:
                  EXPECTED_TOKEN,
                channel:
                  "PHONE",
                sessionId:
                  SESSION_ID,
                normalizedContact:
                  EMAIL
              },
              dependencies
            ),
          "INVALID_CHALLENGE"
        );
      }
    );

    it(
      "keeps session and contact out of the token surface",
      () => {
        const result =
          createOnboardingOtpChallengeBinding(
            {
              channel:
                "EMAIL",
              sessionId:
                SESSION_ID,
              normalizedContact:
                EMAIL
            },
            {
              randomBytesSource:
                deterministicRandom,
              clock:
                clockAt(
                  ISSUED_AT
                ),
              secretSource
            }
          );

        expect(
          result.token
        ).not.toContain(
          SESSION_ID
        );

        expect(
          result.token
        ).not.toContain(
          EMAIL
        );

        expect(
          result.token.split(
            "."
          )
        ).toHaveLength(
          4
        );
      }
    );

    it(
      "rejects malformed and noncanonical tokens",
      () => {
        for (
          const token
          of [
            "",
            "abc",
            "a.b.c.d",
            `${NONCE}.x.${EXPIRES_AT_EPOCH}.${"a".repeat(43)}`,
            `${NONCE}.${ISSUED_AT_EPOCH}.${EXPIRES_AT_EPOCH}.invalid`
          ]
        ) {
          expectBindingError(
            () =>
              verifyOnboardingOtpChallengeBinding(
                {
                  token,
                  channel:
                    "EMAIL",
                  sessionId:
                    SESSION_ID,
                  normalizedContact:
                    EMAIL
                },
                {
                  clock:
                    clockAt(
                      "2026-09-04T16:05:00.000Z"
                    ),
                  secretSource
                }
              ),
            "INVALID_CHALLENGE"
          );
        }
      }
    );

    it(
      "rejects an authenticated token whose TTL is not exactly 600 seconds",
      () => {
        const token =
          signToken({
            channel:
              "EMAIL",
            sessionId:
              SESSION_ID,
            normalizedContact:
              EMAIL,
            nonce:
              NONCE,
            issuedAtEpochSeconds:
              ISSUED_AT_EPOCH,
            expiresAtEpochSeconds:
              ISSUED_AT_EPOCH +
              601
          });

        expectBindingError(
          () =>
            verifyOnboardingOtpChallengeBinding(
              {
                token,
                channel:
                  "EMAIL",
                sessionId:
                  SESSION_ID,
                normalizedContact:
                  EMAIL
              },
              {
                clock:
                  clockAt(
                    "2026-09-04T16:05:00.000Z"
                  ),
                secretSource
              }
            ),
          "INVALID_CHALLENGE"
        );
      }
    );

    it(
      "expires exactly at expires_at and rejects future-issued challenges",
      () => {
        expectBindingError(
          () =>
            verifyOnboardingOtpChallengeBinding(
              {
                token:
                  EXPECTED_TOKEN,
                channel:
                  "EMAIL",
                sessionId:
                  SESSION_ID,
                normalizedContact:
                  EMAIL
              },
              {
                clock:
                  clockAt(
                    "2026-09-04T16:10:00.000Z"
                  ),
                secretSource
              }
            ),
          "EXPIRED_CHALLENGE"
        );

        expectBindingError(
          () =>
            verifyOnboardingOtpChallengeBinding(
              {
                token:
                  EXPECTED_TOKEN,
                channel:
                  "EMAIL",
                sessionId:
                  SESSION_ID,
                normalizedContact:
                  EMAIL
              },
              {
                clock:
                  clockAt(
                    "2026-09-04T15:59:59.000Z"
                  ),
                secretSource
              }
            ),
          "INVALID_CHALLENGE"
        );
      }
    );

    it(
      "allows same-session replay inside the challenge window without changing authority",
      () => {
        const input = {
          token:
            EXPECTED_TOKEN,
          channel:
            "EMAIL" as const,
          sessionId:
            SESSION_ID,
          normalizedContact:
            EMAIL
        };

        const dependencies = {
          clock:
            clockAt(
              "2026-09-04T16:05:00.000Z"
            ),
          secretSource
        };

        const first =
          verifyOnboardingOtpChallengeBinding(
            input,
            dependencies
          );

        const second =
          verifyOnboardingOtpChallengeBinding(
            input,
            dependencies
          );

        expect(
          second
        ).toEqual(
          first
        );
      }
    );

    it(
      "fails closed on missing secret or invalid randomness",
      () => {
        expectBindingError(
          () =>
            createOnboardingOtpChallengeBinding(
              {
                channel:
                  "EMAIL",
                sessionId:
                  SESSION_ID,
                normalizedContact:
                  EMAIL
              },
              {
                randomBytesSource:
                  deterministicRandom,
                clock:
                  clockAt(
                    ISSUED_AT
                  ),
                secretSource:
                  () => undefined
              }
            ),
          "DEPENDENCY_FAILURE"
        );

        expectBindingError(
          () =>
            createOnboardingOtpChallengeBinding(
              {
                channel:
                  "EMAIL",
                sessionId:
                  SESSION_ID,
                normalizedContact:
                  EMAIL
              },
              {
                randomBytesSource:
                  () =>
                    new Uint8Array(
                      31
                    ),
                clock:
                  clockAt(
                    ISSUED_AT
                  ),
                secretSource
              }
            ),
          "DEPENDENCY_FAILURE"
        );
      }
    );
  }
);
