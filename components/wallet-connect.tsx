"use client";

import { useEffect, useState } from "react";
import { LogOut, RefreshCw, Wallet } from "lucide-react";
import type { Address, EIP1193Provider } from "viem";
import { baseSepolia } from "viem/chains";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

const BASE_SEPOLIA_ID = baseSepolia.id; // 84532
const BASE_SEPOLIA_ID_HEX = "0x14a34";
const WRONG_NETWORK_MESSAGE = "Please switch to Base Sepolia.";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function isUserRejection(err: unknown) {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: unknown }).code === 4001;
}

export function WalletConnect() {
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

  const wrongNetwork = address !== null && chainId !== null && chainId !== BASE_SEPOLIA_ID;

  return (
    <div className="flex flex-col items-end gap-1.5">
      {address === null ? (
        <Button variant="outline" size="sm" className="font-mono uppercase" onClick={connect} disabled={connecting}>
          <Wallet /> {connecting ? "Connecting..." : "Connect Wallet"}
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "border px-2 py-1 font-mono text-xs whitespace-nowrap",
              wrongNetwork ? "border-destructive text-destructive" : "text-muted-foreground"
            )}
          >
            {shortenAddress(address)}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={disconnect} aria-label="Disconnect wallet" title="Disconnect">
            <LogOut />
          </Button>
        </div>
      )}

      {wrongNetwork && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <p className="text-xs font-medium text-destructive">{WRONG_NETWORK_MESSAGE}</p>
          <Button variant="outline" size="xs" className="font-mono uppercase" onClick={switchNetwork} disabled={switching}>
            <RefreshCw /> {switching ? "Switching..." : "Switch network"}
          </Button>
        </div>
      )}

      {notice && <p className="text-xs text-muted-foreground">{notice}</p>}
    </div>
  );
}
