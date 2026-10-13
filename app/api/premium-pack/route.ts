/**
 * PAID PREMIUM PACK ROUTE
 *
 * Protected with x402 (official @x402/next): unpaid requests get a 402
 * challenge, and the handler only runs after the facilitator verifies and
 * settles a 0.10 test-USDC payment on Base Sepolia.
 */
import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { getPremiumPackResourceServer, getPremiumPackRoutes } from "@/lib/x402-server";

export const dynamic = "force-dynamic";

const PACK = {
  title: "Advanced Solidity Security Pack",
  description:
    "Unlock an advanced learning pack covering smart-contract security, common vulnerabilities, and secure Solidity patterns.",
  price: "0.10 test USDC on Base Sepolia",
  network: "Base Sepolia testnet payment. No real funds are used.",
  coverage: ["Smart-contract security", "Common vulnerabilities", "Secure Solidity patterns"],
};

async function handler() {
  return NextResponse.json({ unlocked: true, pack: PACK });
}

async function handlerNotConfigured() {
  return NextResponse.json(
    { code: "not_configured", error: "Payments are not configured on this server." },
    { status: 503 }
  );
}

let cachedGet: ((request: NextRequest) => Promise<Response>) | null = null;

export async function GET(request: NextRequest) {
  const routes = getPremiumPackRoutes();
  if (!routes) {
    cachedGet = null;
    return handlerNotConfigured();
  }
  cachedGet ??= withX402(handler, routes, getPremiumPackResourceServer());
  return cachedGet(request);
}
