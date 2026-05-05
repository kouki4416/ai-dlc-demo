import { generateOpaqueToken, hashToken, tokenHashesEqual } from '../hash-token';

describe('hash-token utils', () => {
  describe('generateOpaqueToken', () => {
    it('returns a base64url-safe string of expected entropy', () => {
      const token = generateOpaqueToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(token.length).toBeGreaterThan(40);
    });

    it('produces unique tokens across calls', () => {
      const a = generateOpaqueToken();
      const b = generateOpaqueToken();
      expect(a).not.toEqual(b);
    });

    it('honors a custom byte length', () => {
      const short = generateOpaqueToken(8);
      // base64url of 8 bytes = 11 chars (no padding)
      expect(short.length).toBe(11);
    });
  });

  describe('hashToken', () => {
    it('produces a deterministic SHA-256 hex string', () => {
      const a = hashToken('hello');
      const b = hashToken('hello');
      expect(a).toEqual(b);
      expect(a).toMatch(/^[a-f0-9]{64}$/);
    });

    it('produces different output for different input', () => {
      expect(hashToken('a')).not.toEqual(hashToken('b'));
    });
  });

  describe('tokenHashesEqual', () => {
    it('returns true for equal strings', () => {
      const h = hashToken('xyz');
      expect(tokenHashesEqual(h, h)).toBe(true);
    });

    it('returns false for different strings', () => {
      expect(tokenHashesEqual(hashToken('a'), hashToken('b'))).toBe(false);
    });

    it('returns false for different lengths', () => {
      expect(tokenHashesEqual('abc', 'abcd')).toBe(false);
    });
  });
});
