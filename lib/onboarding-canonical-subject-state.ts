import type {
  CertificateStatus,
  HashReference,
  HbceIprPhaseNumber,
  IprCardStatus,
  IprStatus,
  IsoDateTime,
  JokerAccessStatus,
  RevocationState
} from "@/lib/types";

/**
 * Server-side canonical state owned by IPR Onboarding.
 *
 * It may support a minimized projection into Platform Core. It does not
 * authenticate a Core session and does not grant Core runtime authority.
 */
export const ONBOARDING_CANONICAL_SUBJECT_STATE_VERSION =
  "HBCE-IPR-ONBOARDING-CANONICAL-SUBJECT-STATE-v1.0" as const;

export type OnboardingCanonicalSubjectStateVersion =
  typeof ONBOARDING_CANONICAL_SUBJECT_STATE_VERSION;

export type CanonicalIprState = {
  readonly iprId: string;
  readonly subjectId: string;
  readonly status: IprStatus;
  readonly hashReference: HashReference;
};

export type CanonicalIprCardState = {
  readonly iprCardId: string;
  readonly iprId: string;
  readonly subjectId: string;
  readonly cardSerial: string;
  readonly status: IprCardStatus;
  readonly payloadSha256: HashReference;
};

export type CanonicalOperationalCertificateState = {
  readonly certificateId: string;
  readonly iprId: string;
  readonly subjectId: string;
  readonly cardSerial: string;
  readonly status: CertificateStatus;
  readonly scope: "JOKER_C2_ACCESS";
  readonly payloadSha256: HashReference;
  readonly previousPayloadSha256: HashReference;
  readonly integrityDecision: "VALID";
  readonly integrityCheckedAt: IsoDateTime;
};

export type CanonicalLatestPhaseState = {
  readonly phaseNumber: HbceIprPhaseNumber;
  readonly certificateHash: HashReference;
};

export type OnboardingCanonicalSubjectState = {
  readonly version: OnboardingCanonicalSubjectStateVersion;
  readonly subjectId: string;
  readonly onboardingId: string;
  readonly ipr: CanonicalIprState | null;
  readonly iprCard: CanonicalIprCardState | null;
  readonly operationalCertificate:
    | CanonicalOperationalCertificateState
    | null;
  readonly latestPhase: CanonicalLatestPhaseState | null;
  readonly revocationState: RevocationState;
  readonly revision: number;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
};

/**
 * Persistence boundary.
 *
 * Implementations must use durable server-side storage and atomic revision
 * checks. Browser state, globalThis, local files and demo records do not
 * conform to this contract.
 */
export type OnboardingCanonicalStateAuditContext = {
  readonly eventId: string;
  readonly eventType: string;
  readonly decisionState: string;
  readonly previousEventHash: string | null;
  readonly eventHash: string;
  readonly eventPayloadSha256: string;
  readonly occurredAt: IsoDateTime;
};

export type SaveOnboardingCanonicalSubjectStateCommand = {
  readonly state: OnboardingCanonicalSubjectState;
  readonly expectedRevision: number;
  readonly audit: OnboardingCanonicalStateAuditContext;
};

export interface OnboardingCanonicalSubjectStateRepository {
  getBySubjectId(
    subjectId: string
  ): Promise<OnboardingCanonicalSubjectState | null>;

  getByOnboardingId(
    onboardingId: string
  ): Promise<OnboardingCanonicalSubjectState | null>;

  save(
    command: SaveOnboardingCanonicalSubjectStateCommand
  ): Promise<OnboardingCanonicalSubjectState>;
}

/**
 * Minimized evidence accepted by the service-to-service producer.
 *
 * Transport metadata such as envelope version, issuedAt and nonce does not
 * belong to the stored subject state.
 */
