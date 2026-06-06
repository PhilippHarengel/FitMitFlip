// Pure progress math, shared by Ring and ProgressBar. No React Native imports,
// so it's unit-testable in isolation (components/ui/__tests__/ringMath.test.ts).
//
// The guard cases matter: a missing or zero target (the "no goals set" state)
// must NOT divide by zero or render a bogus fill.

/** Fraction filled, clamped to [0, 1]. Null/0 target or non-positive value → 0. */
export function ringPct(value: number, target: number | null | undefined): number {
  if (target == null || target <= 0) return 0;
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(value / target, 1);
}

/** True when value exceeds a real (positive) target. */
export function isOver(value: number, target: number | null | undefined): boolean {
  if (target == null || target <= 0) return false;
  return value > target;
}
