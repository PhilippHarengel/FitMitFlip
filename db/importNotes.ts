import { SPLITS, SPLIT_NAMES } from './workoutTemplates';

// Parses pasted training notes into sessions ready for DB insert.
// Two formats are auto-detected by the first non-empty line:
//
// A) Session blocks — first line has ONE date:
//      2026-05-01 upper body            (colon after date optional)
//      pull ups  8, 8, 6 - bodyweight
//      incline dumbbell press  10,10,10 - 22kg
//
// B) Transposed table — first line has 2+ dates (a header row), tab-separated:
//      Legs <tab> 2026-06-03 <tab> 2026-05-03 <tab> ...
//      leg curls <tab> 12,12,12 - 55kg <tab> 14,14,14 - 65kg <tab> ...
//      leg press <tab> / <tab> / <tab> 20 - 120kg, 16,14 - 180kg <tab> ...
//    Columns = sessions (one per date). "/" or empty = skipped that session.
//
// Weights: 'bodyweight'/'bw' → null; '22kg' → 22; '40kg/2' → 40 ('/N' ignored).
// A cell may hold several "reps - weight" groups (warmup + working): each group's
// reps become sets at that group's weight, so set weights can differ within a day.

export type ParsedSet = { reps: number; weightKg: number | null };

export type ParsedExercise = {
  name: string;        // mapped to a template exercise name when possible
  rawName: string;     // exactly as written in the notes
  mapped: boolean;     // did it match a known template exercise?
  sets: ParsedSet[];   // one entry per set, each with its own weight
};

export type ParsedSession = {
  date: string;        // 'YYYY-MM-DD'
  split: string;
  splitMapped: boolean;
  exercises: ParsedExercise[];
};

export type ParseResult = {
  sessions: ParsedSession[];
  warnings: string[];
  totalSets: number;
};

// ─── Lookup tables ─────────────────────────────────────────────────────────────

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const TEMPLATE_BY_NORM: Record<string, string> = {};
for (const ex of Object.values(SPLITS).flat()) TEMPLATE_BY_NORM[normalize(ex)] = ex;

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
  'standing calf raises': 'Standing Calf Raises',
  'bulgarian split squat': 'Bulgarian Split Squats',
  'bizeps curls': 'Cable Biceps Curls (backhand)',
  'backhand cable bizeps curls': 'Cable Biceps Curls (backhand)',
};

// Split-label aliases (header cell / block header) → canonical split name.
const SPLIT_ALIASES: Record<string, string> = {
  'legs': 'Leg Day',
  'leg': 'Leg Day',
  'leg day': 'Leg Day',
  'upper': 'Upper Body',
  'upper body': 'Upper Body',
  'full': 'Full Body',
  'full body': 'Full Body',
};
for (const sp of SPLIT_NAMES) SPLIT_ALIASES[normalize(sp)] = sp;

function mapExerciseName(raw: string): { name: string; mapped: boolean } {
  const n = normalize(raw);
  if (TEMPLATE_BY_NORM[n]) return { name: TEMPLATE_BY_NORM[n], mapped: true };
  if (ALIASES[n]) return { name: ALIASES[n], mapped: true };
  return { name: raw.trim().replace(/\s+/g, ' '), mapped: false };
}

function mapSplit(raw: string): { split: string; mapped: boolean } {
  const n = normalize(raw);
  if (SPLIT_ALIASES[n]) return { split: SPLIT_ALIASES[n], mapped: true };
  return { split: raw.trim() || 'Workout', mapped: false };
}

