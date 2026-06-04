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
// Their progression chart always plots reps even if a weight was entered.
export const REPS_ONLY = new Set<string>(['Pull-ups (max reps)']);
export const isRepsOnly = (exercise: string) => REPS_ONLY.has(exercise);
