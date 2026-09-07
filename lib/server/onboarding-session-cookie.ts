import "server-only";

export const ONBOARDING_SESSION_COOKIE_NAME =
  "__Host-hbce-onboarding-session" as const;

export const ONBOARDING_SESSION_COOKIE_MAX_AGE_SECONDS =
  28800 as const;

export const ONBOARDING_SESSION_COOKIE_TOKEN_LENGTH =
  43 as const;

export type OnboardingSessionCookieOptions = {
  readonly httpOnly: true;
  readonly secure: true;
  readonly sameSite: "strict";
  readonly path: "/";
  readonly maxAge: 28800;
};

export type OnboardingSessionCookieDescriptor = {
  readonly name:
    typeof ONBOARDING_SESSION_COOKIE_NAME;
  readonly value: string;
  readonly options:
    OnboardingSessionCookieOptions;
};

export class OnboardingSessionCookieError
  extends Error
{
  constructor(message: string) {
    super(message);
    this.name =
      "OnboardingSessionCookieError";
  }
}

export const ONBOARDING_SESSION_COOKIE_OPTIONS:
  OnboardingSessionCookieOptions =
    Object.freeze({
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge:
        ONBOARDING_SESSION_COOKIE_MAX_AGE_SECONDS
    });

const TOKEN_PATTERN =
  /^[A-Za-z0-9_-]{43}$/;

export function isValidOnboardingSessionCookieToken(
  value: unknown
): value is string {
  if (
    typeof value !== "string" ||
    !TOKEN_PATTERN.test(value)
  ) {
    return false;
  }

  try {
    const decoded =
      Buffer.from(
        value,
        "base64url"
      );

    return (
      decoded.byteLength === 32 &&
      decoded.toString("base64url") === value
    );
  } catch {
    return false;
  }
}

export function createOnboardingSessionCookieDescriptor(
  rawToken: string
): OnboardingSessionCookieDescriptor {
  if (
    !isValidOnboardingSessionCookieToken(
      rawToken
    )
  ) {
    throw new OnboardingSessionCookieError(
      "Onboarding session token has an invalid opaque cookie format."
    );
  }

  return {
    name:
      ONBOARDING_SESSION_COOKIE_NAME,
    value: rawToken,
    options:
      ONBOARDING_SESSION_COOKIE_OPTIONS
  };
}
