import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeCanonical, generateSigningKey, signTaskPayload, verifyEnvelope } from '../../src/utils/crypto2035.ts';
const origin = 'https://agentswarm.in';
const payload = { id: 'task-1', params: { lng: 77, lat: 12 } };

test('canonical JSON sorts nested keys and rejects non-JSON values', () => {
  assert.equal(serializeCanonical({ b: { d: 2, a: 1 }, a: [3, null] }), '{"a":[3,null],"b":{"a":1,"d":2}}');
  for (const invalid of [undefined, NaN, Infinity, 1n, new Date(), { x: undefined }, Array(2)]) {
    assert.throws(() => serializeCanonical(invalid));
  }
  const cycle = {}; cycle.self = cycle;
  assert.throws(() => serializeCanonical(cycle));
});

test('real Ed25519 signature validates and private key is non-extractable', async () => {
  const keys = await generateSigningKey();
  assert.equal(keys.privateKey.extractable, false);
  const envelope = await signTaskPayload(payload, keys, origin);
  assert.equal(await verifyEnvelope(envelope, origin), true);
  assert.equal(await verifyEnvelope(envelope, 'https://other.example'), false);
});

test('tampering with signed scope, payload, nonce, identity or signature is rejected', async () => {
  const e = await signTaskPayload(payload, await generateSigningKey(), origin);
  for (const changes of [
    { payload: { id: 'attacker' } }, { path: '/api/other' }, { method: 'GET' },
    { nonce: crypto.randomUUID() }, { issuedAt: e.issuedAt - 1 },
    { identity: 'invalid' }, { signature: 'invalid' }, { unexpected: true },
  ]) assert.equal(await verifyEnvelope({ ...e, ...changes }, origin), false);
});

test('expired and invalid timestamp envelopes are rejected; verification alone does not consume nonce', async () => {
  const e = await signTaskPayload(payload, await generateSigningKey(), origin);
  assert.equal(await verifyEnvelope(e, origin, e.expiresAt), false);
  assert.equal(await verifyEnvelope({ ...e, issuedAt: NaN }, origin), false);
  assert.equal(await verifyEnvelope({ ...e, expiresAt: e.issuedAt + 3600 }, origin), false);
  assert.equal(await verifyEnvelope(e, origin), true);
  assert.equal(await verifyEnvelope(e, origin), true);
});
