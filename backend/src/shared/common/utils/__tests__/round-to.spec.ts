import { roundTo } from '../round-to';

describe('roundTo', () => {
  it.each([
    [1.005, 2, 1.01],
    [2.345, 2, 2.35],
    [3.14159, 2, 3.14],
    [3.14159, 4, 3.1416],
    [0, 2, 0],
    [-1.235, 2, -1.23],
  ])('roundTo(%f, %d) === %f', (value, decimals, expected) => {
    expect(roundTo(value, decimals)).toBe(expected);
  });

  it('returns the value unchanged for non-finite inputs', () => {
    expect(roundTo(Number.NaN, 2)).toBeNaN();
    expect(roundTo(Number.POSITIVE_INFINITY, 2)).toBe(Number.POSITIVE_INFINITY);
  });

  it('throws on negative or non-integer decimals', () => {
    expect(() => roundTo(1.23, -1)).toThrow();
    expect(() => roundTo(1.23, 1.5)).toThrow();
  });
});
