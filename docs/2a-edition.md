# 2a Edition: sovereign infrastructure foundation

The target is cryptographic agent identity, local deterministic execution, authenticated execution receipts, and PostgreSQL-authoritative task and budget accounting. This branch supplies the database foundation only. Existing demo endpoints still use their original in-memory store; no production cutover or STARK integration is claimed.

## Trust boundaries

Ed25519 authenticates signed bytes. It does not prove program execution or isolate browser secrets. Browser-generated JavaScript keys simulate an enclave; hardware protection requires a separate supported key mechanism. Circle STARK is a proof-system construction, not an Ed25519 identity alternative.

A production receipt verifier needs a specific prover, program commitment, verification parameters, proof encoding, and public input schema. Public inputs must bind the network/domain, task ID, request hash, agent identity, program version, output commitment, and freshness/nonce. Verification failure, unknown programs, and missing verifiers must reject completion. Hashing a trace or signing its hash is not a STARK. Do not promise O(1) verification without defining which input size is held constant and the chosen construction's actual complexity.

## Database behavior

`swarm_enqueue` atomically reserves budget, creates a task, and records accounting and telemetry. A per-account lock and `(identity, request_id)` uniqueness make matching retries idempotent and conflicting retries errors. Amounts are integer micro-USDC; these records are internal accounting, not blockchain transfers.

`swarm_claim` uses `FOR UPDATE SKIP LOCKED` to acquire one eligible task. Each claim produces a fresh fencing token. Expired tasks can be reclaimed. `swarm_finish` requires the current token and an unexpired lease, and captures the reservation with the result and event in one transaction. Matching completion retries do not double-charge. `swarm_cancel` invalidates the token and releases funds exactly once. Workers must not make non-idempotent external side effects before completion: fencing protects database state, not arbitrary external systems.

Account funding and worker provisioning are trusted operator operations. Do not expose raw database credentials or these repository methods directly to clients. Client identity must come from verified signed bytes and registry policy; prices must come from server configuration. Registration ownership, signed nonces, receipt verification, durable agent registry, event API, and gateway/worker wiring remain cutover prerequisites.

## Setup and verification

Use a dedicated PostgreSQL database. The Prisma datasource now uses `postgresql`. Set `DATABASE_URL` to that database and run `bun run db:generate` before using the server repository. The existing User/Post schema is unrelated to the raw SQL task tables; apply the SQL below explicitly, and do not use `db:push` to manage these tables. Apply the SQL with an operator connection:

```sh
psql "$SOVEREIGN_DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/migrations/20261107060000_sovereign_foundation/migration.sql
psql "$SOVEREIGN_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/sovereign/invariants.sql
```

The regression script rolls back its fixtures. Run it on an isolated test database. In a real two-connection test, hold a claimed row lock in one transaction and verify a second claimant obtains another task without blocking. Also verify an expired lease can be reclaimed and its old token cannot complete. Do not deploy until these database checks and concurrent gateway integration checks pass.

## API as the application

The dashboard is one client of the API, not a source of authority. Agents discover the implementation inventory at `GET /api/capabilities`; it explicitly reports demo, simulation, repository-only, and unimplemented features. This inventory is a local AgentSwarm contract, not a claim of standards-compliant A2A Agent Card discovery. A versioned OpenAPI/JSON Schema contract, standardized A2A discovery, and authenticated task APIs are subsequent deliverables.

For the sovereign API, bind an agent ID to a proven wallet signing key through a challenge-response registration flow. An address string alone is insufficient. Key type and chain encoding must be explicit; Ed25519 support does not imply support for every wallet. Sign a domain-separated envelope containing the intended service origin, API version, agent ID, method, path, body commitment, nonce, expiry, and budget ceiling. Persist nonce consumption with the task transaction. Resolve account and capability policy from the verified registry, never an untrusted body field. Document key rotation, revocation, delegation, and recovery before production use.

Every callable service needs discoverable input/output schemas, authentication and signature rules, prices in exact units, idempotency behavior, error codes, and implementation status. Completion receipts and task/event polling must be usable without a browser. Hardware-backed keys and cryptographic execution receipts remain separate trust guarantees; neither is established by a successful UI interaction.
