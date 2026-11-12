import React, { useEffect, useState } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Image, Linking, Text, TextInput } from 'react-native';
import { bookPhotoKey, draftPhotoKey } from '../../lib/recipePhotoKey';
import { clearRecipePhotos, setRecipePhoto } from '../../lib/recipePhotos';
import { loadCookbook, requestPlan } from '../../api/wochenplan';
import FoodScreen from '../FoodScreen';
import RecipeScreen from '../RecipeScreen';
import { FoodSectionProvider } from '../foodSection';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('expo-symbols', () => ({
  SymbolView: () => null,
}));

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  const nav = {
    route: { key: 'food', name: 'FoodMain', params: {} as Record<string, unknown> },
    listeners: new Set<() => void>(),
    navigate(name: string, params?: Record<string, unknown>) {
      this.route = { key: name, name, params: params ?? {} };
      this.listeners.forEach((listener) => listener());
    },
    goBack() {
      this.route = { key: 'food', name: 'FoodMain', params: {} };
      this.listeners.forEach((listener) => listener());
    },
  };
  (globalThis as { __foodNav?: typeof nav }).__foodNav = nav;
  return {
    useNavigation: () => nav,
    useRoute: () => nav.route,
    useFocusEffect: (effect: () => void | (() => void)) => {
      React.useEffect(() => effect(), [effect]);
    },
  };
});

jest.mock('../../api/wochenplan', () => ({
  loadCookbook: jest.fn(),
  requestPlan: jest.fn(),
  wochenplanConfig: () => ({ url: 'https://wochenplan-essen-plan.philipp-harengel.workers.dev', secret: 'hook' }),
}));

jest.mock('../../db/queries', () => {
  const state = {
    drafts: [] as { id: number; name: string; ingredients: string; instructions: string; video: string; confirmed: number }[],
    plan: null as unknown,
    eaten: new Set<string>(),
    opinions: [] as { recipeId: string; name: string; liked: boolean }[],
    videos: {} as Record<string, string>,
  };
  (globalThis as { __foodState?: typeof state }).__foodState = state;
  return {
    today: () => '2026-11-08',
    listRecipeDrafts: async () => state.drafts.map((draft) => ({ ...draft })),
    getRecipeDraft: async (id: number) => state.drafts.find((draft) => draft.id === id) ?? null,
    createRecipeDraft: async (draft: { name: string; ingredients: string; instructions: string; video?: string; confirmed?: number }) => {
      const row = {
        id: state.drafts.length + 1,
        name: draft.name,
        ingredients: draft.ingredients,
        instructions: draft.instructions,
        video: draft.video ?? '',
        confirmed: draft.confirmed ? 1 : 0,
      };
      state.drafts.push(row);
      return row.id;
    },
    updateRecipeDraft: async (id: number, draft: { name: string; ingredients: string; instructions: string; video?: string; confirmed?: number }) => {
      const row = state.drafts.find((item) => item.id === id);
      if (row) {
        row.name = draft.name;
        row.ingredients = draft.ingredients;
        row.instructions = draft.instructions;
        row.video = draft.video ?? '';
        row.confirmed = draft.confirmed ? 1 : 0;
      }
    },
    getRecipeVideo: async (id: string) => state.videos[id] ?? '',
    saveRecipeVideo: async (id: string, url: string) => {
      const trimmed = url.trim();
      if (!trimmed) delete state.videos[id];
      else state.videos[id] = trimmed;
    },
    deleteRecipeDraft: async (id: number) => {
      state.drafts = state.drafts.filter((draft) => draft.id !== id);
    },
    getShoppingPlan: async () => state.plan,
    saveShoppingPlan: async (plan: unknown) => {
      state.plan = plan;
    },
    listRecipeOpinions: async () => state.opinions.map((row) => ({ ...row })),
    setRecipeOpinion: async (recipeId: string, name: string, liked: boolean) => {
      state.opinions = state.opinions.filter((row) => row.recipeId !== recipeId);
      state.opinions.push({ recipeId, name, liked });
    },
    isRecipeEaten: async (id: string) => state.eaten.has(id),
    eatRecipePortion: async (recipe: { id: string }) => {
      state.eaten.add(recipe.id);
    },
    undoRecipePortion: async (id: string) => {
      state.eaten.delete(id);
    },
  };
});

