import { DatabaseSync } from 'node:sqlite';
import {
  createRecipeDraft,
  eatRecipePortion,
  getDailyMacros,
  getShoppingPlan,
  saveShoppingPlan,
  undoRecipePortion,
  updateRecipeDraft,
} from '../queries';
import { commitPlanResult, planRequestFromStored } from '../../lib/planRequest';
import type { ShoppingPlan } from '../../lib/shoppingPlan';

type RawDb = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    get: (...params: unknown[]) => unknown;
    all: (...params: unknown[]) => unknown[];
    run: (...params: unknown[]) => { lastInsertRowid: number | bigint; changes: number | bigint };
  };
};

jest.mock('../db', () => {
  const actual = jest.requireActual('../db') as {
    MIGRATIONS: string[];
    FOOD_SHOPPING_MIGRATIONS: string[];
  };
  const { DatabaseSync: Sqlite } = require('node:sqlite') as { DatabaseSync: new (path: string) => RawDb };
  const raw = new Sqlite(':memory:');
  const added = actual.FOOD_SHOPPING_MIGRATIONS;
  const previous = actual.MIGRATIONS.slice(0, actual.MIGRATIONS.length - added.length);
  for (const sql of previous) raw.exec(sql);
  raw.exec(
    `INSERT INTO foods (name, cached_at, kcal_per_100g, protein_g, carbs_g, fat_g) VALUES ('Alt', '2020-01-01', 50, 5, 5, 5)`,
  );
  raw.exec(`INSERT INTO food_log (date, food_id, serving_g) VALUES ('2026-01-01', 1, 80)`);
  for (const sql of added) raw.exec(sql);
  (globalThis as { __foodRaw?: RawDb }).__foodRaw = raw;
  return {
    getDb: async () => ({
      async execAsync(sql: string) {
        raw.exec(sql);
      },
      async getFirstAsync(sql: string, params: unknown[] = []) {
        return raw.prepare(sql).get(...params) ?? null;
      },
      async getAllAsync(sql: string, params: unknown[] = []) {
        return raw.prepare(sql).all(...params);
      },
      async runAsync(sql: string, params: unknown[] = []) {
        const result = raw.prepare(sql).run(...params);
        return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
      },
      async withTransactionAsync(fn: () => Promise<void>) {
        raw.exec('BEGIN');
        try {
          await fn();
          raw.exec('COMMIT');
        } catch (error) {
          raw.exec('ROLLBACK');
          throw error;
        }
      },
    }),
  };
});

function raw(): RawDb {
  return (globalThis as unknown as { __foodRaw: RawDb }).__foodRaw;
}

const portion = { id: 'recipe-1', name: 'Haferporridge', kcal: 400, protein: 20, carbs: 50, fat: 10 };

const storedPlan: ShoppingPlan = {
  tage: [
    {
      datum: '2026-11-09',
      wochentag: 'Montag',
      fruehstueck: { id: 'a', name: 'Haferporridge' },
      mittagessen: { ausgelassen: true },
      abendessen: { ausgelassen: true },
    },
  ],
  einkauf: [{ kategorie: 'Trockenware', name: 'Haferflocken', menge: 50, einheit: 'g' }],
  nichtLesbar: [],
  summen: { kcal: 400, protein: 20, kohlenhydrate: 50, fett: 10 },
};

describe('food shopping migration', () => {
  it('runs the new statements on an existing schema and keeps old log rows readable', () => {
    const row = raw().prepare(
      'SELECT date, serving_g, recipe_id FROM food_log WHERE date = ?',
    ).get('2026-01-01') as { date: string; serving_g: number; recipe_id: string | null };
    expect(row).toEqual({ date: '2026-01-01', serving_g: 80, recipe_id: null });
    expect(raw().prepare(`SELECT name FROM sqlite_master WHERE name = 'recipe_drafts'`).get()).toBeTruthy();
    expect(raw().prepare(`SELECT name FROM sqlite_master WHERE name = 'shopping_plans'`).get()).toBeTruthy();
  });
});

describe('recipe portions', () => {
  it('stores one portion for today, does not double it, and undo removes only today', async () => {
    await eatRecipePortion(portion, '2026-11-08');
    await eatRecipePortion(portion, '2026-11-08');
    expect(await getDailyMacros('2026-11-08')).toEqual({
      kcal: 400,
      protein_g: 20,
      carbs_g: 50,
      fat_g: 10,
    });
    const todayRows = raw().prepare(
      'SELECT serving_g, recipe_id FROM food_log WHERE date = ? AND recipe_id = ?',
    ).all('2026-11-08', 'recipe-1') as { serving_g: number; recipe_id: string }[];
    expect(todayRows).toEqual([{ serving_g: 100, recipe_id: 'recipe-1' }]);

    await eatRecipePortion(portion, '2026-11-07');
    await undoRecipePortion('recipe-1', '2026-11-08');
    expect(await getDailyMacros('2026-11-08')).toEqual({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
    expect(await getDailyMacros('2026-11-07')).toEqual({
      kcal: 400,
      protein_g: 20,
      carbs_g: 50,
      fat_g: 10,
    });
    const old = raw().prepare('SELECT serving_g, recipe_id FROM food_log WHERE date = ?').get('2026-01-01') as {
      serving_g: number;
      recipe_id: string | null;
    };
    expect(old).toEqual({ serving_g: 80, recipe_id: null });
  });
});

describe('drafts and the stored plan', () => {
  it('keeps a draft out of the plan request and does not overwrite a plan on failure', async () => {
    await createRecipeDraft({ name: 'Geheimsuppe', ingredients: '1 g Salz', instructions: 'Rühren' });
    await updateRecipeDraft(1, { name: 'Geheimsuppe', ingredients: '2 g Salz', instructions: 'Rühren' });
    await saveShoppingPlan(storedPlan);
    const payload = await planRequestFromStored({
      days: 5,
      startToday: false,
      absences: [{ tag: 'Mittwoch', mahlzeit: 'Abendessen' }],
      note: 'wenig Zwiebeln',
      date: '2026-11-08',
    });
    const json = JSON.stringify(payload);
    expect(json).not.toContain('Geheimsuppe');
    expect(json).toContain('Haferporridge');
    expect(payload.datum).toBe('2026-11-08');
    expect(payload.ausfaelle).toEqual([{ tag: 'Mittwoch', mahlzeit: 'Abendessen' }]);
    const before = await getShoppingPlan();
    await commitPlanResult({ fehler: 'Unbekannte Rezept-ID' });
    expect(await getShoppingPlan()).toEqual(before);
  });
});
