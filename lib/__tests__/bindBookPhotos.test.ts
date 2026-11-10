import { bindBookPhotos, bookPhoto, clearRecipePhotos } from '../recipePhotos';

const files = { Carbonara: { uri: 'carbonara' } };

beforeEach(() => clearRecipePhotos());

describe('bindBookPhotos', () => {
  it('attaches a file to the first id for a name and leaves an unknown name blank', () => {
    bindBookPhotos(
      [
        { id: 'aaa', name: 'Carbonara' },
        { id: 'bbb', name: 'Carbonara' },
        { id: 'ccc', name: 'Unbekannt' },
      ],
      files,
    );
    expect(bookPhoto('aaa')).toEqual({ uri: 'carbonara' });
    expect(bookPhoto('bbb')).toBeNull();
    expect(bookPhoto('ccc')).toBeNull();
    expect(bookPhoto('')).toBeNull();
  });
});