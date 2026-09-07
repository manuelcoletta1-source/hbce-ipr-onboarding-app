import "server-only";

import {
  randomUUID
} from "node:crypto";

import {
  OnboardingSessionEventCommandError,
  createNeonOnboardingSessionEventCommands,
  type ContactVerificationEventType,
  type OnboardingSessionEventCommands
} from "@/lib/server/neon-onboarding-session-event-commands";

import {
  ONBOARDING_SESSION_ABSOLUTE_TTL_SECONDS,
  createNeonOnboardingSessionRepository,
  type OnboardingSessionRepository,
  type OnboardingSessionTrustState
} from "@/lib/server/neon-onboarding-session-repository";

import {
  evaluateOnboardingSessionAuthority,
  type OnboardingSessionAuthority
} from "@/lib/server/onboarding-session-authority";

import {
  generateOnboardingSessionToken,
  type GeneratedOnboardingSessionToken
} from "@/lib/server/onboarding-session-token";

export type ContactVerificationFactor =
  ContactVerificationEventType;

export type ContactVerificationFactorEvidence = {
  readonly factor:
    ContactVerificationFactor;

  readonly verificationEvidenceSha256:
    string;
};

export type RecordContactVerificationFactorResult =
  | {
      readonly status:
        "FACTOR_RECORDED";
    }
  | {
      readonly status:
        "FACTOR_ALREADY_RECORDED";
    };

export type FinalizeContactVerificationResult =
  | {
      readonly status:
        "CONTACT_NOT_READY";
    }
  | {
      readonly status:
        "CONTACT_VERIFIED";
      readonly rawToken: string;
    };

export type OnboardingContactVerificationServiceErrorCode =
  | "AUTHORITY_INVALID"
  | "FACTOR_DENIED"
  | "FINALIZATION_DENIED"
  | "DEPENDENCY_FAILURE";

export class OnboardingContactVerificationServiceError
  extends Error
{
  readonly code:
    OnboardingContactVerificationServiceErrorCode;

  constructor(
    code:
      OnboardingContactVerificationServiceErrorCode,
    message: string
  ) {
    super(message);

    this.name =
      "OnboardingContactVerificationServiceError";

    this.code =
      code;
  }
}

export type OnboardingContactVerificationClock =
  () => Date;

export type OnboardingContactVerificationUuidSource =
  () => string;

export type OnboardingContactVerificationTokenGenerator =
  () => GeneratedOnboardingSessionToken;

export type OnboardingContactVerificationDependencies = {
  readonly repository:
    Pick<
      OnboardingSessionRepository,
      "getBySessionId"
    >;

  readonly eventCommands:
    Pick<
      OnboardingSessionEventCommands,
      | "recordContactVerificationEvent"
      | "rotateToContactVerified"
    >;

  readonly clock:
    OnboardingContactVerificationClock;

  readonly uuidSource:
    OnboardingContactVerificationUuidSource;

  readonly tokenGenerator:
    OnboardingContactVerificationTokenGenerator;
};

const SHA256_LOWER_HEX =
  /^[0-9a-f]{64}$/;

const UUID_V4_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RAW_SESSION_TOKEN =
  /^[A-Za-z0-9_-]{43}$/;

function fail(
  code:
    OnboardingContactVerificationServiceErrorCode,
  message: string
): never {
  throw new OnboardingContactVerificationServiceError(
    code,
    message
  );
}

function isNonEmptyIdentifier(
  value: string
): boolean {
  return (
    value.length > 0 &&
    value === value.trim() &&
    !value.includes("\n") &&
    !value.includes("\r") &&
    !value.includes("\0")
  );
}

function assertExactStartedAuthority(
  authority: OnboardingSessionAuthority
): void {
  if (
    authority.issuedState !== "STARTED" ||
    !isNonEmptyIdentifier(
      authority.sessionId
    ) ||
    !isNonEmptyIdentifier(
      authority.onboardingId
    ) ||
    !isNonEmptyIdentifier(
      authority.subjectId
    )
  ) {
    fail(
      "AUTHORITY_INVALID",
      "Contact verification requires one exact STARTED server authority."
    );
  }
}

