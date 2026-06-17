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

export default function Header({ account, balance, chainOk, connecting, onConnect }: HeaderProps) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "var(--cream)",
        borderBottom: "2.5px solid var(--ink)",
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "11px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none" }}>
          <Logo size={38} />
          <span className="display" style={{ fontSize: 24, color: "var(--ink)" }}>
            TaskPing
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {account ? (
            <>
              {!chainOk && (
                <button
                  onClick={() => switchToArc().catch(() => {})}
                  className="tp-btn tp-btn--sm"
                  style={{ background: "var(--red)", color: "var(--paper)" }}
                >
                  Switch to ARC
                </button>
              )}
              <span className="tp-pill" style={{ background: "var(--paper)", padding: "6px 12px" }}>
                <span style={{ color: "var(--muted)", fontWeight: 600 }}>{balance || "0"} USDC</span>
                <span style={{ width: 2, height: 14, background: "var(--ink)", opacity: 0.2 }} />
                <a
                  href={`${ARCSCAN}/address/${account}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none", color: "var(--ink)", fontWeight: 700 }}
                >
                  {account.slice(0, 6)}…{account.slice(-4)}
                </a>
              </span>
            </>
          ) : (
            <button onClick={onConnect} disabled={connecting} className="tp-btn tp-btn--pink">
              {connecting ? "Connecting…" : "Connect wallet"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
