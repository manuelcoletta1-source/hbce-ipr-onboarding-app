import {
  describe,
  expect,
  it
} from "vitest";

import {
  HBCE_EMAIL_OTP_V2_CODE_DOMAIN,
  HBCE_EMAIL_OTP_V2_TTL_SECONDS,
  HBCE_EMAIL_VERIFICATION_EVIDENCE_DOMAIN,
  OnboardingEmailOtpV2Error,
  computeEmailVerificationEvidenceSha256,
  deriveEmailOtpV2Code,
  isEmailOtpV2DevEchoEnabled,
  isValidEmailForOtpV2,
  normalizeEmailForOtpV2,
  readEmailOtpV2Secret,
  verifyEmailOtpV2Code,
  type OnboardingEmailOtpV2ChallengeContext
} from "../lib/server/onboarding-email-otp-v2";

const SECRET =
  "0123456789abcdef0123456789abcdef";

const NONCE_A =
  "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE";

const NONCE_B =
  "AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI";

const ISSUED_AT =
  1788602400;

const EXPIRES_AT =
  ISSUED_AT + 600;

function context(
  overrides:
    Partial<OnboardingEmailOtpV2ChallengeContext> = {}
): OnboardingEmailOtpV2ChallengeContext {
  return {
    sessionId:
      "session_started_001",

    normalizedEmail:
      "test@example.com",

    challengeNonce:
      NONCE_A,

    issuedAtEpochSeconds:
      ISSUED_AT,

    expiresAtEpochSeconds:
      EXPIRES_AT,

    ...overrides
  };
}