function assertVerificationEvidence(
  input:
    ContactVerificationFactorEvidence
): void {
  if (
    (
      input.factor !==
        "EMAIL_VERIFIED" &&
      input.factor !==
        "PHONE_VERIFIED"
    ) ||
    !SHA256_LOWER_HEX.test(
      input.verificationEvidenceSha256
    )
  ) {
    fail(
      "FACTOR_DENIED",
      "Contact verification factor evidence is invalid."
    );
  }
}

function readServerTime(
  clock:
    OnboardingContactVerificationClock
): string {
  try {
    const value =
      clock();

    if (
      !(value instanceof Date) ||
      Number.isNaN(value.getTime())
    ) {
      fail(
        "DEPENDENCY_FAILURE",
        "Contact verification server clock returned an invalid time."
      );
    }

    return value.toISOString();
  } catch (error) {
    if (
      error instanceof
      OnboardingContactVerificationServiceError
    ) {
      throw error;
    }

    fail(
      "DEPENDENCY_FAILURE",
      "Contact verification server clock failed."
    );
  }
}

function assertCanonicalIdentity(
  authority:
    OnboardingSessionAuthority,
  trustState:
    OnboardingSessionTrustState
): void {
  if (
    trustState.session.sessionId !==
      authority.sessionId ||
    trustState.session.onboardingId !==
      authority.onboardingId ||
    trustState.session.subjectId !==
      authority.subjectId
  ) {
    fail(
      "AUTHORITY_INVALID",
      "Canonical session identity does not match the supplied server authority."
    );
  }
}

function mapAuthorityDecisionFailure(
  code: string
): never {
  switch (code) {
    case "INVALID_SERVER_TIME":
    case "INVALID_SESSION_STATE":
    case "INSUFFICIENT_TRUST":
      fail(
        "DEPENDENCY_FAILURE",
        "Canonical session trust state is invalid."
      );

    default:
      fail(
        "AUTHORITY_INVALID",
        "Canonical STARTED authority is no longer active."
      );
  }
}

function factorAlreadyPresent(
  trustState:
    OnboardingSessionTrustState,
  factor:
    ContactVerificationFactor
): boolean {
  return factor ===
    "EMAIL_VERIFIED"
    ? trustState.emailVerified
    : trustState.phoneVerified;
}

function buildFactorPayload(
  input:
    ContactVerificationFactorEvidence
) {
  if (
    input.factor ===
    "EMAIL_VERIFIED"
  ) {
    return {
      kind:
        "HBCE_EMAIL_VERIFIED_V1",
      channel:
        "EMAIL_OTP",
      verificationEvidenceSha256:
        input.verificationEvidenceSha256
    };
  }

  return {
    kind:
      "HBCE_PHONE_VERIFIED_V1",
    channel:
      "SMS_OTP",
    verificationEvidenceSha256:
      input.verificationEvidenceSha256
  };
}

function mapFactorCommandFailure(
  error: unknown
): never {
  if (
    error instanceof
    OnboardingContactVerificationServiceError
  ) {
    throw error;
  }

  if (
    error instanceof
    OnboardingSessionEventCommandError
  ) {
    if (
      error.code ===
        "SESSION_NOT_FOUND"
    ) {
      fail(
        "AUTHORITY_INVALID",
        "STARTED session no longer exists."
      );
    }

    fail(
      "DEPENDENCY_FAILURE",
      "Contact verification factor command failed."
    );
  }

  fail(
    "DEPENDENCY_FAILURE",
    "Contact verification factor dependency failed."
  );
}

function mapRotationCommandFailure(
  error: unknown
): never {
  if (
    error instanceof
    OnboardingContactVerificationServiceError
  ) {
    throw error;
  }

  if (
    error instanceof
    OnboardingSessionEventCommandError
  ) {
    switch (error.code) {
      case "SESSION_NOT_FOUND":
        fail(
          "AUTHORITY_INVALID",
          "STARTED session no longer exists."
        );

      case "EVENT_CONFLICT":
        fail(
          "FINALIZATION_DENIED",
          "CONTACT_VERIFIED rotation conflicted with canonical state."
        );

      default:
        fail(
          "DEPENDENCY_FAILURE",
          "CONTACT_VERIFIED rotation dependency failed."
        );
    }
  }

  fail(
    "DEPENDENCY_FAILURE",
    "CONTACT_VERIFIED rotation dependency failed."
  );
}

