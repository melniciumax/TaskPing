"use client";

import Link from "next/link";
import Logo from "./Logo";
import { ARCSCAN, switchToArc } from "@/lib/arcNetwork";

interface HeaderProps {
  account: string;
  balance: string;
  chainOk: boolean;
  connecting: boolean;
  onConnect: () => void;
}

function Avatar({ account }: { account: string }) {
  // Deterministic warm/slate gradient avatar derived from the address.
  const seed = parseInt(account.slice(2, 8) || "0", 16) || 0;
  const a = ["#f6a44f", "#f4775c", "#6e8cc4", "#3a4a63"][seed % 4];
  const b = ["#e0782a", "#6e8cc4", "#3a4a63", "#f0913b"][(seed >> 3) % 4];
  return (
    <span
      aria-hidden="true"
      style={{
        width: 30,
        height: 30,
        borderRadius: 999,
        background: `linear-gradient(135deg, ${a}, ${b})`,
        flexShrink: 0,
        boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.6)",
      }}
    />
  );
}

export default function Header({ account, balance, chainOk, connecting, onConnect }: HeaderProps) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(244, 239, 230, 0.82)",
        backdropFilter: "saturate(140%) blur(10px)",
        WebkitBackdropFilter: "saturate(140%) blur(10px)",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          maxWidth: 1160,
          margin: "0 auto",
          padding: "13px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none" }}>
          <Logo size={36} />
          <span className="display" style={{ fontSize: 21, color: "var(--ink)", letterSpacing: "-0.03em" }}>
            TaskPing
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* notification bell (decorative) */}
          <span className="tp-icon-btn" aria-hidden="true" title="Notifications" style={{ position: "relative" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--slate)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            <span style={{ position: "absolute", top: 8, right: 9, width: 7, height: 7, borderRadius: 999, background: "var(--coral)", boxShadow: "0 0 0 2px var(--card)" }} />
          </span>

          {account ? (
            <>
              {!chainOk && (
                <button
                  onClick={() => switchToArc().catch(() => {})}
                  className="tp-btn tp-btn--sm"
                  style={{ background: "var(--red)", color: "#fff", borderColor: "transparent" }}
                >
                  Switch to ARC
                </button>
              )}
              <a
                href={`${ARCSCAN}/address/${account}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tp-soft"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "5px 12px 5px 7px",
                  textDecoration: "none",
                  background: "var(--card)",
                }}
              >
                <Avatar account={account} />
                <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>
                    {account.slice(0, 6)}…{account.slice(-4)}
                  </span>
                  <span className="tnum" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)" }}>
                    {balance || "0"} USDC
                  </span>
                </span>
              </a>
            </>
          ) : (
            <button onClick={onConnect} disabled={connecting} className="tp-btn tp-btn--amber">
              {connecting ? "Connecting…" : "Connect wallet"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
