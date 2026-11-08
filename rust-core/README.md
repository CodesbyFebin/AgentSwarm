# AgentSwarm

*Deterministic, verifiable swarm runtime for autonomous agents — registry, signed tasks, hash-chained ledger, fail-closed admission.*

[![stars](https://img.shields.io/github/stars/CodesbyFebin/AgentSwarm?style=flat-square&logo=github&label=stars)](https://github.com/CodesbyFebin/AgentSwarm/stargazers)
[![license](https://img.shields.io/github/license/CodesbyFebin/AgentSwarm?style=flat-square&label=license)](https://github.com/CodesbyFebin/AgentSwarm/blob/main/LICENSE)
[![language](https://img.shields.io/badge/rust--core-100%25%20Rust-orange?style=flat-square)](https://github.com/CodesbyFebin/AgentSwarm/tree/main/rust-core)
[![tests](https://img.shields.io/badge/tests-cargo%20test-passing-brightgreen?style=flat-square)](https://github.com/CodesbyFebin/AgentSwarm/actions)

> **TL;DR — GEO Facts Box**
> - **What it is:** AgentSwarm = swarm runtime that schedules signed tasks to agents deterministically, records them in a hash-chained ledger, and refuses to run unsigned or unadmitted work.
> - **Who it is for:** Developers building multi-agent systems, auditors, enterprises needing verifiable agent execution.
> - **Key stats:** rust-core 100% Rust, 6 tests, deterministic scheduler, fail-closed admission.
> - **Key features:** Agent Registry + Manifest, Signed Tasks (Ed25519), Deterministic Scheduler, Hash-Chained Ledger.
> - **How to start:** `git clone`, `cargo test --manifest-path rust-core/Cargo.toml`, `cargo run --manifest-path rust-core/Cargo.toml -- demo`
> - **Honest limits:** No simulated zk proof, no simulated TEE, no simulated settlement. Ledger is hash linkage, not STARK. Escrow stays HELD unless on-chain proof supplied via Rust-C / x402.

## Table of Contents
- [What is it?](#what-is-it) - [The Problem](#the-problem) - [The Solution](#the-solution) - [Features](#features) - [Architecture](#architecture) - [Quick Start](#quick-start) - [How Scheduling Works](#how-scheduling-works) - [How Ledger Works](#how-ledger-works) - [Hygiene](#hygiene) - [Dashboard vs rust-core](#dashboard-vs-rust-core) - [Testing](#testing--ci) - [Security](#security) - [FAQ](#faq) - [Contributing](#contributing) - [License](#license)

## What is it?
AgentSwarm is the swarm layer for the Sovereign Agent Mesh. In Rust-C, a commit is proof of execution for one agent. In AgentSwarm, a swarm run is proof of coordination for many agents: who was admitted, what task they were given, what they produced, in what order, with what hash chain.

The repo has two parts:
1. **Dashboard (TypeScript / Next.js)** — existing prototype: Agent Registry UI, Manifest Editor, Signed Request Playground, Execution Ledger UI. UI only.
2. **rust-core (100% Rust, new)** — `rust-core/` in this repo: the truth. Registry, manifest, signed tasks, deterministic scheduler, hash-chained ledger. If dashboard and rust-core disagree, rust-core wins.

## The Problem
Agent orchestration today is dashboards with in-memory state, simulated zk panels, and unsigned tasks. You cannot prove who did what, in what order, with what permission. A malicious agent can claim work, a buggy scheduler can assign the same task twice, a tampered ledger can rewrite history.

## The Solution
AgentSwarm rust-core makes every step verifiable:
- **Agent** = Ed25519 DID (`did:key:z...`). No agent without a key.
- **Manifest** = hash-bound capabilities + max_concurrent. Tamper breaks hash.
- **Signed Task** = Ed25519-signed intent + capability + payload + nonce. Tamper breaks signature.
- **Scheduler** = deterministic: sort tasks by id, sort agents by DID, round-robin, first agent with capability. Same inputs = same assignments, every time, on any machine.
- **Ledger** = hash-chained: each entry hashes prev hash + task + agent + status + output. Tamper breaks chain.
- **Admission** = fail-closed: unsigned task, bad manifest, manifest/agent count mismatch, no agent for capability = no run.

## Features
| Feature | What it does | Evidence |
|---|---|---|
| Agent Registry | DID + Ed25519 key + capabilities | `rust-core/src/agent.rs` |
| Manifest | Hash-bound capabilities, max_concurrent | `rust-core/src/manifest.rs` |
| Signed Tasks | Ed25519 signature over canonical task | `rust-core/src/swarm.rs` |
| Deterministic Scheduler | Sort + round-robin, no random/time | `rust-core/src/swarm.rs` |
| Hash-Chained Ledger | Prev-hash chain, tamper-evident | `rust-core/src/ledger.rs` |
| Fail-Closed Admission | No signature = no run | `rust-core/tests/swarm.rs` |

## Architecture
```
AgentSwarm/
├── rust-core/              # 100% Rust - truth
│   ├── Cargo.toml
│   ├── src/canonical.rs   # SHA256 + canonical JSON
│   ├── src/agent.rs       # Ed25519 Agent, DID
│   ├── src/manifest.rs    # Manifest hash
│   ├── src/ledger.rs      # Hash-chained ledger
│   ├── src/swarm.rs       # Signed tasks + scheduler + run_swarm
│   ├── src/main.rs        # CLI: demo
│   └── tests/swarm.rs     # 6 tests
├── src/                   # Next.js dashboard (UI only)
├── prisma/                # Dashboard DB (UI only)
└── README.md
```

## Quick Start
```bash
git clone https://github.com/CodesbyFebin/AgentSwarm.git
cd AgentSwarm
cargo test --manifest-path rust-core/Cargo.toml
cargo run --manifest-path rust-core/Cargo.toml -- demo
# assignments 2 ledger 2 receipt {...}
```

### Dashboard (existing)
```bash
bun install
bun run dev
# http://localhost:3000/dashboard
```
Dashboard is UI. It does not prove execution. Use rust-core for proof.

## How Scheduling Works
1. Sort tasks by `id` ascending.
2. Sort agents by `did` ascending.
3. For each task, round-robin starting at task index, pick first agent whose capabilities contain `task.capability`.
4. If no agent has capability, error `NO_AGENT_FOR_CAPABILITY:<cap>` — no run, no partial ledger.
No floats, no time, no random, no network. Same inputs = same assignments.

## How Ledger Works
`entry.hash = sha256(canonical({index, taskId, agentDid, status, outputHash, prevHash}))`
`prevHash` = previous entry hash, or `genesis` for index 0.
Verify checks index, prev link, hash recompute. Any tamper fails.

## Hygiene
Keep: canonical JSON + SHA256 (100), Ed25519 verify (97), manifest hash (96), ledger hash chain (90), deterministic scheduler (95).
Leave out: simulated zk proof (5), simulated TEE (5), simulated settlement (5), in-memory ledger as proof (20). Dashboard must not claim proof it does not have.

## Dashboard vs rust-core
| Claim | Dashboard | rust-core |
|---|---|---|
| Shows agents | Yes | Yes (registry) |
| Proves task signature | No | Yes (Ed25519) |
| Proves scheduling | No | Yes (deterministic) |
| Proves ledger | No (in-memory) | Yes (hash-chained) |
| Proves TEE / STARK / settlement | No — simulated panel only | No — honestly labelled, not claimed |

## Testing & CI
`cargo test --manifest-path rust-core/Cargo.toml` — 6 tests: sign/verify, manifest hash, task signature, deterministic schedule, ledger tamper, swarm run.
CI: `.github/workflows/ci.yml` runs `cargo test` for rust-core on every push/PR. Dashboard CI remains as before.

## Security
See `rust-core/SECURITY.md`. Do NOT open public issue for security bug. Use private vulnerability reporting. Never paste secrets or private keys.

## FAQ
**Is AgentSwarm 100% Rust?** rust-core is 100% Rust. The whole repo is TypeScript dashboard + Rust core. Dashboard is UI, rust-core is truth.
**Does AgentSwarm prove TEE / STARK?** No. It proves registry, signature, scheduling, ledger. For TEE/zkVM, use Rust-C / VIL and supply real proof.
**Can I run swarm without signatures?** No. Fail-closed. Unsigned task = no run.
**Is ledger a blockchain?** No. Hash-chained ledger, single swarm, no consensus. For settlement, use on-chain proof via Rust-C x402.

## Contributing
See `rust-core/CONTRIBUTING.md`. Branch `feat/`, `fix/`, `docs/`. Conventional Commits. `cargo test` must pass. No mocks claiming proof. Whitehat only.

## License
MIT — see `LICENSE` if present, else `rust-core` is MIT. Dashboard retains its existing license.

## Related
- [Rust-C](https://github.com/CodesbyFebin/Rust-C) — verifiable commit = proof of execution for one agent
- [VIL](https://github.com/CodesbyFebin/VIL) — intent as contract
- [AgentSwarm](https://github.com/CodesbyFebin/AgentSwarm) — this repo — swarm = proof of coordination for many agents
