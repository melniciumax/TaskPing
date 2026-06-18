"use client";

import { Ping, PingStatus } from "@/lib/taskping";

/**
 * Presentational confirmations chart. Buckets the already-fetched `recent`
 * pings into N columns (oldest → newest) and draws stacked confirmed/other
 * bars. Bars grow on load via the .tp-bar CSS keyframe. No on-chain calls.
 */
export default function ConfirmChart({ recent, columns = 9 }: { recent: Ping[]; columns?: number }) {
  // oldest first so the timeline reads left → right
  const ordered = [...recent].sort((a, b) => a.id - b.id);
  const per = Math.max(1, Math.ceil(ordered.length / columns));
  const buckets: { total: number; confirmed: number }[] = [];
  for (let i = 0; i < ordered.length; i += per) {
    const slice = ordered.slice(i, i + per);
    buckets.push({
      total: slice.length,
      confirmed: slice.filter((p) => p.status === PingStatus.Confirmed).length,
    });
  }
  while (buckets.length < columns) buckets.unshift({ total: 0, confirmed: 0 });
  const trimmed = buckets.slice(-columns);
  const maxTotal = Math.max(1, ...trimmed.map((b) => b.total));

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 9, height: 132 }}>
      {trimmed.map((b, i) => {
        const h = (b.total / maxTotal) * 100;
        const confirmedRatio = b.total ? b.confirmed / b.total : 0;
        const delay = `${i * 70}ms`;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, height: "100%" }}>
            <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
              <div
                className="tp-bar"
                style={{
                  width: "100%",
                  height: `${Math.max(b.total ? 14 : 4, h)}%`,
                  minHeight: 6,
                  animationDelay: delay,
                  background: b.total
                    ? `linear-gradient(180deg, var(--amber) 0%, var(--amber) ${(1 - confirmedRatio) * 100}%, var(--slate) ${(1 - confirmedRatio) * 100}%, var(--slate) 100%)`
                    : "var(--line)",
                  boxShadow: b.total ? "0 6px 14px -8px rgba(224,120,42,0.5)" : "none",
                }}
                title={`${b.confirmed}/${b.total} confirmed`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
