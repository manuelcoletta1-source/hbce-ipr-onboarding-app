import "server-only";

export const HBCE_APP_ORIGIN_ENV_NAME =
  "HBCE_APP_ORIGIN" as const;

export type OnboardingOriginPolicyErrorCode =
  | "FORBIDDEN"
  | "DEPENDENCY_FAILURE";

export class OnboardingOriginPolicyError
  extends Error
{
  readonly code:
    OnboardingOriginPolicyErrorCode;

  constructor(
    code:
      OnboardingOriginPolicyErrorCode,
    message: string
  ) {
    super(message);
    this.name =
      "OnboardingOriginPolicyError";
    this.code = code;
  }
}

export function validateHbceAppOrigin(
  value: string | undefined
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.trim() !== value
  ) {
    throw new OnboardingOriginPolicyError(
      "DEPENDENCY_FAILURE",
      "HBCE_APP_ORIGIN is missing or invalid."
    );
  }

  if (value.includes("*")) {
    throw new OnboardingOriginPolicyError(
      "DEPENDENCY_FAILURE",
      "HBCE_APP_ORIGIN must not contain a wildcard."
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new OnboardingOriginPolicyError(
      "DEPENDENCY_FAILURE",
      "HBCE_APP_ORIGIN must be an absolute HTTPS origin."
    );
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    parsed.origin !== value
  ) {
    throw new OnboardingOriginPolicyError(
      "DEPENDENCY_FAILURE",
      "HBCE_APP_ORIGIN must be a canonical absolute HTTPS origin without path, query, fragment or credentials."
    );
  }

  return parsed.origin;
}

export function validateStateChangingRequestOrigin(
  requestOrigin: string | null | undefined,
  expectedOriginValue: string | undefined
): string {
  const expectedOrigin =
    validateHbceAppOrigin(
      expectedOriginValue
    );

  if (
    typeof requestOrigin !== "string" ||
    requestOrigin.length === 0
  ) {
    throw new OnboardingOriginPolicyError(
      "FORBIDDEN",
      "Origin is required for a state-changing authenticated request."
    );
  }

  if (requestOrigin !== expectedOrigin) {
    throw new OnboardingOriginPolicyError(
      "FORBIDDEN",
      "Request Origin does not match the configured HBCE application origin."
    );
  }

  return expectedOrigin;
}