describe(
  "P003-D083R4R2 email OTP v2 primitive",
  () => {
    it(
      "freezes the v2 domains and exact 600-second policy",
      () => {
        expect(
          HBCE_EMAIL_OTP_V2_CODE_DOMAIN
        ).toBe(
          "HBCE_EMAIL_OTP_CODE_V2"
        );

        expect(
          HBCE_EMAIL_VERIFICATION_EVIDENCE_DOMAIN
        ).toBe(
          "HBCE_EMAIL_VERIFICATION_EVIDENCE_V1"
        );

        expect(
          HBCE_EMAIL_OTP_V2_TTL_SECONDS
        ).toBe(
          600
        );
      }
    );

    it(
      "normalizes email deterministically but accepts only canonical normalized input for v2",
      () => {
        expect(
          normalizeEmailForOtpV2(
            " Test@Example.COM "
          )
        ).toBe(
          "test@example.com"
        );

        expect(
          isValidEmailForOtpV2(
            "test@example.com"
          )
        ).toBe(
          true
        );

        expect(
          isValidEmailForOtpV2(
            " Test@Example.COM "
          )
        ).toBe(
          false
        );
      }
    );

    it(
      "derives one deterministic six-digit code from exact session-bound challenge context",
      () => {
        const first =
          deriveEmailOtpV2Code(
            context(),
            SECRET
          );

        const second =
          deriveEmailOtpV2Code(
            context(),
            SECRET
          );

        expect(
          first
        ).toMatch(
          /^\d{6}$/
        );

        expect(
          second
        ).toBe(
          first
        );

        expect(
          first
        ).toBe(
          "250059"
        );
      }
    );

    it(
      "rejects cross-session replay",
      () => {
        const original =
          context();

        const replay =
          context({
            sessionId:
              "session_started_002"
          });

        const code =
          deriveEmailOtpV2Code(
            original,
            SECRET
          );

        expect(
          verifyEmailOtpV2Code(
            original,
            code,
            SECRET
          )
        ).toBe(
          true
        );

        expect(
          verifyEmailOtpV2Code(
            replay,
            code,
            SECRET
          )
        ).toBe(
          false
        );
      }
    );

    it(
      "rejects cross-email replay",
      () => {
        const original =
          context();

        const replay =
          context({
            normalizedEmail:
              "other@example.com"
          });

        const code =
          deriveEmailOtpV2Code(
            original,
            SECRET
          );

        expect(
          verifyEmailOtpV2Code(
            replay,
            code,
            SECRET
          )
        ).toBe(
          false
        );
      }
    );

    it(
      "rejects cross-challenge replay",
      () => {
        const original =
          context();

        const replay =
          context({
            challengeNonce:
              NONCE_B
          });

        const code =
          deriveEmailOtpV2Code(
            original,
            SECRET
          );

        expect(
          verifyEmailOtpV2Code(
            replay,
            code,
            SECRET
          )
        ).toBe(
          false
        );
      }
    );

    it(
      "rejects malformed codes and invalid challenge policy",
      () => {
        expect(
          verifyEmailOtpV2Code(
            context(),
            "12345",
            SECRET
          )
        ).toBe(
          false
        );

        expect(
          () =>
            deriveEmailOtpV2Code(
              context({
                expiresAtEpochSeconds:
                  ISSUED_AT + 601
              }),
              SECRET
            )
        ).toThrowError(
          OnboardingEmailOtpV2Error
        );

        expect(
          () =>
            deriveEmailOtpV2Code(
              context({
                challengeNonce:
                  "not-32-byte-base64url"
              }),
              SECRET
            )
        ).toThrowError(
          OnboardingEmailOtpV2Error
        );
      }
    );

    it(
      "requires an explicit sufficiently long server secret",
      () => {
        expect(
          readEmailOtpV2Secret({
            HBCE_OTP_SECRET:
              SECRET
          })
        ).toBe(
          SECRET
        );

        expect(
          () =>
            readEmailOtpV2Secret(
              {}
            )
        ).toThrowError(
          OnboardingEmailOtpV2Error
        );

        expect(
          () =>
            readEmailOtpV2Secret({
              HBCE_OTP_SECRET:
                "too-short"
            })
        ).toThrowError(
          OnboardingEmailOtpV2Error
        );
      }
    );

    it(
      "forces dev echo off in production and does not create a verification bypass",
      () => {
        expect(
          isEmailOtpV2DevEchoEnabled({
            NODE_ENV:
              "development",
            HBCE_OTP_DEV_ECHO:
              "true"
          })
        ).toBe(
          true
        );

        expect(
          isEmailOtpV2DevEchoEnabled({
            NODE_ENV:
              "production",
            HBCE_OTP_DEV_ECHO:
              "true"
          })
        ).toBe(
          false
        );

        const exactCode =
          deriveEmailOtpV2Code(
            context(),
            SECRET
          );

        expect(
          verifyEmailOtpV2Code(
            context(),
            exactCode,
            SECRET
          )
        ).toBe(
          true
        );

        expect(
          verifyEmailOtpV2Code(
            context(),
            "123456",
            SECRET
          )
        ).toBe(
          false
        );
      }
    );

    it(
      "computes minimized deterministic lower-hex verification evidence",
      () => {
        const first =
          computeEmailVerificationEvidenceSha256({
            sessionId:
              "session_started_001",

            normalizedEmail:
              "test@example.com",

            challengeToken:
              "signed.challenge.token",

            verifiedAtIso:
              "2026-09-05T10:00:00.000Z"
          });

        const second =
          computeEmailVerificationEvidenceSha256({
            sessionId:
              "session_started_001",

            normalizedEmail:
              "test@example.com",

            challengeToken:
              "signed.challenge.token",

            verifiedAtIso:
              "2026-09-05T10:00:00.000Z"
          });

        const different =
          computeEmailVerificationEvidenceSha256({
            sessionId:
              "session_started_001",

            normalizedEmail:
              "test@example.com",

            challengeToken:
              "different.challenge.token",

            verifiedAtIso:
              "2026-09-05T10:00:00.000Z"
          });

        expect(
          first
        ).toMatch(
          /^[0-9a-f]{64}$/
        );

        expect(
          second
        ).toBe(
          first
        );

        expect(
          different
        ).not.toBe(
          first
        );
      }
    );
  }
);
