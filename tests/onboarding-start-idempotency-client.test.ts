import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  ONBOARDING_START_IDEMPOTENCY_BYTES,
  ONBOARDING_START_IDEMPOTENCY_KEY_LENGTH,
  generateBrowserStartIdempotencyKey
} from "../lib/client/onboarding-start-idempotency";

describe(
  "P003-D082R13R1 browser start idempotency",
  () => {
    it(
      "requests exactly 32 random bytes",
      () => {
        const randomSource =
          vi.fn(
            (
              target:
                Uint8Array
            ) => {
              target.fill(
                1
              );
            }
          );

        generateBrowserStartIdempotencyKey(
          randomSource
        );

        expect(
          randomSource
        ).toHaveBeenCalledTimes(
          1
        );

        const firstCall =
          randomSource.mock.calls[0];

        if (
          firstCall === undefined
        ) {
          throw new Error(
            "Random source was not called."
          );
        }

        const target =
          firstCall[0];

        expect(
          target
        ).toBeInstanceOf(
          Uint8Array
        );

        expect(
          target.byteLength
        ).toBe(
          ONBOARDING_START_IDEMPOTENCY_BYTES
        );

        expect(
          target.byteLength
        ).toBe(
          32
        );
      }
    );

    it(
      "encodes a deterministic 32-byte vector as canonical unpadded base64url",
      () => {
        const key =
          generateBrowserStartIdempotencyKey(
            (
              target
            ) => {
              for (
                let index = 0;
                index <
                target.length;
                index += 1
              ) {
                target[index] =
                  index;
              }
            }
          );

        expect(
          key
        ).toBe(
          "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8"
        );
      }
    );

    it(
      "always returns the frozen 43-character key length",
      () => {
        const key =
          generateBrowserStartIdempotencyKey(
            (
              target
            ) => {
              target.fill(
                255
              );
            }
          );

        expect(
          key.length
        ).toBe(
          ONBOARDING_START_IDEMPOTENCY_KEY_LENGTH
        );

        expect(
          key.length
        ).toBe(
          43
        );
      }
    );

    it(
      "uses only the canonical base64url alphabet",
      () => {
        const key =
          generateBrowserStartIdempotencyKey(
            (
              target
            ) => {
              for (
                let index = 0;
                index <
                target.length;
                index += 1
              ) {
                target[index] =
                  (
                    index * 37
                  ) %
                  256;
              }
            }
          );

        expect(
          key
        ).toMatch(
          /^[A-Za-z0-9_-]{43}$/
        );
      }
    );

    it(
      "does not emit base64 padding",
      () => {
        const key =
          generateBrowserStartIdempotencyKey(
            (
              target
            ) => {
              target.fill(
                7
              );
            }
          );

        expect(
          key
        ).not.toContain(
          "="
        );
      }
    );
  }
);
