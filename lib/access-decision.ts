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
      "Verified IPR, issued IPR Card, active operational certificate, final certificate phase, certificate hash and clear revocation state are present. Governed JOKER-C2 access can be enabled."
  };
}

function hasText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasReachedOperationalCertificatePhase(record: OnboardingRecord): boolean {
  return (
    record.currentStep === "phase_9_operational_certificate" ||
    record.currentStep === "joker_c2_access" ||
    record.currentStep === "completed" ||
    record.latestPhaseNumber === 9 ||
    record.latestPhaseCertificateFileName ===
      "hbce-ipr-09-operational-certificate.hbce.json"
  );
}

function hasOperationalCertificateHash(record: OnboardingRecord): boolean {
  return hasText(record.latestPhaseCertificateHash);
}

function hasBlockingRevocationState(record: OnboardingRecord): boolean {
  return (
    record.revocationState === "revoked" ||
    record.revocationState === "suspended" ||
    record.revocationState === "expired"
  );
}

function hasBlockingIprState(record: OnboardingRecord): boolean {
  return (
    record.iprStatus === "revoked" ||
    record.iprStatus === "suspended" ||
    record.iprStatus === "rejected" ||
    record.iprStatus === "expired"
  );
}

function hasBlockingCardState(record: OnboardingRecord): boolean {
  return (
    record.iprCardStatus === "revoked" ||
    record.iprCardStatus === "suspended" ||
    record.iprCardStatus === "expired"
  );
}

function hasBlockingCertificateState(record: OnboardingRecord): boolean {
  return (
    record.certificateStatus === "revoked" ||
    record.certificateStatus === "suspended" ||
    record.certificateStatus === "expired"
  );
}

function isPendingOperationalState(record: OnboardingRecord): boolean {
  return (
    record.onboardingStatus === "in_progress" ||
    record.onboardingStatus === "pending_review" ||
    record.iprStatus === "pending" ||
    record.iprCardStatus === "pending" ||
    record.certificateStatus === "pending" ||
    record.reviewStatus === "pending" ||
    record.reviewStatus === "in_review" ||
    record.reviewStatus === "manual_review" ||
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
  if (!hasText(record.subjectId)) {
    return deny("Subject identifier is missing. Access is blocked.");
  }

  if (!hasText(record.iprId)) {
    return deny("IPR identifier is missing. Access is blocked.");
  }

  if (hasBlockingRevocationState(record)) {
    return deny(`Revocation state is ${record.revocationState}. Access is blocked.`);
  }

  if (hasBlockingIprState(record)) {
    return deny(`IPR status is ${record.iprStatus}. Access is blocked.`);
  }

  if (hasBlockingCardState(record)) {
    return deny(`IPR Card status is ${record.iprCardStatus}. Access is blocked.`);
  }

  if (hasBlockingCertificateState(record)) {
    return deny(
      `Operational certificate status is ${record.certificateStatus}. Access is blocked.`
    );
  }

  if (record.jokerC2AccessStatus === "revoked") {
    return deny("JOKER-C2 access status is revoked. Access is blocked.");
  }

  if (record.jokerC2AccessStatus === "suspended") {
    return deny("JOKER-C2 access status is suspended. Access is blocked.");
  }

  if (record.jokerC2AccessStatus === "disabled") {
    return deny("JOKER-C2 access status is disabled. Access is blocked.");
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

  if (!hasReachedOperationalCertificatePhase(record)) {
    return deny(
      "Final operational certificate phase has not been reached. Certificate 09 is required before JOKER-C2 access."
    );
  }

  if (!hasOperationalCertificateHash(record)) {
    return deny(
      "Operational certificate hash reference is missing. Certificate 09 hash evidence is required before JOKER-C2 access."
    );
  }

  return allow();
}

export function canAccessJokerC2(record: OnboardingRecord): boolean {
  return evaluateAccessDecision(record).decision === "allow_governed_access";
}

export function buildCurrentConditions(record: OnboardingRecord): string[] {
  return [
    `Subject ID: ${record.subjectId || "missing"}`,
    `IPR ID: ${record.iprId || "missing"}`,
    `Current step: ${record.currentStep}`,
    `Latest phase number: ${record.latestPhaseNumber ?? "missing"}`,
    `Latest phase certificate file: ${
      record.latestPhaseCertificateFileName ?? "missing"
    }`,
    `Latest phase certificate hash: ${
      record.latestPhaseCertificateHash ?? "missing"
    }`,
    `IPR status: ${record.iprStatus}`,
    `IPR Card status: ${record.iprCardStatus}`,
    `Operational certificate status: ${record.certificateStatus}`,
    `Revocation state: ${record.revocationState}`,
    `JOKER-C2 access status: ${record.jokerC2AccessStatus}`
  ];
}
