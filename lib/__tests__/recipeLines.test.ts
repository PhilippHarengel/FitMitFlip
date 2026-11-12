import { ingredientRows, methodParagraphs } from '../recipeLines';

describe('recipe lines', () => {
  it('splits ingredients on semicolons and keeps parenthetical notes', () => {
    expect(ingredientRows('50 g Haferflocken; 200 ml Milch')).toEqual([
      { amount: '50 g', name: 'Haferflocken' },
      { amount: '200 ml', name: 'Milch' },
    ]);
    expect(ingredientRows('2 Scheiben Toast (Croutons; gewürfelt); 2 Eier')).toEqual([
      { amount: '2 Scheiben', name: 'Toast (Croutons; gewürfelt)' },
      { amount: '2', name: 'Eier' },
    ]);
    expect(ingredientRows('0,5 TL Dijon-Senf (2,5 g)')).toEqual([
      { amount: '0,5 TL', name: 'Dijon-Senf (2,5 g)' },
    ]);
    expect(ingredientRows('2 große Zwiebeln')).toEqual([
      { amount: '2', name: 'große Zwiebeln' },
    ]);
    expect(ingredientRows('Salz')).toEqual([{ amount: null, name: 'Salz' }]);
    expect(ingredientRows('50 g Haferflocken;')).toEqual([
      { amount: '50 g', name: 'Haferflocken' },
    ]);
    expect(ingredientRows('2 Zehen Knoblauch')).toEqual([
      { amount: '2 Zehen', name: 'Knoblauch' },
    ]);
  });

  it('keeps the method as one paragraph unless the book used line breaks', () => {
    expect(methodParagraphs('Hafer kochen. Banane darauf.')).toEqual([
      'Hafer kochen. Banane darauf.',
    ]);
    expect(methodParagraphs('Hähnchen anbraten.\nReis kochen.')).toEqual([
      'Hähnchen anbraten.',
      'Reis kochen.',
    ]);
    expect(methodParagraphs('Hähnchen anbraten.\n\nReis kochen.\n')).toEqual([
      'Hähnchen anbraten.',
      'Reis kochen.',
    ]);
    expect(methodParagraphs('Hähnchen anbraten.\rReis kochen.')).toEqual([
      'Hähnchen anbraten.',
      'Reis kochen.',
    ]);
  });
});
