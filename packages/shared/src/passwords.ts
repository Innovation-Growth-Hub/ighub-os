/** No look-alike characters (0/o, 1/l/i), so it reads clearly over WhatsApp. */
const CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

/**
 * Readable temporary password for new accounts and resets, e.g. "ighub-7k3m-q9tx".
 * 8 random characters from a 31-character alphabet ≈ 40 bits; it only has to
 * survive until the user's first login, when they must replace it.
 * Uses Web Crypto, available in browsers and Node 20+.
 */
export function generateTempPassword() {
  const pick = (n: number) =>
    Array.from(globalThis.crypto.getRandomValues(new Uint32Array(n)), (v) => CHARS[v % CHARS.length]).join("");
  return `ighub-${pick(4)}-${pick(4)}`;
}
