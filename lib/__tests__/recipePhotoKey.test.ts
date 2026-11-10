import { bookPhotoKey, draftPhotoKey } from '../recipePhotoKey';

describe('recipe photo keys', () => {
  it('keeps the same raw id in separate namespaces and rejects an empty book id', () => {
    expect(bookPhotoKey('1')).toBe('book:1');
    expect(draftPhotoKey(1)).toBe('draft:1');
    expect(bookPhotoKey('1')).not.toBe(draftPhotoKey(1));
    expect(bookPhotoKey('')).toBeNull();
    expect(bookPhotoKey('   ')).toBeNull();
    expect(bookPhotoKey(null)).toBeNull();
  });
});
