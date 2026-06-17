import { ethers } from "ethers";
import { ARC_RPC } from "./arcNetwork";

// ─────────────────────────────────────────────────────────────
// TaskPing — on-chain task confirmations on ARC Testnet.
//
// The contract address is resolved at runtime: a per-browser override
// (set by the /deploy console) takes priority, falling back to the baked
// default. This lets anyone point the app at their own deployed instance
// without touching the code.
// ─────────────────────────────────────────────────────────────
export const DEFAULT_CONTRACT_ADDRESS = "0x2F3aC4dBAbe43f4E14bE8DE7e331f2D4DE35A7C3";
const LS_KEY = "taskping.contract";

export function getContractAddress(): string {
  if (typeof window !== "undefined") {
    try {
      const o = window.localStorage.getItem(LS_KEY);
      if (o && ethers.isAddress(o)) return ethers.getAddress(o);
    } catch {
      /* ignore */
    }
  }
  return DEFAULT_CONTRACT_ADDRESS;
}

export function setContractAddress(addr: string) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LS_KEY, ethers.getAddress(addr));
    } catch {
      /* ignore */
    }
  }
}

export function clearContractAddress() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function isConfigured(addr?: string): boolean {
  const a = addr ?? getContractAddress();
  return ethers.isAddress(a) && a.toLowerCase() !== ethers.ZeroAddress.toLowerCase();
}

export const TASKPING_ABI = [
  "function pingCount() view returns (uint256)",
  "function totalConfirmed() view returns (uint256)",
  "function totalEscrowed() view returns (uint256)",
  "function confirmedCount(address) view returns (uint256)",
  "function sentOf(address) view returns (uint256[])",
  "function receivedOf(address) view returns (uint256[])",
  "function getPing(uint256) view returns (tuple(uint256 id, address from, address to, string title, uint256 bounty, uint8 status, uint64 createdAt, uint64 resolvedAt))",
  "function createPing(address to, string title) payable returns (uint256)",
  "function confirm(uint256 id)",
  "function decline(uint256 id)",
  "function cancel(uint256 id)",
  "event PingCreated(uint256 indexed id, address indexed from, address indexed to, string title, uint256 bounty)",
  "event PingConfirmed(uint256 indexed id, address indexed to, address indexed from, uint256 bounty)",
  "event PingDeclined(uint256 indexed id, address indexed to, address indexed from)",
  "event PingCancelled(uint256 indexed id, address indexed from)",
];

export enum PingStatus {
  Pending = 0,
  Confirmed = 1,
  Declined = 2,
  Cancelled = 3,
}

export const STATUS_LABEL = ["Pending", "Confirmed", "Declined", "Cancelled"] as const;

export interface Ping {
  id: number;
  from: string;
  to: string;
  title: string;
  bounty: bigint;
  status: PingStatus;
  createdAt: number;
  resolvedAt: number;
}

export interface Overview {
  pings: bigint;
  confirmed: bigint;
  escrowed: bigint;
}

// ── read helpers (public RPC, no wallet) ──────────────────────
export function readProvider() {
  return new ethers.JsonRpcProvider(ARC_RPC);
}

export function readContract(address?: string, provider?: ethers.Provider) {
  return new ethers.Contract(address ?? getContractAddress(), TASKPING_ABI, provider ?? readProvider());
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  const failed: T[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const settled = await Promise.allSettled(batch.map(fn));
    settled.forEach((s, j) => (s.status === "fulfilled" ? out.push(s.value) : failed.push(batch[j])));
  }
  // Retry transient failures once before giving up (avoids silently dropping rows).
  if (failed.length) {
    const settled = await Promise.allSettled(failed.map(fn));
    for (const s of settled) if (s.status === "fulfilled") out.push(s.value);
  }
  return out;
}

function toPing(p: {
  id: bigint;
  from: string;
  to: string;
  title: string;
  bounty: bigint;
  status: bigint | number;
  createdAt: bigint | number;
  resolvedAt: bigint | number;
}): Ping {
  return {
    id: Number(p.id),
    from: p.from,
    to: p.to,
    title: p.title,
    bounty: p.bounty,
    status: Number(p.status) as PingStatus,
    createdAt: Number(p.createdAt),
    resolvedAt: Number(p.resolvedAt),
  };
}

export async function fetchOverview(contract?: ethers.Contract): Promise<Overview> {
  const c = contract ?? readContract();
  const [pings, confirmed, escrowed] = await Promise.all([
    c.pingCount(),
    c.totalConfirmed(),
    c.totalEscrowed(),
  ]);
  return { pings, confirmed, escrowed };
}

export async function fetchReputation(addr: string, contract?: ethers.Contract): Promise<number> {
  const c = contract ?? readContract();
  return Number(await c.confirmedCount(addr));
}

export async function fetchPingsByIds(ids: number[], contract?: ethers.Contract): Promise<Ping[]> {
  const c = contract ?? readContract();
  const raw = await mapLimit(ids, 10, async (id) => toPing(await c.getPing(id)));
  raw.sort((a, b) => b.id - a.id); // newest first
  return raw;
}

// Cap how many pings we hydrate per list — ids are appended, so the tail is newest.
const MAX_ROWS = 200;

export async function fetchInbox(addr: string, contract?: ethers.Contract): Promise<Ping[]> {
  const c = contract ?? readContract();
  const ids: bigint[] = await c.receivedOf(addr);
  return fetchPingsByIds(ids.slice(-MAX_ROWS).map(Number), c);
}

export async function fetchSent(addr: string, contract?: ethers.Contract): Promise<Ping[]> {
  const c = contract ?? readContract();
  const ids: bigint[] = await c.sentOf(addr);
  return fetchPingsByIds(ids.slice(-MAX_ROWS).map(Number), c);
}

export async function fetchRecent(max = 12, contract?: ethers.Contract): Promise<Ping[]> {
  const c = contract ?? readContract();
  const count = Number(await c.pingCount());
  if (!count) return [];
  const ids: number[] = [];
  for (let id = count; id >= Math.max(1, count - max + 1); id--) ids.push(id);
  return fetchPingsByIds(ids, c);
}

// ── formatting ────────────────────────────────────────────────
export function shortAddr(addr: string, lead = 6, tail = 4): string {
  if (!addr) return "";
  return `${addr.slice(0, lead)}…${addr.slice(-tail)}`;
}

export function fmtArc(wei: bigint, dp = 3): string {
  const n = parseFloat(ethers.formatEther(wei));
  return n.toFixed(dp).replace(/\.?0+$/, "") || "0";
}

export function timeAgo(unixSeconds: number): string {
  if (!unixSeconds) return "";
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 0) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
