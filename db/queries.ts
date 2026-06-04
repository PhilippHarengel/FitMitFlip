import { getDb } from './db';

// ─── Date helpers ────────────────────────────────────────────────────────────

/** Returns today's date as 'YYYY-MM-DD' in local time. */
export function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Formats a Date object as 'YYYY-MM-DD'. */
export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Day-of-week index (0=Sun … 6=Sat) for a 'YYYY-MM-DD' string, local time. */
export function dowOf(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

// ─── Backup ──────────────────────────────────────────────────────────────────

// Full lossless dump of every table → JSON string, ready to write to a file.
// schema_version lets a future restore know which migration shape it is.
export async function exportAllData(): Promise<string> {
  const db = await getDb();
  const tables = ['workouts', 'sets', 'foods', 'food_log', 'targets', 'schedule', 'schedule_overrides', 'completions'];
  const out: Record<string, unknown[]> = {};
  for (const t of tables) out[t] = await db.getAllAsync(`SELECT * FROM ${t}`);
  const pragma = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return JSON.stringify(
    { app: 'FitMitFlip', schema_version: pragma?.user_version ?? null, exported_at: new Date().toISOString(), tables: out },
    null,
    2
  );
}

// ─── Weekly schedule ─────────────────────────────────────────────────────────

export async function getScheduleBase(): Promise<Record<number, string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ dow: number; type: string }>('SELECT dow, type FROM schedule');
  const out: Record<number, string> = {};
  for (const r of rows) out[r.dow] = r.type;
  return out;
}

export async function setScheduleDay(dow: number, type: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO schedule (dow, type) VALUES (?, ?) ON CONFLICT(dow) DO UPDATE SET type = excluded.type',
    [dow, type]
  );
}

export async function setOverride(date: string, type: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO schedule_overrides (date, type) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET type = excluded.type',
    [date, type]
  );
}

export async function clearOverride(date: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM schedule_overrides WHERE date = ?', [date]);
}

// Resolved planned type for a date: this-week override wins, else the base plan.
export async function getPlannedType(date: string): Promise<string> {
  const db = await getDb();
  const ov = await db.getFirstAsync<{ type: string }>('SELECT type FROM schedule_overrides WHERE date = ?', [date]);
  if (ov) return ov.type;
  const base = await db.getFirstAsync<{ type: string }>('SELECT type FROM schedule WHERE dow = ?', [dowOf(date)]);
  return base?.type ?? 'Rest';
}

// ─── Completion (auto from sets, with manual override) ───────────────────────

async function hasLoggedSets(date: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM sets s JOIN workouts w ON s.workout_id = w.id WHERE w.date = ?',
    [date]
  );
  return (row?.n ?? 0) > 0;
}

// Effective done = manual completion row if present, else auto (any sets logged).
export async function isDone(date: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ done: number }>('SELECT done FROM completions WHERE date = ?', [date]);
  if (row) return row.done === 1;
  return hasLoggedSets(date);
}

export async function setDone(date: string, done: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO completions (date, done) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET done = excluded.done',
    [date, done ? 1 : 0]
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type Workout = {
  id: number;
  date: string;
  name: string | null;
};

export type WorkoutSet = {
  id: number;
  workout_id: number;
  set_number: number;
  exercise: string;
  weight_kg: number | null;
  reps: number | null;
};

export type Food = {
  id: number;
  barcode: string | null;
  name: string;
  kcal_per_100g: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  cached_at: string;
  source: 'api' | 'manual';
};

export type FoodLogEntry = {
  id: number;
  date: string;
  food_id: number;
  serving_g: number;
};

export type DailyMacros = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

// Each field is null when no goal is set for that macro.
export type Targets = {
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

// ─── Workouts ────────────────────────────────────────────────────────────────

export async function getWorkoutsForDate(date: string): Promise<Workout[]> {
  const db = await getDb();
  return db.getAllAsync<Workout>(
    'SELECT * FROM workouts WHERE date = ? ORDER BY id DESC',
    [date]
  );
}

export async function createWorkout(date: string, name?: string): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO workouts (date, name) VALUES (?, ?)',
    [date, name ?? null]
  );
  return result.lastInsertRowId;
}

export async function deleteWorkout(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sets WHERE workout_id = ?', [id]);
  await db.runAsync('DELETE FROM workouts WHERE id = ?', [id]);
}

// Resume a split already started for this date (one workout per date+split).
export async function getWorkoutByDateAndName(date: string, name: string): Promise<Workout | null> {
  const db = await getDb();
  return db.getFirstAsync<Workout>(
    'SELECT * FROM workouts WHERE date = ? AND name = ? ORDER BY id DESC LIMIT 1',
    [date, name]
  );
}

// ─── Sets ────────────────────────────────────────────────────────────────────

