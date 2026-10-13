"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BASE_SEPOLIA_ID, WRONG_NETWORK_MESSAGE, useWallet } from "@/components/wallet-context";
import { cn } from "@/lib/utils";

export function PremiumPack() {
  const { connected, chainId } = useWallet();
  const [showComingSoon, setShowComingSoon] = useState(false);

  const onBaseSepolia = connected && chainId === BASE_SEPOLIA_ID;
  const disabled = !onBaseSepolia;

  const message = !connected
    ? "Connect your wallet to unlock this pack."
    : !onBaseSepolia
      ? WRONG_NETWORK_MESSAGE
      : showComingSoon
        ? "Payment flow coming soon."
        : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="size-4 text-primary" />
          <p className="font-bold tracking-tight uppercase">Advanced Solidity Security Pack</p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Unlock an advanced learning pack covering smart-contract security, common vulnerabilities, and secure Solidity patterns.
        </p>
        <p className="font-mono text-sm">0.10 test USDC on Base Sepolia</p>
        <p className="text-xs text-muted-foreground">Base Sepolia testnet payment. No real funds are used.</p>
        <Button
          variant="outline"
          className="w-fit font-mono uppercase"
          disabled={disabled}
          onClick={() => setShowComingSoon(true)}
        >
          <Lock /> Unlock with test USDC
        </Button>
        {message && (
          <p className={cn("text-xs", connected && !onBaseSepolia ? "font-medium text-destructive" : "text-muted-foreground")}>
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
