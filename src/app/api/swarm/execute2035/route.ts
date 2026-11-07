import { NextRequest, NextResponse } from 'next/server';
import { verifyEnvelope } from '@/utils/crypto2035';

export async function POST(req: NextRequest) {
  const origin = process.env.SWARM_SERVICE_ORIGIN;
  if (!origin) return NextResponse.json({ error: 'SERVICE_NOT_CONFIGURED' }, { status: 503 });
  let envelope: unknown;
  try { envelope = await req.json(); }
  catch { return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 }); }
  if (!await verifyEnvelope(envelope, origin)) {
    return NextResponse.json({ error: 'INVALID_SIGNED_ENVELOPE' }, { status: 401 });
  }
  // Never return COMPLETED_STARK_VERIFIED or settle money without an actual verifier.
  // No task admission occurs: registry ownership, nonce consumption, approval,
  // proof verification, and transactional accounting must be wired first.
  return NextResponse.json({
    error: 'PROOF_VERIFIER_UNAVAILABLE',
    execution_accepted: false,
    cryptographic_execution_proof_verified: false,
    payment_settled: false,
  }, { status: 501 });
}
