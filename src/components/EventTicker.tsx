"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { SwarmEvent, SwarmEventType } from "@/types/swarm";

const EVENT_STYLE: Record<SwarmEventType, { label: string; text: string; dot: string }> = {
  TASK_DISPATCHED: { label: "DISPATCH", text: "text-cyan-400", dot: "bg-cyan-500" },
  CREDENTIALS_VERIFIED: { label: "VERIFIED", text: "text-emerald-400", dot: "bg-emerald-500" },
  PAYMENT_CLEARED: { label: "SETTLED", text: "text-emerald-400", dot: "bg-emerald-500" },
  ARTIFACT_PERSISTED: { label: "ARTIFACT", text: "text-teal-400", dot: "bg-teal-500" },
  WAITING_APPROVAL: { label: "HITL", text: "text-amber-400", dot: "bg-amber-500" },
  REGISTRY_SYNC: { label: "SYNC", text: "text-slate-300", dot: "bg-slate-500" },
  NODE_HANDSHAKE: { label: "HANDSHAKE", text: "text-cyan-300", dot: "bg-cyan-400" },
};

function formatTime(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString("en-GB", { hour12: false });
}

export default function EventTicker({ events }: { events: SwarmEvent[] }) {
  return (
    <section className="flex h-[560px] flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          Real-Time Event Telemetry
        </h2>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          LIVE · LISTEN/NOTIFY
        </span>
      </div>

      <ScrollArea className="flex-1 rounded-lg border border-slate-800 bg-slate-950/70">
        <div className="space-y-2 p-3 font-mono">
          {events.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-600">
              Awaiting swarm activity…
            </div>
          )}
          {events.map((ev) => {
            const style = EVENT_STYLE[ev.event_type];
            return (
              <div
                key={ev.sequence_id}
                className="rounded-md border border-slate-800/70 bg-slate-900/40 p-2.5 transition hover:border-slate-700"
              >
                <div className="mb-1 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">[{formatTime(ev.timestamp)}]</span>
                  <span className={`flex items-center gap-1 font-bold ${style.text}`}>
                    <span className={`size-1.5 rounded-full ${style.dot}`} />
                    {style.label}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">{ev.message}</p>
                <p className="mt-0.5 truncate text-[10px] italic text-slate-500">@ {ev.executing_node}</p>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </section>
  );
}
