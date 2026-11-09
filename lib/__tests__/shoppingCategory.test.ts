import { categoryForItem, insertShoppingLine, type ShoppingLine } from '../shoppingPlan';

describe('shopping categories', () => {
  it('puts a known food in its aisle and an unknown one in Sonstiges', () => {
    expect(categoryForItem('milch')).toBe('Kühlregal');
    expect(categoryForItem('frische Milch (1,5%)')).toBe('Kühlregal');
    expect(categoryForItem('Olivenöl')).toBe('Öle und Gewürze');
    expect(categoryForItem('Hähnchenbrust mit Haut')).toBe('Fleisch und Wurst');
    expect(categoryForItem('Kartoffel')).toBe('Obst und Gemüse');
    expect(categoryForItem('Bandnudeln')).toBe('Nudeln und Getreide');
    expect(categoryForItem('Kerzen')).toBe('Sonstiges');
  });

  it('keeps a name already on the list in that category and groups the new line', () => {
    const lines: ShoppingLine[] = [
      { kategorie: 'Fleisch und Wurst', name: 'Hähnchenbrust', menge: 400, einheit: 'g' },
    ];
    expect(categoryForItem('Hähnchenbrust', [{ name: 'Hähnchenbrust', kategorie: 'Haushalt' }])).toBe('Haushalt');
    const next = insertShoppingLine(lines, { kategorie: 'Kühlregal', name: 'Milch', menge: 1, einheit: 'l' });
    expect(next.map((line) => line.name)).toEqual(['Milch', 'Hähnchenbrust']);
  });
});
