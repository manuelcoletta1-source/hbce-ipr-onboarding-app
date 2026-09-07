export const ONBOARDING_START_IDEMPOTENCY_BYTES =
  32 as const;

export const ONBOARDING_START_IDEMPOTENCY_KEY_LENGTH =
  43 as const;

export type BrowserRandomFillSource = (
  target: Uint8Array
) => void;

export class OnboardingStartIdempotencyError
  extends Error {
  constructor(message: string) {
    super(message);

    this.name =
      "OnboardingStartIdempotencyError";
  }
}

function fillWithBrowserCrypto(
  target: Uint8Array
): void {
  if (
    typeof crypto === "undefined" ||
    typeof crypto.getRandomValues !==
      "function"
  ) {
    throw new OnboardingStartIdempotencyError(
      "Browser cryptographic randomness is unavailable."
    );
  }

  crypto.getRandomValues(
    target
  );
}

function encodeBase64Url(
  bytes: Uint8Array
): string {
  if (
    typeof btoa !== "function"
  ) {
    throw new OnboardingStartIdempotencyError(
      "Browser base64 encoding is unavailable."
    );
  }

  let binary = "";

  for (const byte of bytes) {
    binary +=
      String.fromCharCode(
        byte
      );
  }

  return btoa(
    binary
  )
    .replace(
      /\+/g,
      "-"
    )
    .replace(
      /\//g,
      "_"
    )
    .replace(
      /=+$/g,
      ""
    );
}

export function generateBrowserStartIdempotencyKey(
  randomSource:
    BrowserRandomFillSource =
      fillWithBrowserCrypto
): string {
  const bytes =
    new Uint8Array(
      ONBOARDING_START_IDEMPOTENCY_BYTES
    );

  randomSource(
    bytes
  );

  const key =
    encodeBase64Url(
      bytes
    );

  if (
    key.length !==
    ONBOARDING_START_IDEMPOTENCY_KEY_LENGTH ||
    !/^[A-Za-z0-9_-]{43}$/.test(
      key
    )
  ) {
    throw new OnboardingStartIdempotencyError(
      "Generated onboarding start idempotency key is invalid."
    );
  }

  return key;
}
