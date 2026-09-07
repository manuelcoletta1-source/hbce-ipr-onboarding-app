import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";

import {
  HBCE_PHONE_OTP_V2_CODE_DOMAIN,
  HBCE_PHONE_OTP_V2_TTL_SECONDS,
  HBCE_PHONE_VERIFICATION_EVIDENCE_DOMAIN,
  OnboardingPhoneOtpV2Error,
  computePhoneVerificationEvidenceSha256,
  derivePhoneOtpV2Code,
  isPhoneOtpV2DevEchoEnabled,
  isValidPhoneForOtpV2,
  normalizePhoneForOtpV2,
  readPhoneOtpV2Secret,
  verifyPhoneOtpV2Code
} from "../lib/server/onboarding-phone-otp-v2";

const SECRET =
  "0123456789abcdefghijklmnopqrstuv";

const FALLBACK_SECRET =
  "fallback-0123456789abcdefghijklmnop";

const CONTEXT = {
  sessionId: "session_started_001",
  normalizedPhone: "+393515724982",
  challengeNonce:
    "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8",
  issuedAtEpochSeconds: 1788537600,
  expiresAtEpochSeconds: 1788538200
};

const CHALLENGE_TOKEN =
  "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8.1788537600.1788538200.IZg0Dk3ujto6T-6X8ykPPx39TS5jVeAeEZu-i2r3q-M";

const mutableEnv =
  process.env as Record<string, string | undefined>;

const ORIGINAL_NODE_ENV =
  process.env.NODE_ENV;

const ORIGINAL_PHONE_SECRET =
  process.env.HBCE_PHONE_OTP_SECRET;

const ORIGINAL_FALLBACK_SECRET =
  process.env.HBCE_OTP_SECRET;

const ORIGINAL_DEV_ECHO =
  process.env.HBCE_OTP_DEV_ECHO;

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
  restoreEnv("NODE_ENV", ORIGINAL_NODE_ENV);

  restoreEnv(
    "HBCE_PHONE_OTP_SECRET",
    ORIGINAL_PHONE_SECRET
  );

  restoreEnv(
    "HBCE_OTP_SECRET",
    ORIGINAL_FALLBACK_SECRET
  );

  restoreEnv(
    "HBCE_OTP_DEV_ECHO",
    ORIGINAL_DEV_ECHO
  );
});

