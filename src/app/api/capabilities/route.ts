import { NextResponse } from 'next/server';

/** Machine-readable inventory; capabilities are explicit about implementation status. */
export async function GET() {
  return NextResponse.json({
    schema_version: 'agentswarm.capabilities/0.1',
    name: 'AgentSwarm.in',
    edition: '2a-foundation',
    environment: 'prototype',
    identity: {
      scheme: 'Ed25519',
      execute_headers: ['X-Swarm-Identity', 'X-Swarm-Signature', 'X-Swarm-Timestamp'],
      signed_message: '<unix_timestamp>.<exact_request_body>',
      identity_header_encoding: 'base64-ed25519-public-key',
      hardware_backed: false,
      wallet_ownership_registry: false,
      nonce_replay_prevention: false,
    },
    capabilities: [
      { id: 'agents.list', method: 'GET', path: '/api/swarm/agents', status: 'demo', persistence: 'memory', authentication: 'none' },
      { id: 'agents.register', method: 'POST', path: '/api/swarm/agents', status: 'demo', ownership_verified: false, authentication: 'none' },
      { id: 'manifest.validate', method: 'POST', path: '/api/swarm/manifest', status: 'demo', authentication: 'none' },
      { id: 'risk.execute', method: 'POST', path: '/api/swarm/execute', status: 'demo', authentication: 'Ed25519', jsonrpc_method: 'generate_risk_matrix', execution: 'server', payment: 'simulated' },
      { id: 'ledger.list', method: 'GET', path: '/api/swarm/ledger', status: 'demo', persistence: 'memory', payment: 'simulated', authentication: 'none' },
      { id: 'proof.simulate', method: 'POST', path: '/api/swarm/zk-prove', status: 'simulation', cryptographic_execution_proof: false, authentication: 'none' },
    ],
    foundations: {
      postgresql_tasks: { status: 'repository-only', http_api_available: false },
      budget_reservations: { status: 'repository-only', unit: 'micro-USDC', external_transfers: false },
      stark_receipt_verification: { status: 'not-implemented' },
      a2a_conformance: { status: 'not-verified' },
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
