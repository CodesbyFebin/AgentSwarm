/**
 * zk-STARK Proof Verifier — /api/swarm/zk-prove
 * POST -> simulate a zk-STARK proof generation + verification cycle for a
 *         completed task. Models RISC Zero / Cairo VM / Triton / Miden provers.
 *         Returns proof artifacts with a verification key and public inputs.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";

const PROVERS = ["RISC_ZERO", "CAIRO_VM", "TRITON", "MIDEN"] as const;
type Prover = (typeof PROVERS)[number];

const PROVER_FACTORS: Record<Prover, number> = {
  RISC_ZERO: 1.0,
  CAIRO_VM: 0.82,
  TRITON: 1.35,
  MIDEN: 0.95,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const taskId: string = body?.task_id ?? `task_${Date.now()}`;
    const riskScore: number = Number(body?.risk_score ?? 14);
    const proverChoice: string = String(body?.prover ?? "RISC_ZERO").toUpperCase();
    const prover: Prover = (PROVERS.includes(proverChoice as Prover)
      ? proverChoice
      : "RISC_ZERO") as Prover;

    // Simulate proving latency proportional to execution trace size
    const traceSteps = Math.floor(2 ** 14 + riskScore * 1024 + Math.random() * 8192);
    const proofTimeMs = Math.floor(traceSteps * 0.041 * PROVER_FACTORS[prover]);

    // Fabricate a deterministic-looking STARK proof + verification key
    const proofSeed = createHash("sha256")
      .update(`${taskId}.${prover}.${traceSteps}.${riskScore}`)
      .digest("hex");
    const proofBytes = proofSeed + randomBytes(32).toString("hex");
    const verificationKey =
      "vk_" + createHash("sha256").update(prover + "::v1").digest("hex").slice(0, 24);
    const publicInputs = JSON.stringify({
      task_id: taskId,
      risk_score: riskScore,
      execution_authorized: true,
    });

    // Verification: deterministic pass, ~4% simulated verification failure at high risk
    const fails = riskScore > 80 && Math.random() < 0.4;
    const status = fails ? "REJECTED" : "VERIFIED";

    return NextResponse.json({
      proof_id: `zkp_${proofSeed.slice(0, 12)}`,
      task_id: taskId,
      prover,
      execution_trace_steps: traceSteps,
      proof_bytes: proofBytes,
      public_inputs: publicInputs,
      verification_key: verificationKey,
      status,
      proof_time_ms: proofTimeMs,
      timestamp: Math.floor(Date.now() / 1000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
