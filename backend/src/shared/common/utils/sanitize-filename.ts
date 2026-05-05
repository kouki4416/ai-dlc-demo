import { extname } from 'path';

const MAX_BASENAME_LENGTH = 80;
// Reject path separators, control chars, and OS-reserved names.
const FORBIDDEN_PATTERN = /[\\/\x00-\x1f<>:"|?*]/g;
const RESERVED_WINDOWS = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

export class InvalidFilenameError extends Error {
  constructor(reason: string) {
    super(`Invalid filename: ${reason}`);
    this.name = 'InvalidFilenameError';
  }
}

/**
 * Returns a safe filename derived from `original`. Throws InvalidFilenameError on hopeless input.
 *
 * - Strips path separators and control characters
 * - Collapses repeated dots (`..` → `_`)
 * - Truncates basename to MAX_BASENAME_LENGTH
 * - Preserves the original extension when it is alnum-only ≤ 8 chars
 */
export function sanitizeFilename(original: string): string {
  if (typeof original !== 'string') {
    throw new InvalidFilenameError('not a string');
  }
  const trimmed = original.trim();
  if (!trimmed) {
    throw new InvalidFilenameError('empty');
  }

  const ext = extname(trimmed);
  const baseRaw = ext ? trimmed.slice(0, -ext.length) : trimmed;

  let base = baseRaw
    .replace(FORBIDDEN_PATTERN, '_')
    .replace(/\.\.+/g, '_')
    .replace(/^\.+/, '_')
    .replace(/\s+/g, '_');

  if (RESERVED_WINDOWS.has(base.toUpperCase())) {
    base = `_${base}`;
  }

  if (base.length > MAX_BASENAME_LENGTH) {
    base = base.slice(0, MAX_BASENAME_LENGTH);
  }

  if (!base) {
    throw new InvalidFilenameError('basename empty after sanitization');
  }

  const safeExt = /^\.[a-z0-9]{1,8}$/i.test(ext) ? ext.toLowerCase() : '';
  return `${base}${safeExt}`;
}
