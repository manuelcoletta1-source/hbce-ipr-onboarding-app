import { formatStatusLabel, getBadgeClassName } from "@/lib/format";

import type { SupportedStatus } from "@/lib/format";

type StatusBadgeProps = {
  status: SupportedStatus | string;
  label?: string;
  title?: string;
};

export function StatusBadge({ status, label, title }: StatusBadgeProps) {
  const visibleLabel = label ?? formatStatusLabel(status);
  const accessibleTitle = title ?? visibleLabel;

  return (
    <span
      aria-label={accessibleTitle}
      className={getBadgeClassName(status)}
      title={accessibleTitle}
    >
      {visibleLabel}
    </span>
  );
}
