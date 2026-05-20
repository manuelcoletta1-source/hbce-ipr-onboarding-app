import {
  ACCESS_REQUIRED_CONDITIONS,
  JOKER_C2_GATEWAY_URL
} from "@/lib/constants";

import type {
  AccessDecision,
  AccessGateResult,
  JokerAccessStatus,
  OnboardingRecord
} from "@/lib/types";

type DecisionPayload = {
  decision: AccessDecision;
  jokerC2AccessStatus: JokerAccessStatus;
  decisionReason: string;
};

function deny(decisionReason: string): DecisionPayload {
  return {
    decision: "deny_access",
    jokerC2AccessStatus: "denied",
    decisionReason
  };
}

function pending(decisionReason: string): DecisionPayload {
  return {
    decision: "pending_access",
    jokerC2AccessStatus: "pending",
    decisionReason
  };
}

function allow(): DecisionPayload {
  return {
    decision: "allow_governed_access",
    jokerC2AccessStatus: "enabled",
    decisionReason:
      "Verified IPR, issued IPR Card, active operational certificate and clear revocation state are present. Governed JOKER-C2 access can be enabled."
  };
}

function isPendingOperationalState(record: OnboardingRecord): boolean {
  return (
    record.iprStatus === "pending" ||
    record.iprCardStatus === "pending" ||
    record.certificateStatus === "pending" ||
    record.revocationState === "under_review"
  );
}

export function evaluateJokerC2Access(record: OnboardingRecord): AccessGateResult {
  const decisionPayload = evaluateAccessDecision(record);

  return {
    subjectId: record.subjectId,
    iprId: record.iprId,
    iprStatus: record.iprStatus,
    iprCardStatus: record.iprCardStatus,
    certificateStatus: record.certificateStatus,
    revocationState: record.revocationState,
    jokerC2AccessStatus: decisionPayload.jokerC2AccessStatus,
    decision: decisionPayload.decision,
    decisionReason: decisionPayload.decisionReason,
    requiredConditions: [...ACCESS_REQUIRED_CONDITIONS],
    currentConditions: buildCurrentConditions(record),
    gatewayReference: JOKER_C2_GATEWAY_URL,
    decidedAt: new Date().toISOString()
  };
}

export function evaluateAccessDecision(record: OnboardingRecord): DecisionPayload {
  if (record.revocationState === "revoked") {
    return deny("Revocation state is revoked. Access is blocked.");
  }

  if (record.revocationState === "suspended") {
    return deny("Revocation state is suspended. Access is blocked.");
  }

  if (record.revocationState === "expired") {
    return deny("Revocation state is expired. Access is blocked.");
  }

  if (record.iprStatus === "revoked" || record.iprStatus === "suspended") {
    return deny("IPR status is revoked or suspended. Access is blocked.");
  }

  if (
    record.iprCardStatus === "revoked" ||
    record.iprCardStatus === "suspended"
  ) {
    return deny("IPR Card status is revoked or suspended. Access is blocked.");
  }

  if (
    record.certificateStatus === "revoked" ||
    record.certificateStatus === "suspended"
  ) {
    return deny(
      "Operational certificate status is revoked or suspended. Access is blocked."
    );
  }

  if (record.iprStatus === "rejected") {
    return deny("IPR status is rejected. Access is blocked.");
  }

  if (record.iprCardStatus === "expired") {
    return deny("IPR Card status is expired. Access is blocked.");
  }

  if (record.certificateStatus === "expired") {
    return deny("Operational certificate status is expired. Access is blocked.");
  }

  if (isPendingOperationalState(record)) {
    return pending(
      "Operational identity verification is still pending or under review. Fail-closed policy keeps JOKER-C2 access unavailable."
    );
  }

  if (record.iprStatus !== "verified") {
    return deny("IPR status is not verified.");
  }

  if (record.iprCardStatus !== "issued") {
    return deny("IPR Card status is not issued.");
  }

  if (record.certificateStatus !== "active") {
    return deny("Operational certificate status is not active.");
  }

  if (record.revocationState !== "clear") {
    return deny("Revocation state is not clear.");
  }

  return allow();
}

export function canAccessJokerC2(record: OnboardingRecord): boolean {
  return evaluateAccessDecision(record).decision === "allow_governed_access";
}

export function buildCurrentConditions(record: OnboardingRecord): string[] {
  return [
    `IPR status: ${record.iprStatus}`,
    `IPR Card status: ${record.iprCardStatus}`,
    `Operational certificate status: ${record.certificateStatus}`,
    `Revocation state: ${record.revocationState}`
  ];
}
