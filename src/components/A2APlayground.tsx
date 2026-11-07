"use client";

import { useEffect, useMemo, useState } from "react";
import { Fingerprint, KeyRound, Loader2, MapPin, ShieldCheck, Wallet, Zap } from "lucide-react";
import type { AgentCard, LedgerEntry, SwarmEvent } from "@/types/swarm";
import {
  generateKeypair,
  signPayload,
  canonicalMessage,
  shortHash,
  type EnclaveKeypair,
} from "@/lib/swarm-crypto";
import { bytesToHex, base64ToBytes } from "@/lib/encoding";

interface PlaygroundProps {
  selectedAgent: AgentCard;
  onLogTransaction: (tx: LedgerEntry) => void;
  onEmitEvent: (event: SwarmEvent) => void;
}

interface VerificationProof {
  signature_valid: boolean;
  timestamp_window: string;
  executing_node: string;
  proof_hash: string;
  risk_score: number;
  mitigation_vectors: string[];
}

let SEQ = 1000;

export default function A2APlayground({ selectedAgent, onLogTransaction, onEmitEvent }: PlaygroundProps) {
  const [keypair, setKeypair] = useState<EnclaveKeypair | null>(null);
  const [lat, setLat] = useState("12.9716");
  const [lng, setLng] = useState("77.5946");
  const [spendingCap, setSpendingCap] = useState(0.01);
  const [executing, setExecuting] = useState(false);
  const [requiresHitl, setRequiresHitl] = useState(false);
  const [proof, setProof] = useState<VerificationProof | null>(null);
  const [lastSignature, setLastSignature] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Initialize the demo signing key in the browser after hydration.
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) setKeypair(generateKeypair());
    });
    return () => { active = false; };
  }, []);

  const pubkeyFingerprint = useMemo(() => {
    if (!keypair) return "";
    return shortHash(keypair.publicKeyHex, 14);
  }, [keypair]);

  const emit = (event_type: SwarmEvent["event_type"], executing_node: string, message: string) => {
    onEmitEvent({
      sequence_id: ++SEQ,
      timestamp: Math.floor(Date.now() / 1000),
      event_type,
      executing_node,
      message,
    });
  };

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const runHandshake = async (forceApproval = false) => {
    if (!keypair) return;
    setExecuting(true);
    setError(null);
    setRequiresHitl(false);

    const fee = selectedAgent.pricing.base_task_fee;
    const sourceNode = "client:enclave:smartphone-agent";

    // Step 1 — Discovery lookup
    emit(
      "TASK_DISPATCHED",
      sourceNode,
      `Initiating discovery lookup for skill 'generate_risk_matrix' targeting node '${selectedAgent.id}'`,
    );
    await wait(700);

    // Step 2 — Wallet / budget enforcement
    if (fee > spendingCap && !forceApproval) {
      emit(
        "WAITING_APPROVAL",
        "pay.agentswarm.in",
        `Base fee ${fee} USDC crosses automated budget threshold ${spendingCap} USDC. Prompting user verification…`,
      );
      setRequiresHitl(true);
      setExecuting(false);
      return;
    }

    // Step 3 — Build + sign payload (real Ed25519)
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = {
      jsonrpc: "2.0" as const,
      method: "generate_risk_matrix",
      params: {
        target_coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
        execution_window: new Date().toISOString(),
      },
      id: `tx_${Date.now()}`,
    };
    const bodyStr = JSON.stringify(payload);
    const message = canonicalMessage(timestamp, bodyStr);
    const signature = signPayload(keypair.secretKeyB64, message);
    setLastSignature(signature);

    emit(
      "CREDENTIALS_VERIFIED",
      sourceNode,
      `Signed payload with enclave key ${pubkeyFingerprint} (Ed25519, 64-byte detached signature)`,
    );
    await wait(500);

    emit("NODE_HANDSHAKE", selectedAgent.id, `Secure channel negotiated · transmitting signed JSON-RPC envelope`);

    // Step 4 — Transmit
    try {
      const res = await fetch("/api/swarm/execute", {
        method: "POST",
        headers: {
          "X-Swarm-Identity": keypair.publicKeyB64,
          "X-Swarm-Signature": signature,
          "X-Swarm-Timestamp": timestamp.toString(),
          "Content-Type": "application/json",
        },
        body: bodyStr,
      });
      const data = await res.json();

      if (!res.ok || !data.verification?.signature_valid) {
        const msg = data?.error?.message ?? `Execution rejected (HTTP ${res.status})`;
        setError(msg);
        emit("ARTIFACT_PERSISTED", selectedAgent.id, `Execution rejected: ${msg}`);
        setExecuting(false);
        return;
      }

      // Step 5 — Settlement
      emit(
        "PAYMENT_CLEARED",
        "pay.agentswarm.in",
        `Settled ${fee} ${selectedAgent.pricing.currency} instantly via SwarmPay settlement channels.`,
      );

      onLogTransaction({
        transaction_id: data.id,
        task_id: `task_${Math.random().toString(36).slice(2, 9)}`,
        method: "generate_risk_matrix",
        source: sourceNode,
        destination: selectedAgent.id,
        amount: fee,
        currency: selectedAgent.pricing.currency,
        timestamp,
        status: "SETTLED",
        signature_hash: data.verification.proof_hash,
      });

      setProof({
        signature_valid: data.verification.signature_valid,
        timestamp_window: data.verification.timestamp_window,
        executing_node: data.verification.executing_node,
        proof_hash: data.verification.proof_hash,
        risk_score: data.result.risk_score,
        mitigation_vectors: data.result.mitigation_vectors,
      });

      emit(
        "ARTIFACT_PERSISTED",
        selectedAgent.id,
        `Task complete. Risk score: ${data.result.risk_score}. Proof ${data.verification.proof_hash}.`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      setError(msg);
      emit("ARTIFACT_PERSISTED", sourceNode, `Transport failure: ${msg}`);
    } finally {
      setExecuting(false);
    }
  };

  const rotateKeypair = () => {
    setKeypair(generateKeypair());
    setProof(null);
    setLastSignature("");
    emit("REGISTRY_SYNC", "client:enclave:smartphone-agent", "Secure enclave keypair rotated. New identity provisioned.");
  };

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-100">
        <Zap className="size-4 text-cyan-400" />
        A2A Cryptographic Handshake Workshop
      </h2>

      {/* Enclave identity panel */}
      <div className="mb-4 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <Fingerprint className="size-3.5 text-cyan-400" /> Secure Enclave Identity
          </span>
          <button
            onClick={rotateKeypair}
            disabled={executing}
            className="rounded border border-slate-700 bg-slate-800/60 px-2 py-1 text-[10px] font-semibold text-slate-300 transition hover:border-cyan-500/50 hover:text-cyan-300 disabled:opacity-40"
          >
            <KeyRound className="mr-1 inline size-3" />
            Rotate Keypair
          </button>
        </div>
        <code className="mt-1.5 block break-all font-mono text-[10px] leading-relaxed text-cyan-400/80">
          {keypair ? `ed25519:${pubkeyFingerprint}` : "booting enclave…"}
        </code>
      </div>

      {/* Coordinate inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <MapPin className="mr-1 inline size-3" /> Target Latitude
          </label>
          <input
            type="number"
            step="0.0001"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-200 outline-none transition focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <MapPin className="mr-1 inline size-3" /> Target Longitude
          </label>
          <input
            type="number"
            step="0.0001"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-200 outline-none transition focus:border-cyan-500"
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <Wallet className="mr-1 inline size-3" /> Automated Wallet Cap ({selectedAgent.pricing.currency})
        </label>
        <input
          type="number"
          step="0.001"
          value={spendingCap}
          onChange={(e) => setSpendingCap(parseFloat(e.target.value) || 0)}
          className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-200 outline-none transition focus:border-cyan-500"
        />
        <p className="mt-1 text-[10px] text-slate-500">
          Node fee: <span className="font-mono text-cyan-400">{selectedAgent.pricing.base_task_fee}</span>{" "}
          · tasks above the cap trigger biometric Human-in-the-Loop approval.
        </p>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {requiresHitl ? (
        <div className="mt-4 animate-pulse rounded-lg border border-amber-500/50 bg-amber-950/40 p-4">
          <p className="mb-1 text-xs font-bold text-amber-400">📱 USER VERIFICATION MANDATE ENFORCED</p>
          <p className="mb-3 text-[11px] text-amber-200/90">
            Task requires {selectedAgent.pricing.base_task_fee} USDC, exceeding your automated cap of{" "}
            {spendingCap} USDC. Release the enclave signing key via biometric attestation.
          </p>
          <button
            onClick={() => runHandshake(true)}
            disabled={executing}
            className="w-full rounded bg-amber-500 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
          >
            {executing ? "Awaiting biometric attestation…" : "Confirm via TouchID / FaceID Keypair Release"}
          </button>
        </div>
      ) : (
        <button
          onClick={() => runHandshake(false)}
          disabled={executing || !keypair}
          className="mt-4 w-full rounded-lg bg-cyan-500 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500"
        >
          {executing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Executing Network Verification Pipeline…
            </span>
          ) : (
            "Dispatch Cryptographic Task Loop"
          )}
        </button>
      )}

      {/* Verification proof */}
      {proof && (
        <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-950/20 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <ShieldCheck className="size-4" />
            Execution Verified · Risk Score {proof.risk_score}
          </div>
          <div className="space-y-1 font-mono text-[10px] text-slate-400">
            <div>
              <span className="text-slate-500">signature_valid:</span>{" "}
              <span className="text-emerald-400">true</span>
            </div>
            <div>
              <span className="text-slate-500">executing_node:</span>{" "}
              <span className="text-slate-300">{proof.executing_node}</span>
            </div>
            <div>
              <span className="text-slate-500">timestamp_window:</span>{" "}
              <span className="text-slate-300">{proof.timestamp_window}</span>
            </div>
            <div>
              <span className="text-slate-500">proof_hash:</span>{" "}
              <span className="text-cyan-400">{proof.proof_hash}</span>
            </div>
          </div>
          {lastSignature && (
            <div className="mt-2 border-t border-slate-800 pt-2">
              <span className="text-[10px] text-slate-500">detached signature (base64):</span>
              <code className="mt-0.5 block break-all font-mono text-[9px] leading-relaxed text-slate-600">
                {lastSignature}
              </code>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
