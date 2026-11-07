/**
 * Byte encoding helpers — bridge between Uint8Array crypto output and
 * transport-friendly base64 / hex representations.
 */

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Short fingerprint for display, e.g. `ed25519:8f3a…9c21`. */
export function fingerprint(hex: string, prefix = ""): string {
  if (hex.length <= 12) return `${prefix}${hex}`;
  return `${prefix}${hex.slice(0, 6)}…${hex.slice(-6)}`;
}

/** Deterministic SHA-256 hex digest of an arbitrary string. */
export async function sha256Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}
