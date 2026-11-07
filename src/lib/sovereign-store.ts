/** Trusted server-side repository. Never accept identity/fee from an unsigned request. */
import { createHash } from 'node:crypto';
import { db } from './db';

export interface SovereignTask {
  id: string;
  identity: string;
  request_id: string;
  payload_hash: string;
  payload: unknown;
  fee_micro_usdc: bigint;
  status: 'QUEUED' | 'LEASED' | 'COMPLETED' | 'CANCELLED';
  lease_owner: string | null;
  lease_token: string | null;
  lease_expires_at: Date | null;
  result: unknown;
}

export async function enqueueTask(identity: string, requestId: string, signedBody: string, fee: bigint) {
  // Call only after Ed25519 verification and server-side policy/price resolution.
  const payload = JSON.parse(signedBody);
  const hash = createHash('sha256').update(signedBody).digest('hex');
  const rows = await db.$queryRaw<SovereignTask[]>`
    SELECT * FROM swarm_enqueue(${identity}, ${requestId}, ${hash},
      ${JSON.stringify(payload)}::jsonb, ${fee}::bigint)`;
  return rows[0];
}

export async function claimTask(worker: string, seconds = 30) {
  const rows = await db.$queryRaw<SovereignTask[]>`
    SELECT * FROM swarm_claim(${worker}, ${seconds}::integer)`;
  return rows[0] ?? null;
}

export async function finishTask(taskId: string, worker: string, token: string, result: unknown) {
  // Hybrid proof execution must verify a receipt before entering this operation.
  const rows = await db.$queryRaw<SovereignTask[]>`
    SELECT * FROM swarm_finish(${taskId}::uuid, ${worker}, ${token}::uuid,
      ${JSON.stringify(result)}::jsonb)`;
  return rows[0];
}

export async function cancelTask(taskId: string) {
  await db.$queryRaw`SELECT swarm_cancel(${taskId}::uuid)`;
}
