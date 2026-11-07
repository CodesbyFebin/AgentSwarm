"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowDownRight, Clock, CheckCircle2, XCircle } from "lucide-react";
import type { LedgerEntry } from "@/types/swarm";

function StatusIcon({ status }: { status: LedgerEntry["status"] }) {
  if (status === "SETTLED")
    return <CheckCircle2 className="size-3.5 text-emerald-400" aria-label="settled" />;
  if (status === "PENDING")
    return <Clock className="size-3.5 text-amber-400" aria-label="pending" />;
  return <XCircle className="size-3.5 text-rose-400" aria-label="rejected" />;
}

function formatTime(ts: number) {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

export default function SettlementLedger({ ledger }: { ledger: LedgerEntry[] }) {
  return (
    <section className="flex h-[560px] flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-300">
          <ArrowDownRight className="size-4 text-emerald-400" />
          SwarmPay Settlement Ledger
        </h2>
        <span className="rounded border border-slate-700 bg-slate-800/60 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
          pay.agentswarm.in
        </span>
      </div>

      <ScrollArea className="flex-1 rounded-lg border border-slate-800 bg-slate-950/70">
        <div className="space-y-2 p-3">
          {ledger.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-600">No settlements yet.</div>
          )}
          {ledger.map((tx) => (
            <div
              key={tx.transaction_id}
              className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 transition hover:border-slate-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <StatusIcon status={tx.status} />
                  <code className="max-w-[140px] truncate font-mono text-[11px] text-slate-300">
                    {tx.transaction_id}
                  </code>
                </div>
                <span
                  className={`font-mono text-xs font-bold ${
                    tx.status === "SETTLED" ? "text-emerald-400" : tx.status === "PENDING" ? "text-amber-400" : "text-rose-400"
                  }`}
                >
                  {tx.status === "SETTLED" ? "+" : tx.status === "PENDING" ? "··" : "–"}
                  {tx.amount.toFixed(4)} {tx.currency}
                </span>
              </div>
              <div className="mt-2 space-y-0.5 text-[10px] text-slate-500">
                <div>
                  <span className="text-slate-600">method:</span>{" "}
                  <span className="text-slate-400">{tx.method}</span>
                </div>
                <div className="truncate">
                  <span className="text-slate-600">from:</span>{" "}
                  <span className="text-slate-400">{tx.source}</span>
                </div>
                <div className="truncate">
                  <span className="text-slate-600">to:</span>{" "}
                  <span className="text-slate-400">{tx.destination}</span>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-slate-600">{formatTime(tx.timestamp)}</span>
                  {tx.signature_hash && (
                    <code className="font-mono text-[9px] text-cyan-500/70">{tx.signature_hash}</code>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </section>
  );
}
