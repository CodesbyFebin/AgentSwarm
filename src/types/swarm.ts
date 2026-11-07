/**
 * AgentSwarm.in — Strict Structural Contract
 * ---------------------------------------------
 * These types define the explicit boundaries for data structures crossing
 * the A2A protocol boundary, ensuring absolute consistency between the
 * client enclave (smartphone agent) and the service-node runtime.
 */

import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Agent Manifest                                                     */
/* ------------------------------------------------------------------ */

export interface SkillSchema {
  name: string;
  description: string;
  requiresApproval: boolean;
  riskThreshold: "LOW" | "MEDIUM" | "HIGH";
  input_schema: Record<string, unknown>;
}

export interface AgentPricing {
  currency: string;
  base_task_fee: number;
  token_costs?: {
    prompt_token: number;
    completion_token: number;
  };
}

export interface AgentCard {
  id: string;
  name: string;
  version: string;
  endpoint: string;
  did: string;
  developer: string;
  pricing: AgentPricing;
  skills: SkillSchema[];
  /** Optional public key (base64) registered for signature verification. */
  publicKey?: string;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  registeredAt: number;
}

/* ------------------------------------------------------------------ */
/*  SwarmPay Settlement Ledger                                         */
/* ------------------------------------------------------------------ */

export interface LedgerEntry {
  transaction_id: string;
  task_id: string;
  method: string;
  source: string;
  destination: string;
  amount: number;
  currency: string;
  timestamp: number;
  status: "SETTLED" | "PENDING" | "REJECTED";
  signature_hash?: string;
}

/* ------------------------------------------------------------------ */
/*  Real-time Event Telemetry                                          */
/* ------------------------------------------------------------------ */

export type SwarmEventType =
  | "TASK_DISPATCHED"
  | "CREDENTIALS_VERIFIED"
  | "PAYMENT_CLEARED"
  | "ARTIFACT_PERSISTED"
  | "WAITING_APPROVAL"
  | "REGISTRY_SYNC"
  | "NODE_HANDSHAKE";

export interface SwarmEvent {
  sequence_id: number;
  timestamp: number;
  event_type: SwarmEventType;
  executing_node: string;
  message: string;
}

/* ------------------------------------------------------------------ */
/*  A2A Handshake Envelope                                             */
/* ------------------------------------------------------------------ */

export interface A2ARequest {
  jsonrpc: "2.0";
  method: string;
  params: Record<string, unknown>;
  id: string;
}

export interface A2AResponse {
  jsonrpc: "2.0";
  result?: {
    status: string;
    [key: string]: unknown;
  };
  error?: { code: number; message: string };
  id: string;
  /** Server-side verification proof for audit trail. */
  verification: {
    signature_valid: boolean;
    timestamp_window: string;
    executing_node: string;
    proof_hash: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Zod Schemas — Manifest Editor Validation                           */
/* ------------------------------------------------------------------ */

export const SkillSchemaZod = z.object({
  name: z.string().min(2, "Skill name must be at least 2 characters"),
  description: z.string().min(10, "Describe what this skill does"),
  requiresApproval: z.boolean(),
  riskThreshold: z.enum(["LOW", "MEDIUM", "HIGH"]),
  input_schema: z.record(z.string(), z.unknown()).default({}),
});

export const AgentPricingZod = z.object({
  currency: z.enum(["USDC", "USDT", "INR", "EUR"]),
  base_task_fee: z.number().positive("Base fee must be greater than 0"),
  token_costs: z
    .object({
      prompt_token: z.number().nonnegative(),
      completion_token: z.number().nonnegative(),
    })
    .optional(),
});

export const AgentCardZod = z.object({
  id: z
    .string()
    .min(4, "Agent ID required")
    .regex(/^[a-z0-9:._-]+$/, "Use lowercase alphanumerics, dots, colons, hyphens"),
  name: z.string().min(3, "Agent name required"),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "Use semantic versioning (e.g. 1.4.2)"),
  endpoint: z.string().min(1, "Endpoint required"),
  did: z
    .string()
    .regex(/^did:swarm:in:.+$/, "DID must follow did:swarm:in:<fingerprint>"),
  developer: z.string().min(2, "Developer org required"),
  pricing: AgentPricingZod,
  skills: z.array(SkillSchemaZod).min(1, "Register at least one skill"),
});

export type AgentCardForm = z.infer<typeof AgentCardZod>;

/* ------------------------------------------------------------------ */
/*  zk-STARK Proof Artifacts                                           */
/* ------------------------------------------------------------------ */

export interface ZkStarkProof {
  proof_id: string;
  task_id: string;
  prover: "RISC_ZERO" | "CAIRO_VM" | "TRITON" | "MIDEN";
  execution_trace_steps: number;
  proof_bytes: string;
  public_inputs: string;
  verification_key: string;
  status: "VERIFIED" | "PENDING" | "REJECTED";
  proof_time_ms: number;
  timestamp: number;
}
