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


## Uploaded 2035 blueprint: implementation decisions

The two uploaded plans are byte-identical. Their product goals are retained, with the following implementation corrections:

| Blueprint item | Current decision |
| --- | --- |
| Hash a seed to simulate a signature | Use real WebCrypto Ed25519 signing and public-key verification; no shared hardcoded seed |
| Canonical serialization | Sort plain JSON keys recursively; reject unsupported values and cyclic data; this local profile is not advertised as RFC 8785 |
| Execute2035 gateway | Verify a signed envelope bound to configured origin, method, path, nonce, timestamps, and payload hash; return 501 until real receipt verification and admission controls exist |
| Timestamp replay protection | Expiry limits age; PostgreSQL nonce consumption is still required for any state-changing endpoint |
| Browser budget override | Never authoritative; reservations and operator-approved policies belong on the server |
| STARK receipt string/base64 placeholder | Never accepted as a proof; no successful STARK completion response is emitted |
| LISTEN/NOTIFY | Broadcast only a durable event ID after insertion; reconnecting consumers must reread stored events |
| Organization/project/mission hierarchy and DAG | Planned; not yet present in the task repository |
| Client witness delegation | Research requirement, not an implemented privacy guarantee |
| Sub-500ms proving and O(1) verification | Benchmark hypotheses, not established performance claims |

The signing key is non-extractable through WebCrypto's export API. This does not establish a hardware enclave or protect against malicious code using the key in the same browser context. The signed nonce is only data until admission consumes it transactionally; the new gateway deliberately performs no admission, execution, or accounting writes.

`SWARM_SERVICE_ORIGIN` must be the exact trusted service origin (for example `https://agentswarm.in`); it is not derived from inbound Host headers. The request body is the complete signed envelope returned by `signTaskPayload`, rather than the blueprint's four unauthenticated headers. Configure the real verifier with pinned program identity and public-input bindings before allowing completion. Witness compression alone does not conceal private inputs from a delegated prover; the chosen prover protocol must establish that property separately.

Run the dependency-free signing checks on Node 24:

```sh
node --test tests/sovereign/crypto2035.test.mjs
```

These cover canonical data validation, valid Ed25519 signatures, tampering, service binding, expiry, and the explicit absence of nonce consumption. Browser compatibility, Next.js route integration, PostgreSQL invariants, concurrent leasing, and proving performance still need environment-backed tests. Notifications are hints rather than an ordered stream: sequence IDs may be allocated before another transaction commits. Consumers must account for commit-order gaps instead of advancing an irreversible cursor from notifications alone.

## Independent peer model

Each agent is an independent peer with its own identity, runtime boundary, wallet, and execution history. The target resources and their trust guarantees are explicit:

| Resource | Target contract | Current status |
| --- | --- | --- |
| Agent ID | Stable agent identifier bound to an attested device key, with rotation and revocation records | Not implemented; current WebCrypto keys do not establish device binding |
| Agentic Browser | Isolated browser profile/runtime per peer; capability-scoped network, storage, and tool permissions | Not implemented |
| Micro-stablecoin wallet | Dedicated agent wallet with explicit chain, token, decimals, custody, signing policy, and confirmed settlement records | Not implemented; database micro-USDC reservations are internal accounting |
| Execution commit | Append-only record binding task, parent commitment, peer identity, input/output commitments, program identity, receipt digest, and policy decision | Not implemented |
| STARK validity proof | Actual receipt verified against a pinned program and expected public inputs before accepting the execution commit | Not implemented; execute2035 rejects completion |

### Identity and runtime

Registration must prove possession of an attested device key and bind that key to the Agent ID. A browser-generated non-extractable key is not evidence of a hardware-bound key. A credential that can synchronize across devices is not sufficient evidence of device locking. Recovery must be an explicit identity transition with a revocation trail rather than an invisible replacement of device keys.

The Agentic Browser is a peer-owned runtime resource, not merely a dashboard tab. Define sandbox boundaries, allowed destinations, permission grants, secret access, per-origin storage, and artifact ownership. Browser actions that affect external services must carry task-scoped authorization and idempotency where supported. The browser session must not independently override wallet or task policy.

### Wallet and accounting

An Agent ID is not a wallet address. Bind each wallet through a chain-specific ownership proof and registry record. Keep signing keys outside application logs, task payloads, and execution commits. Specify chain and token before enabling transfers; an internal ledger capture is never evidence of an on-chain settlement. Enforce spending ceilings and approval policy server-side, and treat submitted, confirmed, reverted, and reorganized transactions separately.

### Proof-backed execution commits

The proposed commit body includes `version`, `task_id`, `agent_id`, `device_key_id`, `parent_commit_hash`, `program_id`, `input_commitment`, `output_commitment`, `receipt_digest`, `policy_digest`, and `wallet_settlement_reference` (nullable). Hash the versioned canonical body; store the agent signature and the verifier's acceptance record separately. A receipt must bind the expected task and agent context as public inputs, not just attest to an unrelated computation. Preserve the actual receipt or a retrievable content-addressed artifact alongside its digest.

Accepting a commit requires current lease ownership, verified identity, authorized policy, an actual verified receipt, and an atomic transaction that records the commit, task completion, internal accounting, and durable event. A missing verifier, mismatched program/input/output, revoked device, expired lease, or reused task completion must not create another commit or charge.

A content hash detects changed bytes but does not alone prevent deletion or rewriting an entire history. Append-only database privileges and constraints protect against application writers; stronger immutability requires an independently verifiable anchor or storage trust boundary. Neither an execution proof nor an append-only log establishes the truth of external browser observations without an explicit oracle/attestation model. STARK validity applies to the specified program's computation, not automatically to external effects, device identity, wallet transfers, or secret handling.

These contracts define the desired end state. The current draft remains a foundation and does not claim independent browser peers, hardware device locking, live wallets, immutable execution commits, or STARK-verified execution.


## Master Build dashboard integration

The later two Master Build uploads add a `/dashboard` layout and repeat the earlier simulation snippets. The implementation uses live `/api/capabilities` discovery and the real signed-envelope helper rather than the snippets' seed-hashing crypto or browser-created settlement records. The dashboard reports actual gateway HTTP responses and clearly labels session request history. It does not seed financial balances, pretend a biometric approval occurred, or mark an unverified execution complete.

The additional partial package manifest is not adopted: the existing application dependencies and lockfile are retained. A complete Next.js build and browser QA remain required before release. Gateway origin configuration must match the dashboard's serving origin for signed requests to validate.
