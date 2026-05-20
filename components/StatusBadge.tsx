import { formatStatusLabel, getBadgeClassName } from "@/lib/format";

import type { SupportedStatus } from "@/lib/format";

type StatusBadgeProps = {
  status: SupportedStatus | string;
  label?: string;
  title?: string;
};

export function StatusBadge({ status, label, title }: StatusBadgeProps) {
  const visibleLabel = label ?? formatStatusLabel(status);

  return (
    <span className={getBadgeClassName(status)} title={title ?? visibleLabel}>
      {visibleLabel}
    </span>
  );
}
