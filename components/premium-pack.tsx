"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BASE_SEPOLIA_ID, WRONG_NETWORK_MESSAGE, useWallet } from "@/components/wallet-context";
import { PaymentError, unlockWithTestUSDC, type PaymentErrorCode } from "@/lib/x402-client";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "blockmentor.premiumPack.v1";

type StoredUnlock = { address?: string; txHash: string | null; unlockedAt?: string };

const ERROR_MESSAGES: Record<PaymentErrorCode, string> = {
  rejected: "Payment rejected.",
  insufficient: "Insufficient test USDC on Base Sepolia. Please top up and try again.",
  network: WRONG_NETWORK_MESSAGE,
  timeout: "Payment timed out. Please try again.",
  gemini: "Gemini is temporarily busy. Please try again in a few minutes.",
  not_configured: "Payments are not configured on this server.",
  failed: "Payment failed. Please try again.",
};

function readStoredUnlock(): StoredUnlock | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && "txHash" in parsed) return parsed as StoredUnlock;
  } catch {
    // Ignore corrupt or unavailable storage.
  }
  return null;
}

function isAddress(value: string | null): value is `0x${string}` {
  return value !== null && /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function PremiumPack() {
  const { address, connected, chainId } = useWallet();
  const [unlocked, setUnlocked] = useState<StoredUnlock | null>(null);
  const [paying, setPaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setUnlocked(readStoredUnlock());
  }, []);

  const onBaseSepolia = connected && chainId === BASE_SEPOLIA_ID;
  const disabled = !onBaseSepolia || paying;

  async function handleUnlock() {
    if (!isAddress(address) || paying) return;
    setPaying(true);
    setErrorMessage(null);
    try {
      const { txHash } = await unlockWithTestUSDC(address);
      const record: StoredUnlock = { address, txHash, unlockedAt: new Date().toISOString() };
      setUnlocked(record);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      } catch {
        // Storage unavailable — unlock still shows for this session.
      }
    } catch (err) {
      const code = err instanceof PaymentError ? err.code : "failed";
      setErrorMessage(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.failed);
    } finally {
      setPaying(false);
    }
  }

  const statusMessage = !connected
    ? "Connect your wallet to unlock this pack."
    : !onBaseSepolia
      ? WRONG_NETWORK_MESSAGE
      : errorMessage;

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

        {unlocked ? (
          <div className="flex flex-col gap-2 border border-primary/40 bg-primary/5 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <Check className="size-4" /> Advanced Solidity Security Pack unlocked.
            </p>
            {unlocked.txHash && (
              <div className="flex flex-col gap-1">
                <p className="text-xs text-muted-foreground">Transaction</p>
                <code className="break-all font-mono text-xs">{unlocked.txHash}</code>
                <a
                  className="flex w-fit items-center gap-1 text-xs text-primary underline underline-offset-4"
                  href={`https://sepolia.basescan.org/tx/${unlocked.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on BaseScan <ExternalLink className="size-3" />
                </a>
              </div>
            )}
          </div>
        ) : (
          <>
            <Button
              variant="outline"
              className="w-fit font-mono uppercase"
              disabled={disabled}
              onClick={handleUnlock}
            >
              <Lock /> {paying ? "Unlocking..." : "Unlock with test USDC"}
            </Button>
            {statusMessage && (
              <p
                className={cn(
                  "text-xs",
                  connected && onBaseSepolia && errorMessage ? "font-medium text-destructive" : "text-muted-foreground"
                )}
              >
                {statusMessage}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
