"use client";

import { GitBranch, Shield, Zap } from "lucide-react";

export default function SwarmFooter() {
  return (
    <footer className="mt-auto border-t border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-3 text-[11px] text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <Shield className="size-3.5 text-cyan-500" />
            <span>
              Every payload signed with <span className="font-mono text-cyan-400">Ed25519</span> ·
              anti-replay window 300s · verification proofs persisted on-chain
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <GitBranch className="size-3.5 text-slate-400" /> A2A Protocol v1.0
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="size-3.5 text-emerald-400" /> SwarmPay micro-USDC
            </span>
            <span className="hidden text-slate-600 sm:inline">© 2026 AgentSwarm.in</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