export class OnboardingContactVerificationService {
  private readonly dependencies:
    OnboardingContactVerificationDependencies;

  constructor(
    dependencies:
      OnboardingContactVerificationDependencies
  ) {
    this.dependencies =
      dependencies;
  }

  private async readCanonicalStartedState(
    authority:
      OnboardingSessionAuthority,
    now: string
  ): Promise<
    OnboardingSessionTrustState
  > {
    assertExactStartedAuthority(
      authority
    );

    let trustState:
      OnboardingSessionTrustState | null;

    try {
      trustState =
        await this.dependencies.repository
          .getBySessionId(
            authority.sessionId
          );
    } catch {
      fail(
        "DEPENDENCY_FAILURE",
        "Canonical contact readiness could not be read."
      );
    }

    if (!trustState) {
      fail(
        "AUTHORITY_INVALID",
        "Canonical STARTED session does not exist."
      );
    }

    const decision =
      evaluateOnboardingSessionAuthority({
        trustState,
        now,
        requiredState:
          "STARTED"
      });

    if (!decision.ok) {
      mapAuthorityDecisionFailure(
        decision.code
      );
    }

    if (
      decision.authority.issuedState !==
        "STARTED"
    ) {
      fail(
        "AUTHORITY_INVALID",
        "Contact verification requires exact STARTED authority."
      );
    }

    assertCanonicalIdentity(
      authority,
      trustState
    );

    if (
      decision.authority.sessionId !==
        authority.sessionId ||
      decision.authority.onboardingId !==
        authority.onboardingId ||
      decision.authority.subjectId !==
        authority.subjectId
    ) {
      fail(
        "AUTHORITY_INVALID",
        "Evaluated canonical authority does not match the request authority."
      );
    }

    if (
      trustState.session.issuedState !==
        "STARTED"
    ) {
      fail(
        "AUTHORITY_INVALID",
        "Canonical session is no longer exact STARTED."
      );
    }

    if (trustState.contactVerified) {
      fail(
        "DEPENDENCY_FAILURE",
        "Canonical STARTED state is inconsistent with CONTACT_VERIFIED evidence."
      );
    }

    return trustState;
  }

  async recordFactor(
    authority:
      OnboardingSessionAuthority,
    evidence:
      ContactVerificationFactorEvidence
  ): Promise<
    RecordContactVerificationFactorResult
  > {
    assertExactStartedAuthority(
      authority
    );

    assertVerificationEvidence(
      evidence
    );

    const occurredAt =
      readServerTime(
        this.dependencies.clock
      );

    try {
      await this.dependencies.eventCommands
        .recordContactVerificationEvent({
          sessionId:
            authority.sessionId,

          eventType:
            evidence.factor,

          occurredAt,

          createdAt:
            occurredAt,

          payload:
            buildFactorPayload(
              evidence
            )
        });

      return {
        status:
          "FACTOR_RECORDED"
      };
    } catch (error) {
      if (
        error instanceof
          OnboardingSessionEventCommandError &&
        error.code ===
          "EVENT_COMMAND_DENIED"
      ) {
        const postReadNow =
          readServerTime(
            this.dependencies.clock
          );

        const trustState =
          await this.readCanonicalStartedState(
            authority,
            postReadNow
          );

        if (
          factorAlreadyPresent(
            trustState,
            evidence.factor
          )
        ) {
          return {
            status:
              "FACTOR_ALREADY_RECORDED"
          };
        }

        fail(
          "FACTOR_DENIED",
          "Verification factor was denied and no canonical duplicate evidence exists."
        );
      }

      mapFactorCommandFailure(
        error
      );
    }
  }

