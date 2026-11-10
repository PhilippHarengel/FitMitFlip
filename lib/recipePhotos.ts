import { bookPhotoKey, draftPhotoKey } from './recipePhotoKey';

export type PhotoSource = { uri: string } | number;

const photos = new Map<string, PhotoSource>();

export function photoForKey(key: string | null): PhotoSource | null {
  if (!key) return null;
  return photos.get(key) ?? null;
}

export function setRecipePhoto(key: string, source: PhotoSource): void {
  photos.set(key, source);
}

export function clearRecipePhotos(): void {
  photos.clear();
}

export function bookPhoto(id: string | null | undefined): PhotoSource | null {
  return photoForKey(bookPhotoKey(id));
}

export function draftPhoto(id: number | null | undefined): PhotoSource | null {
  return photoForKey(draftPhotoKey(id));
}

export function bindBookPhotos(
  recipes: { id: string; name: string }[],
  files: Record<string, PhotoSource>,
): void {
  const used = new Set<string>();
  for (const recipe of recipes) {
    if (used.has(recipe.name)) continue;
    const file = files[recipe.name];
    const key = bookPhotoKey(recipe.id);
    if (!file || !key) continue;
    used.add(recipe.name);
    setRecipePhoto(key, file);
  }
}
