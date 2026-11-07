/**
 * Manifest Validator — /api/swarm/manifest
 * POST -> dry-run Zod validation of an agent.json manifest,
 *         returns the canonical /.well-known/agent.json artifact.
 */

import { NextRequest, NextResponse } from "next/server";
import { AgentCardZod } from "@/types/swarm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = AgentCardZod.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          valid: false,
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 },
      );
    }

    // Build the canonical well-known manifest artifact
    const manifest = {
      $schema: "https://agentswarm.in",
      id: parsed.data.did,
      name: parsed.data.name,
      version: parsed.data.version,
      description: parsed.data.skills[0]?.description ?? "",
      endpoint: parsed.data.endpoint,
      developer: {
        organization: parsed.data.developer,
        contact: "ops@agentswarm.in",
        verification_url: "https://agentswarm.in",
      },
      security: {
        type: "Ed25519-Signature-Verification",
        supported_curves: ["Ed25519"],
        assertion_method: "JsonWebSignature2020",
      },
      pricing: {
        currency: parsed.data.pricing.currency,
        billing_mode: "metered",
        base_handshake_fee: String(parsed.data.pricing.base_task_fee),
        per_token_costs: parsed.data.pricing.token_costs
          ? {
              input: String(parsed.data.pricing.token_costs.prompt_token),
              output: String(parsed.data.pricing.token_costs.completion_token),
            }
          : undefined,
      },
      capabilities: parsed.data.skills.map((s) => ({
        method: s.name,
        description: s.description,
        requiresApproval: s.requiresApproval,
        riskThreshold: s.riskThreshold,
        parameters: s.input_schema,
      })),
    };

    return NextResponse.json({ valid: true, manifest });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ valid: false, error: message }, { status: 500 });
  }
}
