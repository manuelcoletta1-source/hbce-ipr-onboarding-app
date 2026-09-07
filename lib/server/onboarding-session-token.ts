import "server-only";

import {
  createHash,
  randomBytes
} from "node:crypto";

export const ONBOARDING_SESSION_TOKEN_BYTES = 32 as const;
export const ONBOARDING_SESSION_TOKEN_ENTROPY_BITS = 256 as const;
export const ONBOARDING_SESSION_TOKEN_SHA256_HEX_LENGTH = 64 as const;

export type OnboardingSessionRandomBytesSource = (
  size: number
) => Uint8Array;

export type GeneratedOnboardingSessionToken = {
  readonly rawToken: string;
  readonly tokenSha256: string;
};

export class OnboardingSessionTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OnboardingSessionTokenError";
  }
}

function assertOpaqueToken(value: string): void {
  if (value.length === 0 || value.trim().length === 0) {
    throw new OnboardingSessionTokenError(
      "Opaque onboarding session token must not be empty."
    );
  }
}

export function sha256OnboardingSessionToken(
  rawToken: string
): string {
  assertOpaqueToken(rawToken);

  return createHash("sha256")
    .update(rawToken, "utf8")
    .digest("hex");
}

export function generateOnboardingSessionToken(
  randomSource: OnboardingSessionRandomBytesSource = (
    size
  ) => randomBytes(size)
): GeneratedOnboardingSessionToken {
  const bytes = randomSource(
    ONBOARDING_SESSION_TOKEN_BYTES
  );

  if (bytes.byteLength !== ONBOARDING_SESSION_TOKEN_BYTES) {
    throw new OnboardingSessionTokenError(
      "Onboarding session random source returned an invalid byte length."
    );
  }

  const copiedBytes = new Uint8Array(
    ONBOARDING_SESSION_TOKEN_BYTES
  );

  copiedBytes.set(bytes);

  const rawToken = Buffer.from(
    copiedBytes
  ).toString("base64url");

  return {
    rawToken,
    tokenSha256:
      sha256OnboardingSessionToken(rawToken)
  };
}