function parseDate(raw: string): string | null {
  const t = raw.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})$/);
  if (m) {
    const d = m[1].padStart(2, '0');
    const mo = m[2].padStart(2, '0');
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${mo}-${d}`;
  }
  return null;
}

function parseWeight(raw: string): number | null {
  const t = raw.trim().toLowerCase();
  if (!t || t === 'bodyweight' || t === 'bw' || t === 'body weight') return null;
  const kg = t.match(/(\d+(?:\.\d+)?)\s*kg/);   // first kg value; '/N' ignored
  if (kg) return parseFloat(kg[1]);
  const n = t.match(/(\d+(?:\.\d+)?)/);
  return n ? parseFloat(n[1]) : null;
}

// Scan a region for "reps,reps - weight" groups → flat list of sets.
// Each group's reps become sets at that group's weight (warmup + working sets).
function parseSets(region: string): ParsedSet[] {
  const re = /((?:\d+\s*,\s*)*\d+)\s*,?\s*-\s*(bodyweight|body weight|bw|\d+(?:\.\d+)?\s*kg(?:\s*\/\s*\d+)?)/gi;
  const sets: ParsedSet[] = [];
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(region)) !== null) {
    const w = parseWeight(m[2]);
    const reps = m[1].split(',').map(r => r.trim()).filter(r => r !== '').map(Number).filter(n => !isNaN(n));
    for (const r of reps) sets.push({ reps: r, weightKg: w });
  }
  return sets;
}

const DATE_RE = /(\d{4}-\d{2}-\d{2}|\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4})/g;
function datesIn(line: string): string[] {
  return [...line.matchAll(DATE_RE)].map(m => m[1]);
}

// ─── Format A: session blocks ───────────────────────────────────────────────────

function parseSessionBlocks(text: string): ParseResult {
  const sessions: ParsedSession[] = [];
  const warnings: string[] = [];
  let totalSets = 0;

  const flat = text.replace(/\s+/g, ' ').trim();
  const dateMatches = [...flat.matchAll(DATE_RE)];
  if (dateMatches.length === 0) {
    warnings.push('No dates found. Each session needs a date like 2026-05-01.');
    return { sessions, warnings, totalSets };
  }

  const exRe = /([A-Za-z][A-Za-z\s\-()]*?)\s*((?:\d+\s*,\s*)*\d+)\s*,?\s*-\s*(bodyweight|body weight|bw|\d+(?:\.\d+)?\s*kg(?:\s*\/\s*\d+)?)/gi;

  for (let i = 0; i < dateMatches.length; i++) {
    const m = dateMatches[i];
    const start = m.index!;
    const end = i + 1 < dateMatches.length ? dateMatches[i + 1].index! : flat.length;
    const date = parseDate(m[1]);
    if (!date) { warnings.push(`Couldn't read date "${m[1]}" — session skipped.`); continue; }

    let chunk = flat.slice(start + m[0].length, end).replace(/^\s*:\s*/, '').trim();

    let split = 'Workout', splitMapped = false, exText = chunk, bestIdx = -1, bestLen = 0, bestName = '';
    for (const sp of SPLIT_NAMES) {
      const idx = chunk.toLowerCase().indexOf(sp.toLowerCase());
      if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) { bestIdx = idx; bestLen = sp.length; bestName = sp; }
    }
    if (bestIdx !== -1) { split = bestName; splitMapped = true; exText = chunk.slice(bestIdx + bestLen).trim(); }
    else warnings.push(`Session ${date}: couldn't identify the split — imported under "Workout".`);

    const exercises: ParsedExercise[] = [];
    let xm: RegExpExecArray | null;
    exRe.lastIndex = 0;
    while ((xm = exRe.exec(exText)) !== null) {
      const rawName = xm[1].trim();
      const w = parseWeight(xm[3]);
      const reps = xm[2].split(',').map(r => r.trim()).filter(r => r !== '').map(Number).filter(n => !isNaN(n));
      if (!rawName || reps.length === 0) continue;
      const { name, mapped } = mapExerciseName(rawName);
      if (!mapped) warnings.push(`Session ${date}: "${rawName}" didn't match a template exercise — imported under that name.`);
      exercises.push({ name, rawName, mapped, sets: reps.map(r => ({ reps: r, weightKg: w })) });
      totalSets += reps.length;
    }
    if (exercises.length === 0) warnings.push(`Session ${date}: no exercises could be read.`);
    sessions.push({ date, split, splitMapped, exercises });
  }
  return { sessions, warnings, totalSets };
}

// ─── Format B: transposed table ──────────────────────────────────────────────────

// Split a table row into columns. Prefer tabs; if the paste lost them, fall back
// to 2+ spaces — but rejoin leading non-cell tokens so multi-word names survive
// (e.g. "standing calve  raises" → one name, not two columns). A cell starts with
// a digit, a date, or "/".
function splitCols(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map(c => c.trim());
  const parts = line.split(/\s{2,}/).map(p => p.trim()).filter(p => p !== '');
  if (parts.length <= 1) return parts;
  const isCell = (p: string) => /^[\d/]/.test(p);
  let name = parts[0];
  let i = 1;
  while (i < parts.length && !isCell(parts[i])) { name += ' ' + parts[i]; i++; }
  return [name, ...parts.slice(i)];
}

function parseTransposed(text: string): ParseResult {
  const warnings: string[] = [];
  let totalSets = 0;
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  const header = splitCols(lines[0]);

  if (header.length < 2) {
    warnings.push('Detected a multi-date header but columns are not tab-separated. Keep the table columns (tabs) when pasting.');
    return { sessions: [], warnings, totalSets };
  }

  const { split, mapped: splitMapped } = mapSplit(header[0]);
  if (!splitMapped) warnings.push(`Header "${header[0].trim()}" isn't a known split — imported under "${split}".`);

  // One session per column with a valid date.
  const dates = header.slice(1).map(c => parseDate(c.trim()));
  const colSessions: (ParsedSession | null)[] = dates.map((d, i) => {
    if (!d) { if (header[i + 1]?.trim()) warnings.push(`Column ${i + 2} header "${header[i + 1].trim()}" isn't a date — column skipped.`); return null; }
    return { date: d, split, splitMapped, exercises: [] };
  });

  for (let r = 1; r < lines.length; r++) {
    const cells = splitCols(lines[r]);
    const rawName = cells[0]?.trim();
    if (!rawName) continue;
    const { name, mapped } = mapExerciseName(rawName);
    let unmappedWarned = false;

    for (let c = 0; c < dates.length; c++) {
      const sess = colSessions[c];
      if (!sess) continue;
      const cell = (cells[c + 1] ?? '').trim();
      if (cell === '' || cell === '/') continue;   // skipped that session
      const sets = parseSets(cell);
      if (sets.length === 0) { warnings.push(`${sess.date} · "${rawName}": couldn't read "${cell}" — skipped.`); continue; }
      if (!mapped && !unmappedWarned) { warnings.push(`"${rawName}" didn't match a template exercise — imported under that name.`); unmappedWarned = true; }
      sess.exercises.push({ name, rawName, mapped, sets });
      totalSets += sets.length;
    }
  }

  const sessions = colSessions.filter((s): s is ParsedSession => s != null && s.exercises.length > 0);
  return { sessions, warnings, totalSets };
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────────

export function parseNotes(text: string): ParseResult {
  const firstLine = text.split(/\r?\n/).find(l => l.trim() !== '') ?? '';
  return datesIn(firstLine).length >= 2 ? parseTransposed(text) : parseSessionBlocks(text);
}
