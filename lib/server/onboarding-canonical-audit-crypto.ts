import "server-only";

import {
  createHash,
  randomUUID
} from "node:crypto";

import {
  stableStringify
} from "@/lib/ipr-certificate-chain";

export const HBCE_CANONICAL_AUDIT_PAYLOAD_VERSION =
  "HBCE_CANONICAL_AUDIT_PAYLOAD_V1" as const;

export const HBCE_CANONICAL_AUDIT_EVENT_HASH_DOMAIN =
  "HBCE_CANONICAL_AUDIT_EVENT_HASH_V1" as const;

export const HBCE_CANONICAL_AUDIT_GENESIS_MARKER =
  "GENESIS" as const;

export const HBCE_ONBOARDING_START_AUDIT_PAYLOAD_KIND =
  "HBCE_ONBOARDING_START_V1" as const;

export type CanonicalAuditJsonPrimitive =
  | string
  | number
  | boolean
  | null;

export type CanonicalAuditJsonValue =
  | CanonicalAuditJsonPrimitive
  | readonly CanonicalAuditJsonValue[]
  | {
      readonly [key: string]:
        CanonicalAuditJsonValue;
    };

export type CanonicalAuditPayload = {
  readonly [key: string]:
    CanonicalAuditJsonValue;
};

export type OnboardingStartCanonicalAuditPayload = {
  readonly kind:
    typeof HBCE_ONBOARDING_START_AUDIT_PAYLOAD_KIND;
};

export type CanonicalAuditUuidSource =
  () => string;

export type CreateCanonicalAuditPayloadHashInput = {
  readonly eventId: string;
  readonly onboardingId: string;
  readonly subjectId: string;
  readonly revision: number;
  readonly eventType: string;
  readonly decisionState: string;
  readonly occurredAt: string;
  readonly canonicalStateSha256: string;
  readonly payload:
    CanonicalAuditPayload;
};

export type CreateCanonicalAuditEventHashInput = {
  readonly revision: number;
  readonly previousEventHash:
    string | null;
  readonly eventPayloadSha256:
    string;
};

export class OnboardingCanonicalAuditCryptoError
  extends Error
{
  constructor(
    message: string
  ) {
    super(message);
    this.name =
      "OnboardingCanonicalAuditCryptoError";
  }
}

function isNonEmptyString(
  value: string
): boolean {
  return value.trim().length > 0;
}

function isSha256LowerHex(
  value: string
): boolean {
  return /^[a-f0-9]{64}$/.test(
    value
  );
}

function assertNonEmpty(
  value: string,
  field: string
): void {
  if (!isNonEmptyString(value)) {
    throw new OnboardingCanonicalAuditCryptoError(
      `${field} must be a non-empty string.`
    );
  }
}

function assertRevision(
  revision: number
): void {
  if (
    !Number.isSafeInteger(revision) ||
    revision < 0
  ) {
    throw new OnboardingCanonicalAuditCryptoError(
      "revision must be a non-negative safe integer."
    );
  }
}

function assertNormalizedIso(
  value: string
): void {
  if (!isNonEmptyString(value)) {
    throw new OnboardingCanonicalAuditCryptoError(
      "occurredAt must be a normalized ISO date-time string."
    );
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString() !== value
  ) {
    throw new OnboardingCanonicalAuditCryptoError(
      "occurredAt must be a normalized ISO date-time string."
    );
  }
}

function assertSha256(
  value: string,
  field: string
): void {
  if (!isSha256LowerHex(value)) {
    throw new OnboardingCanonicalAuditCryptoError(
      `${field} must be lowercase SHA-256 hexadecimal.`
    );
  }
}

function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}

