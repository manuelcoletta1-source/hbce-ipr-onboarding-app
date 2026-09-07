import "server-only";

import {
  createHmac,
  randomBytes,
  timingSafeEqual
} from "node:crypto";

export const ONBOARDING_OTP_CHALLENGE_BINDING_VERSION =
  "HBCE_OTP_CHALLENGE_BINDING_V1" as const;

export const ONBOARDING_OTP_CHALLENGE_NONCE_BYTES =
  32 as const;

export const ONBOARDING_OTP_CHALLENGE_TOKEN_PART_LENGTH =
  43 as const;

export const ONBOARDING_OTP_CHALLENGE_TTL_SECONDS =
  600 as const;

export type OnboardingOtpChallengeChannel =
  | "EMAIL"
  | "PHONE";

export type OnboardingOtpChallengeBindingErrorCode =
  | "INVALID_INPUT"
  | "DEPENDENCY_FAILURE"
  | "INVALID_CHALLENGE"
  | "EXPIRED_CHALLENGE";

export class OnboardingOtpChallengeBindingError
  extends Error
{
  readonly code:
    OnboardingOtpChallengeBindingErrorCode;

  constructor(
    code:
      OnboardingOtpChallengeBindingErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "OnboardingOtpChallengeBindingError";

    this.code =
      code;
  }
}

export type OnboardingOtpRandomBytesSource =
  (
    size: number
  ) => Uint8Array;

export type OnboardingOtpChallengeClock =
  () => Date;

export type OnboardingOtpChallengeSecretSource =
  () => string | null | undefined;

export type OnboardingOtpChallengeBindingDependencies = {
  readonly randomBytesSource?:
    OnboardingOtpRandomBytesSource;

  readonly clock?:
    OnboardingOtpChallengeClock;

  readonly secretSource?:
    OnboardingOtpChallengeSecretSource;
};

export type CreateOnboardingOtpChallengeBindingInput = {
  readonly channel:
    OnboardingOtpChallengeChannel;

  readonly sessionId:
    string;

  readonly normalizedContact:
    string;
};

export type CreatedOnboardingOtpChallengeBinding = {
  readonly token:
    string;

  readonly nonce:
    string;

  readonly issuedAtEpochSeconds:
    number;

  readonly expiresAtEpochSeconds:
    number;
};

export type VerifyOnboardingOtpChallengeBindingInput = {
  readonly token:
    string;

  readonly channel:
    OnboardingOtpChallengeChannel;

  readonly sessionId:
    string;

  readonly normalizedContact:
    string;
};

export type VerifiedOnboardingOtpChallengeBinding = {
  readonly nonce:
    string;

  readonly issuedAtEpochSeconds:
    number;

  readonly expiresAtEpochSeconds:
    number;
};

type ParsedChallengeToken = {
  readonly nonce:
    string;

  readonly issuedAtEpochSeconds:
    number;

  readonly expiresAtEpochSeconds:
    number;

  readonly mac:
    string;
};

const BASE64URL_32_BYTE_PATTERN =
  /^[A-Za-z0-9_-]{43}$/;

const EPOCH_SECONDS_PATTERN =
  /^[0-9]{1,16}$/;

function defaultRandomBytesSource(
  size: number
): Uint8Array {
  return randomBytes(
    size
  );
}

function defaultClock(): Date {
  return new Date();
}

function defaultSecretSource():
  string | undefined
{
  return process.env.HBCE_OTP_SECRET;
}

function assertSafeBindingField(
  value: string,
  field: string
): void {
  if (
    value.length === 0 ||
    value !== value.trim() ||
    value.includes("\n") ||
    value.includes("\r") ||
    value.includes("\0")
  ) {
    throw new OnboardingOtpChallengeBindingError(
      "INVALID_INPUT",
      `${field} is invalid.`
    );
  }
}

