"use client";

import { Activity, Cpu, Radio, Wallet } from "lucide-react";

interface SwarmHeaderProps {
  stats: {
    totalTx: number;
    settledTx: number;
    pendingTx: number;
    volume: number;
    activeNodes: number;
    totalNodes: number;
  };
}

function Metric({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 sm:px-4">
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-md ${accent}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
        <div className="truncate font-mono text-sm font-bold text-slate-100">{value}</div>
      </div>
    </div>
  );
}

export default function SwarmHeader({ stats }: SwarmHeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex size-11 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/10">
              <Radio className="size-6 text-cyan-400" />
              <span className="absolute -right-0.5 -top-0.5 flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
              </span>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">
                <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                  AGENTSWARM.IN
                </span>
                <span className="ml-2 text-slate-100">CONTROL PLANE</span>
              </h1>
              <p className="mt-0.5 text-[11px] text-slate-400 sm:text-xs">
                Postgres-Authoritative A2A Workforce Orchestration Node · Ed25519 · SwarmPay
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:flex lg:flex-wrap">
            <Metric
              icon={<Wallet className="size-4 text-emerald-400" />}
              label="Volume Cleared"
              value={`${stats.volume.toFixed(4)} USDC`}
              accent="bg-emerald-500/10 border border-emerald-500/30"
            />
            <Metric
              icon={<Activity className="size-4 text-cyan-400" />}
              label="Settled Tx"
              value={`${stats.settledTx}`}
              accent="bg-cyan-500/10 border border-cyan-500/30"
            />
            <Metric
              icon={<Cpu className="size-4 text-teal-400" />}
              label="Active Nodes"
              value={`${stats.activeNodes}/${stats.totalNodes}`}
              accent="bg-teal-500/10 border border-teal-500/30"
            />
            <Metric
              icon={<span className="size-2 rounded-full bg-amber-400" />}
              label="Pending"
              value={`${stats.pendingTx}`}
              accent="bg-amber-500/10 border border-amber-500/30"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
