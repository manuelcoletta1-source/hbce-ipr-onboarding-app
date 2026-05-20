import type {
  AccessDecision,
  CertificateStatus,
  IprCardStatus,
  IprStatus,
  JokerAccessStatus,
  OnboardingStatus,
  RevocationState,
  VerificationStatus
} from "@/lib/types";

export type StatusTone = "success" | "warning" | "danger" | "neutral";

export type SupportedStatus =
  | AccessDecision
  | CertificateStatus
  | IprCardStatus
  | IprStatus
  | JokerAccessStatus
  | OnboardingStatus
  | RevocationState
  | VerificationStatus;

const SUCCESS_STATUSES = new Set<string>([
  "approved",
  "verified",
  "issued",
  "active",
  "clear",
  "enabled",
  "completed",
  "allow_governed_access",
  "access_granted",
  "valid",
  "subject_created",
  "fiscal_identity_collected",
  "official_document_submitted",
  "liveness_submitted",
  "compliance_accepted",
  "ipr_approved",
  "ipr_card_issued",
  "ipr_verified",
  "joker_c2_access"
]);

const WARNING_STATUSES = new Set<string>([
  "not_started",
  "started",
  "in_progress",
  "pending",
  "pending_access",
  "submitted",
  "in_review",
  "manual_review",
  "pending_review",
  "needs_more_information",
  "not_created",
  "not_issued",
  "under_review",
  "review_submission",
  "hbce_approval",
  "ipr_card_issuance",
  "operational_certificate"
]);

const DANGER_STATUSES = new Set<string>([
  "denied",
  "disabled",
  "rejected",
  "expired",
  "revoked",
  "suspended",
  "blocked",
  "deny_access",
  "access_denied",
  "fail_closed",
  "invalid_json",
  "invalid_proto",
  "invalid_kind",
  "invalid_issuer",
  "invalid_phase",
  "invalid_next_phase",
  "missing_payload_hash",
  "missing_previous_hash",
  "hash_mismatch",
  "missing_required_field",
  "missing_required_upload",
  "not_operational_certificate",
  "invalid_certificate_scope"
]);

function normalizeStatus(status: string): string {
  return status.trim().replaceAll("-", "_").toLowerCase();
}

export function formatStatusLabel(status: string): string {
  return status
    .trim()
    .replaceAll("-", "_")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function getStatusTone(status: SupportedStatus | string): StatusTone {
  const normalizedStatus = normalizeStatus(status);

  if (SUCCESS_STATUSES.has(normalizedStatus)) {
    return "success";
  }

  if (WARNING_STATUSES.has(normalizedStatus)) {
    return "warning";
  }

  if (DANGER_STATUSES.has(normalizedStatus)) {
    return "danger";
  }

  return "neutral";
}

export function formatAccessDecision(decision: AccessDecision): string {
  if (decision === "allow_governed_access") {
    return "Allow Governed Access";
  }

  if (decision === "pending_access") {
    return "Pending Access";
  }

  return "Deny Access";
}

export function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome"
  }).format(date);
}

export function formatShortDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/Rome"
  }).format(date);
}

export function formatMaskedIdentifier(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length <= 6) {
    return trimmed;
  }

  const prefix = trimmed.slice(0, 3);
  const suffix = trimmed.slice(-3);
  const hiddenLength = Math.max(trimmed.length - 6, 4);

  return `${prefix}${"*".repeat(hiddenLength)}${suffix}`;
}

export function formatRouteLabel(route: string): string {
  if (route === "/") {
    return "Home";
  }

  return route
    .replace(/^\//, "")
    .split("/")
    .filter(Boolean)
    .map((part) => formatStatusLabel(part.replaceAll("-", "_")))
    .join(" / ");
}

export function formatBooleanState(value: boolean): string {
  return value ? "Enabled" : "Disabled";
}

export function formatHashReference(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length <= 18) {
    return trimmed;
  }

  return `${trimmed.slice(0, 12)}…${trimmed.slice(-6)}`;
}

export function getBadgeClassName(status: SupportedStatus | string): string {
  const tone = getStatusTone(status);

  if (tone === "success") {
    return "hbce-badge hbce-badge--success";
  }

  if (tone === "warning") {
    return "hbce-badge hbce-badge--warning";
  }

  if (tone === "danger") {
    return "hbce-badge hbce-badge--danger";
  }

  return "hbce-badge";
}
