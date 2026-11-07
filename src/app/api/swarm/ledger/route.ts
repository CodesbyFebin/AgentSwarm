/**
 * SwarmPay Ledger — /api/swarm/ledger
 * GET -> settlement history + aggregate stats
 */

import { NextResponse } from "next/server";
import { ledgerStats, listLedger } from "@/lib/swarm-store";

export async function GET() {
  return NextResponse.json({
    stats: ledgerStats(),
    entries: listLedger(50),
  });
}