  async finalizeContact(
    authority:
      OnboardingSessionAuthority
  ): Promise<
    FinalizeContactVerificationResult
  > {
    assertExactStartedAuthority(
      authority
    );

    const issuedAt =
      readServerTime(
        this.dependencies.clock
      );

    const trustState =
      await this.readCanonicalStartedState(
        authority,
        issuedAt
      );

    if (
      !trustState.emailVerified ||
      !trustState.phoneVerified
    ) {
      return {
        status:
          "CONTACT_NOT_READY"
      };
    }

    let uuid: string;

    try {
      uuid =
        this.dependencies
          .uuidSource();
    } catch {
      fail(
        "DEPENDENCY_FAILURE",
        "CONTACT_VERIFIED session identifier generation failed."
      );
    }

    if (
      !UUID_V4_LIKE.test(
        uuid
      )
    ) {
      fail(
        "DEPENDENCY_FAILURE",
        "CONTACT_VERIFIED session identifier source returned invalid data."
      );
    }

    const newSessionId =
      `session_${uuid}`;

    let token:
      GeneratedOnboardingSessionToken;

    try {
      token =
        this.dependencies
          .tokenGenerator();
    } catch {
      fail(
        "DEPENDENCY_FAILURE",
        "CONTACT_VERIFIED session token generation failed."
      );
    }

    if (
      !RAW_SESSION_TOKEN.test(
        token.rawToken
      ) ||
      !SHA256_LOWER_HEX.test(
        token.tokenSha256
      )
    ) {
      fail(
        "DEPENDENCY_FAILURE",
        "CONTACT_VERIFIED session token generator returned invalid data."
      );
    }

    const issuedAtMs =
      new Date(
        issuedAt
      ).getTime();

    if (
      !Number.isFinite(
        issuedAtMs
      )
    ) {
      fail(
        "DEPENDENCY_FAILURE",
        "CONTACT_VERIFIED issuance time is invalid."
      );
    }

    const absoluteExpiresAt =
      new Date(
        issuedAtMs +
          ONBOARDING_SESSION_ABSOLUTE_TTL_SECONDS *
            1000
      ).toISOString();

    try {
      const rotated =
        await this.dependencies.eventCommands
          .rotateToContactVerified({
            sourceSessionId:
              authority.sessionId,

            newSessionId,

            newTokenSha256:
              token.tokenSha256,

            issuedAt,

            absoluteExpiresAt,

            createdAt:
              issuedAt,

            contactVerifiedPayload: {
              kind:
                "HBCE_CONTACT_VERIFIED_V1"
            },

            rotatedPayload: {
              kind:
                "HBCE_CONTACT_VERIFIED_ROTATION_V1"
            },

            newSessionCreatedPayload: {
              kind:
                "HBCE_CONTACT_VERIFIED_SESSION_V1",
              issuedState:
                "CONTACT_VERIFIED"
            }
          });

      if (
        rotated.sessionId !==
          newSessionId ||
        rotated.onboardingId !==
          authority.onboardingId ||
        rotated.subjectId !==
          authority.subjectId ||
        rotated.tokenSha256 !==
          token.tokenSha256 ||
        rotated.issuedState !==
          "CONTACT_VERIFIED" ||
        rotated.rotatedFromSessionId !==
          authority.sessionId ||
        rotated.issuedAt !==
          issuedAt ||
        rotated.absoluteExpiresAt !==
          absoluteExpiresAt
      ) {
        fail(
          "DEPENDENCY_FAILURE",
          "CONTACT_VERIFIED rotation returned inconsistent canonical session data."
        );
      }

      return {
        status:
          "CONTACT_VERIFIED",
        rawToken:
          token.rawToken
      };
    } catch (error) {
      if (
        error instanceof
          OnboardingSessionEventCommandError &&
        error.code ===
          "ROTATION_DENIED"
      ) {
        const postReadNow =
          readServerTime(
            this.dependencies.clock
          );

        const postState =
          await this.readCanonicalStartedState(
            authority,
            postReadNow
          );

        if (
          !postState.emailVerified ||
          !postState.phoneVerified
        ) {
          return {
            status:
              "CONTACT_NOT_READY"
          };
        }

        fail(
          "FINALIZATION_DENIED",
          "CONTACT_VERIFIED rotation was denied while both canonical factors remained present."
        );
      }

      mapRotationCommandFailure(
        error
      );
    }
  }
}

export function createOnboardingContactVerificationService():
  OnboardingContactVerificationService
{
  return new OnboardingContactVerificationService({
    repository:
      createNeonOnboardingSessionRepository(),

    eventCommands:
      createNeonOnboardingSessionEventCommands(),

    clock:
      () => new Date(),

    uuidSource:
      () => randomUUID(),

    tokenGenerator:
      () =>
        generateOnboardingSessionToken()
  });
}
