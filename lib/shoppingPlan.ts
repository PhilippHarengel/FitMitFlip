export type CookbookRecipe = {
  id: string;
  name: string;
  mahlzeiten: string[];
  kategorien: string[];
  zutaten: string;
  anleitung: string;
  kcal: number;
  protein: number;
  kohlenhydrate: number;
  fett: number;
};

export type PlanSlot = {
  ausgelassen?: boolean;
  id?: string;
  name?: string;
  kochen?: 'kochen' | 'rest';
  portionen?: number;
};

export type ShoppingLine = {
  kategorie: string;
  name: string;
  menge: number;
  einheit: string;
  checked?: boolean;
};

export type PantryLine = {
  rezept: string;
  name: string;
  menge: number | null;
  einheit: string;
  checked?: boolean;
};

export const SHOPPING_CATEGORY_ORDER = [
  'Obst und Gemüse',
  'Brot und Backwaren',
  'Kühlregal',
  'Fleisch und Wurst',
  'Fisch',
  'Tiefkühl',
  'Nudeln und Getreide',
  'Konserven',
  'Öle und Gewürze',
  'Getränke',
  'Haushalt',
  'Sonstiges',
] as const;

const CATEGORY_BY_NAME: Record<string, string> = {
  Avocado: 'Obst und Gemüse',
  Banane: 'Obst und Gemüse',
  Basilikum: 'Obst und Gemüse',
  Blattspinat: 'Obst und Gemüse',
  Brokkoli: 'Obst und Gemüse',
  Champignons: 'Obst und Gemüse',
  'Frühlingszwiebel': 'Obst und Gemüse',
  Gurke: 'Obst und Gemüse',
  Ingwer: 'Obst und Gemüse',
  Karotte: 'Obst und Gemüse',
  Kartoffeln: 'Obst und Gemüse',
  Kartoffel: 'Obst und Gemüse',
  Kirschtomaten: 'Obst und Gemüse',
  Knoblauch: 'Obst und Gemüse',
  Paprika: 'Obst und Gemüse',
  Petersilie: 'Obst und Gemüse',
  Rosenkohl: 'Obst und Gemüse',
  Rucola: 'Obst und Gemüse',
  'Süßkartoffel': 'Obst und Gemüse',
  Tomate: 'Obst und Gemüse',
  Zitrone: 'Obst und Gemüse',
  Zucchini: 'Obst und Gemüse',
  Zwiebel: 'Obst und Gemüse',
  'grüne Bohnen': 'Obst und Gemüse',
  Toast: 'Brot und Backwaren',
  Vollkornbrot: 'Brot und Backwaren',
  Tortilla: 'Brot und Backwaren',
  Brot: 'Brot und Backwaren',
  'Brötchen': 'Brot und Backwaren',
  'Bergkäse': 'Kühlregal',
  Butter: 'Kühlregal',
  Ei: 'Kühlregal',
  Eier: 'Kühlregal',
  Eigelb: 'Kühlregal',
  Feta: 'Kühlregal',
  'Frischkäse': 'Kühlregal',
  Gnocchi: 'Kühlregal',
  Gouda: 'Kühlregal',
  Hummus: 'Kühlregal',
  Joghurt: 'Kühlregal',
  Magerquark: 'Kühlregal',
  Milch: 'Kühlregal',
  Mozzarella: 'Kühlregal',
  Parmesan: 'Kühlregal',
  Sahne: 'Kühlregal',
  Schlagsahne: 'Kühlregal',
  Schinken: 'Kühlregal',
  'Spätzle': 'Kühlregal',
  Quark: 'Kühlregal',
  'Crème fraîche': 'Kühlregal',
  Bacon: 'Fleisch und Wurst',
  Hackfleisch: 'Fleisch und Wurst',
  'Hähnchenbrust': 'Fleisch und Wurst',
  'Hühnerbrust': 'Fleisch und Wurst',
  'Hähnchen': 'Fleisch und Wurst',
  Speck: 'Fleisch und Wurst',
  Putenbrust: 'Fleisch und Wurst',
  Rinderhack: 'Fleisch und Wurst',
  Wurst: 'Fleisch und Wurst',
  Lachsfilet: 'Fisch',
  Lachs: 'Fisch',
  Sardellen: 'Fisch',
  Beeren: 'Tiefkühl',
  Bandnudeln: 'Nudeln und Getreide',
  Fusilli: 'Nudeln und Getreide',
  Spaghetti: 'Nudeln und Getreide',
  Nudeln: 'Nudeln und Getreide',
  Reis: 'Nudeln und Getreide',
  Haferflocken: 'Nudeln und Getreide',
  Mehl: 'Nudeln und Getreide',
  'rote Linsen': 'Nudeln und Getreide',
  Linsen: 'Nudeln und Getreide',
  'Walnüsse': 'Nudeln und Getreide',
  Mandeln: 'Nudeln und Getreide',
  Apfelmus: 'Konserven',
  Dosentomaten: 'Konserven',
  Kidneybohnen: 'Konserven',
  Kichererbsen: 'Konserven',
  Kokosmilch: 'Konserven',
  Mais: 'Konserven',
  Oliven: 'Konserven',
  Tomatenmark: 'Konserven',
  Thunfisch: 'Konserven',
  Balsamico: 'Öle und Gewürze',
  Chiliflocken: 'Öle und Gewürze',
  Currypulver: 'Öle und Gewürze',
  Erdnussbutter: 'Öle und Gewürze',
  'Gemüsebrühe': 'Öle und Gewürze',
  Honig: 'Öle und Gewürze',
  'Kreuzkümmel': 'Öle und Gewürze',
  Muskat: 'Öle und Gewürze',
  'Olivenöl': 'Öle und Gewürze',
  Oregano: 'Öle und Gewürze',
  Paprikapulver: 'Öle und Gewürze',
  Pfeffer: 'Öle und Gewürze',
  'Rapsöl': 'Öle und Gewürze',
  Rosmarin: 'Öle und Gewürze',
  Salz: 'Öle und Gewürze',
  Senf: 'Öle und Gewürze',
  Sojasauce: 'Öle und Gewürze',
  Thymian: 'Öle und Gewürze',
  Zimt: 'Öle und Gewürze',
  Zucker: 'Öle und Gewürze',
  Zitronensaft: 'Öle und Gewürze',
  'Römersalat': 'Obst und Gemüse',
  'Dijon-Senf': 'Öle und Gewürze',
  'Worcestershire-Sauce': 'Öle und Gewürze',
  Puderzucker: 'Öle und Gewürze',
};

