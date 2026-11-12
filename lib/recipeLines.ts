export type IngredientRow = {
  amount: string | null;
  name: string;
};

const UNITS = [
  'g', 'kg', 'ml', 'l', 'el', 'tl', 'stk', 'stück', 'scheibe', 'zehe', 'bund',
  'stange', 'kopf', 'prise', 'dose', 'packung', 'tasse',
];

function isUnit(word: string): boolean {
  const typed = word.toLocaleLowerCase('de');
  return UNITS.some((unit) => typed === unit || typed === `${unit}n` || typed === `${unit}en`);
}

export function ingredientRows(text: string): IngredientRow[] {
  return splitSegments(text).map(rowFor);
}

export function methodParagraphs(text: string): string[] {
  if (!/[\r\n]/.test(text)) {
    const single = text.trim();
    return single ? [single] : [];
  }
  return text.split(/\r\n|\n|\r/).map((line) => line.trim()).filter((line) => line.length > 0);
}

function splitSegments(text: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  for (const char of text) {
    if (char === '(') depth += 1;
    else if (char === ')' && depth > 0) depth -= 1;
    if (char === ';' && depth === 0) {
      const piece = current.trim();
      if (piece) parts.push(piece);
      current = '';
      continue;
    }
    current += char;
  }
  const tail = current.trim();
  if (tail) parts.push(tail);
  return parts;
}

function rowFor(segment: string): IngredientRow {
  const match = /^(\d+(?:[,.]\d+)?)(?:\s+(\S+))?([\s\S]*)$/.exec(segment);
  if (!match) return { amount: null, name: segment };
  const number = match[1];
  const word = match[2];
  const rest = match[3].trim();
  if (word && isUnit(word)) return { amount: `${number} ${word}`, name: rest };
  const name = [word, rest].filter((part) => part && part.length > 0).join(' ');
  return { amount: number, name };
}
