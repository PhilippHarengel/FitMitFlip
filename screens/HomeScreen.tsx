import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import DateNavigator from '../components/DateNavigator';
import { useSelectedDate } from '../components/DateContext';
import { Screen, Card, ListSection, ListRow, Button, ProgressBar, Ring, Icon } from '../components/ui';
import { useTheme, type Theme } from '../theme';
import { backupToFile } from '../db/backup';
import {
  getDailyMacros,
  getFoodLogForDate,
  getPlannedType,
  importAllData,
  isDone,
  getTargets,
  setTargets,
  toDateString,
  type DailyMacros,
  type Targets,
} from '../db/queries';
import { deriveWorkoutState, deriveNutritionState } from './todayState';

const EMPTY_TARGETS: Targets = { kcal: null, protein_g: null, carbs_g: null, fat_g: null };

export default function HomeScreen() {
  const t = useTheme();
  const navigation = useNavigation<any>(); // cross-tab navigate + setOptions; tab/stack types don't compose cleanly
  const { date, setDate } = useSelectedDate();
  const [macros, setMacros] = useState<DailyMacros>({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  const [targets, setTargetsState] = useState<Targets>(EMPTY_TARGETS);
  const [plannedType, setPlannedType] = useState<string>('Rest');
  const [workoutDone, setWorkoutDone] = useState(false);
  const [foodCount, setFoodCount] = useState(0);
  const [goalsVisible, setGoalsVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const dateStr = toDateString(date);
  const isToday = dateStr === toDateString(new Date());
  const dateLabel = isToday
    ? 'Today'
    : date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Drive the native large title off the selected date.
  useEffect(() => {
    navigation.setOptions({ title: dateLabel });
  }, [navigation, dateLabel]);

  const load = useCallback(async () => {
    const [m, tg, planned, done, fl] = await Promise.all([
      getDailyMacros(dateStr),
      getTargets(),
      getPlannedType(dateStr),
      isDone(dateStr),
      getFoodLogForDate(dateStr),
    ]);
    setMacros(m);
    setTargetsState(tg);
    setPlannedType(planned);
    setWorkoutDone(done);
    setFoodCount(fl.length);
  }, [dateStr]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleSaveGoals(next: Targets) {
    await setTargets(next);
    setTargetsState(next);
    setGoalsVisible(false);
  }

  async function handleBackup() {
    setBackingUp(true);
    try {
      const r = await backupToFile();
      if (!r.shared) Alert.alert('Backup saved', `Saved on-device as ${r.name}. Sharing wasn't available to send it off the device.`);
    } catch (e: any) {
      Alert.alert('Backup failed', e?.message ?? 'Unknown error');
    } finally {
      setBackingUp(false);
    }
  }

  async function handleRestore() {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
      if (picked.canceled || !picked.assets?.[0]) return;
      const text = await new File(picked.assets[0].uri).text();
      Alert.alert(
        'Restore this backup?',
        'This replaces ALL data currently in the app with the backup. It cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: async () => {
              setRestoring(true);
              try {
                const r = await importAllData(text);
                await load();
                Alert.alert('Restore complete', `Loaded ${r.rows} rows from the backup.`);
              } catch (e: any) {
                Alert.alert('Restore failed', e?.message ?? 'Unknown error');
              } finally {
                setRestoring(false);
              }
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Restore failed', e?.message ?? 'Unknown error');
    }
  }

  const nutritionState = deriveNutritionState(targets, foodCount);
  const workoutState = deriveWorkoutState(plannedType, workoutDone);

  return (
    <Screen>
      <DateNavigator date={date} onChange={setDate} maximumDate={new Date()} />

      {/* ── Nutrition (top) ─────────────────────────────────────────────── */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: t.spacing.sm }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: t.colors.secondaryLabel, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Nutrition
          </Text>
          <TouchableOpacity onPress={() => setGoalsVisible(true)} hitSlop={8}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: t.colors.accent }}>Goals</Text>
          </TouchableOpacity>
        </View>

        <CalorieHeadline current={macros.kcal} target={targets.kcal} />

        {nutritionState === 'no-goals' ? (
          <View style={{ marginTop: t.spacing.md }}>
            <Button title="Set your targets" variant="tinted" icon="target" onPress={() => setGoalsVisible(true)} />
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: t.spacing.lg }}>
              <Ring value={macros.protein_g} target={targets.protein_g} color={t.colors.protein} label="Protein" />
              <Ring value={macros.carbs_g} target={targets.carbs_g} color={t.colors.carbs} label="Carbs" />
              <Ring value={macros.fat_g} target={targets.fat_g} color={t.colors.fat} label="Fat" />
            </View>
            {nutritionState === 'empty' && (
              <TouchableOpacity onPress={() => navigation.navigate('Food')} style={{ marginTop: t.spacing.md }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: t.colors.accent, textAlign: 'center' }}>
                  Log your first meal ›
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <TouchableOpacity onPress={() => setDetailVisible(true)} style={{ marginTop: t.spacing.md }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: t.colors.accent, textAlign: 'center' }}>
            View all nutrients ›
          </Text>
        </TouchableOpacity>
      </Card>

      {/* ── Workout ─────────────────────────────────────────────────────── */}
      <WorkoutCard
        state={workoutState}
        plannedType={plannedType}
        onStart={() => navigation.navigate('Workout')}
      />

      {/* ── More ────────────────────────────────────────────────────────── */}
      <ListSection header="More">
        <ListRow icon="target" title="Goals" onPress={() => setGoalsVisible(true)} />
        <ListRow
          icon="square.and.arrow.up"
          title={backingUp ? 'Preparing backup…' : 'Back up data'}
          chevron={false}
          onPress={backingUp || restoring ? undefined : handleBackup}
        />
        <ListRow
          icon="square.and.arrow.down"
          title={restoring ? 'Restoring…' : 'Restore from backup'}
          chevron={false}
          onPress={backingUp || restoring ? undefined : handleRestore}
        />
      </ListSection>

      <NutrientDetailModal
        visible={detailVisible}
        dateLabel={dateLabel}
        macros={macros}
        targets={targets}
        onClose={() => setDetailVisible(false)}
        onEditGoals={() => { setDetailVisible(false); setGoalsVisible(true); }}
      />
      <GoalsModal
        visible={goalsVisible}
        initial={targets}
        onClose={() => setGoalsVisible(false)}
        onSave={handleSaveGoals}
      />
    </Screen>
  );
}

// ── Workout card (rest / pending / done) ─────────────────────────────────────
function WorkoutCard({ state, plannedType, onStart }: {
  state: 'rest' | 'pending' | 'done'; plannedType: string; onStart: () => void;
}) {
  const t = useTheme();

  if (state === 'rest') {
    return (
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
          <Icon name="moon.zzz.fill" color={t.colors.secondaryLabel} size={26} />
          <View>
            <Text style={{ fontSize: 17, fontWeight: '600', color: t.colors.label }}>Rest day</Text>
            <Text style={{ fontSize: 14, color: t.colors.secondaryLabel, marginTop: 1 }}>Recovery — nothing planned</Text>
          </View>
        </View>
      </Card>
    );
  }

  if (state === 'done') {
    return (
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: t.colors.secondaryLabel, textTransform: 'uppercase', letterSpacing: 0.5 }}>Workout</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: t.colors.label, marginTop: 2 }}>{plannedType}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="checkmark.circle.fill" color={t.colors.success} size={22} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: t.colors.success }}>Done</Text>
          </View>
        </View>
      </Card>
    );
  }

  // pending
  return (
    <Card>
      <Text style={{ fontSize: 13, fontWeight: '700', color: t.colors.secondaryLabel, textTransform: 'uppercase', letterSpacing: 0.5 }}>Today's workout</Text>
      <Text style={{ fontSize: 22, fontWeight: '800', color: t.colors.label, marginTop: 2, marginBottom: t.spacing.md }}>{plannedType}</Text>
      <Button title="Start workout" icon="play.fill" onPress={onStart} />
    </Card>
  );
}

