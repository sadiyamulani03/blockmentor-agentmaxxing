"use client";

import { LogOut, RefreshCw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WRONG_NETWORK_MESSAGE, useWallet } from "@/components/wallet-context";
import { cn } from "@/lib/utils";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletConnect() {
  const { address, wrongNetwork, connecting, switching, notice, connect, disconnect, switchNetwork } = useWallet();

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