export async function getSetsForWorkout(workoutId: number): Promise<WorkoutSet[]> {
  const db = await getDb();
  return db.getAllAsync<WorkoutSet>(
    'SELECT * FROM sets WHERE workout_id = ? ORDER BY set_number ASC',
    [workoutId]
  );
}

// Per-set weight/reps from the most recent date this exercise was logged
// strictly before `beforeDate` — used to show last session's numbers as input
// placeholders. Empty object when the exercise has no prior history.
export async function getLastSessionSets(
  exercise: string,
  beforeDate: string
): Promise<Record<number, { weight_kg: number | null; reps: number | null }>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ set_number: number; weight_kg: number | null; reps: number | null }>(
    `SELECT s.set_number, s.weight_kg, s.reps
     FROM sets s JOIN workouts w ON s.workout_id = w.id
     WHERE s.exercise = ?
       AND w.date = (
         SELECT MAX(w2.date) FROM sets s2 JOIN workouts w2 ON s2.workout_id = w2.id
         WHERE s2.exercise = ? AND w2.date < ?
       )`,
    [exercise, exercise, beforeDate]
  );
  const out: Record<number, { weight_kg: number | null; reps: number | null }> = {};
  for (const r of rows) out[r.set_number] = { weight_kg: r.weight_kg, reps: r.reps };
  return out;
}

export async function logSet(
  workoutId: number,
  setNumber: number,
  exercise: string,
  weightKg: number | null,
  reps: number | null
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO sets (workout_id, set_number, exercise, weight_kg, reps) VALUES (?, ?, ?, ?, ?)',
    [workoutId, setNumber, exercise, weightKg, reps]
  );
  return result.lastInsertRowId;
}

// Bulk-import parsed sessions. One workout per (date, split), reused if it
// already exists; sets upsert by (workout_id, exercise, set_number) so a
// re-import overwrites rather than duplicates. Returns counts for the report.
export async function importSessions(sessions: {
  date: string;
  split: string;
  exercises: { name: string; sets: { reps: number; weightKg: number | null }[] }[];
}[]): Promise<{ workouts: number; sets: number }> {
  let workoutCount = 0;
  let setCount = 0;
  for (const session of sessions) {
    const existing = await getWorkoutByDateAndName(session.date, session.split);
    const workoutId = existing ? existing.id : await createWorkout(session.date, session.split);
    workoutCount++;
    for (const ex of session.exercises) {
      for (let i = 0; i < ex.sets.length; i++) {
        await upsertSet(workoutId, ex.name, i + 1, ex.sets[i].weightKg, ex.sets[i].reps);
        setCount++;
      }
    }
  }
  return { workouts: workoutCount, sets: setCount };
}

// One row per day this exercise was trained: the day's average weight and reps
// across all its sets (AVG ignores NULL weights, so bodyweight sets don't drag
// the average down). Ordered oldest → newest for charting progression.
export type ExerciseDay = {
  date: string;
  // Top set = the heaviest weight (or most reps for bodyweight) that day —
  // the cleanest "am I lifting more" signal, undiluted by warm-up sets.
  top_weight: number | null;
  top_reps: number | null;
  avg_reps: number | null; // kept for the per-session detail row
  set_count: number;
};

export async function getExerciseHistory(exercise: string): Promise<ExerciseDay[]> {
  const db = await getDb();
  return db.getAllAsync<ExerciseDay>(
    `SELECT w.date AS date,
            MAX(s.weight_kg) AS top_weight,
            MAX(s.reps)      AS top_reps,
            AVG(s.reps)      AS avg_reps,
            COUNT(*)         AS set_count
     FROM sets s
     JOIN workouts w ON s.workout_id = w.id
     WHERE s.exercise = ?
       AND (s.weight_kg IS NOT NULL OR s.reps IS NOT NULL)
     GROUP BY w.date
     ORDER BY w.date ASC`,
    [exercise]
  );
}

// Insert or update a set keyed on (workout_id, exercise, set_number) so editing
// a templated set never creates duplicate rows. A null weight+reps clears the set.
export async function upsertSet(
  workoutId: number,
  exercise: string,
  setNumber: number,
  weightKg: number | null,
  reps: number | null
): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM sets WHERE workout_id = ? AND exercise = ? AND set_number = ?',
    [workoutId, exercise, setNumber]
  );
  if (existing) {
    await db.runAsync(
      'UPDATE sets SET weight_kg = ?, reps = ? WHERE id = ?',
      [weightKg, reps, existing.id]
    );
  } else {
    await db.runAsync(
      'INSERT INTO sets (workout_id, set_number, exercise, weight_kg, reps) VALUES (?, ?, ?, ?, ?)',
      [workoutId, setNumber, exercise, weightKg, reps]
    );
  }
}

export async function deleteSet(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sets WHERE id = ?', [id]);
}

