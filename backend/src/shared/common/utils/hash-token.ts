import { createHash, randomBytes } from 'crypto';

/**
 * Generates a cryptographically random opaque token (URL-safe base64).
 * Use for refresh tokens and password-reset tokens.
 */
export function generateOpaqueToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('base64url');
}

/**
 * SHA-256 of an opaque token. Stored in DB; the raw token is only ever sent to the client once.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Constant-time comparison to mitigate timing attacks when verifying token hashes.
 */
export function tokenHashesEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
