import {
  createHash,
  createHmac
} from "node:crypto";

import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";

import {
  HBCE_PHONE_CHALLENGE_USAGE_KEY_DOMAIN,
  HBCE_PHONE_RATE_LIMIT_KEY_DOMAIN,
  HBCE_PHONE_RATE_LIMIT_SECRET_ENV,
  HBCE_PHONE_RATE_LIMIT_SECRET_MIN_LENGTH,
  HBCE_PHONE_RATE_LIMIT_SESSION_KEY_DOMAIN,
  OnboardingPhoneAbuseControlError,
  PHONE_ABUSE_CONTROL_PURE_DESIGN_SHA256,
  PHONE_ABUSE_CONTROL_WINDOW_SECONDS,
  PHONE_SEND_PHONE_LIMIT,
  PHONE_SEND_SESSION_LIMIT,
  PHONE_VERIFY_CHALLENGE_LIMIT,
  PHONE_VERIFY_SESSION_LIMIT,
  derivePhoneChallengeUsageKey,
  derivePhoneRateLimitPhoneKey,
  derivePhoneRateLimitSessionKey,
  isPhoneAbuseControlDigest,
  readPhoneRateLimitSecret
} from "../lib/server/onboarding-phone-abuse-control";

const SECRET =
  "0123456789abcdef0123456789abcdef";

const PHONE =
  "+393515724982";

const SESSION_ID =
  "session_started_phone_001";

const CHALLENGE_TOKEN =
  "AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI.1788602400.1788603000.mock-mac";

const EXPECTED_PHONE_KEY =
  "7e38a3be6faea4d0375362e9580fc36f91f004c816b1d93b485b2f7056e19ee3";

const EXPECTED_SESSION_KEY =
  "4017bb30cb5742c69a042c42a7862c88e75160d8172c4fcf43da630bb03ad7e9";

const EXPECTED_CHALLENGE_KEY =
  "82a8ad970dc5412d7e8cdb2269bd4089930b27d375eefe4528d255416fbbc79b";

const mutableEnv =
  process.env as Record<
    string,
    string | undefined
  >;

const ORIGINAL_RATE_LIMIT_SECRET =
  process.env.HBCE_PHONE_RATE_LIMIT_SECRET;

const ORIGINAL_OTP_SECRET =
  process.env.HBCE_OTP_SECRET;

function restoreEnv(
  name: string,
  value: string | undefined
): void {
  if (value === undefined) {
    delete mutableEnv[name];
    return;
  }

  mutableEnv[name] = value;
}

afterEach(() => {
  restoreEnv(
    "HBCE_PHONE_RATE_LIMIT_SECRET",
    ORIGINAL_RATE_LIMIT_SECRET
  );

  restoreEnv(
    "HBCE_OTP_SECRET",
    ORIGINAL_OTP_SECRET
  );
});