describe("onboarding phone OTP v2", () => {
  it("freezes the canonical domains and TTL", () => {
    expect(
      HBCE_PHONE_OTP_V2_CODE_DOMAIN
    ).toBe("HBCE_PHONE_OTP_CODE_V2");

    expect(
      HBCE_PHONE_VERIFICATION_EVIDENCE_DOMAIN
    ).toBe(
      "HBCE_PHONE_VERIFICATION_EVIDENCE_V1"
    );

    expect(
      HBCE_PHONE_OTP_V2_TTL_SECONDS
    ).toBe(600);
  });

  it("normalizes whitespace and validates canonical E.164", () => {
    expect(
      normalizePhoneForOtpV2(
        "  +39 351 572 4982  "
      )
    ).toBe("+393515724982");

    expect(
      isValidPhoneForOtpV2("+393515724982")
    ).toBe(true);

    expect(
      isValidPhoneForOtpV2("393515724982")
    ).toBe(false);

    expect(
      isValidPhoneForOtpV2("+00393515724982")
    ).toBe(false);

    expect(
      isValidPhoneForOtpV2("+39 3515724982")
    ).toBe(false);
  });

  it("matches the frozen deterministic OTP vector", () => {
    const code = derivePhoneOtpV2Code(
      CONTEXT,
      SECRET
    );

    expect(code).toBe("972025");
    expect(code).toMatch(/^\d{6}$/);
  });

  it("binds the OTP to session, phone, nonce and time window", () => {
    const baseline =
      derivePhoneOtpV2Code(CONTEXT, SECRET);

    const differentSession =
      derivePhoneOtpV2Code(
        {
          ...CONTEXT,
          sessionId: "session_started_002"
        },
        SECRET
      );

    const differentPhone =
      derivePhoneOtpV2Code(
        {
          ...CONTEXT,
          normalizedPhone: "+393515724983"
        },
        SECRET
      );

    const differentNonce =
      derivePhoneOtpV2Code(
        {
          ...CONTEXT,
          challengeNonce:
            "BAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8"
        },
        SECRET
      );

    const differentTimeWindow =
      derivePhoneOtpV2Code(
        {
          ...CONTEXT,
          issuedAtEpochSeconds: 1788537601,
          expiresAtEpochSeconds: 1788538201
        },
        SECRET
      );

    expect(differentSession).not.toBe(baseline);
    expect(differentPhone).not.toBe(baseline);
    expect(differentNonce).not.toBe(baseline);
    expect(differentTimeWindow).not.toBe(baseline);
  });

  it("verifies the exact six-digit OTP only", () => {
    expect(
      verifyPhoneOtpV2Code(
        CONTEXT,
        "972025",
        SECRET
      )
    ).toBe(true);

    expect(
      verifyPhoneOtpV2Code(
        CONTEXT,
        "972026",
        SECRET
      )
    ).toBe(false);

    expect(
      verifyPhoneOtpV2Code(
        CONTEXT,
        "9720250",
        SECRET
      )
    ).toBe(false);

    expect(
      verifyPhoneOtpV2Code(
        CONTEXT,
        "97202",
        SECRET
      )
    ).toBe(false);
  });

  it("fails closed on a noncanonical or invalid challenge context", () => {
    expect(() =>
      derivePhoneOtpV2Code(
        {
          ...CONTEXT,
          normalizedPhone:
            "+39 3515724982"
        },
        SECRET
      )
    ).toThrow(OnboardingPhoneOtpV2Error);

    expect(() =>
      derivePhoneOtpV2Code(
        {
          ...CONTEXT,
          expiresAtEpochSeconds:
            CONTEXT.issuedAtEpochSeconds
        },
        SECRET
      )
    ).toThrow(OnboardingPhoneOtpV2Error);
  });

  it("prefers the explicit phone OTP secret", () => {
    mutableEnv.HBCE_PHONE_OTP_SECRET =
      SECRET;

    mutableEnv.HBCE_OTP_SECRET =
      FALLBACK_SECRET;

    expect(readPhoneOtpV2Secret()).toBe(
      SECRET
    );
  });

  it("fails closed when the explicit phone secret is invalid", () => {
    mutableEnv.HBCE_PHONE_OTP_SECRET =
      "too-short";

    mutableEnv.HBCE_OTP_SECRET =
      FALLBACK_SECRET;

    expect(() =>
      readPhoneOtpV2Secret()
    ).toThrow(OnboardingPhoneOtpV2Error);
  });

  it("falls back to HBCE_OTP_SECRET only when the phone secret is absent", () => {
    delete mutableEnv.HBCE_PHONE_OTP_SECRET;

    mutableEnv.HBCE_OTP_SECRET =
      SECRET;

    expect(readPhoneOtpV2Secret()).toBe(
      SECRET
    );
  });

  it("enables dev echo only outside production with an explicit true flag", () => {
    mutableEnv.NODE_ENV = "test";
    mutableEnv.HBCE_OTP_DEV_ECHO = "true";

    expect(
      isPhoneOtpV2DevEchoEnabled()
    ).toBe(true);

    mutableEnv.NODE_ENV = "production";

    expect(
      isPhoneOtpV2DevEchoEnabled()
    ).toBe(false);

    mutableEnv.NODE_ENV = "development";
    mutableEnv.HBCE_OTP_DEV_ECHO = "false";

    expect(
      isPhoneOtpV2DevEchoEnabled()
    ).toBe(false);
  });

  it("matches the frozen verification evidence SHA-256 vector", () => {
    const digest =
      computePhoneVerificationEvidenceSha256({
        sessionId: "session_started_001",
        normalizedPhone: "+393515724982",
        challengeToken: CHALLENGE_TOKEN,
        verifiedAtIso:
          "2026-09-05T15:30:00.000Z"
      });

    expect(digest).toBe(
      "91225b6b9d9ac0505ee89a5120e9e03462ebe2dcab1822e0fac2df26870fac6d"
    );

    expect(digest).toMatch(/^[a-f0-9]{64}$/);
  });
});
