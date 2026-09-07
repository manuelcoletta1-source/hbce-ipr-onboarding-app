import "server-only";

import {
  randomUUID
} from "node:crypto";

import {
  OnboardingSessionEventCommandError,
  NeonOnboardingSessionEventCommands,
  type RotateStartedSessionInput
} from "@/lib/server/neon-onboarding-session-event-commands";

import {
  ONBOARDING_SESSION_ABSOLUTE_TTL_SECONDS,
  ONBOARDING_SESSION_IDLE_TTL_SECONDS,
  createNeonOnboardingSessionRepository,
  type OnboardingSessionRecord,
  type OnboardingSessionRepository,
  type OnboardingSessionTrustState
} from "@/lib/server/neon-onboarding-session-repository";

import {
  isValidOnboardingSessionCookieToken
} from "@/lib/server/onboarding-session-cookie";

import {
  generateOnboardingSessionToken,
  sha256OnboardingSessionToken,
  type GeneratedOnboardingSessionToken
} from "@/lib/server/onboarding-session-token";

export const ONBOARDING_SESSION_IDLE_RECOVERY_REASON =
  "session-idle-recovery" as const;

export type OnboardingSessionRecoveryErrorCode =
  | "UNAUTHORIZED"
  | "NOT_RECOVERABLE"
  | "DEPENDENCY_FAILURE";

export class OnboardingSessionRecoveryError
  extends Error
{
  readonly code:
    OnboardingSessionRecoveryErrorCode;

  constructor(
    code: OnboardingSessionRecoveryErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "OnboardingSessionRecoveryError";

    this.code = code;
  }
}

export type RecoverOnboardingSessionInput = {
  readonly rawToken: unknown;
};

export type RecoveredOnboardingSession = {
  readonly rawToken: string;
  readonly session: OnboardingSessionRecord;
};

export type OnboardingSessionRecoveryRepositoryDependency =
  Pick<
    OnboardingSessionRepository,
    "getByTokenSha256"
  >;

export type OnboardingSessionStartedRotationDependency = {
  rotateStartedSession(
    input: RotateStartedSessionInput
  ): Promise<OnboardingSessionRecord>;
};

export type OnboardingSessionRecoveryClock =
  () => Date;

export type OnboardingSessionRecoveryIdFactory =
  () => string;

export type OnboardingSessionRecoveryTokenFactory =
  () => GeneratedOnboardingSessionToken;

function systemClock(): Date {
  return new Date();
}

function defaultSessionIdFactory(): string {
  return `session_${randomUUID()}`;
}

function defaultTokenFactory():
  GeneratedOnboardingSessionToken
{
  return generateOnboardingSessionToken();
}

function parseNormalizedIsoDateTime(
  value: string
): number | null {
  const parsed =
    new Date(value);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString() !== value
  ) {
    return null;
  }

  return parsed.getTime();
}

function readNormalizedServerTime(
  clock: OnboardingSessionRecoveryClock
): {
  readonly iso: string;
  readonly milliseconds: number;
} {
  let value: Date;

  try {
    value = clock();
  } catch {
    throw new OnboardingSessionRecoveryError(
      "DEPENDENCY_FAILURE",
      "Onboarding session recovery clock failed."
    );
  }

  if (
    !(value instanceof Date) ||
    Number.isNaN(value.getTime())
  ) {
    throw new OnboardingSessionRecoveryError(
      "DEPENDENCY_FAILURE",
      "Onboarding session recovery clock returned an invalid server time."
    );
  }

  return {
    iso: value.toISOString(),
    milliseconds: value.getTime()
  };
}

function assertRecoverableTrustState(
  trustState: OnboardingSessionTrustState,
  nowMs: number
): void {
  const absoluteExpiresAtMs =
    parseNormalizedIsoDateTime(
      trustState.session.absoluteExpiresAt
    );

  const lastActivityAtMs =
    parseNormalizedIsoDateTime(
      trustState.lastActivityAt
    );

  if (
    absoluteExpiresAtMs === null ||
    lastActivityAtMs === null ||
    lastActivityAtMs > nowMs
  ) {
    throw new OnboardingSessionRecoveryError(
      "DEPENDENCY_FAILURE",
      "Onboarding session recovery received an invalid canonical trust state."
    );
  }

  if (
    trustState.session.issuedState !== "STARTED" ||
    trustState.contactVerified ||
    trustState.rotated ||
    trustState.revoked ||
    trustState.expiredEvent
  ) {
    throw new OnboardingSessionRecoveryError(
      "NOT_RECOVERABLE",
      "Onboarding session is not eligible for STARTED idle recovery."
    );
  }

  if (
    nowMs >= absoluteExpiresAtMs
  ) {
    throw new OnboardingSessionRecoveryError(
      "NOT_RECOVERABLE",
      "Onboarding session is beyond its absolute recovery boundary."
    );
  }

  const idleExpiresAtMs =
    lastActivityAtMs +
    (
      ONBOARDING_SESSION_IDLE_TTL_SECONDS *
      1000
    );

  if (
    nowMs < idleExpiresAtMs
  ) {
    throw new OnboardingSessionRecoveryError(
      "NOT_RECOVERABLE",
      "Onboarding session has not reached its idle recovery boundary."
    );
  }
}

