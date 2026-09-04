import { describe, expect, it } from "vitest";

import {
  CanonicalSaveCommandValidationError,
  prepareCanonicalSaveCommand,
  validateCanonicalSaveCommand
} from "../lib/server/canonical-save-command";
import { sha256Canonical } from "../lib/ipr-certificate-chain";
import {
  ONBOARDING_CANONICAL_SUBJECT_STATE_VERSION,
  type OnboardingCanonicalSubjectState,
  type SaveOnboardingCanonicalSubjectStateCommand
} from "../lib/onboarding-canonical-subject-state";

function buildState(
  overrides: Partial<OnboardingCanonicalSubjectState> = {}
): OnboardingCanonicalSubjectState {
  return {
    version: ONBOARDING_CANONICAL_SUBJECT_STATE_VERSION,
    subjectId: "sub_server_001",
    onboardingId: "onb_server_001",
    ipr: {
      iprId: "IPR-HBCE-001",
      subjectId: "sub_server_001",
      status: "verified",
      hashReference: "sha256_ipr"
    },
    iprCard: {
      iprCardId: "CARD-HBCE-001",
      iprId: "IPR-HBCE-001",
      subjectId: "sub_server_001",
      cardSerial: "CARD-SERIAL-001",
      status: "issued",
      payloadSha256: "sha256_card"
    },
    operationalCertificate: {
      certificateId: "CERT-HBCE-001",
      iprId: "IPR-HBCE-001",
      subjectId: "sub_server_001",
      cardSerial: "CARD-SERIAL-001",
      status: "active",
      scope: "JOKER_C2_ACCESS",
      payloadSha256: "sha256_certificate_09",
      previousPayloadSha256: "sha256_card",
      integrityDecision: "VALID",
      integrityCheckedAt: "2026-09-03T20:00:00.000Z"
    },
    latestPhase: {
      phaseNumber: 9,
      certificateHash: "sha256_certificate_09"
    },
    revocationState: "clear",
    revision: 9,
    createdAt: "2026-09-03T19:00:00.000Z",
    updatedAt: "2026-09-03T20:00:00.000Z",
    ...overrides
  };
}

function buildCommand(
  overrides: Partial<SaveOnboardingCanonicalSubjectStateCommand> = {}
): SaveOnboardingCanonicalSubjectStateCommand {
  return {
    state: buildState(),
    expectedRevision: 8,
    audit: {
      eventId: "evt_server_009",
      eventType: "CANONICAL_STATE_ADVANCED",
      decisionState: "accepted",
      previousEventHash: "sha256_event_008",
      eventHash: "sha256_event_009",
      eventPayloadSha256: "sha256_event_payload_009",
      occurredAt: "2026-09-03T20:00:00.000Z"
    },
    ...overrides
  };
}

describe("canonical save command preparation", () => {
  it("prepares deterministic canonical JSON and SHA-256", async () => {
    const command = buildCommand();
    const prepared = await prepareCanonicalSaveCommand(command);

    expect(prepared.command).toBe(command);
    expect(JSON.parse(prepared.canonicalStateJson)).toEqual(command.state);
    expect(prepared.canonicalStateSha256).toBe(
      await sha256Canonical(command.state)
    );
  });

  it("accepts revision zero only after the absent revision sentinel", () => {
    expect(() =>
      validateCanonicalSaveCommand(
        buildCommand({
          state: buildState({ revision: 0 }),
          expectedRevision: -1
        })
      )
    ).not.toThrow();
  });

  it("fails closed when the revision does not advance exactly once", () => {
    expect(() =>
      validateCanonicalSaveCommand(
        buildCommand({
          expectedRevision: 9
        })
      )
    ).toThrowError(
      expect.objectContaining({
        name: "CanonicalSaveCommandValidationError",
        code: "REVISION_SEQUENCE_MISMATCH"
      })
    );
  });

  it("fails closed for an empty audit event identifier", () => {
    const command = buildCommand({
      audit: {
        ...buildCommand().audit,
        eventId: " "
      }
    });

    expect(() => validateCanonicalSaveCommand(command)).toThrowError(
      expect.objectContaining({
        name: "CanonicalSaveCommandValidationError",
        code: "EMPTY_AUDIT_FIELD"
      })
    );
  });

  it("fails closed for a non-normalized audit timestamp", () => {
    const command = buildCommand({
      audit: {
        ...buildCommand().audit,
        occurredAt: "2026-09-03"
      }
    });

    expect(() => validateCanonicalSaveCommand(command)).toThrowError(
      expect.objectContaining({
        name: "CanonicalSaveCommandValidationError",
        code: "INVALID_TIMESTAMP"
      })
    );
  });

  it("fails closed when updatedAt precedes createdAt", () => {
    const command = buildCommand({
      state: buildState({
        createdAt: "2026-09-03T20:00:00.000Z",
        updatedAt: "2026-09-03T19:00:00.000Z"
      })
    });

    try {
      validateCanonicalSaveCommand(command);
      throw new Error("Expected validation to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(
        CanonicalSaveCommandValidationError
      );
      expect(
        (error as CanonicalSaveCommandValidationError).code
      ).toBe("TIMESTAMP_ORDER_INVALID");
    }
  });

  it("fails closed for an empty subject identifier", () => {
    const command = buildCommand({
      state: buildState({
        subjectId: ""
      })
    });

    expect(() => validateCanonicalSaveCommand(command)).toThrowError(
      expect.objectContaining({
        name: "CanonicalSaveCommandValidationError",
        code: "EMPTY_IDENTIFIER"
      })
    );
  });
});
