import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
  createWorkout,
  deleteWorkout,
  getSetsForWorkout,
  getWorkoutByDateAndName,
  toDateString,
  upsertSet,
} from '../db/queries';
import { SPLITS, SPLIT_NAMES, SETS_PER_EXERCISE } from '../db/workoutTemplates';

// Local input state, keyed per (exercise, set number).
type Cell = { weight: string; reps: string };
const cellKey = (exercise: string, setNo: number) => `${exercise}@@${setNo}`;

export default function WorkoutScreen() {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [activeSplit, setActiveSplit] = useState<string | null>(null);
  const [workoutId, setWorkoutId] = useState<number | null>(null);
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [openExercise, setOpenExercise] = useState<string | null>(null);

  const dateStr = toDateString(date);
  const isToday = dateStr === toDateString(new Date());

  // Load: find whichever split was already started for this date (if any).
  const load = useCallback(async () => {
    for (const split of SPLIT_NAMES) {
      const w = await getWorkoutByDateAndName(dateStr, split);
      if (w) {
        await openWorkout(split, w.id);
        return;
      }
    }
    // None started → show the picker.
    setActiveSplit(null);
    setWorkoutId(null);
    setCells({});
  }, [dateStr]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function openWorkout(split: string, id: number) {
    const sets = await getSetsForWorkout(id);
    const next: Record<string, Cell> = {};
    for (const s of sets) {
      next[cellKey(s.exercise, s.set_number)] = {
        weight: s.weight_kg != null ? String(s.weight_kg) : '',
        reps: s.reps != null ? String(s.reps) : '',
      };
    }
    setActiveSplit(split);
    setWorkoutId(id);
    setCells(next);
    setOpenExercise(null);   // land on the collapsed exercise list
  }

  // How many of an exercise's sets have any data entered (for the header badge).
  function filledCount(exercise: string): number {
    let n = 0;
    for (let setNo = 1; setNo <= SETS_PER_EXERCISE; setNo++) {
      const c = cells[cellKey(exercise, setNo)];
      if (c && (c.weight.trim() || c.reps.trim())) n++;
    }
    return n;
  }

  async function handlePickSplit(split: string) {
    const existing = await getWorkoutByDateAndName(dateStr, split);
    const id = existing ? existing.id : await createWorkout(dateStr, split);
    await openWorkout(split, id);
  }

  function setCell(exercise: string, setNo: number, patch: Partial<Cell>) {
    const key = cellKey(exercise, setNo);
    setCells(prev => {
      const base: Cell = prev[key] ?? { weight: '', reps: '' };
      return { ...prev, [key]: { ...base, ...patch } };
    });
  }

  // Persist one set on field blur.
  async function commitCell(exercise: string, setNo: number) {
    if (workoutId == null) return;
    const c = cells[cellKey(exercise, setNo)] ?? { weight: '', reps: '' };
    const w = c.weight.trim() ? parseFloat(c.weight) : null;
    const r = c.reps.trim() ? parseInt(c.reps, 10) : null;
    try {
      await upsertSet(workoutId, exercise, setNo, isFinite(w as number) ? w : null, isFinite(r as number) ? r : null);
    } catch (e: any) {
      Alert.alert('Error saving set', e?.message ?? 'Unknown error');
    }
  }

  function handleChangeSplit() {
    setActiveSplit(null);
  }

  function handleDeleteWorkout() {
    if (workoutId == null) return;
    Alert.alert('Delete this workout?', `Removes the ${activeSplit} workout and all its sets for this day.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteWorkout(workoutId);
          await load();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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

        {activeSplit == null ? (
          // ── Split picker ──
          <ScrollView contentContainerStyle={s.scroll}>
            <Text style={s.pickPrompt}>Choose today's workout</Text>
            {SPLIT_NAMES.map(split => (
              <TouchableOpacity key={split} style={s.splitBtn} onPress={() => handlePickSplit(split)}>
                <Text style={s.splitBtnText}>{split}</Text>
                <Text style={s.splitBtnSub}>{SPLITS[split].length} exercises · {SETS_PER_EXERCISE} sets each</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          // ── Templated logging ──
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            <View style={s.splitHeader}>
              <Text style={s.splitTitle}>{activeSplit}</Text>
              <View style={s.splitActions}>
                <TouchableOpacity onPress={handleChangeSplit}><Text style={s.changeBtn}>Change</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleDeleteWorkout}><Text style={s.deleteBtn}>Delete</Text></TouchableOpacity>
              </View>
            </View>

            {SPLITS[activeSplit].map(exercise => {
              const isOpen = openExercise === exercise;
              const done = filledCount(exercise);
              return (
                <View key={exercise} style={s.exerciseCard}>
                  <TouchableOpacity
                    style={s.exerciseHeader}
                    activeOpacity={0.6}
                    onPress={() => setOpenExercise(prev => (prev === exercise ? null : exercise))}
                  >
                    <Text style={s.exerciseName}>{exercise}</Text>
                    <View style={s.exerciseMeta}>
                      <Text style={[s.exerciseBadge, done > 0 && s.exerciseBadgeDone]}>{done}/{SETS_PER_EXERCISE}</Text>
                      <Text style={s.chevron}>{isOpen ? '▾' : '▸'}</Text>
                    </View>
                  </TouchableOpacity>

                  {isOpen && Array.from({ length: SETS_PER_EXERCISE }, (_, i) => i + 1).map(setNo => {
                    const c = cells[cellKey(exercise, setNo)] ?? { weight: '', reps: '' };
                    return (
                      <View key={setNo} style={s.setRow}>
                        <Text style={s.setNum}>Set {setNo}</Text>
                        <TextInput
                          style={s.cellInput}
                          placeholder="kg"
                          value={c.weight}
                          onChangeText={t => setCell(exercise, setNo, { weight: t })}
                          onEndEditing={() => commitCell(exercise, setNo)}
                          keyboardType="decimal-pad"
                        />
                        <TextInput
                          style={s.cellInput}
                          placeholder="reps"
                          value={c.reps}
                          onChangeText={t => setCell(exercise, setNo, { reps: t })}
                          onEndEditing={() => commitCell(exercise, setNo)}
                          keyboardType="number-pad"
                        />
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 16, gap: 12, paddingBottom: 48 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 20 },
  arrow: { fontSize: 28, color: '#333', paddingHorizontal: 8 },
  dateLabel: { fontSize: 17, fontWeight: '600', color: '#111' },
  // picker
  pickPrompt: { fontSize: 15, color: '#888', textAlign: 'center', marginBottom: 8 },
  splitBtn: { backgroundColor: '#111', borderRadius: 12, padding: 18, alignItems: 'center' },
  splitBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  splitBtnSub: { color: '#bbb', fontSize: 12, marginTop: 4 },
  // logging
  splitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  splitTitle: { fontSize: 20, fontWeight: '800', color: '#111' },
  splitActions: { flexDirection: 'row', gap: 16 },
  changeBtn: { fontSize: 14, color: '#007aff', fontWeight: '600' },
  deleteBtn: { fontSize: 14, color: '#e00' },
  exerciseCard: { backgroundColor: '#f8f8f8', borderRadius: 12, padding: 14 },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseName: { fontSize: 15, fontWeight: '600', color: '#222', flex: 1 },
  exerciseMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exerciseBadge: { fontSize: 12, fontWeight: '600', color: '#bbb' },
  exerciseBadgeDone: { color: '#111' },
  chevron: { fontSize: 14, color: '#999', width: 14, textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, marginTop: 8 },
  setNum: { width: 48, fontSize: 13, color: '#999', fontWeight: '600' },
  cellInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 9, fontSize: 15, textAlign: 'center' },
});
