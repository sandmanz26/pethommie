import type { PasswordHash } from "./types";

/**
 * Passwords are never stored as typed: PBKDF2-SHA256 with a random salt, via the browser's WebCrypto.
 * The iteration count is saved with each hash so it can be raised later without locking anyone out.
 */
export const DEFAULT_ITERATIONS = 100_000;

const encoder = new TextEncoder();

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string, iterations = DEFAULT_ITERATIONS): Promise<PasswordHash> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { algo: "pbkdf2-sha256", iterations, salt: toBase64(salt), hash: toBase64(await derive(password, salt, iterations)) };
}

export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  const actual = await derive(password, fromBase64(stored.salt), stored.iterations);
  const expected = fromBase64(stored.hash);
  if (actual.length !== expected.length) return false;
  // Compare every byte, so how long it takes doesn't reveal where the first difference was.
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
