/**
 * Swarm Store — Server-Authoritative In-Memory Registry
 * -----------------------------------------------------
 * Holds the authoritative agent registry and SwarmPay settlement ledger.
 * Survives Next.js HMR by hoisting onto globalThis; persists for the
 * lifetime of the server process. In production this would be backed by
 * Postgres with LISTEN/NOTIFY channels — here we simulate the same surface.
 */

import type { AgentCard, LedgerEntry, SwarmEvent } from "@/types/swarm";

/* ------------------------------------------------------------------ */
/*  Seed — Authoritative Swarm Nodes                                  */
/* ------------------------------------------------------------------ */

const now = () => Math.floor(Date.now() / 1000);

const SEED_AGENTS: AgentCard[] = [
  {
    id: "agent:in:swarm:bharat-cargo-router",
    name: "Bharat Cargo Optimization Engine",
    version: "1.2.0",
    endpoint: "/api/swarm/execute",
    did: "did:swarm:in:0x892015HjK92lk109AaBcDeFgHiJkLmNoPqRsTuVwXyZ",
    developer: "Swarm Logistics Labs Pvt. Ltd.",
    pricing: { currency: "USDC", base_task_fee: 0.005 },
    skills: [
      {
        name: "generate_risk_matrix",
        description:
          "Deconstructs supply line dependencies across Indian intermodal hubs and returns a weighted risk matrix.",
        requiresApproval: false,
        riskThreshold: "LOW",
        input_schema: { target_coordinates: "object", execution_window: "string" },
      },
    ],
    status: "ONLINE",
    registeredAt: now() - 86400 * 12,
  },
  {
    id: "agent:io:agentswarm:analytics-processor-v1",
    name: "Sovereign Core Task Processor",
    version: "2.0.4",
    endpoint: "/api/swarm/execute",
    did: "did:swarm:in:0x7Af3c9D1e84Bb20fEa4519cD76b1e2f338aF9d04",
    developer: "AgentSwarm Core Foundation",
    pricing: {
      currency: "USDC",
      base_task_fee: 0.025,
      token_costs: { prompt_token: 0.000015, completion_token: 0.00006 },
    },
    skills: [
      {
        name: "generate_risk_matrix",
        description:
          "Compiles extensive security auditing configurations across sovereign compute lanes with attested telemetry.",
        requiresApproval: true,
        riskThreshold: "HIGH",
        input_schema: { target_coordinates: "object", execution_window: "string" },
      },
    ],
    status: "ONLINE",
    registeredAt: now() - 86400 * 30,
  },
  {
    id: "agent:in:swarm:powergrid-balancer",
    name: "Grid Demand Balancer Node",
    version: "0.9.7",
    endpoint: "/api/swarm/execute",
    did: "did:swarm:in:0x3B71d2f8A0cE5b19Dd27F4aC8e12Bb6a0f3e1C7d",
    developer: "Bharat Smart Grid Cooperative",
    pricing: { currency: "USDC", base_task_fee: 0.0012 },
    skills: [
      {
        name: "generate_risk_matrix",
        description:
          "Models load-shed risk for regional substations using real-time SCADA congestion telemetry.",
        requiresApproval: false,
        riskThreshold: "MEDIUM",
        input_schema: { target_coordinates: "object", execution_window: "string" },
      },
    ],
    status: "DEGRADED",
    registeredAt: now() - 86400 * 5,
  },
  {
    id: "agent:io:agentswarm:freight-audit-sentinel",
    name: "Freight Audit Sentinel",
    version: "3.1.0",
    endpoint: "/api/swarm/execute",
    did: "did:swarm:in:0xC9a441fE7b328D9a0655c0E1b2d4f8A77c10bE3f",
    developer: "Mumbai Customs Tech LLP",
    pricing: {
      currency: "USDC",
      base_task_fee: 0.0089,
      token_costs: { prompt_token: 0.000022, completion_token: 0.000091 },
    },
    skills: [
      {
        name: "generate_risk_matrix",
        description:
          "Audits container manifest declarations against satellite port imagery and flags tariff anomalies.",
        requiresApproval: true,
        riskThreshold: "HIGH",
        input_schema: { target_coordinates: "object", execution_window: "string" },
      },
    ],
    status: "ONLINE",
    registeredAt: now() - 86400 * 2,
  },
];