function assertBindingContext(
  input:
    CreateOnboardingOtpChallengeBindingInput |
    VerifyOnboardingOtpChallengeBindingInput
): void {
  if (
    input.channel !== "EMAIL" &&
    input.channel !== "PHONE"
  ) {
    throw new OnboardingOtpChallengeBindingError(
      "INVALID_INPUT",
      "OTP challenge channel is invalid."
    );
  }

  if (
    typeof input.sessionId !== "string"
  ) {
    throw new OnboardingOtpChallengeBindingError(
      "INVALID_INPUT",
      "sessionId is invalid."
    );
  }

  if (
    typeof input.normalizedContact !==
    "string"
  ) {
    throw new OnboardingOtpChallengeBindingError(
      "INVALID_INPUT",
      "normalizedContact is invalid."
    );
  }

  assertSafeBindingField(
    input.sessionId,
    "sessionId"
  );

  assertSafeBindingField(
    input.normalizedContact,
    "normalizedContact"
  );
}

function getSecret(
  dependencies:
    OnboardingOtpChallengeBindingDependencies
): string {
  const secretSource =
    dependencies.secretSource ??
    defaultSecretSource;

  let value:
    string | null | undefined;

  try {
    value =
      secretSource();
  } catch {
    throw new OnboardingOtpChallengeBindingError(
      "DEPENDENCY_FAILURE",
      "OTP challenge secret source failed."
    );
  }

  if (
    typeof value !== "string" ||
    value.trim().length < 24
  ) {
    throw new OnboardingOtpChallengeBindingError(
      "DEPENDENCY_FAILURE",
      "HBCE_OTP_SECRET is missing or too short."
    );
  }

  return value.trim();
}

function getServerEpochSeconds(
  dependencies:
    OnboardingOtpChallengeBindingDependencies
): number {
  const clock =
    dependencies.clock ??
    defaultClock;

  let value:
    Date;

  try {
    value =
      clock();
  } catch {
    throw new OnboardingOtpChallengeBindingError(
      "DEPENDENCY_FAILURE",
      "OTP challenge server clock failed."
    );
  }

  if (
    !(value instanceof Date) ||
    Number.isNaN(
      value.getTime()
    )
  ) {
    throw new OnboardingOtpChallengeBindingError(
      "DEPENDENCY_FAILURE",
      "OTP challenge server clock returned an invalid time."
    );
  }

  const epochSeconds =
    Math.floor(
      value.getTime() /
      1000
    );

  if (
    !Number.isSafeInteger(
      epochSeconds
    ) ||
    epochSeconds < 0
  ) {
    throw new OnboardingOtpChallengeBindingError(
      "DEPENDENCY_FAILURE",
      "OTP challenge server clock returned an invalid epoch."
    );
  }

  return epochSeconds;
}

function encodeCanonicalBase64Url32(
  bytes:
    Uint8Array
): string {
  if (
    bytes.byteLength !==
    ONBOARDING_OTP_CHALLENGE_NONCE_BYTES
  ) {
    throw new OnboardingOtpChallengeBindingError(
      "DEPENDENCY_FAILURE",
      "OTP challenge randomness returned an invalid byte length."
    );
  }

  const encoded =
    Buffer.from(
      bytes
    ).toString(
      "base64url"
    );

  if (
    encoded.length !==
      ONBOARDING_OTP_CHALLENGE_TOKEN_PART_LENGTH ||
    !BASE64URL_32_BYTE_PATTERN.test(
      encoded
    )
  ) {
    throw new OnboardingOtpChallengeBindingError(
      "DEPENDENCY_FAILURE",
      "OTP challenge randomness could not be encoded canonically."
    );
  }

  return encoded;
}

function isCanonicalBase64Url32(
  value: string
): boolean {
  if (
    !BASE64URL_32_BYTE_PATTERN.test(
      value
    )
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
      decoded.byteLength ===
        ONBOARDING_OTP_CHALLENGE_NONCE_BYTES &&
      decoded.toString(
        "base64url"
      ) === value
    );
  } catch {
    return false;
  }
}

