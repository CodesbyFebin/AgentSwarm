# AgentSwarm Hygiene

- 100% Rust for rust-core. No mocks claiming proof.
- Deterministic scheduler: sort by task id + DID, round-robin. No random, no time, no floats.
- Fail-closed: unsigned task = no run. Bad manifest = no run. No agent for capability = error.
- Ledger is hash-chained. Tamper breaks verify.
- No simulated zk proof. No simulated TEE. If you need TEE/zkVM, supply real proof via Rust-C / VIL.
- Dashboard (TypeScript/Next.js) is UI only. It must not claim execution, settlement, or proof. rust-core is truth.
