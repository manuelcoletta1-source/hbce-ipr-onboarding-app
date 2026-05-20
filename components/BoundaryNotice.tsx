type BoundaryNoticeTone = "info" | "danger";

type BoundaryNoticeProps = {
  title: string;
  children: React.ReactNode;
  tone?: BoundaryNoticeTone;
};

export function BoundaryNotice({
  title,
  children,
  tone = "info"
}: BoundaryNoticeProps) {
  const className =
    tone === "danger" ? "hbce-notice hbce-notice--danger" : "hbce-notice";

  return (
    <aside className={className}>
      <strong>{title}</strong>
      <div className="hbce-small" style={{ marginTop: "8px" }}>
        {children}
      </div>
    </aside>
  );
}
