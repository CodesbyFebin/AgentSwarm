// Gate D — Scoped Execution, SHADOW ONLY. Never executes.
// Allowlisted: file read, http get allowlisted, git verify, crypto hash
// Denylisted: file write, http post, email send, mobile call, publish
// Max 3 calls per job. Write/send/call/publish require approval.
export const GATE_D_MODE = "shadow" as const;
export const GATE_D_MAX_CALLS_PER_JOB = 3;
const ALLOW = new Set(["file read", "http get allowlisted", "git verify", "crypto hash"]);
const DENY = new Set(["file write", "http post", "email send", "mobile call", "publish"]);
export type GateDResult = { decision: "WOULD_ALLOW" | "WOULD_DENY"; reason: string; mode: "shadow"; tool: string; jobId: string };
export function evaluateGateDShadow(jobId: string, tool: string, callsUsed: number): GateDResult {
  if (GATE_D_MODE !== "shadow") return { decision: "WOULD_DENY", reason: "GATE_D_MODE must be shadow", mode: "shadow", tool, jobId };
  if (DENY.has(tool)) return { decision: "WOULD_DENY", reason: `Denylisted tool: ${tool}. Requires approval, never auto-executes.`, mode: "shadow", tool, jobId };
  if (!ALLOW.has(tool)) return { decision: "WOULD_DENY", reason: `Not allowlisted: ${tool}`, mode: "shadow", tool, jobId };
  if (callsUsed >= GATE_D_MAX_CALLS_PER_JOB) return { decision: "WOULD_DENY", reason: `Max ${GATE_D_MAX_CALLS_PER_JOB} calls per job exceeded`, mode: "shadow", tool, jobId };
  return { decision: "WOULD_ALLOW", reason: `Allowlisted in SHADOW. No tool call executed.`, mode: "shadow", tool, jobId };
}
// Badge: SHADOW — Evaluates only. No tool calls executed. No toggle to enable live.
