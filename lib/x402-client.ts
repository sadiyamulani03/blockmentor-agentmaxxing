/**
 * X402 CLIENT (Base Sepolia test-USDC)
 *
 * Pays for /api/premium-pack using the connected browser wallet.
 * The wallet signs the payment authorization (EIP-712 typed data) through
 * the injected provider — no private key ever enters the app.
 */
import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import type { ClientEvmSigner } from "@x402/evm";
import { decodePaymentResponseHeader, wrapFetchWithPayment } from "@x402/fetch";

export const BASE_SEPOLIA_CAIP2 = "eip155:84532";

const PAYMENT_TIMEOUT_MS = 60_000;
const MAX_PAYMENT_USD = "$0.10";

export type PaymentErrorCode =
  | "rejected"
  | "insufficient"
  | "network"
  | "timeout"
  | "gemini"
  | "not_configured"
  | "failed";

export class PaymentError extends Error {
  readonly code: PaymentErrorCode;
  constructor(code: PaymentErrorCode) {
    super(code);
    this.name = "PaymentError";
    this.code = code;
  }
}

function readErrorCode(err: unknown): number | undefined {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: unknown }).code;
    return typeof code === "number" ? code : undefined;
  }
  return undefined;
}

function readErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
}

function classify(err: unknown, aborted: boolean): PaymentErrorCode {
  if (aborted) return "timeout";
  if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) return "timeout";
  if (readErrorCode(err) === 4001) return "rejected";
  const message = readErrorMessage(err);
  if (/user (rejected|denied|cancel)/i.test(message)) return "rejected";
  if (/insufficient/i.test(message)) return "insufficient";
  if (/chain mismatch|target chain|wrong chain|unsupported (chain|network)|does not match the .*chain/i.test(message)) {
    return "network";
  }
  if (/temporarily busy/i.test(message)) return "gemini";
  return "failed";
}

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await response.json();
    return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function bodyMentions(body: Record<string, unknown> | null, pattern: RegExp): boolean {
  if (!body) return false;
  try {
    return pattern.test(JSON.stringify(body));
  } catch {
    return false;
  }
}

export async function unlockWithTestUSDC(address: `0x${string}`): Promise<{ txHash: string | null }> {
  const provider = window.ethereum;
  if (!provider) throw new PaymentError("failed");

  const signer: ClientEvmSigner = {
    address,
    async signTypedData(message) {
      return provider.request({
        method: "eth_signTypedData_v4",
        params: [
          address,
          JSON.stringify(
            {
              domain: message.domain,
              types: message.types,
              primaryType: message.primaryType,
              message: message.message,
            },
            (_key, value) => (typeof value === "bigint" ? value.toString() : value)
          ),
        ],
      });
    },
  };

  const client = new x402Client();
  registerExactEvmScheme(client, { signer, networks: [BASE_SEPOLIA_CAIP2] });
  client.setSpendControls({ maxAmountPerPayment: MAX_PAYMENT_USD });

  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAYMENT_TIMEOUT_MS);
  let aborted = false;
  controller.signal.addEventListener("abort", () => {
    aborted = true;
  });

  try {
    const response = await fetchWithPayment("/api/premium-pack", { signal: controller.signal });
    const body = await readJson(response);

    if (response.status === 503) {
      if (body && body.code === "not_configured") throw new PaymentError("not_configured");
      if (bodyMentions(body, /temporarily busy/i)) throw new PaymentError("gemini");
      throw new PaymentError("failed");
    }

    if (!response.ok) {
      if (bodyMentions(body, /insufficient/i)) throw new PaymentError("insufficient");
      throw new PaymentError("failed");
    }

    if (!body || body.unlocked !== true) throw new PaymentError("failed");

    const header = response.headers.get("X-PAYMENT-RESPONSE");
    if (!header) return { txHash: null };

    try {
      const settle = decodePaymentResponseHeader(header);
      if (!settle.success) {
        const detail = `${settle.errorReason ?? ""} ${settle.errorMessage ?? ""}`;
        if (/insufficient/i.test(detail)) throw new PaymentError("insufficient");
        throw new PaymentError("failed");
      }
      return { txHash: settle.transaction || null };
    } catch (err) {
      if (err instanceof PaymentError) throw err;
      return { txHash: null };
    }
  } catch (err) {
    if (err instanceof PaymentError) throw err;
    throw new PaymentError(classify(err, aborted));
  } finally {
    clearTimeout(timer);
  }
}