const SEED_LEDGER: LedgerEntry[] = [
  {
    transaction_id: "tx_init_baseline_alpha",
    task_id: "task_0911",
    method: "generate_risk_matrix",
    source: "client:enclave:smartphone-agent",
    destination: "agent:in:swarm:bharat-cargo-router",
    amount: 0.005,
    currency: "USDC",
    timestamp: now() - 300,
    status: "SETTLED",
    signature_hash: "ed25519:a1f3…c7d2",
  },
  {
    transaction_id: "tx_init_baseline_beta",
    task_id: "task_0884",
    method: "generate_risk_matrix",
    source: "client:enclave:edge-router-pune",
    destination: "agent:io:agentswarm:analytics-processor-v1",
    amount: 0.025,
    currency: "USDC",
    timestamp: now() - 612,
    status: "SETTLED",
    signature_hash: "ed25519:77be…19ad",
  },
  {
    transaction_id: "tx_init_baseline_gamma",
    task_id: "task_0772",
    method: "generate_risk_matrix",
    source: "client:enclave:grid-relay-chennai",
    destination: "agent:in:swarm:powergrid-balancer",
    amount: 0.0012,
    currency: "USDC",
    timestamp: now() - 940,
    status: "PENDING",
  },
];

/* ------------------------------------------------------------------ */
/*  Module-level state (HMR-safe)                                      */
/* ------------------------------------------------------------------ */

interface SwarmState {
  agents: AgentCard[];
  ledger: LedgerEntry[];
  eventSeq: number;
}

const g = globalThis as unknown as { __SWARM_STATE__?: SwarmState };

function state(): SwarmState {
  if (!g.__SWARM_STATE__) {
    g.__SWARM_STATE__ = {
      agents: [...SEED_AGENTS],
      ledger: [...SEED_LEDGER],
      eventSeq: 1,
    };
  }
  return g.__SWARM_STATE__;
}

/* ------------------------------------------------------------------ */
/*  Agent Registry API                                                */
/* ------------------------------------------------------------------ */

export function listAgents(): AgentCard[] {
  return [...state().agents];
}

export function getAgent(id: string): AgentCard | undefined {
  return state().agents.find((a) => a.id === id);
}

export function registerAgent(agent: AgentCard): AgentCard {
  const existing = state().agents.findIndex((a) => a.id === agent.id);
  if (existing >= 0) {
    state().agents[existing] = agent;
  } else {
    state().agents.unshift(agent);
  }
  return agent;
}

/* ------------------------------------------------------------------ */
/*  SwarmPay Ledger API                                                */
/* ------------------------------------------------------------------ */

export function listLedger(limit = 50): LedgerEntry[] {
  return [...state().ledger].slice(0, limit);
}

export function appendLedger(entry: LedgerEntry): LedgerEntry {
  state().ledger.unshift(entry);
  if (state().ledger.length > 200) state().ledger.length = 200;
  return entry;
}

export function ledgerVolume(): number {
  return state().ledger
    .filter((l) => l.status === "SETTLED")
    .reduce((acc, l) => acc + l.amount, 0);
}

export function ledgerStats() {
  const s = state();
  const settled = s.ledger.filter((l) => l.status === "SETTLED");
  const volume = settled.reduce((acc, l) => acc + l.amount, 0);
  const pending = s.ledger.filter((l) => l.status === "PENDING").length;
  return {
    totalTx: s.ledger.length,
    settledTx: settled.length,
    pendingTx: pending,
    volume,
    activeNodes: s.agents.filter((a) => a.status === "ONLINE").length,
    totalNodes: s.agents.length,
  };
}

/* ------------------------------------------------------------------ */
/*  Event Sequence                                                     */
/* ------------------------------------------------------------------ */

export function nextEventSeq(): number {
  return state().eventSeq++;
}

export type { SwarmEvent };
