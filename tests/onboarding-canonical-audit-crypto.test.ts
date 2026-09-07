import {
  describe,
  expect,
  it
} from "vitest";

import {
  HBCE_CANONICAL_AUDIT_EVENT_HASH_DOMAIN,
  HBCE_CANONICAL_AUDIT_GENESIS_MARKER,
  HBCE_CANONICAL_AUDIT_PAYLOAD_VERSION,
  HBCE_ONBOARDING_START_AUDIT_PAYLOAD_KIND,
  OnboardingCanonicalAuditCryptoError,
  createCanonicalAuditEventHash,
  createCanonicalAuditEventPayloadSha256,
  createOnboardingStartCanonicalAuditPayload,
  generateCanonicalAuditEventId,
  type CreateCanonicalAuditPayloadHashInput
} from "../lib/server/onboarding-canonical-audit-crypto";

const EVENT_ID =
  "evt_canonical_00000000-0000-4000-8000-000000000001";

const OCCURRED_AT =
  "2026-09-04T18:00:00.000Z";

const CANONICAL_STATE_SHA256 =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const EXPECTED_PAYLOAD_SHA256 =
  "0a681d5f605cdde5fb2b7bb30b355bb3deb9622e24428909a611634b18f116db";

const EXPECTED_EVENT_HASH =
  "57309ef012e5f63fbbe100e5691e0b726c694e8cf4943707af6de256e811c2ed";

function buildInput(
  overrides:
    Partial<CreateCanonicalAuditPayloadHashInput> = {}
): CreateCanonicalAuditPayloadHashInput {
  return {
    eventId:
      EVENT_ID,
    onboardingId:
      "onb_server_001",
    subjectId:
      "sub_server_001",
    revision:
      0,
    eventType:
      "ONBOARDING_STARTED",
    decisionState:
      "accepted",
    occurredAt:
      OCCURRED_AT,
    canonicalStateSha256:
      CANONICAL_STATE_SHA256,
    payload:
      createOnboardingStartCanonicalAuditPayload(),
    ...overrides
  };
}

