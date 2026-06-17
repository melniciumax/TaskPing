"use client";

import StatusBadge from "./StatusBadge";
import { Ping, PingStatus, fmtArc, shortAddr, timeAgo } from "@/lib/taskping";
import { ARCSCAN } from "@/lib/arcNetwork";

interface Props {
  ping: Ping;
  me: string;
  busyId: number | null;
  msg?: string;
  onConfirm: (id: number) => void;
  onDecline: (id: number) => void;
  onCancel: (id: number) => void;
}

function party(addr: string, me: string) {
  if (me && addr.toLowerCase() === me.toLowerCase()) return "You";
  return shortAddr(addr);
}

export default function PingCard({ ping, me, busyId, msg, onConfirm, onDecline, onCancel }: Props) {
  const meLower = me.toLowerCase();
  const iAmAssignee = ping.to.toLowerCase() === meLower;
  const iAmRequester = ping.from.toLowerCase() === meLower;
  const pending = ping.status === PingStatus.Pending;
  const busy = busyId === ping.id;

  return (
    <div className="tp-soft" style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 5 }}>
          <span style={{ fontSize: 15.5, fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {ping.title}
          </span>
          {ping.bounty > 0n && (
            <span className="tp-pill" style={{ flexShrink: 0, background: "var(--orange-2)", color: "var(--ink)" }}>
              {fmtArc(ping.bounty)} ARC
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
          <a href={`${ARCSCAN}/address/${ping.from}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--muted)", textDecoration: "none", fontWeight: 600 }}>
            {party(ping.from, me)}
          </a>
          {" → "}
          <a href={`${ARCSCAN}/address/${ping.to}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--muted)", textDecoration: "none", fontWeight: 600 }}>
            {party(ping.to, me)}
          </a>
          <span style={{ margin: "0 7px", color: "var(--faint)" }}>·</span>
          {timeAgo(pending ? ping.createdAt : ping.resolvedAt || ping.createdAt)}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {pending && iAmAssignee ? (
          <>
            <button onClick={() => onDecline(ping.id)} disabled={busy} className="tp-btn tp-btn--sm">
              Decline
            </button>
            <button onClick={() => onConfirm(ping.id)} disabled={busy} className="tp-btn tp-btn--sm tp-btn--green">
              {busy ? "…" : "Confirm"}
            </button>
          </>
        ) : pending && iAmRequester ? (
          <>
            <StatusBadge status={ping.status} />
            <button onClick={() => onCancel(ping.id)} disabled={busy} className="tp-btn tp-btn--sm">
              {busy ? "…" : "Cancel"}
            </button>
          </>
        ) : (
          <StatusBadge status={ping.status} />
        )}
      </div>
      </div>
      {msg && (
        <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 8, color: msg.startsWith("✓") ? "var(--green)" : msg.startsWith("✗") ? "var(--red)" : "var(--muted)" }}>
          {msg}
        </div>
      )}
    </div>
  );
}
