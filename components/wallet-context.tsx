"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Address, EIP1193Provider } from "viem";
import { baseSepolia } from "viem/chains";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export const BASE_SEPOLIA_ID = baseSepolia.id; // 84532
const BASE_SEPOLIA_ID_HEX = "0x14a34";
export const WRONG_NETWORK_MESSAGE = "Please switch to Base Sepolia.";

function isUserRejection(err: unknown) {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === 4001;
}

type WalletValue = {
  address: string | null;
  chainId: number | null;
  connected: boolean;
  wrongNetwork: boolean;
  connecting: boolean;
  switching: boolean;
  notice: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
};

const WalletContext = createContext<WalletValue | null>(null);

export function useWallet(): WalletValue {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used within WalletProvider.");
  return value;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) return;
    let cancelled = false;

    const onChainChanged = (hex: string) => setChainId(Number.parseInt(hex, 16));
    const onAccountsChanged = (accounts: Address[]) => setAddress(accounts[0] ?? null);

    provider.on("chainChanged", onChainChanged);
    provider.on("accountsChanged", onAccountsChanged);

    (async () => {
      try {
        const accounts = await provider.request({ method: "eth_accounts" });
        if (cancelled || accounts.length === 0) return;
        setAddress(accounts[0]);
        const hex = await provider.request({ method: "eth_chainId" });
        if (!cancelled) setChainId(Number.parseInt(hex, 16));
      } catch {
        // No prior connection or wallet unreadable — stay disconnected.
      }
    })();

    return () => {
      cancelled = true;
      provider.removeListener("chainChanged", onChainChanged);
      provider.removeListener("accountsChanged", onAccountsChanged);
    };
  }, []);

  async function connect() {
    const provider = window.ethereum;
    if (!provider) {
      setNotice("No browser wallet detected.");
      return;
    }
    setConnecting(true);
    setNotice(null);
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      setAddress(accounts[0] ?? null);
      const hex = await provider.request({ method: "eth_chainId" });
      setChainId(Number.parseInt(hex, 16));
    } catch (err) {
      setNotice(isUserRejection(err) ? "Wallet connection was cancelled." : "Could not connect to wallet.");
    } finally {
      setConnecting(false);
    }
  }

  async function switchNetwork() {
    const provider = window.ethereum;
    if (!provider) return;
    setSwitching(true);
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_SEPOLIA_ID_HEX }],
      });
      setNotice(null);
    } catch {
      setNotice(WRONG_NETWORK_MESSAGE);
    } finally {
      setSwitching(false);
    }
  }

  function disconnect() {
    setAddress(null);
    setChainId(null);
    setNotice(null);
  }

  const value: WalletValue = {
    address,
    chainId,
    connected: address !== null,
    wrongNetwork: address !== null && chainId !== null && chainId !== BASE_SEPOLIA_ID,
    connecting,
    switching,
    notice,
    connect,
    disconnect,
    switchNetwork,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
