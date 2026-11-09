import React, { useCallback, useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { loadCookbook, wochenplanConfig } from '../api/wochenplan';
import { Screen, Button } from '../components/ui';
import {
  createRecipeDraft,
  deleteRecipeDraft,
  eatRecipePortion,
  getRecipeDraft,
  getRecipeVideo,
  isRecipeEaten,
  saveRecipeVideo,
  today,
  undoRecipePortion,
  updateRecipeDraft,
} from '../db/queries';
import type { CookbookRecipe } from '../lib/shoppingPlan';
import { useTheme } from '../theme';

type RecipeParams = { recipeId?: string; draftId?: number | 'new' };

export default function RecipeScreen() {
  const t = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route.params ?? {}) as RecipeParams;
  const draftMode = params.draftId != null;
  const [recipe, setRecipe] = useState<CookbookRecipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eaten, setEaten] = useState(false);
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');
  const [video, setVideo] = useState('');
  const [confirmed, setConfirmed] = useState(0);

  const load = useCallback(async () => {
    if (draftMode) {
      if (params.draftId === 'new') {
        setName('');
        setIngredients('');
        setInstructions('');
        setVideo('');
        setConfirmed(0);
        return;
      }
      const draft = await getRecipeDraft(Number(params.draftId));
      if (!draft) {
        setError('This draft is gone.');
        return;
      }
      setError(null);
      setName(draft.name);
      setIngredients(draft.ingredients);
      setInstructions(draft.instructions);
      setVideo(draft.video ?? '');
      setConfirmed(draft.confirmed ? 1 : 0);
      return;
    }
    const book = await loadCookbook(wochenplanConfig());
    if ('fehler' in book) {
      setRecipe(null);
      setError(book.fehler);
      return;
    }
    const found = book.rezepte.find((item) => item.id === params.recipeId) ?? null;
    setRecipe(found);
    setError(found ? null : 'This recipe is not in the cookbook.');
    if (found) {
      setVideo(await getRecipeVideo(found.id));
      setEaten(await isRecipeEaten(found.id, today()));
    }
  }, [draftMode, params.draftId, params.recipeId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function toggleEaten() {
    if (!recipe) return;
    if (eaten) {
      await undoRecipePortion(recipe.id, today());
      setEaten(false);
      return;
    }
    await eatRecipePortion({
      id: recipe.id,
      name: recipe.name,
      kcal: recipe.kcal,
      protein: recipe.protein,
      carbs: recipe.kohlenhydrate,
      fat: recipe.fett,
    }, today());
    setEaten(true);
  }

  async function saveDraft(nextConfirmed = confirmed) {
    const draft = {
      name: name.trim(),
      ingredients: ingredients.trim(),
      instructions: instructions.trim(),
      video: video.trim(),
      confirmed: nextConfirmed ? 1 : 0,
    };
    if (!draft.name) return;
    if (params.draftId === 'new') await createRecipeDraft(draft);
    else await updateRecipeDraft(Number(params.draftId), draft);
    navigation.goBack();
  }

  async function saveBookVideo() {
    if (!recipe) return;
    await saveRecipeVideo(recipe.id, video);
  }

  function openVideo() {
    const url = video.trim();
    if (!/^https?:\/\//i.test(url)) return;
    Linking.openURL(url).catch(() => setError('This video link could not be opened.'));
  }

  async function removeDraft() {
    if (params.draftId == null || params.draftId === 'new') return;
    await deleteRecipeDraft(Number(params.draftId));
    navigation.goBack();
  }

  const header = (
    <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
      <Text style={{ fontSize: 17, color: t.colors.accent, fontWeight: '600' }}>Back</Text>
    </Pressable>
  );

  return (
    <Screen topSafeArea header={header}>
      {error ? <Text style={{ color: t.colors.warning, fontSize: 15 }}>{error}</Text> : null}
      {draftMode ? (
        <>
          <Field label="Name" value={name} onChange={setName} />
          <Field label="Ingredients" value={ingredients} onChange={setIngredients} multiline />
          <Field label="Instructions" value={instructions} onChange={setInstructions} multiline />
          <Field label="Video" value={video} onChange={setVideo} />
          {/^https?:\/\//i.test(video.trim()) ? <Button title="Open video" variant="tinted" onPress={openVideo} /> : null}
          <Button title="Save" variant="tinted" onPress={() => saveDraft(confirmed)} />
          <Button title="Confirm" onPress={() => saveDraft(1)} />
          {params.draftId !== 'new' ? <Button title="Delete" variant="tinted" destructive onPress={removeDraft} /> : null}
        </>
      ) : recipe ? (
        <>
          <Text style={{ fontSize: 28, fontWeight: '700', color: t.colors.label }}>{recipe.name}</Text>
          <Text style={{ fontSize: 17, color: t.colors.label, lineHeight: 24 }}>{recipe.zutaten}</Text>
          <Text style={{ fontSize: 17, color: t.colors.label, lineHeight: 24 }}>{recipe.anleitung}</Text>
          <Field label="Video" value={video} onChange={setVideo} />
          {/^https?:\/\//i.test(video.trim()) ? <Button title="Open video" variant="tinted" onPress={openVideo} /> : null}
          <Button title="Save video" variant="tinted" onPress={saveBookVideo} />
          <Button title={eaten ? 'Undo' : 'Eaten'} onPress={toggleEaten} />
        </>
      ) : null}
    </Screen>
  );
}

function Field({
  label, value, onChange, multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  const t = useTheme();
  return (
    <View>
      <Text style={{ fontSize: 13, color: t.colors.secondaryLabel, marginBottom: 4 }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        style={{
          color: t.colors.label,
          fontSize: 17,
          minHeight: multiline ? 88 : 44,
          backgroundColor: t.colors.card,
          borderRadius: t.radius.control,
          padding: 12,
        }}
      />
    </View>
  );
}
