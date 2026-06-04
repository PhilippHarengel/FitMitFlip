import * as SQLite from 'expo-sqlite';

// Each entry is a SQL statement that runs once, in order.
// Append new statements at the end — never modify existing ones.
// PRAGMA user_version tracks how many have run.
const MIGRATIONS: string[] = [
  // v1 — initial schema
  `CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    name TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL,
    set_number INTEGER NOT NULL,
    exercise TEXT NOT NULL,
    weight_kg REAL,
    reps INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS foods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode TEXT,
    name TEXT NOT NULL,
    kcal_per_100g REAL,
    protein_g REAL,
    carbs_g REAL,
    fat_g REAL,
    cached_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS food_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    food_id INTEGER NOT NULL,
    serving_g REAL NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date)`,
  `CREATE INDEX IF NOT EXISTS idx_food_log_date ON food_log(date)`,
  // v2 — track where a food came from. 'manual' entries never expire from the
  // barcode cache; 'api' entries still refresh after 30 days.
  `ALTER TABLE foods ADD COLUMN source TEXT NOT NULL DEFAULT 'api'`,
  `CREATE INDEX IF NOT EXISTS idx_foods_barcode ON foods(barcode)`,
];

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('fitmitflip.db');
  await migrateDb(_db);
  return _db;
}

async function migrateDb(db: SQLite.SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const currentVersion = result?.user_version ?? 0;

  for (let i = currentVersion; i < MIGRATIONS.length; i++) {
    await db.execAsync(MIGRATIONS[i]);
    // Update version after each statement so a partial run is resumable.
    await db.execAsync(`PRAGMA user_version = ${i + 1}`);
  }
}