// ── Calorie headline: big number + bar (falls back to plain total, no goal) ──
function CalorieHeadline({ current, target }: { current: number; target: number | null }) {
  const t = useTheme();
  const cur = Math.round(current);

  if (target == null || target <= 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: t.spacing.sm }}>
        <Text style={{ fontSize: 48, fontWeight: '800', color: t.colors.label, lineHeight: 52 }} maxFontSizeMultiplier={1.2}>{cur}</Text>
        <Text style={{ fontSize: 14, color: t.colors.secondaryLabel, marginTop: 2 }}>kcal today</Text>
      </View>
    );
  }

  const tgt = Math.round(target);
  const remaining = tgt - cur;
  const over = remaining < 0;

  return (
    <View style={{ paddingVertical: t.spacing.sm }}>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 48, fontWeight: '800', lineHeight: 52, color: over ? t.colors.warning : t.colors.label }} maxFontSizeMultiplier={1.2}>
          {Math.abs(remaining)}
        </Text>
        <Text style={{ fontSize: 14, marginTop: 2, fontWeight: over ? '600' : '400', color: over ? t.colors.warning : t.colors.secondaryLabel }}>
          {over ? 'kcal over' : 'kcal left'}
        </Text>
      </View>
      <View style={{ marginTop: t.spacing.md }}>
        <ProgressBar value={current} target={target} />
      </View>
      <Text style={{ fontSize: 12, color: t.colors.secondaryLabel, marginTop: 6, textAlign: 'center' }}>{cur} / {tgt} kcal</Text>
    </View>
  );
}