describe(
  "onboarding canonical audit crypto",
  () => {
    it(
      "exposes the frozen canonical audit domains",
      () => {
        expect(
          HBCE_CANONICAL_AUDIT_PAYLOAD_VERSION
        ).toBe(
          "HBCE_CANONICAL_AUDIT_PAYLOAD_V1"
        );

        expect(
          HBCE_CANONICAL_AUDIT_EVENT_HASH_DOMAIN
        ).toBe(
          "HBCE_CANONICAL_AUDIT_EVENT_HASH_V1"
        );

        expect(
          HBCE_CANONICAL_AUDIT_GENESIS_MARKER
        ).toBe(
          "GENESIS"
        );
      }
    );

    it(
      "generates a server canonical audit event identifier",
      () => {
        const eventId =
          generateCanonicalAuditEventId(
            () =>
              "00000000-0000-4000-8000-000000000001"
          );

        expect(
          eventId
        ).toBe(
          EVENT_ID
        );
      }
    );

    it(
      "builds the minimized onboarding start audit payload",
      () => {
        expect(
          createOnboardingStartCanonicalAuditPayload()
        ).toEqual({
          kind:
            HBCE_ONBOARDING_START_AUDIT_PAYLOAD_KIND
        });
      }
    );

    it(
      "matches the frozen canonical payload digest vector",
      async () => {
        await expect(
          createCanonicalAuditEventPayloadSha256(
            buildInput()
          )
        ).resolves.toBe(
          EXPECTED_PAYLOAD_SHA256
        );
      }
    );

    it(
      "matches the frozen canonical genesis event digest vector",
      async () => {
        await expect(
          createCanonicalAuditEventHash({
            revision:
              0,
            previousEventHash:
              null,
            eventPayloadSha256:
              EXPECTED_PAYLOAD_SHA256
          })
        ).resolves.toBe(
          EXPECTED_EVENT_HASH
        );
      }
    );

    it(
      "binds the canonical state digest into the payload digest",
      async () => {
        const baseline =
          await createCanonicalAuditEventPayloadSha256(
            buildInput()
          );

        const changed =
          await createCanonicalAuditEventPayloadSha256(
            buildInput({
              canonicalStateSha256:
                "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
            })
          );

        expect(
          changed
        ).not.toBe(
          baseline
        );
      }
    );

    it(
      "binds server identity and audit metadata into the payload digest",
      async () => {
        const baseline =
          await createCanonicalAuditEventPayloadSha256(
            buildInput()
          );

        const variants = [
          buildInput({
            eventId:
              "evt_canonical_other"
          }),
          buildInput({
            onboardingId:
              "onb_server_002"
          }),
          buildInput({
            subjectId:
              "sub_server_002"
          }),
          buildInput({
            revision:
              1
          }),
          buildInput({
            eventType:
              "OTHER_EVENT"
          }),
          buildInput({
            decisionState:
              "other"
          }),
          buildInput({
            occurredAt:
              "2026-09-04T18:00:01.000Z"
          }),
          buildInput({
            payload: {
              kind:
                HBCE_ONBOARDING_START_AUDIT_PAYLOAD_KIND,
              marker:
                "changed"
            }
          })
        ];

        for (
          const variant
          of variants
        ) {
          const digest =
            await createCanonicalAuditEventPayloadSha256(
              variant
            );

          expect(
            digest
          ).not.toBe(
            baseline
          );
        }
      }
    );

    it(
      "rejects malformed canonical state digest input",
      async () => {
        await expect(
          createCanonicalAuditEventPayloadSha256(
            buildInput({
              canonicalStateSha256:
                "not-a-hash"
            })
          )
        ).rejects.toBeInstanceOf(
          OnboardingCanonicalAuditCryptoError
        );
      }
    );

    it(
      "rejects non-normalized occurredAt",
      async () => {
        await expect(
          createCanonicalAuditEventPayloadSha256(
            buildInput({
              occurredAt:
                "2026-09-04"
            })
          )
        ).rejects.toBeInstanceOf(
          OnboardingCanonicalAuditCryptoError
        );
      }
    );

    it(
      "rejects non-JSON audit payload values",
      async () => {
        await expect(
          createCanonicalAuditEventPayloadSha256(
            buildInput({
              payload: {
                kind:
                  HBCE_ONBOARDING_START_AUDIT_PAYLOAD_KIND,
                invalid:
                  undefined
              } as never
            })
          )
        ).rejects.toBeInstanceOf(
          OnboardingCanonicalAuditCryptoError
        );

        await expect(
          createCanonicalAuditEventPayloadSha256(
            buildInput({
              payload: {
                kind:
                  HBCE_ONBOARDING_START_AUDIT_PAYLOAD_KIND,
                invalid:
                  Number.POSITIVE_INFINITY
              }
            })
          )
        ).rejects.toBeInstanceOf(
          OnboardingCanonicalAuditCryptoError
        );
      }
    );

    it(
      "rejects a previous hash on revision zero",
      async () => {
        await expect(
          createCanonicalAuditEventHash({
            revision:
              0,
            previousEventHash:
              "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            eventPayloadSha256:
              EXPECTED_PAYLOAD_SHA256
          })
        ).rejects.toBeInstanceOf(
          OnboardingCanonicalAuditCryptoError
        );
      }
    );

    it(
      "requires a previous digest after genesis",
      async () => {
        await expect(
          createCanonicalAuditEventHash({
            revision:
              1,
            previousEventHash:
              null,
            eventPayloadSha256:
              EXPECTED_PAYLOAD_SHA256
          })
        ).rejects.toBeInstanceOf(
          OnboardingCanonicalAuditCryptoError
        );
      }
    );

    it(
      "rejects malformed previous and payload digests",
      async () => {
        await expect(
          createCanonicalAuditEventHash({
            revision:
              1,
            previousEventHash:
              "not-a-hash",
            eventPayloadSha256:
              EXPECTED_PAYLOAD_SHA256
          })
        ).rejects.toBeInstanceOf(
          OnboardingCanonicalAuditCryptoError
        );

        await expect(
          createCanonicalAuditEventHash({
            revision:
              0,
            previousEventHash:
              null,
            eventPayloadSha256:
              "not-a-hash"
          })
        ).rejects.toBeInstanceOf(
          OnboardingCanonicalAuditCryptoError
        );
      }
    );

    it(
      "rejects an empty generated event identifier source",
      () => {
        expect(
          () =>
            generateCanonicalAuditEventId(
              () => " "
            )
        ).toThrow(
          OnboardingCanonicalAuditCryptoError
        );
      }
    );
  }
);