function parseEpochSeconds(
  value: string
): number | null {
  if (
    !EPOCH_SECONDS_PATTERN.test(
      value
    )
  ) {
    return null;
  }

  const parsed =
    Number(
      value
    );

  if (
    !Number.isSafeInteger(
      parsed
    ) ||
    parsed < 0
  ) {
    return null;
  }

  return parsed;
}

function buildMacInput(
  params: {
    readonly channel:
      OnboardingOtpChallengeChannel;

    readonly sessionId:
      string;

    readonly normalizedContact:
      string;

    readonly nonce:
      string;

    readonly issuedAtEpochSeconds:
      number;

    readonly expiresAtEpochSeconds:
      number;
  }
): string {
  return [
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
}

function createMac(
  params: {
    readonly secret:
      string;

    readonly channel:
      OnboardingOtpChallengeChannel;

    readonly sessionId:
      string;

    readonly normalizedContact:
      string;

    readonly nonce:
      string;

    readonly issuedAtEpochSeconds:
      number;

    readonly expiresAtEpochSeconds:
      number;
  }
): string {
  const mac =
    createHmac(
      "sha256",
      params.secret
    )
      .update(
        buildMacInput(
          params
        ),
        "utf8"
      )
      .digest(
        "base64url"
      );

  if (
    !isCanonicalBase64Url32(
      mac
    )
  ) {
    throw new OnboardingOtpChallengeBindingError(
      "DEPENDENCY_FAILURE",
      "OTP challenge MAC encoding failed."
    );
  }

  return mac;
}

function macsEqual(
  left: string,
  right: string
): boolean {
  if (
    !isCanonicalBase64Url32(
      left
    ) ||
    !isCanonicalBase64Url32(
      right
    )
  ) {
    return false;
  }

  const leftBytes =
    Buffer.from(
      left,
      "base64url"
    );

  const rightBytes =
    Buffer.from(
      right,
      "base64url"
    );

  return timingSafeEqual(
    leftBytes,
    rightBytes
  );
}

function parseChallengeToken(
  token: string
): ParsedChallengeToken {
  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token !== token.trim()
  ) {
    throw new OnboardingOtpChallengeBindingError(
      "INVALID_CHALLENGE",
      "OTP challenge token is invalid."
    );
  }

  const parts =
    token.split(
      "."
    );

  if (
    parts.length !== 4
  ) {
    throw new OnboardingOtpChallengeBindingError(
      "INVALID_CHALLENGE",
      "OTP challenge token is invalid."
    );
  }

  const [
    nonce,
    issuedRaw,
    expiresRaw,
    mac
  ] = parts;

  if (
    nonce === undefined ||
    issuedRaw === undefined ||
    expiresRaw === undefined ||
    mac === undefined ||
    !isCanonicalBase64Url32(
      nonce
    ) ||
    !isCanonicalBase64Url32(
      mac
    )
  ) {
    throw new OnboardingOtpChallengeBindingError(
      "INVALID_CHALLENGE",
      "OTP challenge token is invalid."
    );
  }

  const issuedAtEpochSeconds =
    parseEpochSeconds(
      issuedRaw
    );

  const expiresAtEpochSeconds =
    parseEpochSeconds(
      expiresRaw
    );

  if (
    issuedAtEpochSeconds === null ||
    expiresAtEpochSeconds === null ||
    expiresAtEpochSeconds -
      issuedAtEpochSeconds !==
      ONBOARDING_OTP_CHALLENGE_TTL_SECONDS
  ) {
    throw new OnboardingOtpChallengeBindingError(
      "INVALID_CHALLENGE",
      "OTP challenge token is invalid."
    );
  }

  return {
    nonce,
    issuedAtEpochSeconds,
    expiresAtEpochSeconds,
    mac
  };
}

