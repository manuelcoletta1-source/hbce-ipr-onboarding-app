import {
  createHash
} from "node:crypto";

import {
  describe,
  expect,
  it
} from "vitest";

import {
  HBCE_SESSION_EVENT_GENESIS_PREVIOUS,
  HBCE_SESSION_EVENT_HASH_DOMAIN,
  HBCE_SESSION_EVENT_PAYLOAD_VERSION,
  OnboardingSessionEventCryptoError,
  createOnboardingSessionEventHash,
  createOnboardingSessionEventPayloadSha256,
  generateOnboardingSessionEventId
} from "../lib/server/onboarding-session-event-crypto";

function sha256Node(
  value: string
): string {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

describe("HBCE onboarding session event cryptographic chain", () => {
  it("generates server event identifiers", () => {
    expect(
      generateOnboardingSessionEventId(
        () =>
          "00000000-0000-4000-8000-000000000001"
      )
    ).toBe(
      "evt_session_00000000-0000-4000-8000-000000000001"
    );
  });

  it("hashes the exact canonical payload envelope", async () => {
    const result =
      await createOnboardingSessionEventPayloadSha256({
        eventId: "evt_session_001",
        sessionId: "session_001",
        eventType: "EMAIL_VERIFIED",
        occurredAt:
          "2026-09-04T16:10:00.000Z",
        payload: {
          verification: "ok",
          channel: "email"
        }
      });

    const canonical =
      '{"eventId":"evt_session_001","eventType":"EMAIL_VERIFIED","occurredAt":"2026-09-04T16:10:00.000Z","payload":{"channel":"email","verification":"ok"},"sessionId":"session_001","version":"HBCE_SESSION_EVENT_PAYLOAD_V1"}';

    expect(result).toBe(
      sha256Node(canonical)
    );

    expect(result).toMatch(
      /^[0-9a-f]{64}$/
    );

    expect(
      HBCE_SESSION_EVENT_PAYLOAD_VERSION
    ).toBe(
      "HBCE_SESSION_EVENT_PAYLOAD_V1"
    );
  });

  it("derives the genesis event hash from the frozen LF-separated preimage", async () => {
    const payloadSha256 =
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    const expectedPreimage = [
      HBCE_SESSION_EVENT_HASH_DOMAIN,
      "0",
      HBCE_SESSION_EVENT_GENESIS_PREVIOUS,
      payloadSha256
    ].join("\n");

    await expect(
      createOnboardingSessionEventHash({
        eventSeq: 0,
        previousEventHash: null,
        eventPayloadSha256:
          payloadSha256
      })
    ).resolves.toBe(
      sha256Node(expectedPreimage)
    );
  });

  it("cryptographically binds a non-genesis event to its predecessor", async () => {
    const previousEventHash =
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

    const payloadSha256 =
      "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

    const expectedPreimage = [
      "HBCE_SESSION_EVENT_HASH_V1",
      "7",
      previousEventHash,
      payloadSha256
    ].join("\n");

    await expect(
      createOnboardingSessionEventHash({
        eventSeq: 7,
        previousEventHash,
        eventPayloadSha256:
          payloadSha256
      })
    ).resolves.toBe(
      sha256Node(expectedPreimage)
    );
  });

  it("changes the event hash if sequence, predecessor or payload digest changes", async () => {
    const previous =
      "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

    const payload =
      "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

    const baseline =
      await createOnboardingSessionEventHash({
        eventSeq: 1,
        previousEventHash: previous,
        eventPayloadSha256: payload
      });

    const changedSequence =
      await createOnboardingSessionEventHash({
        eventSeq: 2,
        previousEventHash: previous,
        eventPayloadSha256: payload
      });

    const changedPrevious =
      await createOnboardingSessionEventHash({
        eventSeq: 1,
        previousEventHash:
          "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        eventPayloadSha256: payload
      });

    const changedPayload =
      await createOnboardingSessionEventHash({
        eventSeq: 1,
        previousEventHash: previous,
        eventPayloadSha256:
          "1111111111111111111111111111111111111111111111111111111111111111"
      });

    expect(changedSequence).not.toBe(
      baseline
    );

    expect(changedPrevious).not.toBe(
      baseline
    );

    expect(changedPayload).not.toBe(
      baseline
    );
  });

  it("rejects non-SHA-256 chain components", async () => {
    await expect(
      createOnboardingSessionEventHash({
        eventSeq: 1,
        previousEventHash: "not-a-hash",
        eventPayloadSha256:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      })
    ).rejects.toBeInstanceOf(
      OnboardingSessionEventCryptoError
    );

    await expect(
      createOnboardingSessionEventHash({
        eventSeq: 1,
        previousEventHash:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        eventPayloadSha256:
          "not-a-hash"
      })
    ).rejects.toBeInstanceOf(
      OnboardingSessionEventCryptoError
    );
  });

  it("rejects illegal genesis and non-genesis predecessor shapes", async () => {
    await expect(
      createOnboardingSessionEventHash({
        eventSeq: 0,
        previousEventHash:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        eventPayloadSha256:
          "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
      })
    ).rejects.toBeInstanceOf(
      OnboardingSessionEventCryptoError
    );

    await expect(
      createOnboardingSessionEventHash({
        eventSeq: 1,
        previousEventHash: null,
        eventPayloadSha256:
          "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
      })
    ).rejects.toBeInstanceOf(
      OnboardingSessionEventCryptoError
    );
  });

  it("rejects non-canonical or non-JSON payload inputs", async () => {
    await expect(
      createOnboardingSessionEventPayloadSha256({
        eventId: "evt_session_001",
        sessionId: "session_001",
        eventType: "SESSION_ACTIVITY",
        occurredAt:
          "2026-09-04 16:10:00",
        payload: {}
      })
    ).rejects.toBeInstanceOf(
      OnboardingSessionEventCryptoError
    );

    const cyclic:
      Record<string, unknown> = {};

    cyclic.self = cyclic;

    await expect(
      createOnboardingSessionEventPayloadSha256({
        eventId: "evt_session_001",
        sessionId: "session_001",
        eventType: "SESSION_ACTIVITY",
        occurredAt:
          "2026-09-04T16:10:00.000Z",
        payload:
          cyclic as never
      })
    ).rejects.toBeInstanceOf(
      OnboardingSessionEventCryptoError
    );
  });
});
