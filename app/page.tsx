"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import Header from "@/components/Header";
import Rainbow from "@/components/Rainbow";
import PingCard from "@/components/PingCard";
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

  const wrap: React.CSSProperties = { maxWidth: 1120, margin: "0 auto", padding: "0 22px" };
  const list = tab === "inbox" ? inbox : sent;

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 70, overflow: "hidden" }}>
      <Header account={account} balance={balance} chainOk={chainOk} connecting={connecting} onConnect={connect} />

      {/* hero */}
      <div style={{ position: "relative" }}>
        <Rainbow size={300} style={{ position: "absolute", top: -20, right: -30, opacity: 0.9, pointerEvents: "none" }} />
        <Rainbow size={190} style={{ position: "absolute", top: 40, left: -70, transform: "scaleX(-1)", opacity: 0.85, pointerEvents: "none" }} />
        <div style={{ ...wrap, paddingTop: 46, paddingBottom: 18, position: "relative", textAlign: "center" }}>
          <span className="tp-tag" style={{ background: "var(--orange)", color: "var(--paper)", fontSize: 13.5, marginBottom: 18 }}>
            On-chain sign-offs · ARC Testnet
          </span>
          <h1 className="display hero-sticker" style={{ fontSize: 52, margin: "16px auto 14px", maxWidth: 760, lineHeight: 1.02 }}>
            Task confirmations<br />that actually stick.
          </h1>
          <p style={{ fontSize: 16.5, color: "var(--muted)", fontWeight: 500, maxWidth: 540, margin: "0 auto", lineHeight: 1.5 }}>
            Ping someone, they confirm, it&apos;s on the chain forever. Add a bounty that releases the
            moment they sign off.
          </p>
        </div>
      </div>

      {/* stats */}
      <div style={{ ...wrap, marginTop: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {[
            { label: "Total pings", value: overview.pings.toString(), bg: "var(--paper)" },
            { label: "Confirmed", value: overview.confirmed.toString(), bg: "var(--yellow)" },
            { label: "USDC escrowed", value: fmtArc(overview.escrowed), bg: "var(--pink)" },
            { label: "Your sign-offs", value: account ? reputation.toString() : "—", bg: "var(--orange-2)" },
          ].map((s) => (
            <div key={s.label} className="tp-card" style={{ padding: "16px 18px", background: s.bg }}>
              <div className="display" style={{ fontSize: 30, color: "var(--ink)" }}>{s.value}</div>
              <div style={{ fontSize: 13.5, color: "var(--ink)", fontWeight: 600, marginTop: 2, opacity: 0.75 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* main grid */}
      <div style={{ ...wrap, marginTop: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(0,1fr)", gap: 20, alignItems: "start" }}>
          {/* left */}
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {(["inbox", "sent"] as const).map((t) => {
                const activeTab = tab === t;
                const count = t === "inbox" ? inbox.length : sent.length;
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className="tp-btn tp-btn--sm"
                    style={{
                      textTransform: "capitalize",
                      background: activeTab ? "var(--ink)" : "var(--paper)",
                      color: activeTab ? "var(--paper)" : "var(--ink)",
                      fontSize: 14,
                      padding: "9px 18px",
                    }}
                  >
                    {t}{count > 0 ? ` · ${count}` : ""}
                  </button>
                );
              })}
            </div>

            {!account ? (
              <div className="tp-card" style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600, padding: 38 }}>
                Connect your wallet to see your pings.
              </div>
            ) : list.length === 0 ? (
              <div className="tp-card" style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600, padding: 38 }}>
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

            {recent.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--muted)", marginBottom: 12, letterSpacing: "0.02em" }}>
                  RECENT ON-CHAIN ACTIVITY
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {recent.slice(0, 8).map((p) => (
                    <div key={p.id} className="tp-soft" style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 14px", fontSize: 13.5, fontWeight: 500 }}>
                      <span style={{ width: 11, height: 11, borderRadius: 99, border: "2px solid var(--ink)", flexShrink: 0, background: p.status === PingStatus.Confirmed ? "var(--green)" : p.status === PingStatus.Pending ? "var(--yellow)" : p.status === PingStatus.Declined ? "var(--red)" : "var(--cream-2)" }} />
                      <span style={{ flex: 1, minWidth: 0, color: "var(--ink)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
                      {p.bounty > 0n && <span style={{ color: "var(--orange)", fontWeight: 700, fontSize: 13 }}>{fmtArc(p.bounty)} USDC</span>}
                      <span style={{ color: "var(--faint)", fontSize: 12.5, flexShrink: 0 }}>{shortAddr(p.to, 5, 3)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* right: new ping */}
          <div className="tp-card" style={{ padding: 22, position: "sticky", top: 84 }}>
            <div className="display" style={{ fontSize: 22, marginBottom: 4 }}>New ping</div>
            <p style={{ fontSize: 13.5, color: "var(--muted)", fontWeight: 500, marginBottom: 16 }}>
              Send a task to someone for confirmation.
            </p>
            {!account ? (
              <button onClick={connect} className="tp-btn tp-btn--pink" style={{ width: "100%" }}>Connect wallet</button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600, display: "block", marginBottom: 6 }}>Assignee</label>
                  <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x… who confirms" className="tp-input" />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600, display: "block", marginBottom: 6 }}>Task</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Approve duct layout rev. C" className="tp-input" />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600, display: "block", marginBottom: 6 }}>
                    Bounty <span style={{ color: "var(--faint)", fontWeight: 500 }}>· optional</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input value={bounty} onChange={(e) => setBounty(e.target.value)} type="number" min="0" step="0.01" placeholder="0.0" className="tp-input" style={{ paddingRight: 60 }} />
                    <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--faint)", fontWeight: 700 }}>USDC</span>
                  </div>
                </div>
                <button onClick={sendPing} disabled={sending} className="tp-btn tp-btn--orange" style={{ width: "100%", marginTop: 2 }}>
                  {sending ? "Sending…" : "Send ping"}
                </button>
                {formMsg && (
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: formMsg.startsWith("✓") ? "var(--green)" : formMsg.startsWith("✗") ? "var(--red)" : "var(--muted)" }}>
                    {formMsg}
                  </div>
                )}
                <p style={{ fontSize: 12.5, color: "var(--faint)", fontWeight: 500, lineHeight: 1.5 }}>
                  Bounty is escrowed on-chain and released on confirm. Decline or cancel refunds you.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* how it works */}
      <div style={{ ...wrap, marginTop: 44 }}>
        <h2 className="display hero-sticker" style={{ fontSize: 30, textAlign: "center", marginBottom: 20 }}>How it works</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            { n: "1", t: "Ping", d: "Send a task to someone's wallet. Attach a bounty if you want.", bg: "var(--yellow)" },
            { n: "2", t: "Confirm", d: "They sign off in one click — timestamped on ARC forever.", bg: "var(--pink)" },
            { n: "3", t: "Settle", d: "The bounty releases to them instantly. No middleman.", bg: "var(--orange-2)" },
          ].map((s) => (
            <div key={s.n} className="tp-card" style={{ padding: 20, background: s.bg }}>
              <div className="display" style={{ fontSize: 34, color: "var(--ink)" }}>{s.n}</div>
              <div style={{ fontSize: 18, fontWeight: 700, margin: "4px 0 6px" }}>{s.t}</div>
              <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500, opacity: 0.78, lineHeight: 1.5 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* footer */}
      <div style={{ ...wrap, marginTop: 40 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 13, color: "var(--muted)", fontWeight: 600, flexWrap: "wrap" }}>
          <span>Verified contract</span>
          <a href={`${ARCSCAN}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--orange)", textDecoration: "none", fontWeight: 700 }}>
            {shortAddr(CONTRACT_ADDRESS, 10, 8)} ↗
          </a>
        </div>
      </div>
    </div>
  );
}