// Delete a single logged set by its natural key (used by the per-set undo).
export async function deleteSetEntry(
  workoutId: number,
  exercise: string,
  setNumber: number
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'DELETE FROM sets WHERE workout_id = ? AND exercise = ? AND set_number = ?',
    [workoutId, exercise, setNumber]
  );
}

// ─── Foods ───────────────────────────────────────────────────────────────────

// Returns a cached food for this barcode. Manual entries (the user's own data)
// never expire; API-sourced entries are only returned if cached within 30 days
// so stale nutrition data gets refreshed from OpenFoodFacts.
export async function getFoodByBarcode(barcode: string): Promise<Food | null> {
  const db = await getDb();
  return db.getFirstAsync<Food>(
    `SELECT * FROM foods
     WHERE barcode = ?
       AND (source = 'manual' OR cached_at > date('now', '-30 days'))
     ORDER BY (source = 'manual') DESC
     LIMIT 1`,
    [barcode]
  );
}

export async function searchFoodsByName(query: string): Promise<Food[]> {
  const db = await getDb();
  return db.getAllAsync<Food>(
    `SELECT * FROM foods WHERE name LIKE ? ORDER BY name LIMIT 20`,
    [`%${query}%`]
  );
}

export async function upsertFood(food: Omit<Food, 'id'>): Promise<number> {
  const db = await getDb();
  const existing = food.barcode
    ? await db.getFirstAsync<Food>('SELECT id, source FROM foods WHERE barcode = ?', [food.barcode])
    : null;

  if (existing) {
    // Never let an API refresh clobber a manual entry — the user's own data wins.
    if (existing.source === 'manual' && food.source !== 'manual') {
      return existing.id;
    }
    await db.runAsync(
      `UPDATE foods SET name=?, kcal_per_100g=?, protein_g=?, carbs_g=?, fat_g=?, cached_at=?, source=?
       WHERE id=?`,
      [food.name, food.kcal_per_100g, food.protein_g, food.carbs_g, food.fat_g, food.cached_at, food.source, existing.id]
    );
    return existing.id;
  }

  const result = await db.runAsync(
    `INSERT INTO foods (barcode, name, kcal_per_100g, protein_g, carbs_g, fat_g, cached_at, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [food.barcode, food.name, food.kcal_per_100g, food.protein_g, food.carbs_g, food.fat_g, food.cached_at, food.source]
  );
  return result.lastInsertRowId;
}

// ─── Food log ────────────────────────────────────────────────────────────────

export async function getFoodLogForDate(date: string): Promise<(FoodLogEntry & Food)[]> {
  const db = await getDb();
  return db.getAllAsync<FoodLogEntry & Food>(
    `SELECT fl.*, f.name, f.kcal_per_100g, f.protein_g, f.carbs_g, f.fat_g
     FROM food_log fl
     JOIN foods f ON fl.food_id = f.id
     WHERE fl.date = ?
     ORDER BY fl.id ASC`,
    [date]
  );
}

export async function logFood(date: string, foodId: number, servingG: number): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO food_log (date, food_id, serving_g) VALUES (?, ?, ?)',
    [date, foodId, servingG]
  );
  return result.lastInsertRowId;
}

export async function deleteFoodLogEntry(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM food_log WHERE id = ?', [id]);
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function getDailyMacros(date: string): Promise<DailyMacros> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    kcal: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
  }>(
    `SELECT
       SUM((fl.serving_g / 100.0) * COALESCE(f.kcal_per_100g, 0))    AS kcal,
       SUM((fl.serving_g / 100.0) * COALESCE(f.protein_g, 0))        AS protein_g,
       SUM((fl.serving_g / 100.0) * COALESCE(f.carbs_g, 0))          AS carbs_g,
       SUM((fl.serving_g / 100.0) * COALESCE(f.fat_g, 0))            AS fat_g
     FROM food_log fl
     JOIN foods f ON fl.food_id = f.id
     WHERE fl.date = ?`,
    [date]
  );

  return {
    kcal: row?.kcal ?? 0,
    protein_g: row?.protein_g ?? 0,
    carbs_g: row?.carbs_g ?? 0,
    fat_g: row?.fat_g ?? 0,
  };
}

// ─── Targets ─────────────────────────────────────────────────────────────────

export async function getTargets(): Promise<Targets> {
  const db = await getDb();
  const row = await db.getFirstAsync<Targets>(
    'SELECT kcal, protein_g, carbs_g, fat_g FROM targets WHERE id = 1'
  );
  return {
    kcal: row?.kcal ?? null,
    protein_g: row?.protein_g ?? null,
    carbs_g: row?.carbs_g ?? null,
    fat_g: row?.fat_g ?? null,
  };
}

export async function setTargets(t: Targets): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE targets SET kcal=?, protein_g=?, carbs_g=?, fat_g=? WHERE id = 1`,
    [t.kcal, t.protein_g, t.carbs_g, t.fat_g]
  );
}
