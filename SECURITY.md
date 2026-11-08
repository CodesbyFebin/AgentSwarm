# Security Policy — AgentSwarm
## Supported: `main` only.
## Reporting: Do NOT open a public issue for a security bug. Use GitHub private vulnerability reporting (Security > Report a vulnerability). Ack in 72h, fix in 14 days.
## Scope: Gate A auth, Gate B signed A2A (Ed25519), approval outbox, Gate D SHADOW (never executes), dead-letter replay (never auto-approves). No real TEE/zkVM/STARK in dashboard — simulated panel must stay labelled SIMULATED. rust-core proves registry/signature/scheduling/ledger only.
## Safe Harbor: Good-faith research welcome. No exfiltration, no DoS, no breaking law. Never paste secrets/private keys into issues/PRs.
