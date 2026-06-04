import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import {
  getDailyMacros,
  getFoodLogForDate,
  getWorkoutsForDate,
  getSetsForWorkout,
  getTargets,
  setTargets,
  toDateString,
  type DailyMacros,
  type Targets,
  type Workout,
  type WorkoutSet,
} from '../db/queries';

type WorkoutWithSets = Workout & { sets: WorkoutSet[] };

const EMPTY_TARGETS: Targets = { kcal: null, protein_g: null, carbs_g: null, fat_g: null };

export default function HomeScreen() {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [macros, setMacros] = useState<DailyMacros>({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  const [targets, setTargetsState] = useState<Targets>(EMPTY_TARGETS);
  const [workouts, setWorkouts] = useState<WorkoutWithSets[]>([]);
  const [foodCount, setFoodCount] = useState(0);
  const [goalsVisible, setGoalsVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);

  const dateStr = toDateString(date);

  const load = useCallback(async () => {
    const [m, t, ws, fl] = await Promise.all([
      getDailyMacros(dateStr),
      getTargets(),
      getWorkoutsForDate(dateStr),
      getFoodLogForDate(dateStr),
    ]);
    const withSets = await Promise.all(
      ws.map(async w => ({ ...w, sets: await getSetsForWorkout(w.id) }))
    );
    setMacros(m);
    setTargetsState(t);
    setWorkouts(withSets);
    setFoodCount(fl.length);
  }, [dateStr]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleSaveGoals(t: Targets) {
    await setTargets(t);
    setTargetsState(t);
    setGoalsVisible(false);
  }

  const isToday = dateStr === toDateString(new Date());

  return (
    <SafeAreaView style={s.safe}>
      {/* Date navigator */}
      <View style={s.dateRow}>
        <TouchableOpacity onPress={() => setDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })}>
          <Text style={s.arrow}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowPicker(true)}>
          <Text style={s.dateLabel}>
            {isToday ? 'Today' : date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })}>
          <Text style={s.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="spinner"
          maximumDate={new Date()}
          onChange={(_, d) => { setShowPicker(false); if (d) setDate(d); }}
        />
      )}

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Calorie card — tap for full nutrient breakdown */}
        <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={() => setDetailVisible(true)}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Nutrition</Text>
            <TouchableOpacity onPress={() => setGoalsVisible(true)}>
              <Text style={s.goalsBtn}>Goals</Text>
            </TouchableOpacity>
          </View>
          <CalorieHeadline current={macros.kcal} target={targets.kcal} />
          {foodCount === 0 && (
            <Text style={s.empty}>No food logged — go to Food tab to add entries.</Text>
          )}
          <Text style={s.detailLink}>View all nutrients ›</Text>
        </TouchableOpacity>

        {/* Workout card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Workout</Text>
          {workouts.length === 0 ? (
            <Text style={s.empty}>No workout logged — go to Workout tab to add one.</Text>
          ) : (
            workouts.map(w => (
              <View key={w.id} style={s.workoutBlock}>
                {w.name ? <Text style={s.workoutName}>{w.name}</Text> : null}
                {w.sets.map(set => (
                  <Text key={set.id} style={s.setLine}>
                    {`Set ${set.set_number}  ${set.exercise}${set.weight_kg != null ? `  ${set.weight_kg} kg` : ''}${set.reps != null ? `  ×${set.reps}` : ''}`}
                  </Text>
                ))}
                {w.sets.length === 0 && <Text style={s.empty}>No sets logged.</Text>}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <NutrientDetailModal
        visible={detailVisible}
        dateLabel={isToday ? 'Today' : date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
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
    </SafeAreaView>
  );
}

// Big remaining-calories headline. Falls back to the plain total if no kcal goal.
function CalorieHeadline({ current, target }: { current: number; target: number | null }) {
  const cur = Math.round(current);

  if (target == null || target <= 0) {
    return (
      <View style={s.kcalBlock}>
        <Text style={s.kcalBig}>{cur}</Text>
        <Text style={s.kcalSub}>kcal today</Text>
      </View>
    );
  }

  const tgt = Math.round(target);
  const remaining = tgt - cur;
  const over = remaining < 0;
  const fillPct = `${Math.min(current / target, 1) * 100}%` as const;

  return (
    <View style={s.kcalBlock}>
      <Text style={[s.kcalBig, over && s.kcalOver]}>{Math.abs(remaining)}</Text>
      <Text style={[s.kcalSub, over && s.kcalOverSub]}>{over ? 'kcal over' : 'kcal left'}</Text>
      <View style={s.kcalTrack}>
        <View style={[s.kcalFill, { width: fillPct, backgroundColor: over ? '#e6a100' : '#111' }]} />
      </View>
      <Text style={s.kcalMeta}>{cur} / {tgt} kcal</Text>
    </View>
  );
}

// Full nutrient breakdown — one MacroProgress row per tracked nutrient.
function NutrientDetailModal({ visible, dateLabel, macros, targets, onClose, onEditGoals }: {
  visible: boolean; dateLabel: string; macros: DailyMacros; targets: Targets;
  onClose: () => void; onEditGoals: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.modalSafe}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={s.modalCancel}>Done</Text></TouchableOpacity>
          <Text style={s.modalTitle}>Nutrients — {dateLabel}</Text>
          <TouchableOpacity onPress={onEditGoals}><Text style={s.modalSave}>Goals</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.modalBody}>
          <MacroProgress label="Calories" unit=" kcal" current={macros.kcal} target={targets.kcal} />
          <MacroProgress label="Protein" unit="g" current={macros.protein_g} target={targets.protein_g} />
          <MacroProgress label="Carbs" unit="g" current={macros.carbs_g} target={targets.carbs_g} />
          <MacroProgress label="Fat" unit="g" current={macros.fat_g} target={targets.fat_g} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// One macro row: progress bar vs target, or a plain total if no target is set.
function MacroProgress({ label, unit, current, target }: {
  label: string; unit: string; current: number; target: number | null;
}) {
  const cur = Math.round(current);

  if (target == null || target <= 0) {
    return (
      <View style={s.macroRow}>
        <View style={s.macroHeader}>
          <Text style={s.macroLabel}>{label}</Text>
          <Text style={s.macroValue}>{cur}{unit}</Text>
        </View>
      </View>
    );
  }

  const tgt = Math.round(target);
  const ratio = current / target;
  const over = current > target;
  const fillPct = `${Math.min(ratio, 1) * 100}%` as const;
  const remaining = Math.round(target - current);

  return (
    <View style={s.macroRow}>
      <View style={s.macroHeader}>
        <Text style={s.macroLabel}>{label}</Text>
        <Text style={s.macroValue}>
          {cur} / {tgt}{unit}
        </Text>
      </View>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: fillPct, backgroundColor: over ? '#e6a100' : '#111' }]} />
      </View>
      <Text style={[s.macroSub, over && s.macroOver]}>
        {over ? `${Math.abs(remaining)}${unit} over` : `${remaining}${unit} left`}
      </Text>
    </View>
  );
}

// ─── Goals modal ───────────────────────────────────────────────────────────────

function GoalsModal({ visible, initial, onClose, onSave }: {
  visible: boolean; initial: Targets; onClose: () => void; onSave: (t: Targets) => void;
}) {
  const toStr = (v: number | null) => (v == null ? '' : String(v));
  const [kcal, setKcal] = useState(toStr(initial.kcal));
  const [protein, setProtein] = useState(toStr(initial.protein_g));
  const [carbs, setCarbs] = useState(toStr(initial.carbs_g));
  const [fat, setFat] = useState(toStr(initial.fat_g));

  // Re-seed the fields whenever the modal reopens with current targets.
  useEffect(() => {
    if (visible) {
      setKcal(toStr(initial.kcal));
      setProtein(toStr(initial.protein_g));
      setCarbs(toStr(initial.carbs_g));
      setFat(toStr(initial.fat_g));
    }
  }, [visible, initial]);

  function parse(v: string): number | null {
    const t = v.trim();
    if (!t) return null;
    const n = parseFloat(t);
    return isFinite(n) && n > 0 ? n : null;
  }

  function handleSave() {
    onSave({
      kcal: parse(kcal),
      protein_g: parse(protein),
      carbs_g: parse(carbs),
      fat_g: parse(fat),
    });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.modalSafe}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={onClose}><Text style={s.modalCancel}>Cancel</Text></TouchableOpacity>
          <Text style={s.modalTitle}>Daily Goals</Text>
          <TouchableOpacity onPress={handleSave}><Text style={s.modalSave}>Save</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
          <Text style={s.modalHint}>Leave a field blank to track that macro without a goal.</Text>
          <Field label="Calories (kcal)" value={kcal} onChange={setKcal} />
          <Field label="Protein (g)" value={protein} onChange={setProtein} />
          <Field label="Carbs (g)" value={carbs} onChange={setCarbs} />
          <Field label="Fat (g)" value={fat} onChange={setFat} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput style={s.input} value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder="—" />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 16, gap: 16 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 20 },
  arrow: { fontSize: 28, color: '#333', paddingHorizontal: 8 },
  dateLabel: { fontSize: 17, fontWeight: '600', color: '#111' },
  card: { backgroundColor: '#f8f8f8', borderRadius: 12, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  goalsBtn: { fontSize: 13, fontWeight: '600', color: '#007aff' },
  kcalBlock: { alignItems: 'center', paddingVertical: 8 },
  kcalBig: { fontSize: 48, fontWeight: '800', color: '#111', lineHeight: 52 },
  kcalOver: { color: '#e6a100' },
  kcalSub: { fontSize: 14, color: '#888', marginTop: 2 },
  kcalOverSub: { color: '#e6a100', fontWeight: '600' },
  kcalTrack: { height: 8, width: '100%', backgroundColor: '#e4e4e4', borderRadius: 4, marginTop: 14, overflow: 'hidden' },
  kcalFill: { height: 8, borderRadius: 4 },
  kcalMeta: { fontSize: 12, color: '#999', marginTop: 6 },
  detailLink: { fontSize: 13, fontWeight: '600', color: '#007aff', textAlign: 'center', marginTop: 14 },
  macroRow: { marginBottom: 14 },
  macroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  macroLabel: { fontSize: 14, color: '#555', fontWeight: '500' },
  macroValue: { fontSize: 15, fontWeight: '700', color: '#111' },
  barTrack: { height: 8, backgroundColor: '#e4e4e4', borderRadius: 4, marginTop: 6, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  macroSub: { fontSize: 12, color: '#999', marginTop: 4 },
  macroOver: { color: '#e6a100', fontWeight: '600' },
  empty: { fontSize: 13, color: '#aaa', fontStyle: 'italic', marginTop: 4 },
  workoutBlock: { marginBottom: 12 },
  workoutName: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
  setLine: { fontSize: 14, color: '#555', paddingVertical: 2 },
  // modal
  modalSafe: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd' },
  modalTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: '#111', marginHorizontal: 8 },
  modalCancel: { fontSize: 15, color: '#666' },
  modalSave: { fontSize: 15, color: '#007aff', fontWeight: '600' },
  modalBody: { padding: 20, gap: 8 },
  modalHint: { fontSize: 13, color: '#999', marginBottom: 8 },
  field: { marginBottom: 8 },
  fieldLabel: { fontSize: 13, color: '#666', marginBottom: 4 },
  input: { backgroundColor: '#f2f2f2', borderRadius: 8, padding: 12, fontSize: 16 },
});
