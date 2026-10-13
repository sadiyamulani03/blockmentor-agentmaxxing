/**
 * X402 SERVER CONFIG (Base Sepolia test-USDC)
 *
 * Builds the x402 resource server used by the premium-pack route:
 * the official public testnet facilitator + the Exact EVM scheme.
 * All payment configuration comes from environment variables.
 */
import { HTTPFacilitatorClient, x402ResourceServer, type RoutesConfig } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

/** Base Sepolia only (CAIP-2 / chain ID 84532). Never mainnet. */
export const BASE_SEPOLIA_NETWORK = "eip155:84532";
export const PREMIUM_PACK_PATH = "/api/premium-pack";

const DEFAULT_FACILITATOR_URL = "https://x402.org/facilitator";
const DEFAULT_PRICE = "$0.10";

export function getFacilitatorUrl() {
  return process.env.X402_FACILITATOR_URL?.trim() || DEFAULT_FACILITATOR_URL;
}

export function getPrice() {
  return process.env.X402_PRICE?.trim() || DEFAULT_PRICE;
}

/** Receiving address from env. Validated as an address shape; never invented. */
export function getPayTo(): string | null {
  const value = process.env.X402_PAY_TO?.trim();
  return value && /^0x[a-fA-F0-9]{40}$/.test(value) ? value : null;
}

let resourceServer: x402ResourceServer | null = null;

export function getPremiumPackResourceServer(): x402ResourceServer {
  if (!resourceServer) {
    resourceServer = new x402ResourceServer(new HTTPFacilitatorClient({ url: getFacilitatorUrl() }));
    resourceServer.register(BASE_SEPOLIA_NETWORK, new ExactEvmScheme());
  }
  return resourceServer;
}

/** Route config for withX402, or null when X402_PAY_TO is not configured. */
export function getPremiumPackRoutes(): RoutesConfig | null {
  const payTo = getPayTo();
  if (!payTo) return null;
  return {
    [PREMIUM_PACK_PATH]: {
      accepts: [
        {
          scheme: "exact",
          price: getPrice(),
          network: BASE_SEPOLIA_NETWORK,
          payTo,
        },
      ],
      description: "Advanced Solidity Security Pack unlock",
      mimeType: "application/json",
    },
  };
}
