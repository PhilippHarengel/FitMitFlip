import { SPLITS, SPLIT_NAMES } from './workoutTemplates';

// Parses pasted training notes into sessions ready for DB insert.
//
// Expected format (one session per header, blank lines optional):
//   2026-05-01: upper body
//   pull ups            8, 8, 6 - bodyweight
//   incline dumbbell press   10, 10, 10 - 22kg
//   ...
//
// Rules:
// - Header line:  <date>: <split name>   (date = YYYY-MM-DD or DD.MM.YYYY)
// - Exercise line: <name> <reps,reps,...> - <weight>
//   · reps: comma list; trailing/empty entries are dropped (a missed set)
//   · weight: 'bodyweight'/'bw' → null; '22kg', '40kg/2' → 22, 40 ('/N' ignored)
// - One weight per exercise applies to all its sets.

export type ParsedExercise = {
  name: string;        // mapped to a template exercise name when possible
  rawName: string;     // exactly as written in the notes
  mapped: boolean;     // did it match a known template exercise?
  weightKg: number | null;
  reps: number[];      // one entry per set
};

export type ParsedSession = {
  date: string;        // 'YYYY-MM-DD'
  split: string;       // mapped split ('Upper Body' / 'Leg Day' / 'Full Body') or raw
  splitMapped: boolean;
  exercises: ParsedExercise[];
};

export type ParseResult = {
  sessions: ParsedSession[];
  warnings: string[];
  totalSets: number;
};

// ─── Lookup tables ─────────────────────────────────────────────────────────────

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Every template exercise, keyed by its normalized form → canonical name.
const TEMPLATE_BY_NORM: Record<string, string> = {};
for (const ex of Object.values(SPLITS).flat()) {
  TEMPLATE_BY_NORM[normalize(ex)] = ex;
}

// Hand aliases for the user's note shorthands → canonical template names.
const ALIASES: Record<string, string> = {
  'pull ups': 'Pull-ups (max reps)',
  'pullups': 'Pull-ups (max reps)',
  'trapez': 'Rows (Trapez)',
  'rows trapez': 'Rows (Trapez)',
  'side delts cable pulls': 'Side Delt Cable',
  'side delt cable pulls': 'Side Delt Cable',
  'side delts cable': 'Side Delt Cable',
  'upper chest cable flys': 'Upper Chest Cable Fly',
  'upper chest cable fly': 'Upper Chest Cable Fly',
  'chest flys': 'Chest Fly',
  'calve raises': 'Standing Calf Raises',
  'standing calve raises': 'Standing Calf Raises',
  'bulgarian split squat': 'Bulgarian Split Squats',
  'bizeps curls': 'Cable Biceps Curls (backhand)',
  'backhand cable bizeps curls': 'Cable Biceps Curls (backhand)',
};

function mapExerciseName(raw: string): { name: string; mapped: boolean } {
  const n = normalize(raw);
  if (TEMPLATE_BY_NORM[n]) return { name: TEMPLATE_BY_NORM[n], mapped: true };
  if (ALIASES[n]) return { name: ALIASES[n], mapped: true };
  // Title-case the raw name as a fallback so it still imports cleanly.
  const titled = raw.trim().replace(/\s+/g, ' ');
  return { name: titled, mapped: false };
}

function parseDate(raw: string): string | null {
  const t = raw.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);          // YYYY-MM-DD
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})$/); // DD.MM.YYYY / DD/MM/YY
  if (m) {
    const d = m[1].padStart(2, '0');
    const mo = m[2].padStart(2, '0');
    let y = m[3];
    if (y.length === 2) y = `20${y}`;
    return `${y}-${mo}-${d}`;
  }
  return null;
}

function parseWeight(raw: string): number | null {
  const t = raw.trim().toLowerCase();
  if (!t || t === 'bodyweight' || t === 'bw' || t === 'body weight') return null;
  const m = t.match(/(\d+(?:\.\d+)?)\s*kg/);  // first kg value; '/2' ignored
  if (m) return parseFloat(m[1]);
  const n = t.match(/(\d+(?:\.\d+)?)/);        // bare number fallback
  return n ? parseFloat(n[1]) : null;
}

// ─── Main parser ───────────────────────────────────────────────────────────────

export function parseNotes(text: string): ParseResult {
  const sessions: ParsedSession[] = [];
  const warnings: string[] = [];
  let totalSets = 0;

  // Notes-app exports collapse spaces and wrap lines unpredictably, so flatten
  // everything to one string. Sessions are delimited by dates, exercises by the
  // reps+weight pattern — neither depends on the original line breaks.
  const flat = text.replace(/\s+/g, ' ').trim();
  if (!flat) return { sessions, warnings, totalSets };

  // Find each session's start by its date (colon after the date is optional).
  const dateRe = /(\d{4}-\d{2}-\d{2}|\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4})/g;
  const dateMatches = [...flat.matchAll(dateRe)];
  if (dateMatches.length === 0) {
    warnings.push('No dates found. Each session must include a date like 2026-05-01 (a colon after it is optional).');
    return { sessions, warnings, totalSets };
  }

  // One exercise = name, then a comma-list of reps, then " - " and a weight.
  const exRe = /([A-Za-z][A-Za-z\s\-()]*?)\s*((?:\d+\s*,\s*)*\d+)\s*,?\s*-\s*(bodyweight|body weight|bw|\d+(?:\.\d+)?\s*kg(?:\s*\/\s*\d+)?)/gi;

  for (let i = 0; i < dateMatches.length; i++) {
    const m = dateMatches[i];
    const start = m.index!;
    const end = i + 1 < dateMatches.length ? dateMatches[i + 1].index! : flat.length;
    const date = parseDate(m[1]);
    if (!date) { warnings.push(`Couldn't read date "${m[1]}" — session skipped.`); continue; }

    // Text after the date, up to the next date, with an optional ":" stripped.
    let chunk = flat.slice(start + m[0].length, end).replace(/^\s*:\s*/, '').trim();

    // Split = first known split phrase; exercises = everything after it.
    let split = 'Workout';
    let splitMapped = false;
    let exText = chunk;
    let bestIdx = -1, bestLen = 0, bestName = '';
    for (const sp of SPLIT_NAMES) {
      const idx = chunk.toLowerCase().indexOf(sp.toLowerCase());
      if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) { bestIdx = idx; bestLen = sp.length; bestName = sp; }
    }
    if (bestIdx !== -1) {
      split = bestName; splitMapped = true; exText = chunk.slice(bestIdx + bestLen).trim();
    } else {
      warnings.push(`Session ${date}: couldn't identify the split (expected Upper Body / Leg Day / Full Body) — imported under "Workout".`);
    }

    const exercises: ParsedExercise[] = [];
    let xm: RegExpExecArray | null;
    exRe.lastIndex = 0;
    while ((xm = exRe.exec(exText)) !== null) {
      const rawName = xm[1].trim();
      const reps = xm[2].split(',').map(r => r.trim()).filter(r => r !== '').map(Number).filter(n => !isNaN(n));
      if (!rawName || reps.length === 0) continue;
      const { name, mapped } = mapExerciseName(rawName);
      if (!mapped) warnings.push(`Session ${date}: "${rawName}" didn't match a template exercise — imported under that name (progression won't merge with a template exercise).`);
      exercises.push({ name, rawName, mapped, weightKg: parseWeight(xm[3]), reps });
      totalSets += reps.length;
    }
    if (exercises.length === 0) warnings.push(`Session ${date}: no exercises could be read.`);

    sessions.push({ date, split, splitMapped, exercises });
  }

  return { sessions, warnings, totalSets };
}
