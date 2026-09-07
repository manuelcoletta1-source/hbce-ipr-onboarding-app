import {
  describe,
  expect,
  it
} from "vitest";

import {
  ONBOARDING_SESSION_COOKIE_MAX_AGE_SECONDS,
  ONBOARDING_SESSION_COOKIE_NAME,
  ONBOARDING_SESSION_COOKIE_OPTIONS,
  ONBOARDING_SESSION_COOKIE_TOKEN_LENGTH,
  OnboardingSessionCookieError,
  createOnboardingSessionCookieDescriptor,
  isValidOnboardingSessionCookieToken
} from "../lib/server/onboarding-session-cookie";

import {
  ONBOARDING_SESSION_ABSOLUTE_TTL_SECONDS
} from "../lib/server/neon-onboarding-session-repository";

function rawToken(): string {
  return Buffer.alloc(
    32,
    7
  ).toString(
    "base64url"
  );
}

describe(
  "onboarding session cookie contract",
  () => {
    it(
      "freezes the __Host- cookie contract",
      () => {
        expect(
          ONBOARDING_SESSION_COOKIE_NAME
        ).toBe(
          "__Host-hbce-onboarding-session"
        );

        expect(
          ONBOARDING_SESSION_COOKIE_MAX_AGE_SECONDS
        ).toBe(28800);

        expect(
          ONBOARDING_SESSION_COOKIE_MAX_AGE_SECONDS
        ).toBe(
          ONBOARDING_SESSION_ABSOLUTE_TTL_SECONDS
        );

        expect(
          ONBOARDING_SESSION_COOKIE_TOKEN_LENGTH
        ).toBe(43);

        expect(
          ONBOARDING_SESSION_COOKIE_OPTIONS
        ).toEqual({
          httpOnly: true,
          secure: true,
          sameSite: "strict",
          path: "/",
          maxAge: 28800
        });

        expect(
          "domain" in
            ONBOARDING_SESSION_COOKIE_OPTIONS
        ).toBe(false);

        expect(
          "expires" in
            ONBOARDING_SESSION_COOKIE_OPTIONS
        ).toBe(false);
      }
    );

    it(
      "accepts the canonical 256-bit base64url token",
      () => {
        const token =
          rawToken();

        expect(
          token
        ).toHaveLength(43);

        expect(
          isValidOnboardingSessionCookieToken(
            token
          )
        ).toBe(true);
      }
    );

    it(
      "returns a pure descriptor without issuing a cookie",
      () => {
        const token =
          rawToken();

        expect(
          createOnboardingSessionCookieDescriptor(
            token
          )
        ).toEqual({
          name:
            "__Host-hbce-onboarding-session",
          value: token,
          options: {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            path: "/",
            maxAge: 28800
          }
        });
      }
    );

    it.each([
      "",
      " ",
      "abc",
      "A".repeat(42),
      "A".repeat(44),
      "+".repeat(43),
      "/".repeat(43),
      "=".repeat(43)
    ])(
      "rejects malformed token %j",
      (value) => {
        expect(
          isValidOnboardingSessionCookieToken(
            value
          )
        ).toBe(false);

        expect(
          () =>
            createOnboardingSessionCookieDescriptor(
              value
            )
        ).toThrow(
          OnboardingSessionCookieError
        );
      }
    );
  }
);
