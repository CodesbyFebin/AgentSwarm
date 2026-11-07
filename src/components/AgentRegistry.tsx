"use client";

import { Server, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import type { AgentCard } from "@/types/swarm";

interface AgentRegistryProps {
  agents: AgentCard[];
  selectedId: string;
  onSelect: (agent: AgentCard) => void;
}

function StatusDot({ status }: { status: AgentCard["status"] }) {
  const color =
    status === "ONLINE"
      ? "bg-emerald-500"
      : status === "DEGRADED"
        ? "bg-amber-500"
        : "bg-slate-600";
  return (
    <span className="relative flex size-2">
      {status === "ONLINE" && (
        <span className={`absolute inline-flex size-full animate-ping rounded-full ${color} opacity-60`} />
      )}
      <span className={`relative inline-flex size-2 rounded-full ${color}`} />
    </span>
  );
}

function RiskBadge({ threshold }: { threshold: AgentCard["skills"][number]["riskThreshold"] }) {
  if (threshold === "LOW")
    return (
      <span className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
        <ShieldCheck className="size-2.5" /> LOW
      </span>
    );
  if (threshold === "MEDIUM")
    return (
      <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
        <ShieldQuestion className="size-2.5" /> MED
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold text-rose-400">
      <ShieldAlert className="size-2.5" /> HIGH
    </span>
  );
}

export default function AgentRegistry({ agents, selectedId, onSelect }: AgentRegistryProps) {
  return (
    <section className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-300">
          <Server className="size-4 text-cyan-400" />
          Swarm Node Registry
        </h2>
        <span className="rounded border border-slate-700 bg-slate-800/60 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
          registry.agentswarm.in
        </span>
      </div>

      <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1 swarm-scroll">
        {agents.map((node) => {
          const selected = node.id === selectedId;
          return (
            <button
              key={node.id}
              onClick={() => onSelect(node)}
              className={`group w-full rounded-lg border p-3 text-left transition ${
                selected
                  ? "border-cyan-500/60 bg-cyan-500/10 ring-1 ring-cyan-500/30"
                  : "border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusDot status={node.status} />
                  <h3 className="truncate text-xs font-bold text-slate-100">{node.name}</h3>
                </div>
                <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                  v{node.version}
                </span>
              </div>
              <code className="mt-1 block truncate font-mono text-[10px] text-slate-500">{node.id}</code>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {node.skills.map((s) => (
                  <RiskBadge key={s.name} threshold={s.riskThreshold} />
                ))}
                {node.pricing.token_costs && (
                  <span className="rounded border border-slate-700 bg-slate-800/40 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
                    metered
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-2 text-[11px]">
                <span className="text-slate-500">base fee</span>
                <span className="font-mono font-bold text-cyan-400">
                  {node.pricing.base_task_fee} {node.pricing.currency}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
