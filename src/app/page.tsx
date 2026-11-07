"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, LayoutDashboard, Lock, Wand2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SwarmHeader from "@/components/SwarmHeader";
import SwarmFooter from "@/components/SwarmFooter";
import AgentRegistry from "@/components/AgentRegistry";
import A2APlayground from "@/components/A2APlayground";
import EventTicker from "@/components/EventTicker";
import SettlementLedger from "@/components/SettlementLedger";
import ManifestEditor from "@/components/ManifestEditor";
import ZkStarkPanel from "@/components/ZkStarkPanel";
import type { AgentCard, LedgerEntry, SwarmEvent, SwarmEventType } from "@/types/swarm";

let AMBIENT_SEQ = 5000;

type TabKey = "control" | "manifest" | "zkstark";

const AMBIENT_EVENTS: {
  type: SwarmEventType;
  node: string;
  build: (a: string, b: string) => string;
}[] = [
  {
    type: "REGISTRY_SYNC",
    node: "registry.agentswarm.in",
    build: (_a, b) => `DID resolution cache refreshed for ${b}`,
  },
  {
    type: "NODE_HANDSHAKE",
    node: "agent:io:agentswarm:mesh-relay-04",
    build: (a, b) => `Mutual Ed25519 handshake established · ${a} ↔ ${b}`,
  },
  {
    type: "PAYMENT_CLEARED",
    node: "pay.agentswarm.in",
    build: (_a, b) => `Background micro-settlement of 0.0008 USDC cleared against ${b}`,
  },
  {
    type: "CREDENTIALS_VERIFIED",
    node: "identity.agentswarm.in",
    build: (_a, b) => `Re-attested device enclave keypair for peer ${b}`,
  },
];

const AMBIENT_SOURCES = [
  "client:enclave:edge-router-pune",
  "client:enclave:grid-relay-chennai",
  "client:enclave:kolkata-drydock-07",
  "client:enclave:mumbai-port-sensor-12",
];

