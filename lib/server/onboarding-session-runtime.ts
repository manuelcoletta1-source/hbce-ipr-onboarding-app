import "server-only";

import {
  isValidOnboardingSessionCookieToken
} from "@/lib/server/onboarding-session-cookie";

import {
  evaluateOnboardingSessionAuthority,
  type OnboardingSessionAuthority,
  type OnboardingSessionAuthorityFailureCode,
  type OnboardingSessionAuthorityRequirement
} from "@/lib/server/onboarding-session-authority";

import type {
  OnboardingSessionRepository
} from "@/lib/server/neon-onboarding-session-repository";

import type {
  OnboardingSessionLifecycleCommands
} from "@/lib/server/neon-onboarding-session-lifecycle-commands";

import {
  sha256OnboardingSessionToken
} from "@/lib/server/onboarding-session-token";

export const AUTHENTICATED_SESSION_ACTIVITY_PAYLOAD_KIND =
  "HBCE_AUTHENTICATED_SESSION_ACTIVITY_V1" as const;

export type OnboardingSessionRuntimeFailureCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "DEPENDENCY_FAILURE";

export class OnboardingSessionRuntimeError
  extends Error
{
  readonly code:
    OnboardingSessionRuntimeFailureCode;

  constructor(
    code:
      OnboardingSessionRuntimeFailureCode,
    message: string
  ) {
    super(message);
    this.name =
      "OnboardingSessionRuntimeError";
    this.code = code;
  }
}

export type OnboardingSessionRuntimeClock =
  () => Date;

export type AuthorizeOnboardingSessionInput = {
  readonly rawToken:
    string | null | undefined;
  readonly requiredState:
    OnboardingSessionAuthorityRequirement;
};

export type OnboardingSessionRuntimeAuthority =
  OnboardingSessionAuthority;

function systemClock(): Date {
  return new Date();
}

function getNormalizedServerTime(
  clock: OnboardingSessionRuntimeClock
): string {
  let value: Date;

  try {
    value = clock();
  } catch {
    throw new OnboardingSessionRuntimeError(
      "DEPENDENCY_FAILURE",
      "Onboarding session runtime clock failed."
    );
  }

  if (
    !(value instanceof Date) ||
    Number.isNaN(value.getTime())
  ) {
    throw new OnboardingSessionRuntimeError(
      "DEPENDENCY_FAILURE",
      "Onboarding session runtime clock returned an invalid server time."
    );
  }

  return value.toISOString();
}

function classifyAuthorityFailure(
  code:
    OnboardingSessionAuthorityFailureCode
): OnboardingSessionRuntimeFailureCode {
  switch (code) {
    case "SESSION_NOT_FOUND":
    case "SESSION_ROTATED":
    case "SESSION_REVOKED":
    case "SESSION_EXPIRED_EVENT":
    case "SESSION_ABSOLUTE_EXPIRED":
    case "SESSION_IDLE_EXPIRED":
      return "UNAUTHORIZED";

    case "INSUFFICIENT_TRUST":
      return "FORBIDDEN";

    case "INVALID_SERVER_TIME":
    case "INVALID_SESSION_STATE":
      return "DEPENDENCY_FAILURE";
  }
}

export class OnboardingSessionRuntimeOrchestrator {
  private readonly repository:
    OnboardingSessionRepository;

  private readonly lifecycle:
    OnboardingSessionLifecycleCommands;

  private readonly clock:
    OnboardingSessionRuntimeClock;

  constructor(
    repository:
      OnboardingSessionRepository,
    lifecycle:
      OnboardingSessionLifecycleCommands,
    clock:
      OnboardingSessionRuntimeClock =
        systemClock
  ) {
    this.repository = repository;
    this.lifecycle = lifecycle;
    this.clock = clock;
  }

  async authorize(
    input:
      AuthorizeOnboardingSessionInput
  ): Promise<OnboardingSessionRuntimeAuthority> {
    if (
      !isValidOnboardingSessionCookieToken(
        input.rawToken
      )
    ) {
      throw new OnboardingSessionRuntimeError(
        "UNAUTHORIZED",
        "A valid onboarding session cookie is required."
      );
    }

    const now =
      getNormalizedServerTime(
        this.clock
      );

    const tokenSha256 =
      sha256OnboardingSessionToken(
        input.rawToken
      );

    let trustState;

    try {
      trustState =
        await this.repository.getByTokenSha256(
          tokenSha256
        );
    } catch {
      throw new OnboardingSessionRuntimeError(
        "DEPENDENCY_FAILURE",
        "Onboarding session repository lookup failed."
      );
    }

    let decision;

    try {
      decision =
        evaluateOnboardingSessionAuthority({
          trustState,
          now,
          requiredState:
            input.requiredState
        });
    } catch {
      throw new OnboardingSessionRuntimeError(
        "DEPENDENCY_FAILURE",
        "Onboarding session authority evaluation failed."
      );
    }

    if (!decision.ok) {
      throw new OnboardingSessionRuntimeError(
        classifyAuthorityFailure(
          decision.code
        ),
        "Onboarding session authority was denied."
      );
    }

    let activityResult;

    try {
      activityResult =
        await this.lifecycle.recordActivity({
          sessionId:
            decision.authority.sessionId,
          occurredAt: now,
          createdAt: now,
          payload: {
            kind:
              AUTHENTICATED_SESSION_ACTIVITY_PAYLOAD_KIND
          }
        });
    } catch {
      throw new OnboardingSessionRuntimeError(
        "DEPENDENCY_FAILURE",
        "Authenticated onboarding session activity could not be recorded."
      );
    }

    if (
      activityResult.status !==
        "APPENDED" &&
      activityResult.status !==
        "SKIPPED_THROTTLE"
    ) {
      throw new OnboardingSessionRuntimeError(
        "DEPENDENCY_FAILURE",
        "Authenticated onboarding session activity returned an invalid result."
      );
    }

    return {
      sessionId:
        decision.authority.sessionId,
      onboardingId:
        decision.authority.onboardingId,
      subjectId:
        decision.authority.subjectId,
      issuedState:
        decision.authority.issuedState
    };
  }
}
