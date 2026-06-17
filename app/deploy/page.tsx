"use client";

import { useState } from "react";
import { ethers } from "ethers";
import Link from "next/link";
import Logo from "@/components/Logo";
import { ARC_CHAIN_ID, ARCSCAN, switchToArc } from "@/lib/arcNetwork";
import { ensureDiscovered, pickProvider } from "@/lib/wallet";
import { setContractAddress } from "@/lib/taskping";
import build from "@/lib/taskping_build.json";

export default function DeployPage() {
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [address, setAddress] = useState("");
  const [verify, setVerify] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSrc, setShowSrc] = useState(false);

  async function connect() {
    try {
      setError("");
      await ensureDiscovered();
      const inj = pickProvider();
      if (!inj) {
        setError("No wallet found. Enable Rabby (or MetaMask) and reload.");
        return;
      }
      const provider = new ethers.BrowserProvider(inj);
      const accounts = (await provider.send("eth_requestAccounts", [])) as string[];
      setAccount(accounts[0]);
      await switchToArc(inj);
      const bal = await provider.getBalance(accounts[0]);
      setBalance(parseFloat(ethers.formatEther(bal)).toFixed(3));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function deploy() {
    try {
      setError("");
      setBusy(true);
      setStatus("Switching to ARC Testnet…");
      await ensureDiscovered();
      const inj = pickProvider();
      if (!inj) throw new Error("No wallet found");
      await switchToArc(inj);
      const provider = new ethers.BrowserProvider(inj);
      const signer = await provider.getSigner(account);
      setStatus("Deploying TaskPing… confirm in your wallet");
      const factory = new ethers.ContractFactory(build.abi as ethers.InterfaceAbi, build.bytecode, signer);
      const contract = await factory.deploy();
      setStatus("Waiting for confirmation on ARC…");
      await contract.waitForDeployment();
      const addr = await contract.getAddress();
      setAddress(addr);
      setContractAddress(addr);
      setStatus("Deployed. Submitting verification…");
      const bal = await provider.getBalance(account);
      setBalance(parseFloat(ethers.formatEther(bal)).toFixed(3));
      await verifyOnArcScan(addr);
    } catch (e) {
      setError((e as Error).message?.slice(0, 140) || "Deploy failed");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOnArcScan(addr: string) {
    try {
      setVerify("Submitting source to ArcScan…");
      const resp = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr }),
      });
      const data = await resp.json();
      if (data.ok) setVerify("✓ Verification submitted (GUID " + data.guid + ")");
      else setVerify("Verify manually on ArcScan — " + (data.error || "submitted"));
    } catch {
      setVerify("Auto-verify failed — verify manually at testnet.arcscan.app/verifyContract");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "26px 22px 60px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 26 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none" }}>
            <Logo size={38} />
            <span className="display" style={{ fontSize: 24 }}>TaskPing</span>
          </Link>
          <Link href="/" className="tp-btn tp-btn--sm">← Back</Link>
        </div>

        <div style={{ marginBottom: 22 }}>
          <span className="tp-tag" style={{ background: "var(--yellow)", fontSize: 13, marginBottom: 14 }}>One-time setup</span>
          <h1 className="display hero-sticker" style={{ fontSize: 36, margin: "14px 0 8px" }}>Deploy the contract</h1>
          <p style={{ fontSize: 15, color: "var(--muted)", fontWeight: 500, lineHeight: 1.5 }}>
            Spin up your own TaskPing on ARC Testnet. Costs a sliver of test ARC, takes a few seconds,
            and the app connects to it automatically.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* step 1 */}
          <div className="tp-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--faint)", marginBottom: 12 }}>STEP 1 · WALLET</div>
            {account ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span className="tp-pill" style={{ background: "var(--green)", color: "var(--paper)" }}>
                  {account.slice(0, 8)}…{account.slice(-6)}
                </span>
                <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 600 }}>{balance} ARC</span>
              </div>
            ) : (
              <button onClick={connect} className="tp-btn tp-btn--pink">Connect wallet</button>
            )}
          </div>

          {/* step 2 */}
          <div className="tp-card" style={{ padding: 20, opacity: account ? 1 : 0.6 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--faint)", marginBottom: 12 }}>STEP 2 · DEPLOY</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <button onClick={deploy} disabled={!account || busy} className="tp-btn tp-btn--orange">
                {busy ? "Deploying…" : "Deploy TaskPing"}
              </button>
              <button onClick={() => setShowSrc((s) => !s)} className="tp-btn tp-btn--sm">
                {showSrc ? "Hide source" : "View source"}
              </button>
              <span style={{ fontSize: 12.5, color: "var(--faint)", fontWeight: 500 }}>
                Solidity {build.compilerVersion} · optimizer {build.optimizer.runs}
              </span>
            </div>

            {status && (
              <div className="tp-soft" style={{ marginTop: 14, padding: "11px 13px", background: "var(--cream-2)", fontSize: 13.5, fontWeight: 600 }}>
                {status}
              </div>
            )}
            {verify && <div style={{ marginTop: 8, fontSize: 13.5, color: "var(--muted)", fontWeight: 600 }}>{verify}</div>}
            {error && (
              <div className="tp-soft" style={{ marginTop: 10, padding: "11px 13px", background: "var(--red)", color: "var(--paper)", fontSize: 13.5, fontWeight: 600 }}>
                {error}
              </div>
            )}

            {showSrc && (
              <textarea
                readOnly
                value={build.source}
                style={{ marginTop: 14, width: "100%", height: 220, background: "var(--cream-2)", border: "2px solid var(--ink)", borderRadius: 12, padding: 12, fontSize: 12, fontFamily: "ui-monospace, monospace", color: "var(--ink)", resize: "vertical", outline: "none" }}
              />
            )}
          </div>

          {/* result */}
          {address && (
            <div className="tp-card" style={{ padding: 20, background: "var(--green)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--paper)", marginBottom: 8, opacity: 0.85 }}>✓ DEPLOYED & CONNECTED</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--paper)", wordBreak: "break-all", marginBottom: 14 }}>{address}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href="/" className="tp-btn">Open TaskPing →</Link>
                <a href={`${ARCSCAN}/address/${address}`} target="_blank" rel="noopener noreferrer" className="tp-btn">View on ArcScan ↗</a>
              </div>
            </div>
          )}
        </div>

        <p style={{ marginTop: 18, fontSize: 12.5, color: "var(--faint)", fontWeight: 600, textAlign: "center" }}>
          ARC Testnet · chain {ARC_CHAIN_ID}
        </p>
      </div>
    </div>
  );
}
