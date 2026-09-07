import "server-only";

import {
  type NextRequest,
  type NextResponse
} from "next/server";

import {
  ONBOARDING_SESSION_COOKIE_NAME,
  createOnboardingSessionCookieDescriptor
} from "@/lib/server/onboarding-session-cookie";

import {
  OnboardingOriginPolicyError,
  validateStateChangingRequestOrigin
} from "@/lib/server/onboarding-origin-policy";

import {
  OnboardingSessionRuntimeError,
  type OnboardingSessionRuntimeAuthority,
  type OnboardingSessionRuntimeOrchestrator
} from "@/lib/server/onboarding-session-runtime";

import type {
  OnboardingSessionAuthorityRequirement
} from "@/lib/server/onboarding-session-authority";

export type OnboardingHttpRequestPolicy =
  | "SAFE_READ"
  | "STATE_CHANGING";

export type OnboardingHttpTrustStatus =
  | 401
  | 403
  | 503;

export class OnboardingNextHttpTrustAdapterError
  extends Error
{
  readonly httpStatus:
    OnboardingHttpTrustStatus;

  constructor(
    httpStatus:
      OnboardingHttpTrustStatus,
    message: string
  ) {
    super(message);
    this.name =
      "OnboardingNextHttpTrustAdapterError";
    this.httpStatus =
      httpStatus;
  }
}

export type OnboardingSessionRuntimeDependency =
  Pick<
    OnboardingSessionRuntimeOrchestrator,
    "authorize"
  >;

export type AuthorizeNextOnboardingRequestInput = {
  readonly request:
    NextRequest;

  readonly requestPolicy:
    OnboardingHttpRequestPolicy;

  readonly requiredState:
    OnboardingSessionAuthorityRequirement;
};

function assertServerRoutePolicy(
  requestPolicy:
    OnboardingHttpRequestPolicy,
  requiredState:
    OnboardingSessionAuthorityRequirement
): void {
  if (
    requestPolicy !== "SAFE_READ" &&
    requestPolicy !== "STATE_CHANGING"
  ) {
    throw new OnboardingNextHttpTrustAdapterError(
      503,
      "Onboarding HTTP request policy is invalid."
    );
  }

  if (
    requiredState !== "STARTED" &&
    requiredState !== "CONTACT_VERIFIED"
  ) {
    throw new OnboardingNextHttpTrustAdapterError(
      503,
      "Onboarding HTTP trust requirement is invalid."
    );
  }
}

function mapOriginError(
  error:
    OnboardingOriginPolicyError
): never {
  if (
    error.code === "FORBIDDEN"
  ) {
    throw new OnboardingNextHttpTrustAdapterError(
      403,
      "Onboarding request Origin was rejected."
    );
  }

  throw new OnboardingNextHttpTrustAdapterError(
    503,
    "Onboarding Origin policy configuration is unavailable."
  );
}

function mapRuntimeError(
  error:
    OnboardingSessionRuntimeError
): never {
  switch (error.code) {
    case "UNAUTHORIZED":
      throw new OnboardingNextHttpTrustAdapterError(
        401,
        "Onboarding session authorization failed."
      );

    case "FORBIDDEN":
      throw new OnboardingNextHttpTrustAdapterError(
        403,
        "Onboarding session trust is insufficient."
      );

    case "DEPENDENCY_FAILURE":
      throw new OnboardingNextHttpTrustAdapterError(
        503,
        "Onboarding session trust dependency failed."
      );
  }
}

export class OnboardingNextHttpTrustAdapter {
  private readonly runtime:
    OnboardingSessionRuntimeDependency;

  constructor(
    runtime:
      OnboardingSessionRuntimeDependency
  ) {
    this.runtime =
      runtime;
  }

  async authorize(
    input:
      AuthorizeNextOnboardingRequestInput
  ): Promise<OnboardingSessionRuntimeAuthority> {
    assertServerRoutePolicy(
      input.requestPolicy,
      input.requiredState
    );

    if (
      input.requestPolicy ===
      "STATE_CHANGING"
    ) {
      try {
        validateStateChangingRequestOrigin(
          input.request.headers.get(
            "origin"
          ),
          process.env.HBCE_APP_ORIGIN
        );
      } catch (error) {
        if (
          error instanceof
          OnboardingOriginPolicyError
        ) {
          return mapOriginError(
            error
          );
        }

        throw new OnboardingNextHttpTrustAdapterError(
          503,
          "Onboarding Origin validation failed unexpectedly."
        );
      }
    }

    const rawToken =
      input.request.cookies.get(
        ONBOARDING_SESSION_COOKIE_NAME
      )?.value;

    try {
      return await this.runtime.authorize({
        rawToken,
        requiredState:
          input.requiredState
      });
    } catch (error) {
      if (
        error instanceof
        OnboardingSessionRuntimeError
      ) {
        return mapRuntimeError(
          error
        );
      }

      throw new OnboardingNextHttpTrustAdapterError(
        503,
        "Onboarding HTTP trust adapter dependency failed unexpectedly."
      );
    }
  }
}

export function setOnboardingSessionCookie(
  response: NextResponse,
  rawToken: string
): NextResponse {
  const descriptor =
    createOnboardingSessionCookieDescriptor(
      rawToken
    );

  response.cookies.set(
    descriptor.name,
    descriptor.value,
    descriptor.options
  );

  return response;
}
