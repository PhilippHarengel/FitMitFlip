import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { loadCookbook, requestPlan, wochenplanConfig } from '../api/wochenplan';
import { Screen, Card, ListSection, ListRow, Button } from '../components/ui';
import {
  listRecipeDrafts,
  getShoppingPlan,
  listRecipeOpinions,
  saveShoppingPlan,
  setRecipeOpinion,
  today,
  type RecipeDraft,
} from '../db/queries';
import { useTheme, type Theme } from '../theme';
import {
  MEALS,
  absencesFromSkips,
  buildPlanPayload,
  categoryForItem,
  formatAmount,
  insertShoppingLine,
  isShoppingPlan,
  planWindow,
  pruneSkips,
  skipDayLabel,
  stepDayCount,
  toggleSkipDay,
  toggleSkipMeal,
  slotTitle,
  type CookbookRecipe,
  type PlanSlot,
  type PlanWindowDay,
  type ShoppingPlan,
  type SkipMap,
} from '../lib/shoppingPlan';
import { useFoodSection, type FoodSectionName } from './foodSection';

const MEAL_LABELS = [
  ['Breakfast', 'fruehstueck'],
  ['Lunch', 'mittagessen'],
  ['Dinner', 'abendessen'],
] as const;

export default function FoodScreen() {
  const t = useTheme();
  const navigation = useNavigation<any>();
  const { section, setSection } = useFoodSection();
  const [recipes, setRecipes] = useState<CookbookRecipe[]>([]);
  const [drafts, setDrafts] = useState<RecipeDraft[]>([]);
  const [bookError, setBookError] = useState<string | null>(null);
  const [plan, setPlan] = useState<ShoppingPlan | null>(null);
  const [planError, setPlanError] = useState<{ id: number; text: string } | null>(null);
  const [listStatus, setListStatus] = useState<'received' | 'missing' | null>(null);
  const errorSeq = useRef(0);
  const [days, setDays] = useState('7');
  const [startToday, setStartToday] = useState(false);
  const [skips, setSkips] = useState<SkipMap>({});
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [composing, setComposing] = useState(true);
  const [opinions, setOpinions] = useState<Record<string, { liked: boolean; name: string }>>({});
  const opened = useRef(false);
  const anchor = today();
  const windowDays = useMemo(
    () => planWindow(anchor, Number(days), startToday),
    [anchor, days, startToday],
  );

  useEffect(() => {
    const allowed = new Set(windowDays.map((day) => day.date));
    setSkips((current) => pruneSkips(current, allowed));
  }, [windowDays]);

  const load = useCallback(async () => {
    const [book, stored, draftRows, opinionRows] = await Promise.all([
      loadCookbook(wochenplanConfig()),
      getShoppingPlan(),
      listRecipeDrafts(),
      listRecipeOpinions(),
    ]);
    if ('fehler' in book) {
      setBookError(book.fehler);
      setRecipes([]);
    } else {
      setBookError(null);
      setRecipes(book.rezepte);
    }
    setDrafts(draftRows);
    setPlan(stored);
    setOpinions(Object.fromEntries(opinionRows.map((row) => [row.recipeId, { liked: row.liked, name: row.name }])));
    if (!opened.current) {
      opened.current = true;
      setComposing(stored == null);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function submitPlan() {
    if (sending) return;
    setSending(true);
    try {
      const blocked = Object.values(opinions).filter((item) => !item.liked).map((item) => item.name);
      const hint = [note.trim(), blocked.length ? `Diese Gerichte gefallen nicht: ${blocked.join(', ')}` : '']
        .filter(Boolean)
        .join('. ');
      const payload = buildPlanPayload({
        days: Number(days),
        startToday,
        absences: absencesFromSkips(windowDays, skips),
        note: hint,
        date: today(),
      }, historyPlan(plan, opinions));
      const result = await requestPlan(wochenplanConfig(), payload);
      if (!isShoppingPlan(result)) {
        errorSeq.current += 1;
        setPlanError({ id: errorSeq.current, text: result.fehler });
        setListStatus('missing');
        return;
      }
      await saveShoppingPlan(result);
      setPlan(result);
      setPlanError(null);
      setListStatus('received');
      setComposing(false);
    } finally {
      setSending(false);
    }
  }

  const segment = (
    <View style={{ flexDirection: 'row', backgroundColor: t.colors.card, borderRadius: t.radius.control, padding: 2 }}>
      {(['Cookbook', 'Plan', 'List'] as FoodSectionName[]).map((label) => {
        const selected = section === label;
        return (
          <Pressable
            key={label}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => setSection(label)}
            style={{
              flex: 1,
              minHeight: 36,
              borderRadius: t.radius.control,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? t.colors.accent : 'transparent',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: selected ? '#FFFFFF' : t.colors.label }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Screen topSafeArea header={segment}>
      {section === 'Cookbook' ? (
        <Cookbook
          recipes={recipes}
          drafts={drafts}
          error={bookError}
          onOpenRecipe={(recipeId) => navigation.navigate('Recipe', { recipeId })}
          onOpenDraft={(draftId) => navigation.navigate('Recipe', { draftId })}
          onNewDraft={() => navigation.navigate('Recipe', { draftId: 'new' })}
        />
      ) : section === 'Plan' ? (
        composing || !plan ? (
          <Plan
            error={planError}
            listStatus={listStatus}
            onDismissError={() => setPlanError(null)}
            days={days}
            startToday={startToday}
            windowDays={windowDays}
            skips={skips}
            note={note}
            sending={sending}
            onDays={setDays}
            onStartToday={setStartToday}
            onPressDay={(date) => setSkips((current) => toggleSkipDay(current, date))}
            onPressMeal={(date, meal) => setSkips((current) => toggleSkipMeal(current, date, meal))}
            onNote={setNote}
            onSubmit={submitPlan}
          />
        ) : (
          <DishReview
            plan={plan}
            opinions={opinions}
            onOpinion={(recipeId, name, liked) => {
              setOpinions((current) => ({ ...current, [recipeId]: { liked, name } }));
              void setRecipeOpinion(recipeId, name, liked);
            }}
            onOpenRecipe={(recipeId) => navigation.navigate('Recipe', { recipeId })}
            onNewPlan={() => setComposing(true)}
          />
        )
      ) : (
        <ShoppingList
          plan={plan}
          listStatus={listStatus}
          onChange={(next) => {
            setPlan(next);
            void saveShoppingPlan(next);
          }}
          onNewPlan={() => { setComposing(true); setSection('Plan'); }}
        />
      )}
    </Screen>
  );
}

function Cookbook({
  recipes, drafts, error, onOpenRecipe, onOpenDraft, onNewDraft,
}: {
  recipes: CookbookRecipe[];
  drafts: RecipeDraft[];
  error: string | null;
  onOpenRecipe: (id: string) => void;
  onOpenDraft: (id: number) => void;
  onNewDraft: () => void;
}) {
  const t = useTheme();
  return (
    <>
      {error ? <Text style={{ color: t.colors.warning, fontSize: 15 }}>{error}</Text> : null}
      {recipes.length > 0 && (
        <ListSection header="Cookbook">
          {recipes.map((recipe) => (
            <ListRow
              key={recipe.id}
              title={recipe.name}
              onPress={() => onOpenRecipe(recipe.id)}
            />
          ))}
        </ListSection>
      )}
      <ListSection header="Drafts">
        {drafts.map((draft) => (
          <ListRow key={draft.id} title={draft.name} onPress={() => onOpenDraft(draft.id)} />
        ))}
        <ListRow title="New draft" icon="plus" chevron={false} onPress={onNewDraft} />
      </ListSection>
    </>
  );
}

function SkipColumn({
  day, meals, onToggleDay, onToggleMeal,
}: {
  day: PlanWindowDay;
  meals: readonly (typeof MEALS)[number][];
  onToggleDay: () => void;
  onToggleMeal: (meal: (typeof MEALS)[number]) => void;
}) {
  const t = useTheme();
  const label = skipDayLabel(day);
  const all = meals.length === MEALS.length;
  const some = meals.length > 0;
  return (
    <View style={{ width: 108, gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: all }}
        onPress={onToggleDay}
        style={({ pressed }) => ({
          minHeight: 44,
          borderRadius: t.radius.control,
          borderWidth: 1,
          borderColor: some ? t.colors.accent : t.colors.separator,
          backgroundColor: all ? t.colors.accent : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: all ? '#FFFFFF' : t.colors.label }}>{label}</Text>
      </Pressable>
      {MEALS.map((meal) => {
        const on = meals.includes(meal);
        return (
          <Pressable
            key={meal}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${meal}`}
            accessibilityState={{ selected: on }}
            onPress={() => onToggleMeal(meal)}
            style={({ pressed }) => ({
              minHeight: 36,
              borderRadius: t.radius.full,
              borderWidth: 1,
              borderColor: on ? t.colors.accent : t.colors.separator,
              backgroundColor: on ? t.colors.accent : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 12, fontWeight: on ? '600' : '400', color: on ? '#FFFFFF' : t.colors.label }}>{meal}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function historyPlan(
  plan: ShoppingPlan | null,
  opinions: Record<string, { liked: boolean; name: string }>,
): ShoppingPlan | null {
  if (!plan) return null;
  const hide = (slot: PlanSlot): PlanSlot =>
    slot.id && opinions[slot.id]?.liked ? { ...slot, name: undefined } : slot;
  return {
    ...plan,
    tage: plan.tage.map((day) => ({
      ...day,
      fruehstueck: hide(day.fruehstueck),
      mittagessen: hide(day.mittagessen),
      abendessen: hide(day.abendessen),
    })),
  };
}

function OpinionButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 32,
        paddingHorizontal: 12,
        borderRadius: t.radius.full,
        borderWidth: 1,
        borderColor: active ? t.colors.accent : t.colors.separator,
        backgroundColor: active ? t.colors.accent : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#FFFFFF' : t.colors.label }}>{label.split(' ')[0]}</Text>
    </Pressable>
  );
}

function ErrorNote({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
      <Text style={{ flex: 1, color: t.colors.warning, fontSize: 15 }}>{message}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss error" onPress={onDismiss} hitSlop={8}>
        <Text style={{ color: t.colors.warning, fontSize: 18, fontWeight: '600', lineHeight: 22 }}>×</Text>
      </Pressable>
    </View>
  );
}

function ListOutcome({ status }: { status: 'received' | 'missing' | null }) {
  const t = useTheme();
  if (!status) return null;
  const received = status === 'received';
  return (
    <Text style={{ marginTop: t.spacing.sm, fontSize: 13, color: received ? t.colors.success : t.colors.warning }}>
      {received ? 'Einkaufsliste: erhalten' : 'Einkaufsliste: fehlt'}
    </Text>
  );
}

function Plan(props: {
  error: { id: number; text: string } | null;
  listStatus: 'received' | 'missing' | null;
  onDismissError: () => void;
  days: string;
  startToday: boolean;
  windowDays: PlanWindowDay[];
  skips: SkipMap;
  note: string;
  sending: boolean;
  onDays: (value: string) => void;
  onStartToday: (value: boolean) => void;
  onPressDay: (date: string) => void;
  onPressMeal: (date: string, meal: (typeof MEALS)[number]) => void;
  onNote: (value: string) => void;
  onSubmit: () => void;
}) {
  const t = useTheme();
  return (
    <>
      {props.error ? <ErrorNote key={props.error.id} message={props.error.text} onDismiss={props.onDismissError} /> : null}
      <Card>
          <Text style={{ fontSize: 13, color: t.colors.secondaryLabel, marginBottom: 4 }}>Days</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fewer days"
              onPress={() => props.onDays(stepDayCount(props.days, -1))}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: t.radius.control,
                borderWidth: 1,
                borderColor: t.colors.separator,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 22, color: t.colors.label }}>−</Text>
            </Pressable>
            <TextInput
              accessibilityLabel="Days"
              value={props.days}
              onChangeText={props.onDays}
              keyboardType="number-pad"
              style={{
                flex: 1,
                color: t.colors.label,
                fontSize: 22,
                fontWeight: '600',
                minHeight: 44,
                textAlign: 'center',
                borderWidth: 1,
                borderColor: t.colors.separator,
                borderRadius: t.radius.control,
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="More days"
              onPress={() => props.onDays(stepDayCount(props.days, 1))}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: t.radius.control,
                borderWidth: 1,
                borderColor: t.colors.separator,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 22, color: t.colors.label }}>+</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start today"
            accessibilityState={{ selected: props.startToday }}
            onPress={() => props.onStartToday(!props.startToday)}
            style={({ pressed }) => ({
              marginTop: t.spacing.md,
              minHeight: 44,
              borderRadius: t.radius.control,
              borderWidth: 1,
              borderColor: props.startToday ? t.colors.accent : t.colors.separator,
              backgroundColor: props.startToday ? t.colors.accent : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 17, fontWeight: '600', color: props.startToday ? '#FFFFFF' : t.colors.label }}>Start today</Text>
          </Pressable>
          <Text style={{ fontSize: 13, color: t.colors.secondaryLabel, marginTop: t.spacing.lg }}>Skip</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: t.spacing.sm, marginHorizontal: -t.spacing.lg }}
            contentContainerStyle={{ gap: t.spacing.sm, paddingHorizontal: t.spacing.lg }}
          >
            {props.windowDays.map((day) => (
              <SkipColumn
                key={day.date}
                day={day}
                meals={props.skips[day.date] ?? []}
                onToggleDay={() => props.onPressDay(day.date)}
                onToggleMeal={(meal) => props.onPressMeal(day.date, meal)}
              />
            ))}
          </ScrollView>
          <Text style={{ fontSize: 13, color: t.colors.secondaryLabel, marginTop: t.spacing.lg, marginBottom: 4 }}>Note</Text>
          <TextInput
            accessibilityLabel="Note"
            value={props.note}
            onChangeText={props.onNote}
            style={{ color: t.colors.label, fontSize: 17, minHeight: 44 }}
          />
          <View style={{ marginTop: t.spacing.lg }}>
            <Button title="New plan" onPress={props.onSubmit} disabled={props.sending} />
            <ListOutcome status={props.listStatus} />
          </View>
        </Card>
    </>
  );
}

function renderShoppingGroup(
  header: string,
  rows: { item: { kategorie: string; name: string; menge: number; einheit: string; checked?: boolean }; index: number }[],
  t: Theme,
  openLine: (index: number) => void,
  toggleChecked: (index: number) => void,
) {
  if (rows.length === 0) return null;
  let category = '';
  return (
    <ListSection header={header}>
      {rows.map(({ item, index }) => {
        const showCategory = item.kategorie !== category;
        category = item.kategorie;
        return (
          <View key={`${header}-${item.kategorie}-${item.name}-${index}`}>
            {showCategory ? (
              <View style={{
                backgroundColor: t.colors.track,
                paddingHorizontal: t.spacing.lg,
                paddingVertical: 10,
                borderTopWidth: index > 0 ? 1 : 0,
                borderTopColor: t.colors.separator,
              }}>
                <Text style={{ fontSize: 15, fontWeight: '700', letterSpacing: 0.8, color: t.colors.accent, textTransform: 'uppercase' }}>
                  {item.kategorie}
                </Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel={`Check ${item.name}`}
                accessibilityState={{ checked: item.checked === true }}
                onPress={() => toggleChecked(index)}
                hitSlop={8}
                style={{ paddingLeft: t.spacing.lg, paddingVertical: 10 }}
              >
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: item.checked ? t.colors.accent : t.colors.separator,
                  backgroundColor: item.checked ? t.colors.accent : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {item.checked ? <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>✓</Text> : null}
                </View>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${item.name}`} onPress={() => openLine(index)} style={{ flex: 1 }}>
                <View style={{ paddingHorizontal: t.spacing.md, paddingVertical: 10, opacity: item.checked ? 0.45 : 1 }}>
                  <Text style={{ fontSize: 17, color: t.colors.label, textDecorationLine: item.checked ? 'line-through' : 'none' }}>{item.name}</Text>
                  <Text style={{ fontSize: 13, color: t.colors.secondaryLabel }}>{formatAmount(item.menge)} {item.einheit}</Text>
                </View>
              </Pressable>
            </View>
          </View>
        );
      })}
    </ListSection>
  );
}

function emptyShoppingPlan(): ShoppingPlan {
  return {
    tage: [],
    einkauf: [],
    nichtLesbar: [],
    vorrat: [],
    summen: { kcal: 0, protein: 0, kohlenhydrate: 0, fett: 0 },
  };
}

function parseAmount(value: string): number {
  const amount = Number(value.trim().replace(',', '.'));
  return Number.isFinite(amount) ? amount : 0;
}

function ShoppingList({
  plan, listStatus, onChange, onNewPlan,
}: {
  plan: ShoppingPlan | null;
  listStatus: 'received' | 'missing' | null;
  onChange: (plan: ShoppingPlan) => void;
  onNewPlan: () => void;
}) {
  const t = useTheme();
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('g');
  const lines = plan?.einkauf ?? [];

  function openNew() {
    setEditing('new');
    setName('');
    setAmount('');
    setUnit('g');
  }

  function openLine(index: number) {
    const line = lines[index];
    setEditing(index);
    setName(line.name);
    setAmount(formatAmount(line.menge));
    setUnit(line.einheit);
  }

  function saveLine() {
    const trimmed = name.trim();
    if (!trimmed || editing == null) return;
    const nextLine = {
      kategorie: editing === 'new' ? categoryForItem(trimmed, lines) : lines[editing].kategorie,
      name: trimmed,
      menge: parseAmount(amount),
      einheit: unit.trim() || 'g',
      checked: editing === 'new' ? false : lines[editing].checked,
    };
    const einkauf = editing === 'new'
      ? insertShoppingLine(lines, nextLine)
      : lines.map((line, index) => index === editing ? nextLine : line);
    onChange({ ...(plan ?? emptyShoppingPlan()), einkauf });
    setEditing(null);
  }

  function toggleChecked(index: number) {
    const einkauf = lines.map((line, i) => (i === index ? { ...line, checked: !line.checked } : line));
    onChange({ ...(plan ?? emptyShoppingPlan()), einkauf });
  }

  function removeLine() {
    if (typeof editing !== 'number') return;
    onChange({ ...(plan ?? emptyShoppingPlan()), einkauf: lines.filter((_, index) => index !== editing) });
    setEditing(null);
  }

  return (
    <>
      <View style={{ marginBottom: t.spacing.md }}>
        <Button title="Add item" variant="tinted" onPress={openNew} />
      </View>
      {editing != null ? (
        <Card>
          <Text style={{ fontSize: 13, color: t.colors.secondaryLabel, marginBottom: 4 }}>Name</Text>
          <TextInput
            accessibilityLabel="Item name"
            value={name}
            onChangeText={setName}
            style={{ color: t.colors.label, fontSize: 17, minHeight: 44 }}
          />
          <Text style={{ fontSize: 13, color: t.colors.secondaryLabel, marginTop: t.spacing.md, marginBottom: 4 }}>Amount</Text>
          <TextInput
            accessibilityLabel="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            style={{ color: t.colors.label, fontSize: 17, minHeight: 44 }}
          />
          <Text style={{ fontSize: 13, color: t.colors.secondaryLabel, marginTop: t.spacing.md, marginBottom: 4 }}>Unit</Text>
          <TextInput
            accessibilityLabel="Unit"
            value={unit}
            onChangeText={setUnit}
            style={{ color: t.colors.label, fontSize: 17, minHeight: 44 }}
          />
          <View style={{ marginTop: t.spacing.lg, gap: t.spacing.sm }}>
            <Button title="Save" onPress={saveLine} />
            {typeof editing === 'number' ? <Button title="Remove" variant="tinted" destructive onPress={removeLine} /> : null}
          </View>
        </Card>
      ) : null}
      {lines.length === 0 && editing == null ? (
        <Text style={{ fontSize: 17, color: t.colors.secondaryLabel }}>No list yet.</Text>
      ) : null}
      {renderShoppingGroup('Shopping', lines.map((item, index) => ({ item, index })).filter((row) => !row.item.checked), t, openLine, toggleChecked)}
      {renderShoppingGroup('Shopped', lines.map((item, index) => ({ item, index })).filter((row) => row.item.checked), t, openLine, toggleChecked)}
      {plan?.vorrat && plan.vorrat.length > 0 && (
        <ListSection header="Pantry">
          {plan.vorrat.map((item, index) => {
            const amount = item.menge == null ? item.name : `${formatAmount(item.menge)} ${item.einheit} ${item.name}`;
            return (
              <View key={`${item.rezept}-${item.name}-${index}`} style={{ paddingHorizontal: t.spacing.lg, paddingVertical: 10, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={`In stock ${item.name}`}
                    accessibilityState={{ checked: item.checked === true }}
                    onPress={() => {
                      const vorrat = plan.vorrat!.map((row, i) => i === index ? { ...row, checked: !row.checked } : row);
                      onChange({ ...plan, vorrat });
                    }}
                    hitSlop={8}
                  >
                    <View style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: item.checked ? t.colors.accent : t.colors.separator,
                      backgroundColor: item.checked ? t.colors.accent : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {item.checked ? <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>✓</Text> : null}
                    </View>
                  </Pressable>
                  <View style={{ flex: 1, opacity: item.checked ? 0.45 : 1 }}>
                    <Text style={{ fontSize: 17, color: t.colors.label, textDecorationLine: item.checked ? 'line-through' : 'none' }}>{amount}</Text>
                    <Text style={{ fontSize: 13, color: t.colors.secondaryLabel }}>{item.rezept}</Text>
                  </View>
                </View>
                {item.checked ? null : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Buy ${item.name}`}
                    onPress={() => {
                      const line = {
                        kategorie: categoryForItem(item.name, lines),
                        name: item.name,
                        menge: item.menge ?? 1,
                        einheit: item.einheit || 'Stk',
                        checked: false,
                      };
                      onChange({
                        ...plan,
                        einkauf: insertShoppingLine(lines, line),
                        vorrat: plan.vorrat!.filter((_, i) => i !== index),
                      });
                    }}
                  >
                    <Text style={{ color: t.colors.accent, fontSize: 15, fontWeight: '600' }}>Buy</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </ListSection>
      )}
      {plan && plan.nichtLesbar.length > 0 && (
        <ListSection header="Not readable">
          {plan.nichtLesbar.map((line) => (
            <ListRow key={line} title={line} chevron={false} />
          ))}
        </ListSection>
      )}
      <View>
        <Button title="New plan" variant="tinted" onPress={onNewPlan} />
        <ListOutcome status={listStatus} />
      </View>
    </>
  );
}

function DishReview({
  plan, opinions, onOpinion, onOpenRecipe, onNewPlan,
}: {
  plan: ShoppingPlan;
  opinions: Record<string, { liked: boolean; name: string }>;
  onOpinion: (recipeId: string, name: string, liked: boolean) => void;
  onOpenRecipe: (id: string) => void;
  onNewPlan: () => void;
}) {
  const t = useTheme();
  return (
    <>
      <Text style={{ fontSize: 13, color: t.colors.secondaryLabel }}>Dishes come first. The shopping list is under List.</Text>
      {plan.tage.map((day) => (
        <View key={day.datum} style={{ paddingTop: t.spacing.md }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: t.colors.secondaryLabel }}>
            {day.wochentag} {day.datum}
          </Text>
          {MEAL_LABELS.map(([label, key]) => {
            const slot = day[key];
            const title = `${label} · ${slotTitle(slot)}`;
            const opinion = slot.id ? opinions[slot.id] : undefined;
            return (
              <View key={key} style={{ paddingTop: t.spacing.sm, gap: t.spacing.sm }}>
                {slot.id ? (
                  <ListRow title={title} onPress={() => onOpenRecipe(slot.id!)} />
                ) : (
                  <ListRow title={title} chevron={false} />
                )}
                {slot.id && slot.name ? (
                  <View style={{ flexDirection: 'row', gap: t.spacing.sm, paddingHorizontal: t.spacing.lg }}>
                    <OpinionButton label={`Like ${slot.name}`} active={opinion?.liked === true} onPress={() => onOpinion(slot.id!, slot.name!, true)} />
                    <OpinionButton label={`No ${slot.name}`} active={opinion?.liked === false} onPress={() => onOpinion(slot.id!, slot.name!, false)} />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
      <View style={{ marginTop: t.spacing.lg }}>
        <Button title="New plan" variant="tinted" onPress={onNewPlan} />
      </View>
    </>
  );
}
