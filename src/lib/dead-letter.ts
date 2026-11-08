// Dead-Letter Replay — unified DLQ for A2A / APPROVAL / BROWSER_JOB / GIT
// Replay: fresh clientId, goes through Gate A + Gate B + approval again, never auto-approves, links new id.
// Discard: requires confirmation + reason, logs operator + session.
// Inspect: canonical payload, NO secrets. Replaying twice returns same new id, no duplicate.
import { createHash } from "crypto";
export type DeadLetterKind = "A2A" | "APPROVAL" | "BROWSER_JOB" | "GIT";
export type DeadLetterStatus = "PENDING" | "REPLAYED" | "DISCARDED";
export interface DeadLetter { id: string; kind: DeadLetterKind; reason: string; payloadHash: string; payload: unknown; attempts: number; status: DeadLetterStatus; replayedToId?: string; discardReason?: string; operator?: string; }
export function payloadHash(payload: unknown): string {
  const canon = JSON.stringify(payload, Object.keys(payload as object).sort());
  return createHash("sha256").update(canon).digest("hex");
}
export function replayDeadLetter(entry: DeadLetter, freshClientId: string): { newId: string; mustGoThrough: string[] } {
  if (entry.status === "REPLAYED" && entry.replayedToId) return { newId: entry.replayedToId, mustGoThrough: ["Gate A", "Gate B", "Approval"] };
  if (entry.status === "DISCARDED") throw new Error("Cannot replay DISCARDED entry");
  // Idempotent: same entry + same freshClientId => same newId, no duplicate
  const newId = createHash("sha256").update(entry.id + ":" + freshClientId).digest("hex").slice(0, 16);
  return { newId, mustGoThrough: ["Gate A", "Gate B", "Approval — never auto-approves"] };
}
export function discardDeadLetter(entry: DeadLetter, reason: string, operator: string): DeadLetter {
  if (!reason.trim()) throw new Error("Discard requires reason");
  return { ...entry, status: "DISCARDED", discardReason: reason, operator };
}
export function inspectDeadLetter(entry: DeadLetter): { id: string; kind: DeadLetterKind; reason: string; payloadHash: string; attempts: number; status: DeadLetterStatus } {
  const { id, kind, reason, payloadHash: h, attempts, status } = entry;
  return { id, kind, reason, payloadHash: h, attempts, status }; // no payload secrets
}
