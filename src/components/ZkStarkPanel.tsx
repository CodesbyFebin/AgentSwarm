"use client";

import { useState } from "react";
import { Cpu, Loader2, Lock, ShieldCheck, Terminal } from "lucide-react";
import type { ZkStarkProof } from "@/types/swarm";

const PROVERS: { id: ZkStarkProof["prover"]; name: string; blurb: string }[] = [
  { id: "RISC_ZERO", name: "RISC Zero zkVM", blurb: "RISC-V execution trace · Rust toolchain" },
  { id: "CAIRO_VM", name: "Cairo VM", blurb: "STARK-friendly AIR · Cairo1" },
  { id: "TRITON", name: "Triton VM", blurb: "Triton instruction set · Neptune FRI" },
  { id: "MIDEN", name: "Miden VM", blurb: "Stack machine · Winterfell prover" },
];

export default function ZkStarkPanel() {
  const [prover, setProver] = useState<ZkStarkProof["prover"]>("RISC_ZERO");
  const [taskId, setTaskId] = useState("task_0911");
  const [riskScore, setRiskScore] = useState("14");
  const [proving, setProving] = useState(false);
  const [proofs, setProofs] = useState<ZkStarkProof[]>([]);
  const [error, setError] = useState<string | null>(null);

  const prove = async () => {
    setProving(true);
    setError(null);
    try {
      const res = await fetch("/api/swarm/zk-prove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prover, task_id: taskId, risk_score: Number(riskScore) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Proof generation failed");
      setProofs((p) => [data as ZkStarkProof, ...p]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setProving(false);
    }
  };

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Controls */}
      <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-slate-100">
          <Lock className="size-4 text-emerald-400" />
          zk-STARK Verifiable Compute
        </h2>
        <p className="mb-4 text-xs text-slate-400">
          Bind a completed task to a succinct proof of correct execution. Verifiers re-check the
          proof in &lt;10ms without re-running the trace.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Prover Backend
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PROVERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProver(p.id)}
                  className={`rounded-lg border p-2.5 text-left transition ${
                    prover === p.id
                      ? "border-cyan-500/60 bg-cyan-500/10 ring-1 ring-cyan-500/30"
                      : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
                    <Cpu className="size-3.5 text-cyan-400" />
                    {p.name}
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500">{p.blurb}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Task ID
              </label>
              <input
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Risk Score
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={riskScore}
                onChange={(e) => setRiskScore(e.target.value)}
                className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-200 outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <button
            onClick={prove}
            disabled={proving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {proving ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Generating STARK proof…
              </>
            ) : (
              <>
                <ShieldCheck className="size-4" /> Generate & Verify Proof
              </>
            )}
          </button>

          {error && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <Terminal className="size-3 text-slate-400" /> verifier.rs
            </div>
            <pre className="mt-1.5 font-mono text-[10px] leading-relaxed text-slate-500">{`fn verify(proof, vk, pub_inputs) {
  fri_commit(proof, vk)
    && air_constraints_hold(pub_inputs)
    // O(log |trace|) — succinct
}`}</pre>
          </div>
        </div>
      </div>

      {/* Proof stream */}
      <div className="lg:col-span-3 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">Proof Stream</h2>
          <span className="font-mono text-[10px] text-slate-500">{proofs.length} proofs</span>
        </div>

        <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1 swarm-scroll">
          {proofs.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-600">
              No proofs generated yet. Trigger a proving cycle to bind task execution to a succinct
              STARK proof.
            </div>
          )}
          {proofs.map((p) => {
            const verified = p.status === "VERIFIED";
            return (
              <div
                key={p.proof_id}
                className={`rounded-lg border p-3.5 ${
                  verified ? "border-emerald-500/40 bg-emerald-950/20" : "border-rose-500/40 bg-rose-950/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {verified ? (
                      <ShieldCheck className="size-4 text-emerald-400" />
                    ) : (
                      <Lock className="size-4 text-rose-400" />
                    )}
                    <code className="font-mono text-xs font-bold text-slate-200">{p.proof_id}</code>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      verified
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-rose-500/20 text-rose-400"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-2 font-mono text-[10px] text-slate-400">
                  <div>
                    <span className="text-slate-600">prover:</span>{" "}
                    <span className="text-cyan-400">{p.prover}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">trace steps:</span>{" "}
                    <span className="text-slate-300">{p.execution_trace_steps.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">prove time:</span>{" "}
                    <span className="text-slate-300">{p.proof_time_ms} ms</span>
                  </div>
                  <div>
                    <span className="text-slate-600">task:</span>{" "}
                    <span className="text-slate-300">{p.task_id}</span>
                  </div>
                </div>

                <div className="mt-2.5 space-y-1 border-t border-slate-800 pt-2.5 font-mono text-[10px]">
                  <div>
                    <span className="text-slate-600">verification_key:</span>{" "}
                    <span className="text-slate-400">{p.verification_key}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">public_inputs:</span>{" "}
                    <span className="break-all text-slate-400">{p.public_inputs}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">proof_bytes:</span>
                    <code className="mt-0.5 block break-all text-[9px] leading-relaxed text-slate-600">
                      {p.proof_bytes}
                    </code>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
