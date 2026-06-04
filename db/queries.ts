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

// ─── Sets ────────────────────────────────────────────────────────────────────

export async function getSetsForWorkout(workoutId: number): Promise<WorkoutSet[]> {
  const db = await getDb();
  return db.getAllAsync<WorkoutSet>(
    'SELECT * FROM sets WHERE workout_id = ? ORDER BY set_number ASC',
    [workoutId]
  );
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

export async function deleteSet(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sets WHERE id = ?', [id]);
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
