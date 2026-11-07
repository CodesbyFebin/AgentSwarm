# AgentSwarm.in

Agent orchestration dashboard prototype recovered from the supplied workspace archive.

## Run locally

Install Node.js 20.9 or newer and Bun, then run:

```sh
bun install --frozen-lockfile
bun run dev
```

Open http://localhost:3000 for the original demo or http://localhost:3000/dashboard for capability discovery and the signed 2035 gateway playground. Set `SWARM_SERVICE_ORIGIN` to the exact serving origin to validate signed gateway requests; execution remains blocked until a real proof verifier and admission controls are integrated. To build and run the standalone server:

```sh
bun run build
bun run start
```

The Swarm APIs use in-memory state. The optional Prisma schema now targets PostgreSQL; to work with it, set `DATABASE_URL` in a local `.env` and run `bun run db:generate`. The provided database scripts can reset or discard data; review them before use.

## Included

- Agent registry and manifest editor
- Signed request playground with Ed25519 verification
- In-memory execution and settlement ledger endpoints
- Simulated zk proof panel and endpoint
- Next.js, React, TypeScript, Tailwind, and shadcn components

## Current limits

This is a prototype, not the Rust platform described in the supplied architecture notes. Registry and ledger state reset when the process restarts. Settlement records do not transfer funds. The zk endpoint fabricates demonstration artifacts; it does not generate or verify cryptographic proofs. Timestamp checks alone do not prevent repeated requests within the accepted window. A2A compliance has not been verified. The supplied Next.js configuration ignores TypeScript build errors.

See [the 2a Edition foundation](docs/2a-edition.md) for PostgreSQL task leasing and budget accounting. The demo endpoints have not yet been cut over to this repository.

No feature merge from the 77 referenced projects has been performed. Their availability, licenses, compatibility, and implementation must be reviewed before integrating code. No license grant for this uploaded source was supplied.

## Publish to a new GitHub repository

Create an empty repository named `agentswarm`, then run from this directory:

```sh
git remote add origin https://github.com/YOUR_ACCOUNT/agentswarm.git
git push -u origin main
```

## Preparation and validation

Original Git history, environment secrets, workspace service scripts, and the uploaded database were excluded. Source files and the existing Bun lockfile were retained. Dependencies were not installed and the application build was not run in this environment.
