import { PingStatus, STATUS_LABEL } from "@/lib/taskping";

const STYLES: Record<PingStatus, { bg: string; color: string; dot: string }> = {
  [PingStatus.Pending]: { bg: "var(--yellow-soft)", color: "#9a6f12", dot: "var(--yellow)" },
  [PingStatus.Confirmed]: { bg: "var(--green-soft)", color: "#1f6e45", dot: "var(--green)" },
  [PingStatus.Declined]: { bg: "var(--red-soft)", color: "#a33a2c", dot: "var(--red)" },
  [PingStatus.Cancelled]: { bg: "var(--line-soft)", color: "var(--muted)", dot: "var(--faint)" },
};

export default function StatusBadge({ status }: { status: PingStatus }) {
  const s = STYLES[status] ?? STYLES[PingStatus.Cancelled];
  return (
    <span className="tp-pill" style={{ background: s.bg, color: s.color }}>
      <span style={{ width: 7, height: 7, borderRadius: 999, background: s.dot, flexShrink: 0 }} />
      {STATUS_LABEL[status] ?? "Unknown"}
    </span>
  );
}