export type OnboardingTrustedIngressEvidence = {
  readonly iprId: string;
  readonly subjectId: string;
  readonly iprStatus: IprStatus;
  readonly iprCardStatus: IprCardStatus;
  readonly certificateStatus: CertificateStatus;
  readonly revocationState: RevocationState;

  /**
   * Onboarding eligibility evidence only.
   *
   * "enabled" neither authenticates a Platform Core session nor authorizes
   * JOKER-C2 runtime access.
   */
  readonly jokerC2AccessStatus: JokerAccessStatus;
  readonly latestPhaseNumber: HbceIprPhaseNumber;
  readonly latestPhaseCertificateHash: HashReference;
  readonly certificateId: string;
  readonly certificateHash: HashReference;
  readonly certificateScope: "JOKER_C2_ACCESS";
  readonly cardSerial: string;
};

export type OnboardingProjectionFailureCode =
  | "INVALID_CANONICAL_STATE_VERSION"
  | "INVALID_REVISION"
  | "MISSING_SUBJECT_ID"
  | "MISSING_ONBOARDING_ID"
  | "MISSING_IPR_STATE"
  | "MISSING_IPR_CARD_STATE"
  | "MISSING_OPERATIONAL_CERTIFICATE_STATE"
  | "MISSING_LATEST_PHASE_STATE"
  | "MISSING_HASH_EVIDENCE"
  | "SUBJECT_BINDING_MISMATCH"
  | "IPR_BINDING_MISMATCH"
  | "CARD_BINDING_MISMATCH"
  | "CERTIFICATE_HASH_MISMATCH"
  | "INVALID_OPERATIONAL_PHASE"
  | "INVALID_CERTIFICATE_SCOPE"
  | "CERTIFICATE_INTEGRITY_NOT_VALID";

export type OnboardingTrustedIngressProjectionResult =
  | {
      readonly ok: true;
      readonly evidence: OnboardingTrustedIngressEvidence;
    }
  | {
      readonly ok: false;
      readonly code: OnboardingProjectionFailureCode;
      readonly message: string;
    };

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function fail(
  code: OnboardingProjectionFailureCode,
  message: string
): OnboardingTrustedIngressProjectionResult {
  return {
    ok: false,
    code,
    message
  };
}

function deriveJokerC2AccessStatus(
  state: OnboardingCanonicalSubjectState
): JokerAccessStatus {
  if (state.revocationState === "revoked") {
    return "revoked";
  }

  if (state.revocationState === "suspended") {
    return "suspended";
  }

  if (
    state.revocationState === "expired" ||
    state.ipr?.status === "expired" ||
    state.iprCard?.status === "expired" ||
    state.operationalCertificate?.status === "expired"
  ) {
    return "disabled";
  }

  if (
    state.revocationState === "under_review" ||
    state.ipr?.status === "pending" ||
    state.iprCard?.status === "pending" ||
    state.operationalCertificate?.status === "pending"
  ) {
    return "pending";
  }

  if (
    state.revocationState === "clear" &&
    state.ipr?.status === "verified" &&
    state.iprCard?.status === "issued" &&
    state.operationalCertificate?.status === "active" &&
    state.operationalCertificate.scope === "JOKER_C2_ACCESS" &&
    state.latestPhase?.phaseNumber === 9
  ) {
    return "enabled";
  }

  return "denied";
}

/**
 * Builds evidence exclusively from server-owned canonical state.
 *
 * It never consumes browser claims and never produces Core session or
 * runtime-authorization fields.
 */
