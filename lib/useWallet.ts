"use client";

import { ethers } from "ethers";
import { useCallback, useEffect, useState } from "react";

import { ensureDiscovered, pickDetail, pickProvider, setChosenRdns } from "./wallet";
import { ARC_CHAIN_HEX, ARC_RPC, switchToArc } from "./arcNetwork";

/**
 * The one place wallet state lives. Wallets are discovered through EIP-6963
 * (Rabby gets first dibs), the chosen one is pinned, and that exact provider
 * backs every read, write and event afterwards. The page holds this hook and
 * hands the pieces down to the header.
 */
export function useWallet() {
  const [account, setAccount] = useState("");
  const [balance, setBalance] = useState("");
  const [chainOk, setChainOk] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Read the native (USDC) balance straight off the RPC, not the wallet.
  const refreshBalance = useCallback(async (addr: string) => {
    try {
      const rpc = new ethers.JsonRpcProvider(ARC_RPC);
      const raw = await rpc.getBalance(addr);
      setBalance(parseFloat(ethers.formatEther(raw)).toFixed(3));
    } catch {
      setBalance("—");
    }
  }, []);

  const connect = useCallback(async () => {
    await ensureDiscovered();
    const detail = pickDetail();
    const injected = detail?.provider;
    if (!injected) return;

    setChosenRdns(detail.rdns); // remember this wallet for every later call
    setConnecting(true);
    try {
      const accs = (await injected.request({ method: "eth_requestAccounts" })) as string[];
      setAccount(accs[0]);
      await switchToArc(injected);
      try {
        const id = (await injected.request({ method: "eth_chainId" })) as string;
        setChainOk(id.toLowerCase() === ARC_CHAIN_HEX.toLowerCase());
      } catch {
        setChainOk(false);
      }
      refreshBalance(accs[0]);
    } catch {
      /* user rejected */
    } finally {
      setConnecting(false);
    }
  }, [refreshBalance]);

  // Reconnect silently on mount and keep account/chain state in sync with the
  // wallet's own events.
  useEffect(() => {
    let teardown = () => {};

    (async () => {
      await ensureDiscovered();
      const injected = pickProvider();
      if (!injected) return;

      try {
        const accs = (await injected.request({ method: "eth_accounts" })) as string[];
        if (accs.length) {
          setAccount(accs[0]);
          refreshBalance(accs[0]);
          injected
            .request({ method: "eth_chainId" })
            .then((id) => setChainOk((id as string).toLowerCase() === ARC_CHAIN_HEX.toLowerCase()))
            .catch(() => {});
        }
      } catch {
        /* ignore */
      }

      if (!injected.on) return;

      const handleAccounts = (a: unknown) => {
        const list = a as string[];
        if (list.length) {
          setAccount(list[0]);
          refreshBalance(list[0]);
        } else {
          setAccount("");
          setBalance("");
          setChainOk(false);
        }
      };
      const handleChain = (c: unknown) =>
        setChainOk((c as string).toLowerCase() === ARC_CHAIN_HEX.toLowerCase());

      injected.on("accountsChanged", handleAccounts);
      injected.on("chainChanged", handleChain);
      teardown = () => {
        injected.removeListener?.("accountsChanged", handleAccounts);
        injected.removeListener?.("chainChanged", handleChain);
      };
    })();

    return () => teardown();
  }, [refreshBalance]);

  return { account, balance, chainOk, connecting, connect, refreshBalance };
}
