// Fixed workout splits. To change an exercise, edit the list here — exercise
// names are the identity used for progression tracking, so keep them stable.
export const SETS_PER_EXERCISE = 3;

export const SPLITS: Record<string, string[]> = {
  'Upper Body': [
    'Pull-ups (max reps)',
    'Incline Dumbbell Press',
    'Upper Chest Cable Fly',
    'Lat Pulldown',
    'Rows (Trapez)',
    'Side Delt Cable',
  ],
  'Leg Day': [
    'Leg Curls',
    'Leg Adductor',
    'Leg Abductor',
    'Bulgarian Split Squats',
    'Standing Calf Raises',
    'Leg Extensions',
  ],
  'Full Body': [
    'Lunges',
    'Chest Fly',
    'Rows',
    'Leg Press',
    'Cable Biceps Curls (backhand)',
    'Dips',
  ],
};

export type SplitName = keyof typeof SPLITS;
export const SPLIT_NAMES = Object.keys(SPLITS);

// All schedulable day types: the three loggable splits plus cardio and rest.
export const WORKOUT_TYPES = [...SPLIT_NAMES, 'Jogging', 'Rest'];
export const isStrengthSplit = (type: string) => SPLIT_NAMES.includes(type);

// Exercises tracked by reps, not weight (bodyweight/max-rep movements).
// Their progression chart always plots reps, and the set inputs hide the
// weight wheel entirely.
export const REPS_ONLY = new Set<string>(['Pull-ups (max reps)', 'Dips']);
export const isRepsOnly = (exercise: string) => REPS_ONLY.has(exercise);

// Scroll-wheel options for the set inputs.
export const WEIGHT_STEP = 2.5;
export const WEIGHT_MAX = 300;
export const REPS_MAX = 50;
export const DEFAULT_WEIGHT = 20;
export const DEFAULT_REPS = 10;

// 0, 2.5, 5 … 300  (one decimal so 82.5 shows cleanly, 80 stays "80")
export const WEIGHT_OPTIONS: number[] = Array.from(
  { length: Math.round(WEIGHT_MAX / WEIGHT_STEP) + 1 },
  (_, i) => Math.round(i * WEIGHT_STEP * 10) / 10
);
// 0, 1, 2 … 50
export const REPS_OPTIONS: number[] = Array.from({ length: REPS_MAX + 1 }, (_, i) => i);

// Snap an arbitrary value onto the wheel grid so a Picker always has a row
// that matches its selectedValue (last session's number may be off-grid).
export const snapWeight = (v: number): number =>
  Math.min(WEIGHT_MAX, Math.max(0, Math.round(v / WEIGHT_STEP) * WEIGHT_STEP));
export const snapReps = (v: number): number =>
  Math.min(REPS_MAX, Math.max(0, Math.round(v)));