function createRecoveryArtifacts(
  sourceSessionId: string,
  nowIso: string,
  nowMs: number,
  idFactory:
    OnboardingSessionRecoveryIdFactory,
  tokenFactory:
    OnboardingSessionRecoveryTokenFactory
): {
  readonly newSessionId: string;
  readonly generatedToken:
    GeneratedOnboardingSessionToken;
  readonly absoluteExpiresAt: string;
} {
  let newSessionId: string;

  try {
    newSessionId =
      idFactory();
  } catch {
    throw new OnboardingSessionRecoveryError(
      "DEPENDENCY_FAILURE",
      "Onboarding session recovery identifier generation failed."
    );
  }

  if (
    typeof newSessionId !== "string" ||
    newSessionId.trim().length === 0 ||
    newSessionId !== newSessionId.trim() ||
    newSessionId === sourceSessionId
  ) {
    throw new OnboardingSessionRecoveryError(
      "DEPENDENCY_FAILURE",
      "Onboarding session recovery generated an invalid successor identifier."
    );
  }

  let generatedToken:
    GeneratedOnboardingSessionToken;

  try {
    generatedToken =
      tokenFactory();
  } catch {
    throw new OnboardingSessionRecoveryError(
      "DEPENDENCY_FAILURE",
      "Onboarding session recovery token generation failed."
    );
  }

  if (
    !isValidOnboardingSessionCookieToken(
      generatedToken.rawToken
    )
  ) {
    throw new OnboardingSessionRecoveryError(
      "DEPENDENCY_FAILURE",
      "Onboarding session recovery generated an invalid opaque token."
    );
  }

  let recomputedTokenSha256: string;

  try {
    recomputedTokenSha256 =
      sha256OnboardingSessionToken(
        generatedToken.rawToken
      );
  } catch {
    throw new OnboardingSessionRecoveryError(
      "DEPENDENCY_FAILURE",
      "Onboarding session recovery token digest validation failed."
    );
  }

  if (
    recomputedTokenSha256 !==
      generatedToken.tokenSha256
  ) {
    throw new OnboardingSessionRecoveryError(
      "DEPENDENCY_FAILURE",
      "Onboarding session recovery token digest is inconsistent."
    );
  }

  const absoluteExpiresAt =
    new Date(
      nowMs +
      (
        ONBOARDING_SESSION_ABSOLUTE_TTL_SECONDS *
        1000
      )
    ).toISOString();

  if (
    new Date(absoluteExpiresAt).getTime() -
      new Date(nowIso).getTime() !==
      (
        ONBOARDING_SESSION_ABSOLUTE_TTL_SECONDS *
        1000
      )
  ) {
    throw new OnboardingSessionRecoveryError(
      "DEPENDENCY_FAILURE",
      "Onboarding session recovery absolute TTL construction failed."
    );
  }

  return {
    newSessionId,
    generatedToken,
    absoluteExpiresAt
  };
}

function mapRotationFailure(
  error: unknown
): never {
  if (
    error instanceof
    OnboardingSessionRecoveryError
  ) {
    throw error;
  }

  if (
    error instanceof
      OnboardingSessionEventCommandError &&
    error.code ===
      "ROTATION_DENIED"
  ) {
    throw new OnboardingSessionRecoveryError(
      "NOT_RECOVERABLE",
      "Onboarding session recovery lost eligibility before atomic rotation."
    );
  }

  throw new OnboardingSessionRecoveryError(
    "DEPENDENCY_FAILURE",
    "Onboarding session recovery rotation failed."
  );
}