function shoppingNameKey(name: string): string {
  return name
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\([^)]*$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('de');
}

export function categoryForItem(name: string, existing: { name: string; kategorie: string }[] = []): string {
  const typed = shoppingNameKey(name);
  if (!typed) return 'Sonstiges';
  const fromList = existing.find((line) => shoppingNameKey(line.name) === typed);
  if (fromList?.kategorie) return fromList.kategorie;
  let best = '';
  let category = 'Sonstiges';
  for (const [known, group] of Object.entries(CATEGORY_BY_NAME)) {
    const key = shoppingNameKey(known);
    const hit = typed === key || typed.startsWith(`${key} `) || typed.endsWith(` ${key}`) || typed.includes(` ${key} `);
    if (hit && key.length > best.length) {
      best = key;
      category = group;
    }
  }
  return category;
}

export function insertShoppingLine(lines: ShoppingLine[], line: ShoppingLine): ShoppingLine[] {
  const rank = (group: string) => {
    const index = SHOPPING_CATEGORY_ORDER.indexOf(group as (typeof SHOPPING_CATEGORY_ORDER)[number]);
    return index === -1 ? SHOPPING_CATEGORY_ORDER.length : index;
  };
  const lastSame = lines.reduce((found, item, index) => (item.kategorie === line.kategorie ? index : found), -1);
  let insertAt = lines.length;
  if (lastSame >= 0) insertAt = lastSame + 1;
  else {
    const later = lines.findIndex((item) => rank(item.kategorie) > rank(line.kategorie));
    if (later >= 0) insertAt = later;
  }
  const next = [...lines];
  next.splice(insertAt, 0, line);
  return next;
}

export type PlanDay = {
  datum: string;
  wochentag: string;
  fruehstueck: PlanSlot;
  mittagessen: PlanSlot;
  abendessen: PlanSlot;
};

export type ShoppingPlan = {
  tage: PlanDay[];
  einkauf: ShoppingLine[];
  nichtLesbar: string[];
  vorrat?: PantryLine[];
  summen: {
    kcal: number;
    protein: number;
    kohlenhydrate: number;
    fett: number;
  };
};

export type PlanAbsence = { tag: string; mahlzeit: string };

export type PlanRequest = {
  action: 'planen';
  tage: number;
  startHeute: boolean;
  ausfaelle: PlanAbsence[];
  hinweis: string;
  datum: string;
  letzterPlan: ShoppingPlan | null;
};

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export const WEEKDAY_DE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] as const;
export const MEALS = ['Breakfast', 'Lunch', 'Dinner'] as const;
export const MEAL_DE = ['Frühstück', 'Mittagessen', 'Abendessen'] as const;

