export const COOKBOOK_SWATCHES = [
  '#e2b15a', '#7ea84a', '#e09a2b', '#c9844a', '#c4a574',
  '#c4652d', '#d4a017', '#3f8f5b', '#d4724a', '#c4504a',
] as const;

export function swatchAt(index: number): string {
  const count = COOKBOOK_SWATCHES.length;
  const wrapped = ((index % count) + count) % count;
  return COOKBOOK_SWATCHES[wrapped];
}

export function heroSwatch(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (Math.imul(hash, 31) + id.charCodeAt(i)) >>> 0;
  }
  return COOKBOOK_SWATCHES[hash % COOKBOOK_SWATCHES.length];
}
