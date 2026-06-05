import { ringPct, isOver } from '../ringMath';

describe('ringPct', () => {
  it('returns the fraction filled for a normal value/target', () => {
    expect(ringPct(50, 100)).toBe(0.5);
    expect(ringPct(120, 150)).toBeCloseTo(0.8);
  });

  it('clamps to 1 when over target', () => {
    expect(ringPct(150, 100)).toBe(1);
    expect(ringPct(999, 100)).toBe(1);
  });

  it('returns 0 for a null or zero target (no-goals / div-by-zero guard)', () => {
    expect(ringPct(50, null)).toBe(0);
    expect(ringPct(50, undefined)).toBe(0);
    expect(ringPct(50, 0)).toBe(0);
    expect(ringPct(50, -10)).toBe(0);
  });

  it('returns 0 for non-positive or non-finite values', () => {
    expect(ringPct(0, 100)).toBe(0);
    expect(ringPct(-5, 100)).toBe(0);
    expect(ringPct(NaN, 100)).toBe(0);
    expect(ringPct(Infinity, 100)).toBe(0);
  });
});

describe('isOver', () => {
  it('is true only when value exceeds a real target', () => {
    expect(isOver(120, 100)).toBe(true);
    expect(isOver(100, 100)).toBe(false);
    expect(isOver(80, 100)).toBe(false);
  });

  it('is false when there is no real target', () => {
    expect(isOver(120, null)).toBe(false);
    expect(isOver(120, 0)).toBe(false);
  });
});