const porridge = {
  id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  name: 'Haferporridge',
  mahlzeiten: ['Frühstück'],
  kategorien: [],
  zutaten: '50 g Haferflocken; 200 ml Milch',
  anleitung: 'Hafer kochen.',
  kcal: 400,
  protein: 20,
  kohlenhydrate: 50,
  fett: 10,
};

const chicken = {
  id: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  name: 'Hähnchen Reis',
  mahlzeiten: ['Mittagessen'],
  kategorien: ['große Mahlzeit'],
  zutaten: '200 g Hähnchenbrust',
  anleitung: 'Reis kochen.',
  kcal: 700,
  protein: 50,
  kohlenhydrate: 60,
  fett: 20,
};

const successPlan = {
  tage: [
    {
      datum: '2026-11-09',
      wochentag: 'Montag',
      fruehstueck: { ausgelassen: true },
      mittagessen: { id: chicken.id, name: chicken.name, kochen: 'kochen', portionen: 2 },
      abendessen: { id: 'cccccccccccccccccccccccccccccccc', name: 'Toast Avocado', kochen: 'rest' },
    },
  ],
  einkauf: [{ kategorie: 'Fleisch und Wurst', name: 'Hähnchenbrust', menge: 400, einheit: 'g' }],
  nichtLesbar: ['Umrechnung: 1 EL Puderzucker'],
  summen: { kcal: 700, protein: 50, kohlenhydrate: 60, fett: 20 },
};

type FoodState = {
  drafts: { id: number; name: string; ingredients: string; instructions: string; video: string; confirmed: number }[];
  plan: unknown;
  eaten: Set<string>;
  opinions: { recipeId: string; name: string; liked: boolean }[];
  videos: Record<string, string>;
};

function state(): FoodState {
  return (globalThis as unknown as { __foodState: FoodState }).__foodState;
}

function nav() {
  return (globalThis as unknown as { __foodNav: { route: { name: string; params: Record<string, unknown> }; listeners: Set<() => void> } }).__foodNav;
}

function flatten(children: unknown): string {
  if (children == null || typeof children === 'boolean') return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flatten).join('');
  return '';
}

function allText(renderer: TestRenderer.ReactTestRenderer) {
  return renderer.root.findAllByType(Text).map((node) => flatten(node.props.children)).join('\n');
}

function photoUris(renderer: TestRenderer.ReactTestRenderer) {
  const uris: string[] = [];
  for (const node of renderer.root.findAll((item) => item.props?.testID === 'recipe-photo')) {
    const uri = node.props.source?.uri;
    if (typeof uri === 'string' && !uris.includes(uri)) uris.push(uri);
  }
  return uris;
}

function podTitles(renderer: TestRenderer.ReactTestRenderer, testID: string) {
  const titles: string[] = [];
  for (const node of renderer.root.findAll((item) => item.props?.testID === testID && typeof item.props.onPress === 'function')) {
    if (node.parent?.props?.testID === testID) continue;
    const title = flatten(node.findAllByType(Text)[0]?.props.children);
    if (title && !titles.includes(title)) titles.push(title);
  }
  return titles;
}

function pressLabel(renderer: TestRenderer.ReactTestRenderer, label: string) {
  const text = renderer.root.findAllByType(Text).find((node) => flatten(node.props.children) === label);
  if (!text) throw new Error(`missing ${label}\n${allText(renderer)}`);
  let node: TestRenderer.ReactTestInstance | null = text;
  while (node && typeof node.props?.onPress !== 'function') node = node.parent;
  if (!node) throw new Error(`no press for ${label}`);
  return node.props.onPress();
}

async function settle() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function press(renderer: TestRenderer.ReactTestRenderer, label: string) {
  await act(async () => {
    const result = pressLabel(renderer, label);
    if (result && typeof result.then === 'function') await result;
  });
  await settle();
}

async function pressAccess(renderer: TestRenderer.ReactTestRenderer, label: string) {
  await act(async () => {
    const node = renderer.root.findAll(
      (item) => item.props?.accessibilityLabel === label && typeof item.props.onPress === 'function',
    )[0];
    if (!node) throw new Error(`missing ${label}\n${allText(renderer)}`);
    const result = node.props.onPress();
    if (result && typeof result.then === 'function') await result;
  });
  await settle();
}

