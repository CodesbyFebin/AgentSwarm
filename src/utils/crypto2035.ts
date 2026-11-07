/** Browser/Node WebCrypto signing. No enclave or zero-knowledge proof is implied. */
export interface CryptographicEnvelope {
  version: 'agentswarm.request/1';
  origin: string;
  method: 'POST';
  path: '/api/swarm/execute2035';
  identity: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
  payload: unknown;
  publicInputsHash: string;
  signature: string;
}

export function serializeCanonical(value: unknown): string {
  const seen = new Set<object>();
  function encode(v: unknown, depth: number): string {
    if (depth > 64) throw new Error('Payload nesting exceeds limit');
    if (v === null || typeof v === 'boolean' || typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'number' && Number.isFinite(v)) return JSON.stringify(v);
    if (typeof v !== 'object' || v === null || seen.has(v)) throw new Error('Expected acyclic JSON data');
    seen.add(v);
    try {
      if (Array.isArray(v)) {
        if (Object.keys(v).length !== v.length) throw new Error('Sparse or extended arrays are unsupported');
        return '[' + Array.from(v, x => encode(x, depth + 1)).join(',') + ']';
      }
      if (Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) {
        throw new Error('Expected plain JSON object');
      }
      const record = v as Record<string, unknown>;
      return '{' + Object.keys(record).sort().map(k => JSON.stringify(k) + ':' + encode(record[k], depth + 1)).join(',') + '}';
    } finally { seen.delete(v); }
  }
  return encode(value, 0);
}

const utf8 = (s: string) => new TextEncoder().encode(s);
const toBase64 = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
function fromBase64(s: string, length: number): ArrayBuffer {
  if (s.length > 128) throw new Error('Invalid key or signature');
  const bytes = Uint8Array.from(atob(s), c => c.charCodeAt(0));
  if (bytes.length !== length || toBase64(bytes.buffer) !== s) throw new Error('Invalid key or signature');
  return bytes.buffer;
}
export async function digestString(data: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', utf8(data));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
const signingMessage = (unsigned: Omit<CryptographicEnvelope, 'signature'>) =>
  utf8('AgentSwarm signed request v1\n' + serializeCanonical(unsigned));

export async function generateSigningKey(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey('Ed25519', false, ['sign', 'verify']) as CryptoKeyPair;
}

export async function signTaskPayload(payload: unknown, keys: CryptoKeyPair, origin: string): Promise<CryptographicEnvelope> {
  if (new URL(origin).origin !== origin) throw new Error('Expected exact service origin');
  const issuedAt = Math.floor(Date.now() / 1000);
  const unsigned: Omit<CryptographicEnvelope, 'signature'> = {
    version: 'agentswarm.request/1', origin, method: 'POST', path: '/api/swarm/execute2035',
    identity: toBase64(await crypto.subtle.exportKey('raw', keys.publicKey)),
    nonce: crypto.randomUUID(), issuedAt, expiresAt: issuedAt + 60, payload,
    publicInputsHash: await digestString(serializeCanonical(payload)),
  };
  return { ...unsigned, signature: toBase64(await crypto.subtle.sign('Ed25519', keys.privateKey, signingMessage(unsigned))) };
}

/** Signature validation only. A state-changing caller MUST atomically consume nonce in PostgreSQL. */
export async function verifyEnvelope(input: unknown, expectedOrigin: string, now = Math.floor(Date.now() / 1000)): Promise<boolean> {
  try {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
    const e = input as CryptographicEnvelope;
    const keys = ['version','origin','method','path','identity','nonce','issuedAt','expiresAt','payload','publicInputsHash','signature'];
    if (Object.keys(e).length !== keys.length || !keys.every(k => Object.hasOwn(e, k))) return false;
    if (e.version !== 'agentswarm.request/1' || e.origin !== expectedOrigin || e.method !== 'POST' || e.path !== '/api/swarm/execute2035') return false;
    if (typeof e.identity !== 'string' || typeof e.signature !== 'string' || typeof e.nonce !== 'string' || !/^[0-9a-f-]{36}$/.test(e.nonce)) return false;
    if (!Number.isSafeInteger(e.issuedAt) || !Number.isSafeInteger(e.expiresAt) || e.issuedAt > now + 5 || e.expiresAt <= now || e.expiresAt <= e.issuedAt || e.expiresAt - e.issuedAt > 60) return false;
    if (e.publicInputsHash !== await digestString(serializeCanonical(e.payload))) return false;
    const { signature, ...unsigned } = e;
    const publicKey = await crypto.subtle.importKey('raw', fromBase64(e.identity, 32), 'Ed25519', false, ['verify']);
    return await crypto.subtle.verify('Ed25519', publicKey, fromBase64(signature, 64), signingMessage(unsigned));
  } catch { return false; }
}
