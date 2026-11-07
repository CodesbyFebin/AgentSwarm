/**
 * Agent Registry — /api/swarm/agents
 * GET  -> list all registered swarm nodes
 * POST -> validate + register a new agent manifest (Zod-validated)
 */

import { NextRequest, NextResponse } from "next/server";
import { listAgents, registerAgent } from "@/lib/swarm-store";
import { AgentCardZod } from "@/types/swarm";
import type { AgentCard } from "@/types/swarm";

export async function GET() {
  return NextResponse.json({ agents: listAgents() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = AgentCardZod.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          errors: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 },
      );
    }
    const data = parsed.data;
    const agent: AgentCard = {
      id: data.id,
      name: data.name,
      version: data.version,
      endpoint: data.endpoint,
      did: data.did,
      developer: data.developer,
      pricing: data.pricing,
      skills: data.skills,
      status: "ONLINE",
      registeredAt: Math.floor(Date.now() / 1000),
    };
    registerAgent(agent);
    return NextResponse.json({ ok: true, agent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