describe(
  "onboarding PHONE abuse-control pure primitive",
  () => {
    it(
      "freezes the canonical design, domains and policy constants",
      () => {
        expect(
          PHONE_ABUSE_CONTROL_PURE_DESIGN_SHA256
        ).toBe(
          "ddac743e2e01fb46d223f48372bce543e91b60dba87f9770e1efd6c77fe70ae9"
        );

        expect(
          HBCE_PHONE_RATE_LIMIT_KEY_DOMAIN
        ).toBe(
          "HBCE_PHONE_RATE_LIMIT_KEY_V1"
        );

        expect(
          HBCE_PHONE_RATE_LIMIT_SESSION_KEY_DOMAIN
        ).toBe(
          "HBCE_PHONE_RATE_LIMIT_SESSION_KEY_V1"
        );

        expect(
          HBCE_PHONE_CHALLENGE_USAGE_KEY_DOMAIN
        ).toBe(
          "HBCE_PHONE_CHALLENGE_USAGE_KEY_V1"
        );

        expect(
          HBCE_PHONE_RATE_LIMIT_SECRET_ENV
        ).toBe(
          "HBCE_PHONE_RATE_LIMIT_SECRET"
        );

        expect(
          HBCE_PHONE_RATE_LIMIT_SECRET_MIN_LENGTH
        ).toBe(32);

        expect(
          PHONE_ABUSE_CONTROL_WINDOW_SECONDS
        ).toBe(600);

        expect(
          PHONE_SEND_SESSION_LIMIT
        ).toBe(3);

        expect(
          PHONE_SEND_PHONE_LIMIT
        ).toBe(3);

        expect(
          PHONE_VERIFY_SESSION_LIMIT
        ).toBe(10);

        expect(
          PHONE_VERIFY_CHALLENGE_LIMIT
        ).toBe(5);
      }
    );

    it(
      "matches all three frozen deterministic digest vectors",
      () => {
        expect(
          derivePhoneRateLimitPhoneKey(
            PHONE,
            SECRET
          )
        ).toBe(
          EXPECTED_PHONE_KEY
        );

        expect(
          derivePhoneRateLimitSessionKey(
            SESSION_ID
          )
        ).toBe(
          EXPECTED_SESSION_KEY
        );

        expect(
          derivePhoneChallengeUsageKey(
            CHALLENGE_TOKEN
          )
        ).toBe(
          EXPECTED_CHALLENGE_KEY
        );
      }
    );

    it(
      "uses exact domain-first LF-separated UTF-8 preimages",
      () => {
        const expectedPhone =
          createHmac(
            "sha256",
            SECRET
          )
            .update(
              [
                HBCE_PHONE_RATE_LIMIT_KEY_DOMAIN,
                PHONE
              ].join("\n"),
              "utf8"
            )
            .digest("hex");

        const expectedSession =
          createHash("sha256")
            .update(
              [
                HBCE_PHONE_RATE_LIMIT_SESSION_KEY_DOMAIN,
                SESSION_ID
              ].join("\n"),
              "utf8"
            )
            .digest("hex");

        const expectedChallenge =
          createHash("sha256")
            .update(
              [
                HBCE_PHONE_CHALLENGE_USAGE_KEY_DOMAIN,
                CHALLENGE_TOKEN
              ].join("\n"),
              "utf8"
            )
            .digest("hex");

        expect(
          derivePhoneRateLimitPhoneKey(
            PHONE,
            SECRET
          )
        ).toBe(
          expectedPhone
        );

        expect(
          derivePhoneRateLimitSessionKey(
            SESSION_ID
          )
        ).toBe(
          expectedSession
        );

        expect(
          derivePhoneChallengeUsageKey(
            CHALLENGE_TOKEN
          )
        ).toBe(
          expectedChallenge
        );
      }
    );

    it(
      "binds every digest to its exact domain and exact input",
      () => {
        expect(
          derivePhoneRateLimitPhoneKey(
            "+393515724983",
            SECRET
          )
        ).not.toBe(
          EXPECTED_PHONE_KEY
        );

        expect(
          derivePhoneRateLimitSessionKey(
            "session_started_phone_002"
          )
        ).not.toBe(
          EXPECTED_SESSION_KEY
        );

        expect(
          derivePhoneChallengeUsageKey(
            `${CHALLENGE_TOKEN}x`
          )
        ).not.toBe(
          EXPECTED_CHALLENGE_KEY
        );

        const wrongPhoneDomain =
          createHmac(
            "sha256",
            SECRET
          )
            .update(
              [
                "WRONG_DOMAIN",
                PHONE
              ].join("\n"),
              "utf8"
            )
            .digest("hex");

        expect(
          derivePhoneRateLimitPhoneKey(
            PHONE,
            SECRET
          )
        ).not.toBe(
          wrongPhoneDomain
        );
      }
    );

    it(
      "returns only canonical lowercase SHA-256 hexadecimal digests",
      () => {
        const values = [
          derivePhoneRateLimitPhoneKey(
            PHONE,
            SECRET
          ),
          derivePhoneRateLimitSessionKey(
            SESSION_ID
          ),
          derivePhoneChallengeUsageKey(
            CHALLENGE_TOKEN
          )
        ];

        for (const value of values) {
          expect(value).toMatch(
            /^[0-9a-f]{64}$/
          );

          expect(
            isPhoneAbuseControlDigest(
              value
            )
          ).toBe(true);
        }

        expect(
          isPhoneAbuseControlDigest(
            EXPECTED_PHONE_KEY.toUpperCase()
          )
        ).toBe(false);

        expect(
          isPhoneAbuseControlDigest(
            "not-a-digest"
          )
        ).toBe(false);
      }
    );

    it(
      "requires PHONE input to already be canonical E.164",
      () => {
        expect(() =>
          derivePhoneRateLimitPhoneKey(
            " +393515724982",
            SECRET
          )
        ).toThrow(
          OnboardingPhoneAbuseControlError
        );

        expect(() =>
          derivePhoneRateLimitPhoneKey(
            "+39 3515724982",
            SECRET
          )
        ).toThrow(
          OnboardingPhoneAbuseControlError
        );

        expect(() =>
          derivePhoneRateLimitPhoneKey(
            "393515724982",
            SECRET
          )
        ).toThrow(
          OnboardingPhoneAbuseControlError
        );

        expect(() =>
          derivePhoneRateLimitPhoneKey(
            "+0123456789",
            SECRET
          )
        ).toThrow(
          OnboardingPhoneAbuseControlError
        );
      }
    );

    it(
      "rejects noncanonical session and challenge scalar inputs",
      () => {
        expect(() =>
          derivePhoneRateLimitSessionKey(
            " session_started_phone_001"
          )
        ).toThrow(
          OnboardingPhoneAbuseControlError
        );

        expect(() =>
          derivePhoneRateLimitSessionKey(
            ""
          )
        ).toThrow(
          OnboardingPhoneAbuseControlError
        );

        expect(() =>
          derivePhoneChallengeUsageKey(
            `${CHALLENGE_TOKEN}\0x`
          )
        ).toThrow(
          OnboardingPhoneAbuseControlError
        );

        expect(() =>
          derivePhoneChallengeUsageKey(
            " "
          )
        ).toThrow(
          OnboardingPhoneAbuseControlError
        );
      }
    );

    it(
      "reads only the dedicated PHONE rate-limit secret and trims it",
      () => {
        mutableEnv.HBCE_PHONE_RATE_LIMIT_SECRET =
          `  ${SECRET}  `;

        mutableEnv.HBCE_OTP_SECRET =
          "different-otp-secret-012345678901234567890";

        expect(
          readPhoneRateLimitSecret()
        ).toBe(
          SECRET
        );

        expect(
          derivePhoneRateLimitPhoneKey(
            PHONE
          )
        ).toBe(
          EXPECTED_PHONE_KEY
        );
      }
    );

    it(
      "fails closed when the dedicated secret is missing even if OTP secret exists",
      () => {
        delete mutableEnv.HBCE_PHONE_RATE_LIMIT_SECRET;

        mutableEnv.HBCE_OTP_SECRET =
          "0123456789abcdef0123456789abcdef";

        try {
          readPhoneRateLimitSecret();

          throw new Error(
            "Expected dedicated secret failure."
          );
        } catch (error) {
          expect(
            error
          ).toBeInstanceOf(
            OnboardingPhoneAbuseControlError
          );

          expect(
            (
              error as
                OnboardingPhoneAbuseControlError
            ).code
          ).toBe(
            "PHONE_RATE_LIMIT_SECRET_MISSING"
          );
        }

        expect(() =>
          derivePhoneRateLimitPhoneKey(
            PHONE
          )
        ).toThrow(
          OnboardingPhoneAbuseControlError
        );
      }
    );

    it(
      "fails closed on an explicitly configured short secret without OTP fallback",
      () => {
        mutableEnv.HBCE_PHONE_RATE_LIMIT_SECRET =
          "too-short";

        mutableEnv.HBCE_OTP_SECRET =
          "0123456789abcdef0123456789abcdef";

        try {
          readPhoneRateLimitSecret();

          throw new Error(
            "Expected short secret failure."
          );
        } catch (error) {
          expect(
            error
          ).toBeInstanceOf(
            OnboardingPhoneAbuseControlError
          );

          expect(
            (
              error as
                OnboardingPhoneAbuseControlError
            ).code
          ).toBe(
            "PHONE_RATE_LIMIT_SECRET_INVALID"
          );
        }
      }
    );

    it(
      "rejects an injected short secret deterministically",
      () => {
        try {
          derivePhoneRateLimitPhoneKey(
            PHONE,
            "short"
          );

          throw new Error(
            "Expected injected secret failure."
          );
        } catch (error) {
          expect(
            error
          ).toBeInstanceOf(
            OnboardingPhoneAbuseControlError
          );

          expect(
            (
              error as
                OnboardingPhoneAbuseControlError
            ).code
          ).toBe(
            "PHONE_RATE_LIMIT_SECRET_INVALID"
          );
        }
      }
    );
  }
);
