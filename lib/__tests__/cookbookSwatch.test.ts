import { heroSwatch } from '../cookbookSwatch';

describe('cookbook hero swatch', () => {
  it('returns the same color for the same recipe id', () => {
    const id = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    expect(heroSwatch(id)).toBe(heroSwatch(id));
    expect(heroSwatch(id)).toMatch(/^#[0-9a-f]{6}$/);
  });
});