function assertJsonValue(
  value: unknown,
  ancestors: Set<object>
): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new OnboardingCanonicalAuditCryptoError(
        "Canonical audit payload numbers must be finite."
      );
    }

    return;
  }

  if (Array.isArray(value)) {
    if (ancestors.has(value)) {
      throw new OnboardingCanonicalAuditCryptoError(
        "Canonical audit payload must not contain cycles."
      );
    }

    ancestors.add(value);

    for (const item of value) {
      assertJsonValue(
        item,
        ancestors
      );
    }

    ancestors.delete(value);
    return;
  }

  if (isPlainObject(value)) {
    if (ancestors.has(value)) {
      throw new OnboardingCanonicalAuditCryptoError(
        "Canonical audit payload must not contain cycles."
      );
    }

    ancestors.add(value);

    for (
      const child
      of Object.values(value)
    ) {
      assertJsonValue(
        child,
        ancestors
      );
    }

    ancestors.delete(value);
    return;
  }

  throw new OnboardingCanonicalAuditCryptoError(
    "Canonical audit payload must contain JSON values only."
  );
}

function assertPayload(
  payload:
    CanonicalAuditPayload
): void {
  if (!isPlainObject(payload)) {
    throw new OnboardingCanonicalAuditCryptoError(
      "Canonical audit payload root must be a JSON object."
    );
  }

  assertJsonValue(
    payload,
    new Set<object>()
  );
}

function sha256Utf8(
  value: string
): string {
  return createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

export function generateCanonicalAuditEventId(
  uuidSource:
    CanonicalAuditUuidSource =
      () => randomUUID()
): string {
  const uuid =
    uuidSource();

  assertNonEmpty(
    uuid,
    "canonical audit UUID"
  );

  return `evt_canonical_${uuid}`;
}

export function createOnboardingStartCanonicalAuditPayload():
  OnboardingStartCanonicalAuditPayload
{
  return {
    kind:
      HBCE_ONBOARDING_START_AUDIT_PAYLOAD_KIND
  };
}

export async function createCanonicalAuditEventPayloadSha256(
  input:
    CreateCanonicalAuditPayloadHashInput
): Promise<string> {
  assertNonEmpty(
    input.eventId,
    "eventId"
  );

  assertNonEmpty(
    input.onboardingId,
    "onboardingId"
  );

  assertNonEmpty(
    input.subjectId,
    "subjectId"
  );

  assertRevision(
    input.revision
  );

  assertNonEmpty(
    input.eventType,
    "eventType"
  );

  assertNonEmpty(
    input.decisionState,
    "decisionState"
  );

  assertNormalizedIso(
    input.occurredAt
  );

  assertSha256(
    input.canonicalStateSha256,
    "canonicalStateSha256"
  );

  assertPayload(
    input.payload
  );

  const envelope = {
    version:
      HBCE_CANONICAL_AUDIT_PAYLOAD_VERSION,
    eventId:
      input.eventId,
    onboardingId:
      input.onboardingId,
    subjectId:
      input.subjectId,
    revision:
      input.revision,
    eventType:
      input.eventType,
    decisionState:
      input.decisionState,
    occurredAt:
      input.occurredAt,
    canonicalStateSha256:
      input.canonicalStateSha256,
    payload:
      input.payload
  };

  return sha256Utf8(
    stableStringify(
      envelope
    )
  );
}

export async function createCanonicalAuditEventHash(
  input:
    CreateCanonicalAuditEventHashInput
): Promise<string> {
  assertRevision(
    input.revision
  );

  assertSha256(
    input.eventPayloadSha256,
    "eventPayloadSha256"
  );

  if (
    input.revision === 0
  ) {
    if (
      input.previousEventHash !== null
    ) {
      throw new OnboardingCanonicalAuditCryptoError(
        "Genesis canonical audit event must have null previousEventHash."
      );
    }
  } else {
    if (
      input.previousEventHash === null
    ) {
      throw new OnboardingCanonicalAuditCryptoError(
        "Non-genesis canonical audit event requires previousEventHash."
      );
    }

    assertSha256(
      input.previousEventHash,
      "previousEventHash"
    );
  }

  const previous =
    input.previousEventHash ??
    HBCE_CANONICAL_AUDIT_GENESIS_MARKER;

  const preimage = [
    HBCE_CANONICAL_AUDIT_EVENT_HASH_DOMAIN,
    input.revision.toString(10),
    previous,
    input.eventPayloadSha256
  ].join("\n");

  return sha256Utf8(
    preimage
  );
}
