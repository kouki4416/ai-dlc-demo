/**
 * Rounds `value` to `decimals` places using banker's-friendly half-up.
 * Used for score aggregation (display 2 decimals; sort 4 decimals).
 */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) {
    return value;
  }
  if (decimals < 0 || !Number.isInteger(decimals)) {
    throw new Error(`Invalid decimals: ${decimals}`);
  }
  const factor = 10 ** decimals;
  // (value * factor) can introduce floating noise; using `Math.round` after
  // multiplication is sufficient for the precision we care about (≤ 6 places).
  return Math.round(value * factor) / factor;
}
