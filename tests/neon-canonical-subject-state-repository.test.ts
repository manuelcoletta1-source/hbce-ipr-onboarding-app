import { describe, expect, it, vi } from "vitest";

import {
  NeonCanonicalRepositoryError,
  NeonCanonicalSubjectStateRepository,
  type NeonQueryExecutor
} from "../lib/server/neon-canonical-subject-state-repository";
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
    ipr: null,
    iprCard: null,
    operationalCertificate: null,
    latestPhase: null,
    revocationState: "clear",
    revision: 0,
    createdAt: "2026-09-04T14:00:00.000Z",
    updatedAt: "2026-09-04T14:00:00.000Z",
    ...overrides
  };
}

function buildCommand(): SaveOnboardingCanonicalSubjectStateCommand {
  return {
    state: buildState(),
    expectedRevision: -1,
    audit: {
      eventId: "evt_server_000",
      eventType: "ONBOARDING_CREATED",
      decisionState: "accepted",
      previousEventHash: null,
      eventHash: "sha256_event_000",
      eventPayloadSha256: "sha256_event_payload_000",
      occurredAt: "2026-09-04T14:00:00.000Z"
    }
  };
}

describe("Neon canonical subject-state repository", () => {
  it("reads the current revision by subject with one parameter", async () => {
    const state = buildState();
    const executor = vi.fn<NeonQueryExecutor>().mockResolvedValue([
      { canonical_state: state }
    ]);
    const repository =
      new NeonCanonicalSubjectStateRepository(executor);

    await expect(
      repository.getBySubjectId("sub_server_001")
    ).resolves.toEqual(state);

    expect(executor).toHaveBeenCalledTimes(1);
    expect(executor.mock.calls.at(0)![0]).toContain(
      "WHERE onboardings.subject_id = $1"
    );
    expect(executor.mock.calls.at(0)![1]).toEqual([
      "sub_server_001"
    ]);
  });

  it("reads the current revision by onboarding identifier", async () => {
    const state = buildState();
    const executor = vi.fn<NeonQueryExecutor>().mockResolvedValue([
      { canonical_state: JSON.stringify(state) }
    ]);
    const repository =
      new NeonCanonicalSubjectStateRepository(executor);

    await expect(
      repository.getByOnboardingId("onb_server_001")
    ).resolves.toEqual(state);

    expect(executor.mock.calls.at(0)![0]).toContain(
      "WHERE onboardings.onboarding_id = $1"
    );
  });

  it("does not query Neon for an empty lookup identifier", async () => {
    const executor = vi.fn<NeonQueryExecutor>();
    const repository =
      new NeonCanonicalSubjectStateRepository(executor);

    await expect(repository.getBySubjectId(" ")).resolves.toBeNull();
    await expect(repository.getByOnboardingId("")).resolves.toBeNull();

    expect(executor).not.toHaveBeenCalled();
  });

  it("sends one parameterized initial transition statement", async () => {
    const command = buildCommand();
    const executor = vi.fn<NeonQueryExecutor>().mockResolvedValue([
      { canonical_state: command.state }
    ]);
    const repository =
      new NeonCanonicalSubjectStateRepository(executor);

    await expect(repository.save(command)).resolves.toEqual(
      command.state
    );

    expect(executor).toHaveBeenCalledTimes(1);

    const [query, parameters] = executor.mock.calls.at(0)!;

    expect(query).toContain("WITH subject_candidate AS");
    expect(query).toContain("inserted_revision AS");
    expect(query).toContain("inserted_audit_event AS");
    expect(query).toContain("$17::timestamptz");
    expect(query).not.toContain(command.state.subjectId);
    expect(query).not.toContain(command.audit.eventId);
    expect(parameters).toHaveLength(17);
    expect(parameters[0]).toBe(command.state.subjectId);
    expect(parameters[5]).toBeNull();
  });

  it("passes the expected stored revision for an update", async () => {
    const initial = buildCommand();
    const command = {
      ...initial,
      state: buildState({ revision: 5 }),
      expectedRevision: 4
    };
    const executor = vi.fn<NeonQueryExecutor>().mockResolvedValue([
      { canonical_state: command.state }
    ]);
    const repository =
      new NeonCanonicalSubjectStateRepository(executor);

    await repository.save(command);

    expect(executor.mock.calls.at(0)![1][4]).toBe(5);
    expect(executor.mock.calls.at(0)![1][5]).toBe(4);
  });

  it("maps a guarded PostgreSQL rollback to revision conflict", async () => {
    const databaseError = Object.assign(
      new Error("division by zero"),
      { code: "22012" }
    );
    const executor = vi.fn<NeonQueryExecutor>().mockRejectedValue(
      databaseError
    );
    const repository =
      new NeonCanonicalSubjectStateRepository(executor);

    await expect(repository.save(buildCommand())).rejects.toEqual(
      expect.objectContaining({
        name: "NeonCanonicalRepositoryError",
        code: "REVISION_CONFLICT"
      })
    );
  });

  it("fails closed when Neon returns invalid canonical state", async () => {
    const executor = vi.fn<NeonQueryExecutor>().mockResolvedValue([
      { canonical_state: null }
    ]);
    const repository =
      new NeonCanonicalSubjectStateRepository(executor);

    await expect(
      repository.getBySubjectId("sub_server_001")
    ).rejects.toBeInstanceOf(NeonCanonicalRepositoryError);
  });
});