// ── Nutrient detail modal (themed) ───────────────────────────────────────────
function NutrientDetailModal({ visible, dateLabel, macros, targets, onClose, onEditGoals }: {
  visible: boolean; dateLabel: string; macros: DailyMacros; targets: Targets;
  onClose: () => void; onEditGoals: () => void;
}) {
  const t = useTheme();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.colors.bgGrouped }}>
        <ModalHeader theme={t} left="Done" onLeft={onClose} title={`Nutrients — ${dateLabel}`} right="Goals" onRight={onEditGoals} />
        <ScrollView contentContainerStyle={{ padding: t.spacing.lg, gap: t.spacing.md }}>
          <MacroProgress label="Calories" unit=" kcal" current={macros.kcal} target={targets.kcal} />
          <MacroProgress label="Protein" unit="g" current={macros.protein_g} target={targets.protein_g} />
          <MacroProgress label="Carbs" unit="g" current={macros.carbs_g} target={targets.carbs_g} />
          <MacroProgress label="Fat" unit="g" current={macros.fat_g} target={targets.fat_g} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function MacroProgress({ label, unit, current, target }: {
  label: string; unit: string; current: number; target: number | null;
}) {
  const t = useTheme();
  const cur = Math.round(current);

  if (target == null || target <= 0) {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={{ fontSize: 15, color: t.colors.secondaryLabel, fontWeight: '500' }}>{label}</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: t.colors.label }}>{cur}{unit}</Text>
      </View>
    );
  }

  const tgt = Math.round(target);
  const over = current > target;
  const remaining = Math.round(target - current);

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={{ fontSize: 15, color: t.colors.secondaryLabel, fontWeight: '500' }}>{label}</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: t.colors.label }}>{cur} / {tgt}{unit}</Text>
      </View>
      <View style={{ marginTop: 6 }}>
        <ProgressBar value={current} target={target} />
      </View>
      <Text style={{ fontSize: 12, marginTop: 4, color: over ? t.colors.warning : t.colors.secondaryLabel, fontWeight: over ? '600' : '400' }}>
        {over ? `${Math.abs(remaining)}${unit} over` : `${remaining}${unit} left`}
      </Text>
    </View>
  );
}

// ── Goals modal (themed) ─────────────────────────────────────────────────────
function GoalsModal({ visible, initial, onClose, onSave }: {
  visible: boolean; initial: Targets; onClose: () => void; onSave: (t: Targets) => void;
}) {
  const t = useTheme();
  const toStr = (v: number | null) => (v == null ? '' : String(v));
  const [kcal, setKcal] = useState(toStr(initial.kcal));
  const [protein, setProtein] = useState(toStr(initial.protein_g));
  const [carbs, setCarbs] = useState(toStr(initial.carbs_g));
  const [fat, setFat] = useState(toStr(initial.fat_g));

  useEffect(() => {
    if (visible) {
      setKcal(toStr(initial.kcal));
      setProtein(toStr(initial.protein_g));
      setCarbs(toStr(initial.carbs_g));
      setFat(toStr(initial.fat_g));
    }
  }, [visible, initial]);

  function parse(v: string): number | null {
    const s = v.trim();
    if (!s) return null;
    const n = parseFloat(s);
    return isFinite(n) && n > 0 ? n : null;
  }

  function handleSave() {
    onSave({ kcal: parse(kcal), protein_g: parse(protein), carbs_g: parse(carbs), fat_g: parse(fat) });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.colors.bgGrouped }}>
        <ModalHeader theme={t} left="Cancel" onLeft={onClose} title="Daily Goals" right="Save" onRight={handleSave} />
        <ScrollView contentContainerStyle={{ padding: t.spacing.lg, gap: t.spacing.md }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 13, color: t.colors.secondaryLabel, marginBottom: t.spacing.sm }}>
            Leave a field blank to track that macro without a goal.
          </Text>
          <Field theme={t} label="Calories (kcal)" value={kcal} onChange={setKcal} />
          <Field theme={t} label="Protein (g)" value={protein} onChange={setProtein} />
          <Field theme={t} label="Carbs (g)" value={carbs} onChange={setCarbs} />
          <Field theme={t} label="Fat (g)" value={fat} onChange={setFat} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function Field({ theme, label, value, onChange }: { theme: Theme; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View>
      <Text style={{ fontSize: 13, color: theme.colors.secondaryLabel, marginBottom: 4 }}>{label}</Text>
      <TextInput
        style={{ backgroundColor: theme.colors.card, color: theme.colors.label, borderRadius: theme.radius.control, padding: 12, fontSize: 16 }}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder="—"
        placeholderTextColor={theme.colors.secondaryLabel}
      />
    </View>
  );
}

// Shared modal header (Cancel/Title/Save). A precursor to PR2's `Sheet` component.
function ModalHeader({ theme, left, onLeft, title, right, onRight }: {
  theme: Theme; left: string; onLeft: () => void; title: string; right?: string; onRight?: () => void;
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
      borderBottomWidth: 0.5, borderBottomColor: theme.colors.separator, backgroundColor: theme.colors.bg,
    }}>
      <TouchableOpacity onPress={onLeft} hitSlop={8}><Text style={{ fontSize: 17, color: theme.colors.accent }}>{left}</Text></TouchableOpacity>
      <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: theme.colors.label, marginHorizontal: theme.spacing.sm }} numberOfLines={1}>{title}</Text>
      {right && onRight
        ? <TouchableOpacity onPress={onRight} hitSlop={8}><Text style={{ fontSize: 17, fontWeight: '600', color: theme.colors.accent }}>{right}</Text></TouchableOpacity>
        : <View style={{ width: 50 }} />}
    </View>
  );
}
