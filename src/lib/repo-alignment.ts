// v6.5 Repo Alignment: Atlas concept -> repo equivalent -> status
export const REPO_ALIGNMENT = [
  { atlas: "File JSON DB", repo: "Prisma ORM", status: "MIGRATION NEEDED — see prisma/schema.prisma" },
  { atlas: "In-Memory Ledger", repo: "Durable Outbox + Git Chain + rust-core Ledger", status: "GAP — repo ledger is transient, use rust-core" },
  { atlas: "Signed Playground", repo: "Gate B signed A2A (Ed25519)", status: "ALIGNED" },
  { atlas: "Simulated zk Panel", repo: "Evidence Pinning + Git Chain", status: "ALIGNED — both must stay labelled SIMULATION" },
  { atlas: "Execution blocked", repo: "P4 blocked", status: "ALIGNED" },
  { atlas: "Sessions JSON", repo: "Prisma Session + httpOnly cookie", status: "MIGRATION NEEDED" },
  { atlas: "Polling", repo: "TanStack Query + WebSocket", status: "MIGRATION NEEDED" },
  { atlas: "No-MCP Gateway", repo: "No-MCP Gateway", status: "KEEP — do not add MCP" },
] as const;
export const GAPS_TODO = [".env.example", "SECURITY.md", ".github/workflows/ci.yml", "LICENSE"] as const;
