import type { ReactNode } from "react";

export type BoundaryNoticeTone = "info" | "warning" | "danger";

type BoundaryNoticeProps = {
  title: string;
  children: ReactNode;
  tone?: BoundaryNoticeTone;
};

function getBoundaryNoticeClassName(tone: BoundaryNoticeTone): string {
  if (tone === "danger") {
    return "hbce-notice hbce-notice--danger";
  }

  if (tone === "warning") {
    return "hbce-notice hbce-notice--warning";
  }

  return "hbce-notice";
}

function getBoundaryNoticeRole(tone: BoundaryNoticeTone): "note" | "alert" {
  if (tone === "danger") {
    return "alert";
  }

  return "note";
}

export function BoundaryNotice({
  title,
  children,
  tone = "info"
}: BoundaryNoticeProps) {
  return (
    <aside
      className={getBoundaryNoticeClassName(tone)}
      role={getBoundaryNoticeRole(tone)}
    >
      <strong>{title}</strong>

      <div className="hbce-small" style={{ marginTop: "8px" }}>
        {children}
      </div>
    </aside>
  );
}
