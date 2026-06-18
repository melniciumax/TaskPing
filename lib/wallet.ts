// ---------------------------------------------------------------------------
// Multi-wallet discovery via EIP-6963.
//
// A browser with Rabby + MetaMask + OKX + Phantom all installed has them
// scrapping over window.ethereum, so individual requests silently vanish.
// EIP-6963 sidesteps that: every wallet announces itself by event, we keep a
// table of what showed up, and we pin one specific provider so that every
// read, write and event subscription afterwards talks to the same wallet.
// ---------------------------------------------------------------------------

export interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  isRabby?: boolean;
  isMetaMask?: boolean;
}

interface ProviderDetail {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: Eip1193Provider;
}

// Wallets we reach for first, in order, when nothing has been pinned yet.
const PREFERENCE = ["io.rabby", "io.metamask"];

// localStorage slot that remembers which wallet the user pinned. Built from a
// namespace + field pair so the layout differs from the sibling scaffolds.
const PIN_NAMESPACE = "tp:v1";
const PIN_FIELD = "pinned-rdns";
const PIN_SLOT = `${PIN_NAMESPACE}/${PIN_FIELD}`;

// Running table of every wallet that has announced itself this session.
const announced: ProviderDetail[] = [];

function remember(detail?: ProviderDetail) {
  if (!detail?.info?.rdns || !detail.provider) return;
  const at = announced.findIndex((d) => d.info.rdns === detail.info.rdns);
  if (at === -1) announced.push(detail);
  else announced[at] = detail;
}

// Wire up the announce/request handshake as soon as we have a window.
if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", (e: Event) => {
    remember((e as CustomEvent<ProviderDetail>).detail);
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

// --- pinned-choice persistence ---------------------------------------------

export function getChosenRdns(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(PIN_SLOT) || "";
  } catch {
    return "";
  }
}

export function setChosenRdns(rdns: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PIN_SLOT, rdns);
  } catch {
    /* ignore */
  }
}

// --- discovery helpers ------------------------------------------------------

export function refreshWallets() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("eip6963:requestProvider"));
}

/** Resolve once at least one wallet has announced (or a short timeout). */
export function ensureDiscovered(timeoutMs = 250): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (announced.length) {
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    let settled = false;
    const onAnnounce = () => finish();
    function finish() {
      if (settled) return;
      settled = true;
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      resolve();
    }
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    setTimeout(finish, timeoutMs);
  });
}

export function listWallets() {
  refreshWallets();
  return announced.map((d) => ({ name: d.info.name, rdns: d.info.rdns, icon: d.info.icon }));
}

// --- provider selection -----------------------------------------------------

/** Best matching provider detail — pinned choice, then preference, then any. */
export function pickDetail(rdns?: string): { provider: Eip1193Provider; rdns: string } | undefined {
  refreshWallets();
  const want = rdns ?? getChosenRdns();
  if (want) {
    const hit = announced.find((d) => d.info.rdns === want);
    if (hit) return { provider: hit.provider, rdns: hit.info.rdns };
  }
  for (const r of PREFERENCE) {
    const hit = announced.find((d) => d.info.rdns === r);
    if (hit) return { provider: hit.provider, rdns: hit.info.rdns };
  }
  if (announced[0]) return { provider: announced[0].provider, rdns: announced[0].info.rdns };
  return undefined;
}

/** Best injected provider. Defaults to the pinned wallet, then Rabby/MetaMask. */
export function pickProvider(rdns?: string): Eip1193Provider | undefined {
  const d = pickDetail(rdns);
  if (d) return d.provider;
  return typeof window !== "undefined" ? (window.ethereum as Eip1193Provider | undefined) : undefined;
}
