import "server-only";

import { randomUUID } from "node:crypto";

import {
  sha256Canonical,
  sha256Hex
} from "@/lib/ipr-certificate-chain";

export const HBCE_SESSION_EVENT_PAYLOAD_VERSION =
  "HBCE_SESSION_EVENT_PAYLOAD_V1" as const;

export const HBCE_SESSION_EVENT_HASH_DOMAIN =
  "HBCE_SESSION_EVENT_HASH_V1" as const;

export const HBCE_SESSION_EVENT_GENESIS_PREVIOUS =
  "GENESIS" as const;

export type OnboardingSessionEventType =
  | "SESSION_CREATED"
  | "EMAIL_VERIFIED"
  | "PHONE_VERIFIED"
  | "CONTACT_VERIFIED"
  | "SESSION_ACTIVITY"
  | "SESSION_ROTATED"
  | "SESSION_REVOKED"
  | "SESSION_EXPIRED";

export type OnboardingSessionEventJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly OnboardingSessionEventJsonValue[]
  | {
      readonly [key: string]:
        OnboardingSessionEventJsonValue;
    };

export type OnboardingSessionEventPayload = {
  readonly [key: string]:
    OnboardingSessionEventJsonValue;
};

export type CreateOnboardingSessionEventPayloadHashInput = {
  readonly eventId: string;
  readonly sessionId: string;
  readonly eventType: OnboardingSessionEventType;
  readonly occurredAt: string;
  readonly payload: OnboardingSessionEventPayload;
};

export type CreateOnboardingSessionEventHashInput = {
  readonly eventSeq: number;
  readonly previousEventHash: string | null;
  readonly eventPayloadSha256: string;
};

export type OnboardingSessionEventUuidSource =
  () => string;

export class OnboardingSessionEventCryptoError
  extends Error
{
  constructor(message: string) {
    super(message);
    this.name =
      "OnboardingSessionEventCryptoError";
  }
}

function isNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

export function isSha256LowerHex(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{64}$/.test(value)
  );
}

function assertNormalizedIso(
  value: string
): void {
  const parsed = new Date(value);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString() !== value
  ) {
    throw new OnboardingSessionEventCryptoError(
      "occurredAt must be a normalized ISO date-time."
    );
  }
}

function assertJsonValue(
  value: unknown,
  ancestors: Set<object>
): asserts value is OnboardingSessionEventJsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new OnboardingSessionEventCryptoError(
        "Event payload numbers must be finite."
      );
    }

    return;
  }

  if (typeof value !== "object") {
    throw new OnboardingSessionEventCryptoError(
      "Event payload must contain only canonical JSON values."
    );
  }

  const objectValue = value as object;

  if (ancestors.has(objectValue)) {
    throw new OnboardingSessionEventCryptoError(
      "Event payload must not contain cycles."
    );
  }

  ancestors.add(objectValue);

  try {
    if (Array.isArray(value)) {
      for (const item of value) {
        assertJsonValue(item, ancestors);
      }

      return;
    }

    const prototype =
      Object.getPrototypeOf(value);

    if (
      prototype !== Object.prototype &&
      prototype !== null
    ) {
      throw new OnboardingSessionEventCryptoError(
        "Event payload objects must be plain JSON objects."
      );
    }

    for (const item of Object.values(
      value as Record<string, unknown>
    )) {
      assertJsonValue(item, ancestors);
    }
  } finally {
    ancestors.delete(objectValue);
  }
}

function assertPayload(
  payload: OnboardingSessionEventPayload
): void {
  assertJsonValue(
    payload,
    new Set<object>()
  );

  if (
    payload === null ||
    Array.isArray(payload) ||
    typeof payload !== "object"
  ) {
    throw new OnboardingSessionEventCryptoError(
      "Event payload root must be a JSON object."
    );
  }
}

export function generateOnboardingSessionEventId(
  uuidSource:
    OnboardingSessionEventUuidSource = randomUUID
): string {
  const uuid = uuidSource();

  if (!isNonEmptyString(uuid)) {
    throw new OnboardingSessionEventCryptoError(
      "Event UUID source returned an invalid identifier."
    );
  }

  return `evt_session_${uuid}`;
}

export async function createOnboardingSessionEventPayloadSha256(
  input:
    CreateOnboardingSessionEventPayloadHashInput
): Promise<string> {
  if (!isNonEmptyString(input.eventId)) {
    throw new OnboardingSessionEventCryptoError(
      "eventId must be non-empty."
    );
  }

  if (!isNonEmptyString(input.sessionId)) {
    throw new OnboardingSessionEventCryptoError(
      "sessionId must be non-empty."
    );
  }

  assertNormalizedIso(input.occurredAt);
  assertPayload(input.payload);

  return sha256Canonical({
    version:
      HBCE_SESSION_EVENT_PAYLOAD_VERSION,
    eventId: input.eventId,
    sessionId: input.sessionId,
    eventType: input.eventType,
    occurredAt: input.occurredAt,
    payload: input.payload
  });
}

export async function createOnboardingSessionEventHash(
  input:
    CreateOnboardingSessionEventHashInput
): Promise<string> {
  if (
    !Number.isSafeInteger(input.eventSeq) ||
    input.eventSeq < 0
  ) {
    throw new OnboardingSessionEventCryptoError(
      "eventSeq must be a non-negative safe integer."
    );
  }

  if (!isSha256LowerHex(
    input.eventPayloadSha256
  )) {
    throw new OnboardingSessionEventCryptoError(
      "eventPayloadSha256 must be lowercase SHA-256 hexadecimal."
    );
  }

  if (input.eventSeq === 0) {
    if (input.previousEventHash !== null) {
      throw new OnboardingSessionEventCryptoError(
        "Genesis event must have null previousEventHash."
      );
    }
  } else if (
    !isSha256LowerHex(
      input.previousEventHash
    )
  ) {
    throw new OnboardingSessionEventCryptoError(
      "Non-genesis event requires a lowercase SHA-256 previousEventHash."
    );
  }

  const previousComponent =
    input.previousEventHash ??
    HBCE_SESSION_EVENT_GENESIS_PREVIOUS;

  const preimage = [
    HBCE_SESSION_EVENT_HASH_DOMAIN,
    String(input.eventSeq),
    previousComponent,
    input.eventPayloadSha256
  ].join("\n");

  return sha256Hex(preimage);
}
