import "server-only";

import {
  sha256Canonical,
  stableStringify
} from "@/lib/ipr-certificate-chain";
import type {
  OnboardingCanonicalSubjectState,
  SaveOnboardingCanonicalSubjectStateCommand
} from "@/lib/onboarding-canonical-subject-state";

export type CanonicalSaveCommandErrorCode =
  | "EMPTY_IDENTIFIER"
  | "INVALID_REVISION"
  | "REVISION_SEQUENCE_MISMATCH"
  | "INVALID_TIMESTAMP"
  | "TIMESTAMP_ORDER_INVALID"
  | "EMPTY_AUDIT_FIELD";

export class CanonicalSaveCommandValidationError extends Error {
  readonly code: CanonicalSaveCommandErrorCode;

  constructor(code: CanonicalSaveCommandErrorCode, message: string) {
    super(message);
    this.name = "CanonicalSaveCommandValidationError";
    this.code = code;
  }
}

export type PreparedCanonicalSaveCommand = {
  readonly command: SaveOnboardingCanonicalSubjectStateCommand;
  readonly canonicalStateJson: string;
  readonly canonicalStateSha256: string;
};

function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

function isValidIsoDateTime(value: string): boolean {
  if (!isNonEmptyString(value)) {
    return false;
  }

  const parsed = new Date(value);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString() === value
  );
}

function assertNonEmptyIdentifier(
  value: string,
  field: "subjectId" | "onboardingId"
): void {
  if (!isNonEmptyString(value)) {
    throw new CanonicalSaveCommandValidationError(
      "EMPTY_IDENTIFIER",
      `${field} must be a non-empty string.`
    );
  }
}

function assertValidRevision(
  state: OnboardingCanonicalSubjectState,
  expectedRevision: number
): void {
  if (
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < -1 ||
    !Number.isSafeInteger(state.revision) ||
    state.revision < 0
  ) {
    throw new CanonicalSaveCommandValidationError(
      "INVALID_REVISION",
      "expectedRevision must be an integer greater than or equal to -1 and state.revision must be a non-negative integer."
    );
  }

  if (state.revision !== expectedRevision + 1) {
    throw new CanonicalSaveCommandValidationError(
      "REVISION_SEQUENCE_MISMATCH",
      "state.revision must be exactly one greater than expectedRevision."
    );
  }
}

function assertValidStateTimestamps(
  state: OnboardingCanonicalSubjectState
): void {
  if (
    !isValidIsoDateTime(state.createdAt) ||
    !isValidIsoDateTime(state.updatedAt)
  ) {
    throw new CanonicalSaveCommandValidationError(
      "INVALID_TIMESTAMP",
      "Canonical state timestamps must be normalized ISO date-time strings."
    );
  }

  if (
    new Date(state.updatedAt).getTime() <
    new Date(state.createdAt).getTime()
  ) {
    throw new CanonicalSaveCommandValidationError(
      "TIMESTAMP_ORDER_INVALID",
      "updatedAt must not precede createdAt."
    );
  }
}

function assertValidAuditContext(
  command: SaveOnboardingCanonicalSubjectStateCommand
): void {
  const requiredAuditFields = [
    ["eventId", command.audit.eventId],
    ["eventType", command.audit.eventType],
    ["decisionState", command.audit.decisionState],
    ["eventHash", command.audit.eventHash],
    ["eventPayloadSha256", command.audit.eventPayloadSha256]
  ] as const;

  for (const [field, value] of requiredAuditFields) {
    if (!isNonEmptyString(value)) {
      throw new CanonicalSaveCommandValidationError(
        "EMPTY_AUDIT_FIELD",
        `${field} must be a non-empty string.`
      );
    }
  }

  if (
    command.audit.previousEventHash !== null &&
    !isNonEmptyString(command.audit.previousEventHash)
  ) {
    throw new CanonicalSaveCommandValidationError(
      "EMPTY_AUDIT_FIELD",
      "previousEventHash must be null or a non-empty string."
    );
  }

  if (!isValidIsoDateTime(command.audit.occurredAt)) {
    throw new CanonicalSaveCommandValidationError(
      "INVALID_TIMESTAMP",
      "occurredAt must be a normalized ISO date-time string."
    );
  }
}

export function validateCanonicalSaveCommand(
  command: SaveOnboardingCanonicalSubjectStateCommand
): void {
  assertNonEmptyIdentifier(command.state.subjectId, "subjectId");
  assertNonEmptyIdentifier(command.state.onboardingId, "onboardingId");
  assertValidRevision(command.state, command.expectedRevision);
  assertValidStateTimestamps(command.state);
  assertValidAuditContext(command);
}

export async function prepareCanonicalSaveCommand(
  command: SaveOnboardingCanonicalSubjectStateCommand
): Promise<PreparedCanonicalSaveCommand> {
  validateCanonicalSaveCommand(command);

  const canonicalStateJson = stableStringify(command.state);
  const canonicalStateSha256 = await sha256Canonical(command.state);

  return {
    command,
    canonicalStateJson,
    canonicalStateSha256
  };
}
