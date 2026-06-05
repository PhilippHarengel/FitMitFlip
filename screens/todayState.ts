import type { Targets } from '../db/queries';

// Pure derivation of the Today screen's two state machines. No React Native
// imports → unit-testable in isolation (screens/__tests__/todayState.test.ts).

// ── Workout card ──────────────────────────────────────────────────────────────
//   'Rest' planned        → rest    (calm row, no Start button)
//   training day, not done → pending (Start button)
//   training day, done     → done    (green check)
export type WorkoutCardState = 'rest' | 'pending' | 'done';

export function deriveWorkoutState(plannedType: string, done: boolean): WorkoutCardState {
  if (!plannedType || plannedType === 'Rest') return 'rest';
  return done ? 'done' : 'pending';
}

// ── Nutrition block ───────────────────────────────────────────────────────────
//   no macro goals set     → 'no-goals' (show "Set your targets", not broken rings)
//   goals set, nothing eaten → 'empty'   (rings at 0 + "Log your first meal")
//   goals set, food logged  → 'tracking' (filled rings)
// "Goals" here = the ring macros (protein/carbs/fat); the kcal bar handles its
// own null-target case separately.
export type NutritionState = 'no-goals' | 'empty' | 'tracking';

export function deriveNutritionState(targets: Targets, foodCount: number): NutritionState {
  const hasRingGoals = !!(targets.protein_g || targets.carbs_g || targets.fat_g);
  if (!hasRingGoals) return 'no-goals';
  if (foodCount <= 0) return 'empty';
  return 'tracking';
}
