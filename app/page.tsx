"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import Header from "@/components/Header";
import PingCard from "@/components/PingCard";
import CountUp from "@/components/CountUp";
import ConfirmChart from "@/components/ConfirmChart";
import { useWallet } from "@/lib/useWallet";
import { ARCSCAN, switchToArc } from "@/lib/arcNetwork";
import { pickProvider } from "@/lib/wallet";
import {
  CONTRACT_ADDRESS,
  TASKPING_ABI,
  PingStatus,
  readContract,
  fetchOverview,
  fetchInbox,
  fetchSent,
  fetchReputation,
  fetchRecent,
  fmtArc,
  shortAddr,
  type Ping,
  type Overview,
} from "@/lib/taskping";

export default function Home() {
  const { account, balance, chainOk, connecting, connect, refreshBalance } = useWallet();

  const [overview, setOverview] = useState<Overview>({ pings: 0n, confirmed: 0n, escrowed: 0n });
  const [inbox, setInbox] = useState<Ping[]>([]);
  const [sent, setSent] = useState<Ping[]>([]);
  const [recent, setRecent] = useState<Ping[]>([]);
  const [reputation, setReputation] = useState(0);
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");

  const [to, setTo] = useState("");
  const [title, setTitle] = useState("");
  const [bounty, setBounty] = useState("");
  const [formMsg, setFormMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actMsg, setActMsg] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    try {
      const c = readContract();
      const [ov, rec] = await Promise.all([fetchOverview(c), fetchRecent(14, c)]);
      setOverview(ov);
      setRecent(rec);
      if (account) {
        const [inb, snt, rep] = await Promise.all([
          fetchInbox(account, c),
          fetchSent(account, c),
          fetchReputation(account, c),
        ]);
        const rank = (p: Ping) => (p.status === PingStatus.Pending ? 0 : 1);
        setInbox([...inb].sort((a, b) => rank(a) - rank(b) || b.id - a.id));
        setSent(snt);
        setReputation(rep);
      } else {
        setInbox([]);
        setSent([]);
        setReputation(0);
      }
    } catch {
      /* keep last good state */
    }
  }, [account]);

  useEffect(() => {
    load();
  }, [load]);

  async function getWriteContract() {
    const inj = pickProvider();
    if (!inj) throw new Error("No wallet found");
    await switchToArc(inj);
    const provider = new ethers.BrowserProvider(inj);
    const signer = await provider.getSigner(account);
    return new ethers.Contract(CONTRACT_ADDRESS, TASKPING_ABI, signer);
  }

  async function sendPing() {
    if (!account) return;
    if (!ethers.isAddress(to)) return setFormMsg("✗ Enter a valid assignee address (0x…)");
    if (to.toLowerCase() === account.toLowerCase()) return setFormMsg("✗ You can't ping yourself");
    if (!title.trim()) return setFormMsg("✗ Add a short task title");
    const b = bounty.trim();
    if (b && !/^\d+(\.\d{1,18})?$/.test(b)) return setFormMsg("✗ Bounty must be a plain amount, e.g. 0.5");
    setSending(true);
    setFormMsg("Sending… confirm in your wallet");
    try {
      const c = await getWriteContract();
      const value = b && Number(b) > 0 ? ethers.parseEther(b) : 0n;
      const tx = await c.createPing(to.trim(), title.trim(), { value });
      setFormMsg("Confirming on ARC…");
      await tx.wait();
      setFormMsg("✓ Ping sent!");
      setTo("");
      setTitle("");
      setBounty("");
      await load();
      if (account) await refreshBalance(account);
    } catch (e) {
      setFormMsg("✗ " + ((e as Error).message?.slice(0, 90) || "Failed"));
    } finally {
      setSending(false);
    }
  }

  async function act(id: number, method: "confirm" | "decline" | "cancel") {
    if (!account) return;
    setBusyId(id);
    setActMsg((m) => ({ ...m, [id]: "" }));
    try {
      const c = await getWriteContract();
      const tx = await c[method](id);
      setActMsg((m) => ({ ...m, [id]: "Confirming on ARC…" }));
      await tx.wait();
      await load();
      if (account) await refreshBalance(account);
      setActMsg((m) => {
        const n = { ...m };
        delete n[id];
        return n;
      });
    } catch (e) {
      setActMsg((m) => ({ ...m, [id]: "✗ " + ((e as Error).message?.slice(0, 80) || "Action failed") }));
    } finally {
      setBusyId(null);
    }
  }

  const wrap: React.CSSProperties = { maxWidth: 1160, margin: "0 auto", padding: "0 22px" };
  const list = tab === "inbox" ? inbox : sent;

  const pendingInbox = inbox.filter((p) => p.status === PingStatus.Pending);
  const escrowedNum = parseFloat(fmtArc(overview.escrowed)) || 0;
  const totalPings = Number(overview.pings);
  const confirmedNum = Number(overview.confirmed);
  const confirmRate = totalPings ? Math.round((confirmedNum / totalPings) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 64 }}>
      <Header account={account} balance={balance} chainOk={chainOk} connecting={connecting} onConnect={connect} />

      {/* page heading */}
      <div style={{ ...wrap, paddingTop: 34, paddingBottom: 6 }}>
        <div className="rise" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <span className="tp-tag" style={{ marginBottom: 12 }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--amber-deep)" }} />
              On-chain sign-offs · ARC Testnet
            </span>
            <h1 className="display" style={{ fontSize: 38, margin: "12px 0 6px", maxWidth: 620 }}>
              Task confirmations that actually stick.
            </h1>
            <p style={{ fontSize: 15.5, color: "var(--muted)", fontWeight: 500, maxWidth: 540, lineHeight: 1.55 }}>
              Ping someone, they confirm, it&apos;s on the chain forever. Attach a bounty that releases the moment they sign off.
            </p>
          </div>
        </div>
      </div>

      {/* dashboard grid */}
      <div style={{ ...wrap, marginTop: 22 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.55fr) minmax(0, 1fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          {/* ── LEFT column ───────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* stat input-style cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {[
                { label: "Total pings", value: totalPings, dp: 0, suffix: "" },
                { label: "Confirmed", value: confirmedNum, dp: 0, suffix: "" },
                { label: "Your sign-offs", value: account ? reputation : 0, dp: 0, suffix: account ? "" : "" },
              ].map((s, i) => (
                <div key={s.label} className="tp-card tp-lift rise" style={{ padding: "16px 18px", animationDelay: `${i * 70}ms` }}>
                  <div className="tp-label">{s.label}</div>
                  <div className="display" style={{ fontSize: 30, marginTop: 8, color: "var(--ink)" }}>
                    {account || s.label !== "Your sign-offs" ? <CountUp value={s.value} decimals={s.dp} /> : "—"}
                  </div>
                </div>
              ))}
            </div>

            {/* highlighted AMBER bounty card */}
            <div className="tp-accent rise" style={{ padding: 24, animationDelay: "120ms" }}>
              <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.85 }}>
                    USDC escrowed on-chain
                  </div>
                  <div className="display" style={{ fontSize: 52, lineHeight: 1, margin: "10px 0 4px" }}>
                    <CountUp value={escrowedNum} decimals={escrowedNum % 1 === 0 ? 0 : 2} />
                    <span style={{ fontSize: 22, fontWeight: 700, opacity: 0.9, marginLeft: 8 }}>USDC</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 500, opacity: 0.92, maxWidth: 340, lineHeight: 1.5 }}>
                    {pendingInbox.length > 0
                      ? `${pendingInbox.length} ping${pendingInbox.length > 1 ? "s" : ""} waiting on your confirmation. Bounties release the moment you sign off.`
                      : "Bounties are held in escrow and released to the assignee automatically on confirm."}
                  </div>
                </div>
                <div className="float-slow" aria-hidden="true" style={{ flexShrink: 0 }}>
                  {/* radiating ping ripple motif */}
                  <svg width="92" height="92" viewBox="0 0 92 92" fill="none">
                    <circle cx="46" cy="46" r="40" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
                    <circle cx="46" cy="46" r="28" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
                    <circle cx="46" cy="46" r="15" fill="#fff" />
                    <path d="M40 46 L44.5 50.5 L53 41" stroke="var(--amber-deep)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <div style={{ position: "relative", zIndex: 1, marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a href={`${ARCSCAN}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="tp-btn tp-btn--onaccent">
                  View contract ↗
                </a>
                {!account ? (
                  <button onClick={connect} disabled={connecting} className="tp-btn" style={{ background: "rgba(255,255,255,0.16)", color: "#fff", borderColor: "rgba(255,255,255,0.4)" }}>
                    {connecting ? "Connecting…" : "Connect to confirm"}
                  </button>
                ) : (
                  <span className="tp-btn" style={{ background: "rgba(255,255,255,0.16)", color: "#fff", borderColor: "rgba(255,255,255,0.4)", cursor: "default" }}>
                    Confirm rate · {confirmRate}%
                  </span>
                )}
              </div>
            </div>

            {/* confirmations CHART + diagonal-hatch slate card */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", gap: 14 }}>
              <div className="tp-card rise" style={{ padding: 20, animationDelay: "160ms" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div>
                    <div className="tp-label">Confirmations</div>
                    <div className="display" style={{ fontSize: 19, marginTop: 5 }}>Recent activity</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11.5, fontWeight: 600, color: "var(--muted)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: "var(--slate)" }} /> Confirmed
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: "var(--amber)" }} /> Open
                    </span>
                  </div>
                </div>
                <ConfirmChart recent={recent} />
                <div style={{ marginTop: 10, fontSize: 12, color: "var(--faint)", fontWeight: 600, textAlign: "center" }}>
                  Last {Math.min(recent.length, 14)} on-chain pings
                </div>
              </div>

              <div className="tp-hatch rise" style={{ padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between", animationDelay: "200ms" }}>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.7 }}>
                    Confirm rate
                  </div>
                  <div className="display" style={{ fontSize: 44, lineHeight: 1, margin: "10px 0 2px" }}>
                    <CountUp value={confirmRate} decimals={0} suffix="%" />
                  </div>
                </div>
                {/* progress meter */}
                <div style={{ position: "relative", zIndex: 1, marginTop: 16 }}>
                  <div style={{ height: 9, borderRadius: 999, background: "rgba(255,255,255,0.16)", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${confirmRate}%`,
                        borderRadius: 999,
                        background: "linear-gradient(90deg, var(--amber), #f6a44f)",
                        transition: "width 1.1s cubic-bezier(0.22,1,0.36,1)",
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 9, fontSize: 12.5, fontWeight: 500, opacity: 0.82, lineHeight: 1.45 }}>
                    {confirmedNum} of {totalPings || 0} pings confirmed across the network.
                  </div>
                </div>
              </div>
            </div>

            {/* tasks list */}
            <div className="tp-card rise" style={{ padding: 20, animationDelay: "220ms" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
                <div className="display" style={{ fontSize: 19 }}>Your tasks</div>
                <div style={{ display: "flex", gap: 6, background: "var(--bg-2)", padding: 4, borderRadius: 999 }}>
                  {(["inbox", "sent"] as const).map((t) => {
                    const activeTab = tab === t;
                    const count = t === "inbox" ? inbox.length : sent.length;
                    return (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        style={{
                          textTransform: "capitalize",
                          border: "none",
                          cursor: "pointer",
                          borderRadius: 999,
                          padding: "7px 16px",
                          fontWeight: 700,
                          fontSize: 13,
                          fontFamily: "inherit",
                          color: activeTab ? "#fff" : "var(--muted)",
                          background: activeTab ? "var(--slate)" : "transparent",
                          transition: "background 0.2s ease, color 0.2s ease",
                        }}
                      >
                        {t}{count > 0 ? ` · ${count}` : ""}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!account ? (
                <div style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600, padding: "32px 0" }}>
                  Connect your wallet to see your pings.
                </div>
              ) : list.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600, padding: "32px 0" }}>
                  {tab === "inbox" ? "Nothing waiting on you 🎉" : "You haven't sent any pings yet."}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {list.map((p) => (
                    <PingCard
                      key={p.id}
                      ping={p}
                      me={account}
                      busyId={busyId}
                      msg={actMsg[p.id]}
                      onConfirm={(id) => act(id, "confirm")}
                      onDecline={(id) => act(id, "decline")}
                      onCancel={(id) => act(id, "cancel")}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT column: create-task + recent ─────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18, position: "sticky", top: 84 }}>
            <div className="tp-card rise" style={{ padding: 22, animationDelay: "90ms" }}>
              <div className="display" style={{ fontSize: 20, marginBottom: 4 }}>New ping</div>
              <p style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 500, marginBottom: 18 }}>
                Send a task to someone for confirmation.
              </p>
              {!account ? (
                <button onClick={connect} disabled={connecting} className="tp-btn tp-btn--amber" style={{ width: "100%" }}>
                  {connecting ? "Connecting…" : "Connect wallet"}
                </button>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                  <div>
                    <label className="tp-label" style={{ display: "block", marginBottom: 7 }}>Assignee</label>
                    <div className="tp-field">
                      <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x… who confirms" className="tp-input" />
                    </div>
                  </div>
                  <div>
                    <label className="tp-label" style={{ display: "block", marginBottom: 7 }}>Task</label>
                    <div className="tp-field">
                      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Approve duct layout rev. C" className="tp-input" />
                    </div>
                  </div>
                  <div>
                    <label className="tp-label" style={{ display: "block", marginBottom: 7 }}>
                      Bounty <span style={{ color: "var(--faint)", textTransform: "none", letterSpacing: 0, fontWeight: 600 }}>· optional</span>
                    </label>
                    <div className="tp-field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input value={bounty} onChange={(e) => setBounty(e.target.value)} type="number" min="0" step="0.01" placeholder="0.0" className="tp-input" />
                      <span style={{ fontSize: 13, color: "var(--amber-deep)", fontWeight: 800, flexShrink: 0 }}>USDC</span>
                    </div>
                  </div>
                  <button onClick={sendPing} disabled={sending} className="tp-btn tp-btn--amber" style={{ width: "100%", marginTop: 4, padding: "13px 20px" }}>
                    {sending ? <span className="spin-slow" style={{ display: "inline-block", width: 15, height: 15, border: "2px solid rgba(255,255,255,0.5)", borderTopColor: "#fff", borderRadius: 999 }} /> : null}
                    {sending ? "Sending…" : "Send ping"}
                  </button>
                  {formMsg && (
                    <div style={{ fontSize: 13, fontWeight: 600, color: formMsg.startsWith("✓") ? "var(--green)" : formMsg.startsWith("✗") ? "var(--red)" : "var(--muted)" }}>
                      {formMsg}
                    </div>
                  )}
                  <p style={{ fontSize: 12, color: "var(--faint)", fontWeight: 500, lineHeight: 1.5 }}>
                    Bounty is escrowed on-chain and released on confirm. Decline or cancel refunds you.
                  </p>
                </div>
              )}
            </div>

            {/* recent on-chain activity */}
            <div className="tp-card rise" style={{ padding: 20, animationDelay: "160ms" }}>
              <div className="tp-label" style={{ marginBottom: 12 }}>Recent on-chain activity</div>
              {recent.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--faint)", fontWeight: 600, padding: "10px 0" }}>No pings yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {recent.slice(0, 7).map((p) => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 4px", fontSize: 13, fontWeight: 500, borderBottom: "1px solid var(--line-soft)" }}>
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: 999,
                          flexShrink: 0,
                          background:
                            p.status === PingStatus.Confirmed ? "var(--green)" :
                            p.status === PingStatus.Pending ? "var(--yellow)" :
                            p.status === PingStatus.Declined ? "var(--red)" : "var(--faint)",
                        }}
                      />
                      <span style={{ flex: 1, minWidth: 0, color: "var(--ink)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
                      {p.bounty > 0n && <span className="tnum" style={{ color: "var(--amber-deep)", fontWeight: 700, fontSize: 12 }}>{fmtArc(p.bounty)}</span>}
                      <span style={{ color: "var(--faint)", fontSize: 11.5, flexShrink: 0 }}>{shortAddr(p.to, 5, 3)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* how it works */}
      <div style={{ ...wrap, marginTop: 40 }}>
        <h2 className="display" style={{ fontSize: 24, marginBottom: 16 }}>How it works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {[
            { n: "01", t: "Ping", d: "Send a task to someone's wallet. Attach a bounty if you want.", c: "var(--amber)" },
            { n: "02", t: "Confirm", d: "They sign off in one click — timestamped on ARC forever.", c: "var(--blue)" },
            { n: "03", t: "Settle", d: "The bounty releases to them instantly. No middleman.", c: "var(--slate)" },
          ].map((s) => (
            <div key={s.n} className="tp-card tp-lift" style={{ padding: 20 }}>
              <div className="display tnum" style={{ fontSize: 24, color: s.c }}>{s.n}</div>
              <div style={{ fontSize: 16.5, fontWeight: 700, margin: "8px 0 6px", letterSpacing: "-0.01em" }}>{s.t}</div>
              <div style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 500, lineHeight: 1.5 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* footer */}
      <div style={{ ...wrap, marginTop: 36 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, color: "var(--muted)", fontWeight: 600, flexWrap: "wrap" }}>
          <span>Verified contract</span>
          <a href={`${ARCSCAN}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--amber-deep)", textDecoration: "none", fontWeight: 700 }}>
            {shortAddr(CONTRACT_ADDRESS, 10, 8)} ↗
          </a>
        </div>
      </div>
    </div>
  );
}