export function createOnboardingOtpChallengeBinding(
  input:
    CreateOnboardingOtpChallengeBindingInput,
  dependencies:
    OnboardingOtpChallengeBindingDependencies = {}
): CreatedOnboardingOtpChallengeBinding {
  assertBindingContext(
    input
  );

  const secret =
    getSecret(
      dependencies
    );

  const issuedAtEpochSeconds =
    getServerEpochSeconds(
      dependencies
    );

  const expiresAtEpochSeconds =
    issuedAtEpochSeconds +
    ONBOARDING_OTP_CHALLENGE_TTL_SECONDS;

  const randomBytesSource =
    dependencies.randomBytesSource ??
    defaultRandomBytesSource;

  let randomValue:
    Uint8Array;

  try {
    randomValue =
      randomBytesSource(
        ONBOARDING_OTP_CHALLENGE_NONCE_BYTES
      );
  } catch {
    throw new OnboardingOtpChallengeBindingError(
      "DEPENDENCY_FAILURE",
      "OTP challenge randomness failed."
    );
  }

  if (
    !(randomValue instanceof Uint8Array)
  ) {
    throw new OnboardingOtpChallengeBindingError(
      "DEPENDENCY_FAILURE",
      "OTP challenge randomness returned an invalid value."
    );
  }

  const nonce =
    encodeCanonicalBase64Url32(
      new Uint8Array(
        randomValue
      )
    );

  const mac =
    createMac({
      secret,
      channel:
        input.channel,
      sessionId:
        input.sessionId,
      normalizedContact:
        input.normalizedContact,
      nonce,
      issuedAtEpochSeconds,
      expiresAtEpochSeconds
    });

  const token = [
    nonce,
    String(
      issuedAtEpochSeconds
    ),
    String(
      expiresAtEpochSeconds
    ),
    mac
  ].join(
    "."
  );

  return {
    token,
    nonce,
    issuedAtEpochSeconds,
    expiresAtEpochSeconds
  };
}

export function verifyOnboardingOtpChallengeBinding(
  input:
    VerifyOnboardingOtpChallengeBindingInput,
  dependencies:
    OnboardingOtpChallengeBindingDependencies = {}
): VerifiedOnboardingOtpChallengeBinding {
  assertBindingContext(
    input
  );

  const parsed =
    parseChallengeToken(
      input.token
    );

  const secret =
    getSecret(
      dependencies
    );

  const expectedMac =
    createMac({
      secret,
      channel:
        input.channel,
      sessionId:
        input.sessionId,
      normalizedContact:
        input.normalizedContact,
      nonce:
        parsed.nonce,
      issuedAtEpochSeconds:
        parsed.issuedAtEpochSeconds,
      expiresAtEpochSeconds:
        parsed.expiresAtEpochSeconds
    });

  if (
    !macsEqual(
      expectedMac,
      parsed.mac
    )
  ) {
    throw new OnboardingOtpChallengeBindingError(
      "INVALID_CHALLENGE",
      "OTP challenge binding verification failed."
    );
  }

  const nowEpochSeconds =
    getServerEpochSeconds(
      dependencies
    );

  if (
    parsed.issuedAtEpochSeconds >
    nowEpochSeconds
  ) {
    throw new OnboardingOtpChallengeBindingError(
      "INVALID_CHALLENGE",
      "OTP challenge token is not yet valid."
    );
  }

  if (
    parsed.expiresAtEpochSeconds <=
    nowEpochSeconds
  ) {
    throw new OnboardingOtpChallengeBindingError(
      "EXPIRED_CHALLENGE",
      "OTP challenge token has expired."
    );
  }

  return {
    nonce:
      parsed.nonce,
    issuedAtEpochSeconds:
      parsed.issuedAtEpochSeconds,
    expiresAtEpochSeconds:
      parsed.expiresAtEpochSeconds
  };
}