export function buildOnboardingTrustedIngressEvidence(
  state: OnboardingCanonicalSubjectState
): OnboardingTrustedIngressProjectionResult {
  if (state.version !== ONBOARDING_CANONICAL_SUBJECT_STATE_VERSION) {
    return fail(
      "INVALID_CANONICAL_STATE_VERSION",
      "Canonical subject state version is not supported."
    );
  }

  if (!Number.isSafeInteger(state.revision) || state.revision < 0) {
    return fail(
      "INVALID_REVISION",
      "Canonical state revision must be a non-negative safe integer."
    );
  }

  if (!hasText(state.subjectId)) {
    return fail("MISSING_SUBJECT_ID", "Canonical subject identifier is missing.");
  }

  if (!hasText(state.onboardingId)) {
    return fail(
      "MISSING_ONBOARDING_ID",
      "Canonical onboarding identifier is missing."
    );
  }

  if (!state.ipr) {
    return fail("MISSING_IPR_STATE", "Canonical IPR state is missing.");
  }

  if (!state.iprCard) {
    return fail(
      "MISSING_IPR_CARD_STATE",
      "Canonical IPR Card state is missing."
    );
  }

  if (!state.operationalCertificate) {
    return fail(
      "MISSING_OPERATIONAL_CERTIFICATE_STATE",
      "Canonical operational certificate state is missing."
    );
  }

  if (!state.latestPhase) {
    return fail(
      "MISSING_LATEST_PHASE_STATE",
      "Canonical latest phase state is missing."
    );
  }

  const { ipr, iprCard, operationalCertificate, latestPhase } = state;

  if (
    !hasText(ipr.hashReference) ||
    !hasText(iprCard.payloadSha256) ||
    !hasText(operationalCertificate.payloadSha256) ||
    !hasText(operationalCertificate.previousPayloadSha256) ||
    !hasText(latestPhase.certificateHash)
  ) {
    return fail(
      "MISSING_HASH_EVIDENCE",
      "Required canonical hash evidence is missing."
    );
  }

  if (
    ipr.subjectId !== state.subjectId ||
    iprCard.subjectId !== state.subjectId ||
    operationalCertificate.subjectId !== state.subjectId
  ) {
    return fail(
      "SUBJECT_BINDING_MISMATCH",
      "IPR, card and certificate must bind to the canonical subject."
    );
  }

  if (
    iprCard.iprId !== ipr.iprId ||
    operationalCertificate.iprId !== ipr.iprId
  ) {
    return fail(
      "IPR_BINDING_MISMATCH",
      "IPR Card and certificate must bind to the canonical IPR."
    );
  }

  if (operationalCertificate.cardSerial !== iprCard.cardSerial) {
    return fail(
      "CARD_BINDING_MISMATCH",
      "Operational certificate must bind to the canonical IPR Card."
    );
  }

  if (
    latestPhase.certificateHash !== operationalCertificate.payloadSha256
  ) {
    return fail(
      "CERTIFICATE_HASH_MISMATCH",
      "Latest phase hash must match the operational certificate payload hash."
    );
  }

  if (latestPhase.phaseNumber !== 9) {
    return fail(
      "INVALID_OPERATIONAL_PHASE",
      "Trusted ingress requires the final operational certificate phase."
    );
  }

  if (operationalCertificate.scope !== "JOKER_C2_ACCESS") {
    return fail(
      "INVALID_CERTIFICATE_SCOPE",
      "Operational certificate scope is invalid for JOKER-C2 ingress."
    );
  }

  if (operationalCertificate.integrityDecision !== "VALID") {
    return fail(
      "CERTIFICATE_INTEGRITY_NOT_VALID",
      "Operational certificate integrity has not been validated."
    );
  }

  return {
    ok: true,
    evidence: {
      iprId: ipr.iprId,
      subjectId: state.subjectId,
      iprStatus: ipr.status,
      iprCardStatus: iprCard.status,
      certificateStatus: operationalCertificate.status,
      revocationState: state.revocationState,
      jokerC2AccessStatus: deriveJokerC2AccessStatus(state),
      latestPhaseNumber: latestPhase.phaseNumber,
      latestPhaseCertificateHash: latestPhase.certificateHash,
      certificateId: operationalCertificate.certificateId,
      certificateHash: operationalCertificate.payloadSha256,
      certificateScope: operationalCertificate.scope,
      cardSerial: iprCard.cardSerial
    }
  };
}