function assertRecoveredSession(
  result: OnboardingSessionRecord,
  source:
    OnboardingSessionTrustState,
  expected: {
    readonly newSessionId: string;
    readonly tokenSha256: string;
    readonly issuedAt: string;
    readonly absoluteExpiresAt: string;
  }
): void {
  if (
    result.sessionId !==
      expected.newSessionId ||
    result.onboardingId !==
      source.session.onboardingId ||
    result.subjectId !==
      source.session.subjectId ||
    result.tokenSha256 !==
      expected.tokenSha256 ||
    result.issuedState !==
      "STARTED" ||
    result.issuedAt !==
      expected.issuedAt ||
    result.absoluteExpiresAt !==
      expected.absoluteExpiresAt ||
    result.rotatedFromSessionId !==
      source.session.sessionId ||
    result.createdAt !==
      expected.issuedAt
  ) {
    throw new OnboardingSessionRecoveryError(
      "DEPENDENCY_FAILURE",
      "Onboarding session recovery returned an invalid successor session."
    );
  }
}

export class OnboardingSessionRecoveryService {
  private readonly repository:
    OnboardingSessionRecoveryRepositoryDependency;

  private readonly rotations:
    OnboardingSessionStartedRotationDependency;

  private readonly clock:
    OnboardingSessionRecoveryClock;

  private readonly idFactory:
    OnboardingSessionRecoveryIdFactory;

  private readonly tokenFactory:
    OnboardingSessionRecoveryTokenFactory;

  constructor(
    repository:
      OnboardingSessionRecoveryRepositoryDependency,
    rotations:
      OnboardingSessionStartedRotationDependency,
    clock:
      OnboardingSessionRecoveryClock =
        systemClock,
    idFactory:
      OnboardingSessionRecoveryIdFactory =
        defaultSessionIdFactory,
    tokenFactory:
      OnboardingSessionRecoveryTokenFactory =
        defaultTokenFactory
  ) {
    this.repository = repository;
    this.rotations = rotations;
    this.clock = clock;
    this.idFactory = idFactory;
    this.tokenFactory = tokenFactory;
  }

  async recover(
    input:
      RecoverOnboardingSessionInput
  ): Promise<RecoveredOnboardingSession> {
    if (
      !isValidOnboardingSessionCookieToken(
        input.rawToken
      )
    ) {
      throw new OnboardingSessionRecoveryError(
        "UNAUTHORIZED",
        "A valid onboarding session cookie is required for recovery."
      );
    }

    const now =
      readNormalizedServerTime(
        this.clock
      );

    let tokenSha256: string;

    try {
      tokenSha256 =
        sha256OnboardingSessionToken(
          input.rawToken
        );
    } catch {
      throw new OnboardingSessionRecoveryError(
        "UNAUTHORIZED",
        "Onboarding session recovery token is invalid."
      );
    }

    let trustState:
      OnboardingSessionTrustState |
      null;

    try {
      trustState =
        await this.repository.getByTokenSha256(
          tokenSha256
        );
    } catch {
      throw new OnboardingSessionRecoveryError(
        "DEPENDENCY_FAILURE",
        "Onboarding session recovery repository lookup failed."
      );
    }

    if (!trustState) {
      throw new OnboardingSessionRecoveryError(
        "UNAUTHORIZED",
        "Onboarding session recovery could not resolve the supplied session."
      );
    }

    assertRecoverableTrustState(
      trustState,
      now.milliseconds
    );

    const artifacts =
      createRecoveryArtifacts(
        trustState.session.sessionId,
        now.iso,
        now.milliseconds,
        this.idFactory,
        this.tokenFactory
      );

    let recovered:
      OnboardingSessionRecord;

    try {
      recovered =
        await this.rotations.rotateStartedSession({
          sourceSessionId:
            trustState.session.sessionId,
          newSessionId:
            artifacts.newSessionId,
          newTokenSha256:
            artifacts.generatedToken.tokenSha256,
          issuedAt:
            now.iso,
          absoluteExpiresAt:
            artifacts.absoluteExpiresAt,
          createdAt:
            now.iso,
          rotatedPayload: {
            reason:
              ONBOARDING_SESSION_IDLE_RECOVERY_REASON
          },
          newSessionCreatedPayload: {
            issuedState:
              "STARTED",
            reason:
              ONBOARDING_SESSION_IDLE_RECOVERY_REASON
          }
        });
    } catch (error) {
      return mapRotationFailure(
        error
      );
    }

    assertRecoveredSession(
      recovered,
      trustState,
      {
        newSessionId:
          artifacts.newSessionId,
        tokenSha256:
          artifacts.generatedToken.tokenSha256,
        issuedAt:
          now.iso,
        absoluteExpiresAt:
          artifacts.absoluteExpiresAt
      }
    );

    return {
      rawToken:
        artifacts.generatedToken.rawToken,
      session:
        recovered
    };
  }
}

export function createOnboardingSessionRecoveryService():
  OnboardingSessionRecoveryService
{
  return new OnboardingSessionRecoveryService(
    createNeonOnboardingSessionRepository(),
    new NeonOnboardingSessionEventCommands()
  );
}
