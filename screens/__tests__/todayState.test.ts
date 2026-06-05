import { deriveWorkoutState, deriveNutritionState } from '../todayState';
import type { Targets } from '../../db/queries';

const noTargets: Targets = { kcal: null, protein_g: null, carbs_g: null, fat_g: null };
const fullTargets: Targets = { kcal: 2200, protein_g: 150, carbs_g: 220, fat_g: 70 };

describe('deriveWorkoutState', () => {
  it('is rest on a Rest day (or empty plan)', () => {
    expect(deriveWorkoutState('Rest', false)).toBe('rest');
    expect(deriveWorkoutState('', false)).toBe('rest');
  });

  it('is pending on a training day not yet done', () => {
    expect(deriveWorkoutState('Upper Body', false)).toBe('pending');
  });

  it('is done on a training day that is done', () => {
    expect(deriveWorkoutState('Upper Body', true)).toBe('done');
  });

  it('stays rest even if marked done (no dead done-state on a rest day)', () => {
    expect(deriveWorkoutState('Rest', true)).toBe('rest');
  });
});

describe('deriveNutritionState', () => {
  it('is no-goals when no macro target is set', () => {
    expect(deriveNutritionState(noTargets, 0)).toBe('no-goals');
    expect(deriveNutritionState(noTargets, 5)).toBe('no-goals');
  });

  it('treats a kcal-only goal as no ring goals', () => {
    expect(deriveNutritionState({ ...noTargets, kcal: 2000 }, 3)).toBe('no-goals');
  });

  it('is empty when goals exist but nothing is logged', () => {
    expect(deriveNutritionState(fullTargets, 0)).toBe('empty');
  });

  it('is tracking when goals exist and food is logged', () => {
    expect(deriveNutritionState(fullTargets, 4)).toBe('tracking');
  });

  it('counts a single ring macro as having goals', () => {
    expect(deriveNutritionState({ ...noTargets, protein_g: 150 }, 0)).toBe('empty');
  });
});