export default function SwarmControlDashboard() {
  const [agents, setAgents] = useState<AgentCard[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [events, setEvents] = useState<SwarmEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [tab, setTab] = useState<TabKey>("control");
  const [booted, setBooted] = useState(false);

  /* ---------- Initial bootstrap ---------- */
  useEffect(() => {
    (async () => {
      try {
        const [agRes, lgRes] = await Promise.all([
          fetch("/api/swarm/agents").then((r) => r.json()),
          fetch("/api/swarm/ledger").then((r) => r.json()),
        ]);
        const ag: AgentCard[] = agRes.agents ?? [];
        const lg: LedgerEntry[] = lgRes.entries ?? [];
        setAgents(ag);
        setLedger(lg);
        if (ag.length) setSelectedId(ag[0].id);
        setEvents([
          {
            sequence_id: ++AMBIENT_SEQ,
            timestamp: Math.floor(Date.now() / 1000),
            event_type: "ARTIFACT_PERSISTED",
            executing_node: "agent:in:swarm:bharat-cargo-router",
            message: "Platform infrastructure online. Persistent connection pools ready.",
          },
        ]);
      } catch {
        // ignore — UI shows empty states gracefully
      } finally {
        setBooted(true);
      }
    })();
  }, []);

  /* ---------- Ambient real-time ticker (LISTEN/NOTIFY sim) ---------- */
  useEffect(() => {
    if (!booted || agents.length === 0) return;
    const tick = () => {
      const dest = agents[Math.floor(Math.random() * agents.length)];
      const src = AMBIENT_SOURCES[Math.floor(Math.random() * AMBIENT_SOURCES.length)];
      const ev = AMBIENT_EVENTS[Math.floor(Math.random() * AMBIENT_EVENTS.length)];
      setEvents((prev) =>
        [
          {
            sequence_id: ++AMBIENT_SEQ,
            timestamp: Math.floor(Date.now() / 1000),
            event_type: ev.type,
            executing_node: ev.node,
            message: ev.build(src, dest.id),
          },
          ...prev,
        ].slice(0, 80),
      );
    };
    const handle = setInterval(tick, 7000);
    return () => clearInterval(handle);
  }, [agents, booted]);

  /* ---------- Derived stats ---------- */
  const stats = useMemo(() => {
    const settled = ledger.filter((l) => l.status === "SETTLED");
    const volume = settled.reduce((a, l) => a + l.amount, 0);
    const pending = ledger.filter((l) => l.status === "PENDING").length;
    const active = agents.filter((a) => a.status === "ONLINE").length;
    return {
      totalTx: ledger.length,
      settledTx: settled.length,
      pendingTx: pending,
      volume,
      activeNodes: active,
      totalNodes: agents.length,
    };
  }, [ledger, agents]);

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedId) ?? agents[0],
    [agents, selectedId],
  );

  /* ---------- Mutators from children ---------- */
  const handleLogTransaction = useCallback((tx: LedgerEntry) => {
    setLedger((prev) => [tx, ...prev].slice(0, 200));
  }, []);

  const handleEmitEvent = useCallback((ev: SwarmEvent) => {
    setEvents((prev) => [ev, ...prev].slice(0, 80));
  }, []);

  const handleRegistered = useCallback((agent: AgentCard) => {
    setAgents((prev) => {
      const exists = prev.findIndex((a) => a.id === agent.id);
      if (exists >= 0) {
        const copy = [...prev];
        copy[exists] = agent;
        return copy;
      }
      return [agent, ...prev];
    });
    setSelectedId(agent.id);
    setEvents((prev) =>
      [
        {
          sequence_id: ++AMBIENT_SEQ,
          timestamp: Math.floor(Date.now() / 1000),
          event_type: "REGISTRY_SYNC" as SwarmEventType,
          executing_node: "registry.agentswarm.in",
          message: `New node '${agent.name}' (${agent.id}) onboarded to the swarm registry.`,
        },
        ...prev,
      ].slice(0, 80),
    );
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <SwarmHeader stats={stats} />

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* Sub-domain route strip */}
        <div className="mb-5 flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-500">
          <span className="rounded border border-slate-800 bg-slate-900/60 px-2 py-1">registry.agentswarm.in</span>
          <span className="text-slate-700">↔</span>
          <span className="rounded border border-slate-800 bg-slate-900/60 px-2 py-1">identity.agentswarm.in</span>
          <span className="text-slate-700">↔</span>
          <span className="rounded border border-slate-800 bg-slate-900/60 px-2 py-1">pay.agentswarm.in</span>
          <span className="ml-auto hidden items-center gap-1.5 sm:flex">
            <Boxes className="size-3.5 text-cyan-500" />
            <span className="text-slate-600">Sovereign A2A mesh · Ed25519 · SwarmPay</span>
          </span>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="w-full">
          <TabsList className="mb-6 flex h-auto w-full flex-wrap gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1.5 sm:w-fit">
            <TabsTrigger
              value="control"
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-300"
            >
              <LayoutDashboard className="size-4" />
              Control Plane
            </TabsTrigger>
            <TabsTrigger
              value="manifest"
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-300"
            >
              <Wand2 className="size-4" />
              Manifest Forge
            </TabsTrigger>
            <TabsTrigger
              value="zkstark"
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-300"
            >
              <Lock className="size-4" />
              zk-STARK Verifier
            </TabsTrigger>
          </TabsList>

          {/* ---------- Control Plane ---------- */}
          <TabsContent value="control">
            {selectedAgent ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Col 1: registry + playground */}
                <div className="space-y-6">
                  <AgentRegistry agents={agents} selectedId={selectedAgent.id} onSelect={(a) => setSelectedId(a.id)} />
                  <A2APlayground
                    selectedAgent={selectedAgent}
                    onLogTransaction={handleLogTransaction}
                    onEmitEvent={handleEmitEvent}
                  />
                </div>
                {/* Col 2: event ticker */}
                <EventTicker events={events} />
                {/* Col 3: settlement ledger */}
                <SettlementLedger ledger={ledger} />
              </div>
            ) : (
              <div className="py-20 text-center text-slate-500">Booting swarm registry…</div>
            )}
          </TabsContent>

          {/* ---------- Manifest Forge ---------- */}
          <TabsContent value="manifest">
            <ManifestEditor onRegistered={handleRegistered} />
          </TabsContent>

          {/* ---------- zk-STARK Verifier ---------- */}
          <TabsContent value="zkstark">
            <ZkStarkPanel />
          </TabsContent>
        </Tabs>
      </main>

      <SwarmFooter />
    </div>
  );
}
