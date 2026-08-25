import { describe, expect, it } from "vitest";

import {
  canAccessJokerC2,
  evaluateAccessDecision,
  evaluateJokerC2Access
} from "@/lib/access-decision";

import {
  approvedOnboardingRecord,
  deniedOnboardingRecord,
  pendingOnboardingRecord,
  revokedOnboardingRecord
} from "@/lib/mock-onboarding";

import type { OnboardingRecord } from "@/lib/types";

function buildFullyQualifiedApprovedRecord(): OnboardingRecord {
  return {
    ...approvedOnboardingRecord,
    currentStep: "phase_9_operational_certificate",
    latestPhaseNumber: 9,
    latestPhaseCertificateFileName:
      "hbce-ipr-09-operational-certificate.hbce.json",
    latestPhaseCertificateHash:
      "sha256_demo_operational_certificate_hash"
  };
}

describe("canonical JOKER-C2 access decision", () => {
  it("keeps the current approved fixture denied while certificate hash evidence is missing", () => {
    const result = evaluateJokerC2Access(
      approvedOnboardingRecord
    );

    expect(result.decision).toBe(
      "deny_access"
    );

    expect(
      result.jokerC2AccessStatus
    ).toBe("denied");

    expect(
      result.decisionReason
    ).toContain(
      "certificate hash"
    );
  });

  it("keeps pending onboarding unavailable", () => {
    const result = evaluateJokerC2Access(
      pendingOnboardingRecord
    );

    expect(result.decision).toBe(
      "pending_access"
    );

    expect(
      result.jokerC2AccessStatus
    ).toBe("pending");
  });

  it("denies rejected onboarding", () => {
    const result = evaluateJokerC2Access(
      deniedOnboardingRecord
    );

    expect(result.decision).toBe(
      "deny_access"
    );

    expect(
      result.jokerC2AccessStatus
    ).toBe("denied");
  });

  it("denies revoked onboarding", () => {
    const result = evaluateJokerC2Access(
      revokedOnboardingRecord
    );

    expect(result.decision).toBe(
      "deny_access"
    );

    expect(
      result.jokerC2AccessStatus
    ).toBe("denied");
  });

  it("allows only a fully qualified approved operational record", () => {
    const record =
      buildFullyQualifiedApprovedRecord();

    const result =
      evaluateAccessDecision(record);

    expect(result.decision).toBe(
      "allow_governed_access"
    );

    expect(
      result.jokerC2AccessStatus
    ).toBe("enabled");

    expect(
      canAccessJokerC2(record)
    ).toBe(true);
  });

  it("revocation overrides an otherwise fully qualified approved record", () => {
    const record: OnboardingRecord = {
      ...buildFullyQualifiedApprovedRecord(),
      revocationState: "revoked"
    };

    const result =
      evaluateAccessDecision(record);

    expect(result.decision).toBe(
      "deny_access"
    );

    expect(
      result.jokerC2AccessStatus
    ).toBe("denied");

    expect(
      canAccessJokerC2(record)
    ).toBe(false);
  });

  it("missing subject identity blocks an otherwise fully qualified record", () => {
    const record: OnboardingRecord = {
      ...buildFullyQualifiedApprovedRecord(),
      subjectId: ""
    };

    const result =
      evaluateAccessDecision(record);

    expect(result.decision).toBe(
      "deny_access"
    );

    expect(
      result.decisionReason
    ).toContain(
      "Subject identifier is missing"
    );
  });
});
