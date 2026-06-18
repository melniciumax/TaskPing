import { pickProvider, type Eip1193Provider } from "./wallet";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

// --- ARC Testnet chain configuration ---------------------------------------
export const ARC_CHAIN_ID = 5042002;
export const ARC_CHAIN_HEX = "0x" + ARC_CHAIN_ID.toString(16);
export const ARC_RPC = "https://rpc.testnet.arc.network";
export const ARCSCAN = "https://testnet.arcscan.app";

// Payload handed to wallet_addEthereumChain.
export const ARC_NETWORK_PARAMS = {
  chainId: ARC_CHAIN_HEX,
  chainName: "ARC Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: [ARC_RPC],
  blockExplorerUrls: [ARCSCAN],
};

/**
 * Make sure ARC Testnet exists in the wallet, then switch to it. Works against
 * a provider you pass in, or otherwise the best discovered one (Rabby first).
 */
export async function switchToArc(provider?: Eip1193Provider): Promise<void> {
  const eth = provider ?? pickProvider();
  if (!eth) throw new Error("No wallet detected");

  // Adding first is harmless even when the chain is already registered.
  try {
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [ARC_NETWORK_PARAMS],
    });
  } catch {
    // Certain wallets reject a duplicate add — that's fine, keep going.
  }

  // Now make ARC the active chain.
  await eth.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: ARC_CHAIN_HEX }],
  });
}
