import {
  describe,
  expect,
  it
} from "vitest";

import {
  HBCE_APP_ORIGIN_ENV_NAME,
  OnboardingOriginPolicyError,
  validateHbceAppOrigin,
  validateStateChangingRequestOrigin
} from "../lib/server/onboarding-origin-policy";

const ORIGIN =
  "https://hbce-ipr-onboarding-app.vercel.app";

describe(
  "onboarding Origin policy",
  () => {
    it(
      "freezes the server-only environment key",
      () => {
        expect(
          HBCE_APP_ORIGIN_ENV_NAME
        ).toBe(
          "HBCE_APP_ORIGIN"
        );
      }
    );

    it(
      "accepts a canonical absolute HTTPS origin",
      () => {
        expect(
          validateHbceAppOrigin(
            ORIGIN
          )
        ).toBe(
          ORIGIN
        );

        expect(
          validateStateChangingRequestOrigin(
            ORIGIN,
            ORIGIN
          )
        ).toBe(
          ORIGIN
        );
      }
    );

    it.each([
      undefined,
      "",
      " ",
      "http://example.com",
      "https://example.com/",
      "https://example.com/path",
      "https://example.com?x=1",
      "https://example.com#fragment",
      "https://user@example.com",
      "https://*.example.com"
    ])(
      "fails closed on invalid expected origin %j",
      (value) => {
        expect(
          () =>
            validateHbceAppOrigin(
              value
            )
        ).toThrow(
          OnboardingOriginPolicyError
        );

        try {
          validateHbceAppOrigin(
            value
          );
        } catch (error) {
          expect(error).toMatchObject({
            code:
              "DEPENDENCY_FAILURE"
          });
        }
      }
    );

    it(
      "forbids a missing request Origin",
      () => {
        expect(
          () =>
            validateStateChangingRequestOrigin(
              null,
              ORIGIN
            )
        ).toThrow(
          OnboardingOriginPolicyError
        );

        try {
          validateStateChangingRequestOrigin(
            null,
            ORIGIN
          );
        } catch (error) {
          expect(error).toMatchObject({
            code: "FORBIDDEN"
          });
        }
      }
    );

    it(
      "forbids an Origin mismatch without host or referer fallback",
      () => {
        try {
          validateStateChangingRequestOrigin(
            "https://evil.example",
            ORIGIN
          );
          throw new Error(
            "Expected origin validation to fail."
          );
        } catch (error) {
          expect(error).toMatchObject({
            code: "FORBIDDEN"
          });
        }
      }
    );
  }
);