function Host() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick((n) => n + 1);
    nav().listeners.add(listener);
    return () => {
      nav().listeners.delete(listener);
    };
  }, []);
  return (
    <FoodSectionProvider>
      {nav().route.name === 'Recipe' ? <RecipeScreen /> : <FoodScreen />}
    </FoodSectionProvider>
  );
}

async function renderHost() {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(<Host />);
  });
  await settle();
  return renderer;
}

beforeEach(() => {
  clearRecipePhotos();
  state().drafts = [];
  state().plan = null;
  state().eaten.clear();
  state().opinions = [];
  state().videos = {};
  nav().route = { name: 'FoodMain', params: {} };
  (loadCookbook as jest.Mock).mockReset();
  (requestPlan as jest.Mock).mockReset();
  (loadCookbook as jest.Mock).mockResolvedValue({ rezepte: [porridge, chicken] });
  (requestPlan as jest.Mock).mockResolvedValue(successPlan);
});

describe('food tab', () => {
  it('shows Cookbook and Plan and drops the old logging surface', async () => {
    const renderer = await renderHost();
    const text = allText(renderer);
    expect(text).toContain('Cookbook');
    expect(text).toContain('Plan');
    expect(text).toContain('List');
    expect(text).toContain('Haferporridge');
    expect(text).toContain('New draft');
    expect(podTitles(renderer, 'cookbook-pod')).toEqual(['Haferporridge', 'Hähnchen Reis']);
    expect(podTitles(renderer, 'draft-pod')).toEqual([]);
    expect(text).not.toContain('Search food');
    expect(text).not.toContain('New Meal');
    expect(text).not.toContain('Logged today');
    expect(text).not.toContain('Add Manually');
    expect(text).not.toContain('Point at a barcode');
    expect(renderer.root.findAllByType(Text).some((node) => flatten(node.props.children) === 'Today')).toBe(false);

    await press(renderer, 'Plan');
    expect(allText(renderer)).toContain('Start today');
    expect(allText(renderer)).toContain('Mon 9');
    expect(allText(renderer)).not.toContain('Add skip');
    const days = renderer.root.findAllByType(TextInput).find((node) => node.props.accessibilityLabel === 'Days');
    expect(days?.props.value).toBe('7');
    const start = renderer.root.findAll((node) => node.props?.accessibilityLabel === 'Start today')[0];
    expect(start?.props.accessibilityState.selected).toBe(false);
    await press(renderer, 'Start today');
    expect(allText(renderer)).toContain('Sun 8');
    await act(async () => {
      days?.props.onChangeText('3');
    });
    expect(allText(renderer)).toContain('Tue 10');
    expect(allText(renderer)).not.toContain('Wed 11');
    await pressAccess(renderer, 'More days');
    expect(allText(renderer)).toContain('Wed 11');

    await press(renderer, 'Cookbook');
    expect(allText(renderer)).toContain('New draft');
  });

  it('keeps the dishes when a recipe opened from the plan is closed', async () => {
    state().plan = successPlan;
    const renderer = await renderHost();
    await press(renderer, 'Plan');
    expect(allText(renderer)).toContain('Hähnchen Reis');
    await press(renderer, 'Lunch · Hähnchen Reis · Cook');
    expect(allText(renderer)).toContain('200 g');
    expect(allText(renderer)).toContain('Hähnchenbrust');
    expect(allText(renderer)).toContain('Reis kochen.');
    expect(allText(renderer)).toContain('Eaten');
    await press(renderer, 'Back');
    expect(allText(renderer)).toContain('Hähnchen Reis');
    expect(allText(renderer)).not.toContain('New draft');
  });

  it('shows ingredients and switches Eaten to Undo', async () => {
    const renderer = await renderHost();
    await press(renderer, 'Haferporridge');
    const text = allText(renderer);
    expect(text).toContain('Haferflocken');
    expect(text).toContain('Milch');
    expect(text).toContain('50 g');
    expect(text).toContain('200 ml');
    expect(text).not.toContain('50 g Haferflocken; 200 ml Milch');
    expect(text).toContain('400 kcal · 20 g protein · 50 g carbs · 10 g fat');
    expect(text).toContain('Hafer kochen.');
    await press(renderer, 'Eaten');
    expect(allText(renderer)).toContain('Undo');
    expect(allText(renderer)).not.toContain('Eaten');
    await press(renderer, 'Undo');
    expect(allText(renderer)).toContain('Eaten');
  });

  it('keeps the book video field closed until Add video and opens a saved https link', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    const renderer = await renderHost();
    await press(renderer, 'Haferporridge');
    expect(allText(renderer)).toContain('Add video');
    expect(allText(renderer)).not.toContain('Open video');
    expect(renderer.root.findAllByType(TextInput).some((node) => node.props.accessibilityLabel === 'Video')).toBe(false);
    await press(renderer, 'Add video');
    await act(async () => {
      const field = renderer.root.findAllByType(TextInput).find((node) => node.props.accessibilityLabel === 'Video');
      field?.props.onChangeText('https://example.com/reel');
    });
    await press(renderer, 'Save video');
    expect(allText(renderer)).toContain('Open video');
    expect(allText(renderer)).toContain('Edit video');
    expect(renderer.root.findAllByType(TextInput).some((node) => node.props.accessibilityLabel === 'Video')).toBe(false);
    expect(state().videos[porridge.id]).toBe('https://example.com/reel');
    await press(renderer, 'Open video');
    expect(open).toHaveBeenCalledWith('https://example.com/reel');
    await press(renderer, 'Edit video');
    await act(async () => {
      const field = renderer.root.findAllByType(TextInput).find((node) => node.props.accessibilityLabel === 'Video');
      field?.props.onChangeText('not a link');
    });
    await press(renderer, 'Save video');
    expect(allText(renderer)).not.toContain('Open video');
    expect(allText(renderer)).toContain('Edit video');
    open.mockRestore();
  });

  it('shows a photo only for the book id that has one when names match', async () => {
    const twin = { ...porridge, id: 'dddddddddddddddddddddddddddddddd' };
    (loadCookbook as jest.Mock).mockResolvedValue({ rezepte: [porridge, twin] });
    setRecipePhoto(bookPhotoKey(porridge.id)!, { uri: 'hafer' });
    const renderer = await renderHost();
    const pods = renderer.root.findAll((item) => item.props?.testID === 'cookbook-pod' && typeof item.props.onPress === 'function' && item.parent?.props?.testID !== 'cookbook-pod');
    expect(pods).toHaveLength(2);
    expect(photoUris(renderer)).toEqual(['hafer']);
  });

  it('keeps a draft photo on the same id after the draft is renamed', async () => {
    setRecipePhoto(draftPhotoKey(1)!, { uri: 'draft-photo' });
    const renderer = await renderHost();
    await press(renderer, 'New draft');
    await act(async () => {
      const name = renderer.root.findAllByType(TextInput).find((node) => node.props.accessibilityLabel === 'Name');
      name?.props.onChangeText('Geheimsuppe');
    });
    await press(renderer, 'Save');
    expect(photoUris(renderer)).toEqual(['draft-photo']);
    await press(renderer, 'Geheimsuppe');
    await act(async () => {
      const name = renderer.root.findAllByType(TextInput).find((node) => node.props.accessibilityLabel === 'Name');
      name?.props.onChangeText('Geheimsuppe Neu');
    });
    await press(renderer, 'Save');
    expect(allText(renderer)).toContain('Geheimsuppe Neu');
    expect(photoUris(renderer)).toEqual(['draft-photo']);
  });

  it('shows a cookbook error and no invented list', async () => {
    (loadCookbook as jest.Mock).mockResolvedValue({ fehler: 'Das Rezeptbuch ist nicht erreichbar.' });
    nav().route = { name: 'Recipe', params: { recipeId: porridge.id } };
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<RecipeScreen />);
    });
    await settle();
    const text = allText(renderer);
    expect(text).toContain('Das Rezeptbuch ist nicht erreichbar.');
    expect(text).not.toContain('Haferporridge');
    expect(text).not.toContain('Erfundenes Gericht');
  });

  it('submits the form and shows the shopping list before the days', async () => {
    const renderer = await renderHost();
    await press(renderer, 'Plan');
    await press(renderer, 'Mon 9');
    await press(renderer, 'Breakfast');
    await press(renderer, 'Lunch');
    await press(renderer, 'Dinner');
    await act(async () => {
      const note = renderer.root.findAllByType(TextInput).find((node) => node.props.accessibilityLabel === 'Note');
      note?.props.onChangeText('wenig Zwiebeln');
    });
    await press(renderer, 'New plan');
    const body = (requestPlan as jest.Mock).mock.calls[0][1];
    expect(body.tage).toBe(7);
    expect(body.startHeute).toBe(false);
    expect(body.ausfaelle).toEqual([]);
    expect(body.hinweis).toBe('wenig Zwiebeln');
    expect(body.datum).toBe('2026-11-08');
    expect(JSON.stringify(body)).not.toContain('zutaten');
    const text = allText(renderer);
    expect(text).toContain('Hähnchen Reis');
    expect(text).toContain('Cook');
    expect(text).toContain('Montag');
    expect(text).toContain('Dishes come first');
    expect(text).not.toContain('Fleisch und Wurst');
    await press(renderer, 'List');
    const list = allText(renderer);
    expect(list).toContain('Fleisch und Wurst');
    expect(list).toContain('Hähnchenbrust');
    expect(list).toContain('1 EL Puderzucker');
    expect(list).not.toContain('Lunch ·');
    await press(renderer, 'Plan');
    await pressAccess(renderer, 'No Hähnchen Reis');
    await press(renderer, 'New plan');
    await press(renderer, 'New plan');
    expect((requestPlan as jest.Mock).mock.calls.at(-1)?.[1].hinweis).toContain('Diese Gerichte gefallen nicht: Hähnchen Reis');
  });

  it('skips one meal per day and a whole empty day on the first tap', async () => {
    const renderer = await renderHost();
    await press(renderer, 'Plan');
    await pressAccess(renderer, 'Mon 9 Breakfast');
    await pressAccess(renderer, 'Wed 11 Dinner');
    await press(renderer, 'New plan');
    expect((requestPlan as jest.Mock).mock.calls[0][1].ausfaelle).toEqual([
      { tag: 'Montag', mahlzeit: 'Frühstück' },
      { tag: 'Mittwoch', mahlzeit: 'Abendessen' },
    ]);

    (requestPlan as jest.Mock).mockClear();
    await press(renderer, 'New plan');
    await press(renderer, 'Thu 12');
    await press(renderer, 'New plan');
    expect((requestPlan as jest.Mock).mock.calls[0][1].ausfaelle).toEqual([
      { tag: 'Montag', mahlzeit: 'Frühstück' },
      { tag: 'Mittwoch', mahlzeit: 'Abendessen' },
      { tag: 'Donnerstag', mahlzeit: 'Frühstück' },
      { tag: 'Donnerstag', mahlzeit: 'Mittagessen' },
      { tag: 'Donnerstag', mahlzeit: 'Abendessen' },
    ]);
  });

  it('shows a failure without a list when nothing is stored', async () => {
    (requestPlan as jest.Mock).mockResolvedValue({ fehler: 'Unbekannte Rezept-ID' });
    const renderer = await renderHost();
    await press(renderer, 'Plan');
    await press(renderer, 'New plan');
    const text = allText(renderer);
    expect(text).toContain('Unbekannte Rezept-ID');
    expect(text).toContain('Einkaufsliste: fehlt');
    expect(text).not.toContain('Hähnchenbrust');
    expect(text).not.toContain('Fleisch und Wurst');
    await pressAccess(renderer, 'Dismiss error');
    expect(allText(renderer)).not.toContain('Unbekannte Rezept-ID');
    expect(allText(renderer)).toContain('Einkaufsliste: fehlt');
    await press(renderer, 'New plan');
    expect(allText(renderer)).toContain('Unbekannte Rezept-ID');
  });

  it('keeps the stored plan visible when a new request fails', async () => {
    state().plan = successPlan;
    (requestPlan as jest.Mock).mockResolvedValue({ fehler: 'Fenster falsch' });
    const renderer = await renderHost();
    await press(renderer, 'List');
    expect(allText(renderer)).toContain('Hähnchenbrust');
    await press(renderer, 'Plan');
    await press(renderer, 'New plan');
    await press(renderer, 'New plan');
    expect(allText(renderer)).toContain('Fenster falsch');
    await press(renderer, 'List');
    const text = allText(renderer);
    expect(text).toContain('Hähnchenbrust');
    expect(text).toContain('Fleisch und Wurst');
    expect(state().plan).toEqual(successPlan);
  });

  it('creates, renames and deletes a draft without sending it in the plan', async () => {
    const renderer = await renderHost();
    await press(renderer, 'New draft');
    expect(renderer.root.findAllByType(TextInput).some((node) => node.props.accessibilityLabel === 'Video')).toBe(true);
    await act(async () => {
      const name = renderer.root.findAllByType(TextInput).find((node) => node.props.accessibilityLabel === 'Name');
      const ingredients = renderer.root.findAllByType(TextInput).find((node) => node.props.accessibilityLabel === 'Ingredients');
      const instructions = renderer.root.findAllByType(TextInput).find((node) => node.props.accessibilityLabel === 'Instructions');
      name?.props.onChangeText('Geheimsuppe');
      ingredients?.props.onChangeText('1 g Salz');
      instructions?.props.onChangeText('Rühren');
    });
    await press(renderer, 'Save');
    expect(allText(renderer)).toContain('Geheimsuppe');
    expect(allText(renderer)).toContain('DRAFTS');
    expect(podTitles(renderer, 'draft-pod')).toEqual(['Geheimsuppe']);
    expect(podTitles(renderer, 'cookbook-pod')).not.toContain('Geheimsuppe');

    await press(renderer, 'Geheimsuppe');
    await act(async () => {
      const name = renderer.root.findAllByType(TextInput).find((node) => node.props.accessibilityLabel === 'Name');
      name?.props.onChangeText('Geheimsuppe Neu');
    });
    await press(renderer, 'Save');
    expect(allText(renderer)).toContain('Geheimsuppe Neu');
    expect(allText(renderer)).not.toContain('Geheimsuppe\n');

    await press(renderer, 'Geheimsuppe Neu');
    await act(async () => {
      const video = renderer.root.findAllByType(TextInput).find((node) => node.props.accessibilityLabel === 'Video');
      video?.props.onChangeText('https://example.com/reel');
    });
    await press(renderer, 'Confirm');
    expect(state().drafts[0].video).toBe('https://example.com/reel');
    expect(state().drafts[0].confirmed).toBe(1);

    await press(renderer, 'Plan');
    await press(renderer, 'New plan');
    const sent = JSON.stringify((requestPlan as jest.Mock).mock.calls.at(-1)?.[1]);
    expect(sent).not.toContain('Geheimsuppe');
    expect(sent).not.toContain('example.com');

    await press(renderer, 'Cookbook');
    await press(renderer, 'Geheimsuppe Neu');
    await press(renderer, 'Delete');
    expect(allText(renderer)).not.toContain('Geheimsuppe');
  });

  it('edits a shopping line and adds another', async () => {
    state().plan = successPlan;
    const renderer = await renderHost();
    await press(renderer, 'List');
    await press(renderer, 'Hähnchenbrust');
    await act(async () => {
      const amount = renderer.root.findAllByType(TextInput).find((node) => node.props.accessibilityLabel === 'Amount');
      amount?.props.onChangeText('500');
    });
    await press(renderer, 'Save');
    expect(allText(renderer)).toContain('500 g');
    await press(renderer, 'Add item');
    await act(async () => {
      const itemName = renderer.root.findAllByType(TextInput).find((node) => node.props.accessibilityLabel === 'Item name');
      const amount = renderer.root.findAllByType(TextInput).find((node) => node.props.accessibilityLabel === 'Amount');
      itemName?.props.onChangeText('Milch');
      amount?.props.onChangeText('1');
    });
    await press(renderer, 'Save');
    expect(allText(renderer)).toContain('Milch');
    expect(allText(renderer)).toContain('1 g');
    const stored = state().plan as { einkauf: { name: string; menge: number }[] };
    expect(stored.einkauf.map((line) => line.name)).toEqual(['Milch', 'Hähnchenbrust']);
    expect(stored.einkauf[0].kategorie).toBe('Kühlregal');
    await pressAccess(renderer, 'Check Hähnchenbrust');
    const afterCheck = allText(renderer);
    expect(afterCheck.indexOf('SHOPPING')).toBeLessThan(afterCheck.indexOf('SHOPPED'));
    expect(afterCheck.indexOf('Milch')).toBeLessThan(afterCheck.indexOf('Hähnchenbrust'));
    const checked = state().plan as { einkauf: { name: string; checked?: boolean }[] };
    expect(checked.einkauf.find((line) => line.name === 'Hähnchenbrust')?.checked).toBe(true);
    await pressAccess(renderer, 'Check Hähnchenbrust');
    const again = state().plan as { einkauf: { name: string; checked?: boolean }[] };
    expect(again.einkauf.find((line) => line.name === 'Hähnchenbrust')?.checked).toBe(false);
  });
});
