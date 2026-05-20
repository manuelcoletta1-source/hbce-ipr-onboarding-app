import { ACCESS_REQUIRED_CONDITIONS, JOKER_C2_GATEWAY_URL } from "@/lib/constants";

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

function allow(): DecisionPayload {
  return {
    decision: "allow_governed_access",
    jokerC2AccessStatus: "enabled",
    decisionReason:
      "Verified IPR, issued IPR Card, active operational certificate and clear revocation state are present."
  };
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
