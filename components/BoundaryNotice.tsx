import type { ReactNode } from "react";

type BoundaryNoticeTone = "info" | "danger";

type BoundaryNoticeProps = {
  title: string;
  children: ReactNode;
  tone?: BoundaryNoticeTone;
};

export function BoundaryNotice({
  title,
  children,
  tone = "info"
}: BoundaryNoticeProps) {
  const isDanger = tone === "danger";
  const className = isDanger
    ? "hbce-notice hbce-notice--danger"
    : "hbce-notice";

  return (
    <aside className={className} role={isDanger ? "alert" : "note"}>
      <strong>{title}</strong>
      <div className="hbce-small" style={{ marginTop: "8px" }}>
        {children}
      </div>
    </aside>
  );
}
