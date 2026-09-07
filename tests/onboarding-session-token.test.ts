import { createHash } from "node:crypto";

import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  ONBOARDING_SESSION_TOKEN_BYTES,
  ONBOARDING_SESSION_TOKEN_ENTROPY_BITS,
  ONBOARDING_SESSION_TOKEN_SHA256_HEX_LENGTH,
  OnboardingSessionTokenError,
  generateOnboardingSessionToken,
  sha256OnboardingSessionToken
} from "../lib/server/onboarding-session-token";

describe("onboarding opaque session token primitives", () => {
  it("freezes the 256-bit token policy", () => {
    expect(
      ONBOARDING_SESSION_TOKEN_BYTES
    ).toBe(32);

    expect(
      ONBOARDING_SESSION_TOKEN_ENTROPY_BITS
    ).toBe(256);

    expect(
      ONBOARDING_SESSION_TOKEN_SHA256_HEX_LENGTH
    ).toBe(64);
  });

  it("generates exactly 32 random bytes and exposes an opaque base64url token", () => {
    const bytes = Uint8Array.from(
      { length: 32 },
      (_, index) => index
    );

    const randomSource = vi.fn(
      () => bytes
    );

    const result =
      generateOnboardingSessionToken(
        randomSource
      );

    expect(randomSource).toHaveBeenCalledWith(
      32
    );

    expect(result.rawToken).toBe(
      Buffer.from(bytes).toString("base64url")
    );

    expect(result.rawToken).not.toContain(
      "="
    );

    expect(result.tokenSha256).toHaveLength(
      64
    );
  });

  it("computes the digest from the exact opaque token bytes", () => {
    const rawToken =
      "opaque-session-token_example-001";

    const expected = createHash("sha256")
      .update(rawToken, "utf8")
      .digest("hex");

    expect(
      sha256OnboardingSessionToken(rawToken)
    ).toBe(expected);
  });

  it("returns only lowercase hexadecimal SHA-256", () => {
    const digest =
      sha256OnboardingSessionToken(
        "opaque-token"
      );

    expect(digest).toMatch(
      /^[0-9a-f]{64}$/
    );
  });

  it("rejects an empty opaque token", () => {
    expect(() =>
      sha256OnboardingSessionToken("   ")
    ).toThrow(OnboardingSessionTokenError);
  });

  it("fails closed if the random source does not return exactly 32 bytes", () => {
    expect(() =>
      generateOnboardingSessionToken(
        () => new Uint8Array(31)
      )
    ).toThrow(OnboardingSessionTokenError);

    expect(() =>
      generateOnboardingSessionToken(
        () => new Uint8Array(33)
      )
    ).toThrow(OnboardingSessionTokenError);
  });
});
