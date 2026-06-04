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

const SPLIT_BY_NORM: Record<string, string> = {};
for (const sp of SPLIT_NAMES) SPLIT_BY_NORM[normalize(sp)] = sp;

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
  const lines = text.split(/\r?\n/);
  const sessions: ParsedSession[] = [];
  const warnings: string[] = [];
  let current: ParsedSession | null = null;
  let totalSets = 0;

  lines.forEach((line, idx) => {
    const ln = idx + 1;
    const trimmed = line.trim();
    if (!trimmed) return;

    // Header? "<date>: <split>"
    const headerMatch = trimmed.match(/^([^:]+):\s*(.+)$/);
    if (headerMatch && parseDate(headerMatch[1]) && line.search(/\s-\s/) === -1) {
      const date = parseDate(headerMatch[1])!;
      const splitNorm = normalize(headerMatch[2]);
      const split = SPLIT_BY_NORM[splitNorm];
      if (!split) warnings.push(`Line ${ln}: unknown split "${headerMatch[2].trim()}" — imported under that name.`);
      current = {
        date,
        split: split ?? headerMatch[2].trim(),
        splitMapped: !!split,
        exercises: [],
      };
      sessions.push(current);
      return;
    }

    // Exercise line — needs an active session.
    if (!current) {
      warnings.push(`Line ${ln}: "${trimmed}" before any dated session header — skipped.`);
      return;
    }

    // Split name/reps from weight on " - ".
    const dashIdx = trimmed.search(/\s-\s/);
    const left = dashIdx === -1 ? trimmed : trimmed.slice(0, dashIdx).trim();
    const right = dashIdx === -1 ? '' : trimmed.slice(dashIdx + 3).trim();

    // Left = "<name>  <reps comma list>"
    const lm = left.match(/^(.+?)\s+([\d][\d,\s]*)$/);
    if (!lm) {
      warnings.push(`Line ${ln}: couldn't read "${trimmed}" — skipped.`);
      return;
    }
    const rawName = lm[1].trim();
    const reps = lm[2].split(',').map(r => r.trim()).filter(r => r !== '').map(Number).filter(n => !isNaN(n));
    if (reps.length === 0) {
      warnings.push(`Line ${ln}: no sets found for "${rawName}" — skipped.`);
      return;
    }
    const { name, mapped } = mapExerciseName(rawName);
    if (!mapped) warnings.push(`Line ${ln}: "${rawName}" didn't match a template exercise — imported under that name (progression won't merge with a template exercise).`);

    current.exercises.push({ name, rawName, mapped, weightKg: parseWeight(right), reps });
    totalSets += reps.length;
  });

  return { sessions, warnings, totalSets };
}