export function absenceToGerman(weekday: string, meal: string): PlanAbsence {
  const dayIndex = WEEKDAYS.indexOf(weekday as (typeof WEEKDAYS)[number]);
  const mealIndex = MEALS.indexOf(meal as (typeof MEALS)[number]);
  return {
    tag: dayIndex >= 0 ? WEEKDAY_DE[dayIndex] : weekday,
    mahlzeit: mealIndex >= 0 ? MEAL_DE[mealIndex] : meal,
  };
}

export function isShoppingPlan(value: unknown): value is ShoppingPlan {
  if (!value || typeof value !== 'object') return false;
  const row = value as { fehler?: unknown; einkauf?: unknown; tage?: unknown; nichtLesbar?: unknown };
  if (typeof row.fehler === 'string' && row.fehler.length > 0) return false;
  return Array.isArray(row.einkauf) && Array.isArray(row.tage) && Array.isArray(row.nichtLesbar);
}

export function planDayCount(days: number): number {
  if (!Number.isFinite(days) || days <= 0) return 7;
  return Math.round(days);
}

export function buildPlanPayload(
  form: { days: number; startToday: boolean; absences: PlanAbsence[]; note: string; date: string },
  letzterPlan: ShoppingPlan | null,
): PlanRequest {
  return {
    action: 'planen',
    tage: planDayCount(Number(form.days)),
    startHeute: form.startToday === true,
    ausfaelle: form.absences,
    hinweis: form.note.trim(),
    datum: form.date,
    letzterPlan,
  };
}

export type PlanWindowDay = {
  date: string;
  weekday: (typeof WEEKDAYS)[number];
};

const JS_WEEKDAYS: (typeof WEEKDAYS)[number][] = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

const WEEKDAY_SHORT: Record<(typeof WEEKDAYS)[number], string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};

export type SkipMap = Partial<Record<string, (typeof MEALS)[number][]>>;

function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function planWindow(anchor: string, days: number, startToday: boolean): PlanWindowDay[] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(anchor);
  if (!match) return [];
  const start = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(start.getTime())) return [];
  if (!startToday) start.setDate(start.getDate() + 1);
  return Array.from({ length: planDayCount(days) }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    return { date: isoDate(current), weekday: JS_WEEKDAYS[current.getDay()] };
  });
}

export function skipDayLabel(day: PlanWindowDay): string {
  return `${WEEKDAY_SHORT[day.weekday]} ${Number(day.date.slice(8))}`;
}

function mealsOn(skips: SkipMap, date: string): (typeof MEALS)[number][] {
  return skips[date] ?? [];
}

export function toggleSkipDay(skips: SkipMap, date: string): SkipMap {
  if (mealsOn(skips, date).length === MEALS.length) {
    const next = { ...skips };
    delete next[date];
    return next;
  }
  return { ...skips, [date]: [...MEALS] };
}

export function toggleSkipMeal(
  skips: SkipMap,
  date: string,
  meal: (typeof MEALS)[number],
): SkipMap {
  const current = new Set(mealsOn(skips, date));
  if (current.has(meal)) current.delete(meal);
  else current.add(meal);
  const list = MEALS.filter((item) => current.has(item));
  const next: SkipMap = { ...skips };
  if (list.length === 0) delete next[date];
  else next[date] = list;
  return next;
}

export function stepDayCount(value: string, delta: number): string {
  const parsed = Number(value);
  const base = Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 7;
  return String(Math.max(1, base + delta));
}

export function absencesFromSkips(windowDays: readonly PlanWindowDay[], skips: SkipMap): PlanAbsence[] {
  const seen = new Set<string>();
  const absences: PlanAbsence[] = [];
  for (const day of windowDays) {
    for (const meal of mealsOn(skips, day.date)) {
      const absence = absenceToGerman(day.weekday, meal);
      const key = `${absence.tag}\n${absence.mahlzeit}`;
      if (seen.has(key)) continue;
      seen.add(key);
      absences.push(absence);
    }
  }
  return absences;
}

export function pruneSkips(skips: SkipMap, allowed: ReadonlySet<string>): SkipMap {
  let changed = false;
  const next: SkipMap = {};
  for (const [date, meals] of Object.entries(skips)) {
    if (!allowed.has(date) || !meals || meals.length === 0) {
      changed = true;
      continue;
    }
    next[date] = meals;
  }
  return changed ? next : skips;
}

export function formatAmount(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return String(Math.round(rounded));
  return String(rounded).replace('.', ',');
}

export function slotTitle(slot: PlanSlot): string {
  if (slot.ausgelassen || !slot.name) return 'Skipped';
  if (slot.kochen === 'kochen') return `${slot.name} · Cook`;
  if (slot.kochen === 'rest') return `${slot.name} · Leftover`;
  return slot.name;
}
