export function bookPhotoKey(id: string | null | undefined): string | null {
  const trimmed = id?.trim() ?? '';
  if (!trimmed) return null;
  return `book:${trimmed}`;
}

export function draftPhotoKey(id: number | null | undefined): string | null {
  if (id == null || !Number.isFinite(id)) return null;
  return `draft:${id}`;
}
