import {
  afterEach,
  describe,
  expect,
  it
} from "vitest";

import {
  GET
} from "../app/api/health/route";

const ORIGINAL_REVISION =
  process.env.VERCEL_GIT_COMMIT_SHA;

function restoreRevisionEnvironment():
  void {
  if (
    ORIGINAL_REVISION ===
    undefined
  ) {
    delete process.env
      .VERCEL_GIT_COMMIT_SHA;

    return;
  }

  process.env
    .VERCEL_GIT_COMMIT_SHA =
      ORIGINAL_REVISION;
}

async function getHealthPayload() {
  const response =
    await GET();

  expect(
    response.status
  ).toBe(
    200
  );

  const payload:
    unknown =
      await response.json();

  if (
    typeof payload !==
      "object" ||
    payload ===
      null ||
    Array.isArray(
      payload
    )
  ) {
    throw new Error(
      "Health route returned an invalid payload."
    );
  }

  return payload as {
    readonly ok:
      unknown;

    readonly status:
      unknown;

    readonly data?: {
      readonly deployment_revision?:
        unknown;
    };
  };
}

afterEach(
  () => {
    restoreRevisionEnvironment();
  }
);

describe(
  "P003-D10D5 deployment revision health witness",
  () => {
    it(
      "exposes an exact canonical 40-character lowercase Git SHA",
      async () => {
        const revision =
          "0123456789abcdef0123456789abcdef01234567";

        process.env
          .VERCEL_GIT_COMMIT_SHA =
            revision;

        const payload =
          await getHealthPayload();

        expect(
          payload.ok
        ).toBe(
          true
        );

        expect(
          payload.status
        ).toBe(
          "healthy"
        );

        expect(
          payload.data
            ?.deployment_revision
        ).toBe(
          revision
        );
      }
    );

    it(
      "returns null when the deployment revision is unavailable",
      async () => {
        delete process.env
          .VERCEL_GIT_COMMIT_SHA;

        const payload =
          await getHealthPayload();

        expect(
          payload.ok
        ).toBe(
          true
        );

        expect(
          payload.status
        ).toBe(
          "healthy"
        );

        expect(
          payload.data
            ?.deployment_revision
        ).toBeNull();
      }
    );

    it.each(
      [
        "",
        "0123456789abcdef0123456789abcdef0123456",
        "0123456789abcdef0123456789abcdef012345678",
        "0123456789abcdef0123456789abcdef0123456g",
        "0123456789ABCDEF0123456789ABCDEF01234567",
        " 0123456789abcdef0123456789abcdef01234567",
        "0123456789abcdef0123456789abcdef01234567 "
      ]
    )(
      "fails closed to null for a noncanonical deployment revision",
      async (
        revision
      ) => {
        process.env
          .VERCEL_GIT_COMMIT_SHA =
            revision;

        const payload =
          await getHealthPayload();

        expect(
          payload.ok
        ).toBe(
          true
        );

        expect(
          payload.status
        ).toBe(
          "healthy"
        );

        expect(
          payload.data
            ?.deployment_revision
        ).toBeNull();
      }
    );
  }
);
