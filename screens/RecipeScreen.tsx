import React, { useCallback, useRef, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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
import { heroSwatch } from '../lib/cookbookSwatch';
import { bookPhoto } from '../lib/recipePhotos';
import { ingredientRows, methodParagraphs } from '../lib/recipeLines';
import type { CookbookRecipe } from '../lib/shoppingPlan';
import { useTheme } from '../theme';

type RecipeParams = { recipeId?: string; draftId?: number | 'new' };

function isHttp(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

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
  const [editingVideo, setEditingVideo] = useState(false);
  const [confirmed, setConfirmed] = useState(0);
  const loadTicket = useRef(0);

  const load = useCallback(async () => {
    const ticket = ++loadTicket.current;
    const current = () => ticket === loadTicket.current;
    if (draftMode) {
      if (params.draftId === 'new') {
        setError(null);
        setName('');
        setIngredients('');
        setInstructions('');
        setVideo('');
        setConfirmed(0);
        return;
      }
      const draft = await getRecipeDraft(Number(params.draftId));
      if (!current()) return;
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
    const recipeId = params.recipeId;
    setRecipe((shown) => (shown && shown.id === recipeId ? shown : null));
    const book = await loadCookbook(wochenplanConfig());
    if (!current()) return;
    if ('fehler' in book) {
      setRecipe(null);
      setError(book.fehler);
      return;
    }
    const found = book.rezepte.find((item) => item.id === recipeId) ?? null;
    setRecipe(found);
    setError(found ? null : 'This recipe is not in the cookbook.');
    setEditingVideo(false);
    if (found) {
      const [savedVideo, alreadyEaten] = await Promise.all([
        getRecipeVideo(found.id),
        isRecipeEaten(found.id, today()),
      ]);
      if (!current()) return;
      setVideo(savedVideo);
      setEaten(alreadyEaten);
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
    const next = video.trim();
    await saveRecipeVideo(recipe.id, next);
    setVideo(next);
    setEditingVideo(false);
  }

  function openVideo() {
    const url = video.trim();
    if (!isHttp(url)) return;
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

  const rows = recipe ? ingredientRows(recipe.zutaten) : [];
  const steps = recipe ? methodParagraphs(recipe.anleitung) : [];
  const swatch = recipe ? heroSwatch(recipe.id) : t.colors.track;
  const photo = recipe ? bookPhoto(recipe.id) : null;

  return (
    <Screen topSafeArea header={header} scroll={draftMode}>
      {error ? <Text style={{ color: t.colors.warning, fontSize: 15 }}>{error}</Text> : null}
      {draftMode ? (
        <>
          <Field label="Name" value={name} onChange={setName} />
          <Field label="Ingredients" value={ingredients} onChange={setIngredients} multiline />
          <Field label="Instructions" value={instructions} onChange={setInstructions} multiline />
          <Field label="Video" value={video} onChange={setVideo} />
          {isHttp(video) ? <Button title="Open video" variant="tinted" onPress={openVideo} /> : null}
          <Button title="Save" variant="tinted" onPress={() => saveDraft(confirmed)} />
          <Button title="Confirm" onPress={() => saveDraft(1)} />
          {params.draftId !== 'new' ? <Button title="Delete" variant="tinted" destructive onPress={removeDraft} /> : null}
        </>
      ) : recipe ? (
        <>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: t.spacing.lg }} keyboardShouldPersistTaps="handled">
            <View
              style={{
                height: 200,
                borderRadius: 18,
                overflow: 'hidden',
                backgroundColor: swatch,
              }}
            >
              {photo ? (
                <Image
                  source={photo}
                  testID="recipe-photo"
                  resizeMode="cover"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
              ) : (
                <View testID="recipe-swatch" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: swatch }} />
              )}
              <View
                style={{
                  position: 'absolute',
                  left: 10,
                  right: 10,
                  bottom: 10,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.84)',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text numberOfLines={2} style={{ fontSize: 16, fontWeight: '600', lineHeight: 20, color: '#111111' }}>{recipe.name}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 15, color: t.colors.secondaryLabel }}>
              {`${recipe.kcal} kcal · ${recipe.protein} g protein · ${recipe.kohlenhydrate} g carbs · ${recipe.fett} g fat`}
            </Text>
            {rows.length > 0 ? (
              <View style={{ gap: t.spacing.sm }}>
                <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 0.3, color: t.colors.secondaryLabel }}>INGREDIENTS</Text>
                {rows.map((row, index) => (
                  <View key={`${row.amount ?? ''}-${row.name}-${index}`} style={{ flexDirection: 'row', gap: t.spacing.md }}>
                    {row.amount != null ? (
                      <Text style={{ width: 112, fontSize: 17, fontWeight: '600', color: t.colors.secondaryLabel }}>{row.amount}</Text>
                    ) : null}
                    <Text style={{ flex: 1, fontSize: 17, lineHeight: 24, color: t.colors.label }}>{row.name}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {steps.length > 0 ? (
              <View style={{ gap: t.spacing.sm }}>
                <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 0.3, color: t.colors.secondaryLabel }}>METHOD</Text>
                {steps.map((step, index) => (
                  <Text key={`${index}-${step}`} style={{ fontSize: 17, lineHeight: 24, color: t.colors.label }}>{step}</Text>
                ))}
              </View>
            ) : null}
            <View style={{ gap: t.spacing.sm }}>
              {isHttp(video) ? <Button title="Open video" variant="tinted" onPress={openVideo} /> : null}
              <Pressable onPress={() => setEditingVideo(true)} hitSlop={8}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: t.colors.accent }}>
                  {video.trim() ? 'Edit video' : 'Add video'}
                </Text>
              </Pressable>
              {editingVideo ? (
                <>
                  <Field label="Video" value={video} onChange={setVideo} />
                  <Button title="Save video" variant="tinted" onPress={saveBookVideo} />
                </>
              ) : null}
            </View>
          </ScrollView>
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
