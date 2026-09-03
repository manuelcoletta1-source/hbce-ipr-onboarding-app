import { describe, expect, it } from "vitest";

import {
  ONBOARDING_CANONICAL_SUBJECT_STATE_VERSION,
  buildOnboardingTrustedIngressEvidence,
  type OnboardingCanonicalSubjectState
} from "../lib/onboarding-canonical-subject-state";

function buildCanonicalState(
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

describe("onboarding canonical subject state", () => {
  it("builds minimized trusted-ingress evidence from a complete bound state", () => {
    const result = buildOnboardingTrustedIngressEvidence(
      buildCanonicalState()
    );

    expect(result).toEqual({
      ok: true,
      evidence: {
        iprId: "IPR-HBCE-001",
        subjectId: "sub_server_001",
        iprStatus: "verified",
        iprCardStatus: "issued",
        certificateStatus: "active",
        revocationState: "clear",
        jokerC2AccessStatus: "enabled",
        latestPhaseNumber: 9,
        latestPhaseCertificateHash: "sha256_certificate_09",
        certificateId: "CERT-HBCE-001",
        certificateHash: "sha256_certificate_09",
        certificateScope: "JOKER_C2_ACCESS",
        cardSerial: "CARD-SERIAL-001"
      }
    });

    if (result.ok) {
      expect(result.evidence).not.toHaveProperty("verifiedSubject");
      expect(result.evidence).not.toHaveProperty("runtimeAuthorized");
      expect(result.evidence).not.toHaveProperty("sessionAuthenticated");
      expect(result.evidence).not.toHaveProperty(
        "profilePersistenceAuthorized"
      );
      expect(result.evidence).not.toHaveProperty("accountId");
    }
  });

  it("fails closed when the canonical IPR state is absent", () => {
    const result = buildOnboardingTrustedIngressEvidence(
      buildCanonicalState({ ipr: null })
    );

    expect(result).toMatchObject({
      ok: false,
      code: "MISSING_IPR_STATE"
    });
  });

  it("fails closed when certificate and subject bindings differ", () => {
    const state = buildCanonicalState();

    const result = buildOnboardingTrustedIngressEvidence({
      ...state,
      operationalCertificate: {
        ...state.operationalCertificate!,
        subjectId: "sub_client_supplied"
      }
    });

    expect(result).toMatchObject({
      ok: false,
      code: "SUBJECT_BINDING_MISMATCH"
    });
  });

  it("fails closed when card and certificate IPR bindings differ", () => {
    const state = buildCanonicalState();

    const result = buildOnboardingTrustedIngressEvidence({
      ...state,
      operationalCertificate: {
        ...state.operationalCertificate!,
        iprId: "IPR-HBCE-DIFFERENT"
      }
    });

    expect(result).toMatchObject({
      ok: false,
      code: "IPR_BINDING_MISMATCH"
    });
  });

  it("fails closed when certificate and card serial bindings differ", () => {
    const state = buildCanonicalState();

    const result = buildOnboardingTrustedIngressEvidence({
      ...state,
      operationalCertificate: {
        ...state.operationalCertificate!,
        cardSerial: "CARD-SERIAL-DIFFERENT"
      }
    });

    expect(result).toMatchObject({
      ok: false,
      code: "CARD_BINDING_MISMATCH"
    });
  });

  it("fails closed when the latest phase hash differs from certificate 09", () => {
    const state = buildCanonicalState();

    const result = buildOnboardingTrustedIngressEvidence({
      ...state,
      latestPhase: {
        phaseNumber: 9,
        certificateHash: "sha256_mismatched_certificate"
      }
    });

    expect(result).toMatchObject({
      ok: false,
      code: "CERTIFICATE_HASH_MISMATCH"
    });
  });

  it("fails closed before operational phase 9", () => {
    const state = buildCanonicalState();

    const result = buildOnboardingTrustedIngressEvidence({
      ...state,
      latestPhase: {
        phaseNumber: 8,
        certificateHash: "sha256_certificate_09"
      }
    });

    expect(result).toMatchObject({
      ok: false,
      code: "INVALID_OPERATIONAL_PHASE"
    });
  });

  it("projects revocation as overriding negative eligibility", () => {
    const result = buildOnboardingTrustedIngressEvidence(
      buildCanonicalState({ revocationState: "revoked" })
    );

    expect(result).toMatchObject({
      ok: true,
      evidence: {
        revocationState: "revoked",
        jokerC2AccessStatus: "revoked"
      }
    });
  });

  it("projects under-review state as pending eligibility", () => {
    const result = buildOnboardingTrustedIngressEvidence(
      buildCanonicalState({ revocationState: "under_review" })
    );

    expect(result).toMatchObject({
      ok: true,
      evidence: {
        revocationState: "under_review",
        jokerC2AccessStatus: "pending"
      }
    });
  });

  it("does not convert a non-qualified complete state into enabled eligibility", () => {
    const state = buildCanonicalState();

    const result = buildOnboardingTrustedIngressEvidence({
      ...state,
      ipr: {
        ...state.ipr!,
        status: "rejected"
      }
    });

    expect(result).toMatchObject({
      ok: true,
      evidence: {
        iprStatus: "rejected",
        jokerC2AccessStatus: "denied"
      }
    });
  });
});
