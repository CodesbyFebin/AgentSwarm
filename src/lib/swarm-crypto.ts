/**
 * Swarm Crypto — Ed25519 Signature Suite
 * ---------------------------------------
 * Backed by tweetnacl (RFC 8032 Ed25519). Every client enclave derives its
 * own keypair on first boot; every signed payload is verifiable server-side.
 * This is genuine asymmetric cryptography, not a mock.
 */

import nacl from "tweetnacl";
import { bytesToBase64, base64ToBytes, bytesToHex } from "./encoding";

export interface EnclaveKeypair {
  publicKeyB64: string;
  secretKeyB64: string;
  publicKeyHex: string;
}

/** Generate a fresh Ed25519 signing keypair inside the simulated secure enclave. */
export function generateKeypair(): EnclaveKeypair {
  const kp = nacl.sign.keyPair();
  return {
    publicKeyB64: bytesToBase64(kp.publicKey),
    secretKeyB64: bytesToBase64(kp.secretKey),
    publicKeyHex: bytesToHex(kp.publicKey),
  };
}

/**
 * Canonical signing message — binds timestamp + request body together.
 * Tampering with either invalidates the signature.
 */
export function canonicalMessage(timestamp: number, bodyJson: string): string {
  return `${timestamp}.${bodyJson}`;
}

/** Sign the canonical message with the enclave secret key. Returns base64 signature. */
export function signPayload(secretKeyB64: string, message: string): string {
  const sk = base64ToBytes(secretKeyB64);
  const msg = new TextEncoder().encode(message);
  const sig = nacl.sign.detached(msg, sk);
  return bytesToBase64(sig);
}

/** Verify an Ed25519 signature. Returns true only if the signature is cryptographically valid. */
export function verifySignature(
  publicKeyB64: string,
  message: string,
  signatureB64: string,
): boolean {
  try {
    const pk = base64ToBytes(publicKeyB64);
    const sig = base64ToBytes(signatureB64);
    const msg = new TextEncoder().encode(message);
    return nacl.sign.detached.verify(msg, sig, pk);
  } catch {
    return false;
  }
}

/** Truncate a hex string for compact display. */
export function shortHash(hex: string, len = 10): string {
  if (hex.length <= len) return hex;
  return `${hex.slice(0, len / 2)}…${hex.slice(-len / 2)}`;
}
