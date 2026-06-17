import { PingStatus, STATUS_LABEL } from "@/lib/taskping";

const STYLES: Record<PingStatus, { bg: string; color: string }> = {
  [PingStatus.Pending]: { bg: "var(--yellow)", color: "var(--ink)" },
  [PingStatus.Confirmed]: { bg: "var(--green)", color: "var(--paper)" },
  [PingStatus.Declined]: { bg: "var(--red)", color: "var(--paper)" },
  [PingStatus.Cancelled]: { bg: "var(--cream-2)", color: "var(--muted)" },
};

export default function StatusBadge({ status }: { status: PingStatus }) {
  const s = STYLES[status] ?? STYLES[PingStatus.Cancelled];
  return (
    <span className="tp-pill" style={{ background: s.bg, color: s.color }}>
      {STATUS_LABEL[status] ?? "Unknown"}
    </span>
  );
}
