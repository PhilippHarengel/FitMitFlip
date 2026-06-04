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
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import ExerciseHistoryModal from './ExerciseHistoryModal';
import ImportScreen from './ImportScreen';
import WeeklyPlanModal from './WeeklyPlanModal';
import DayAdjustModal from './DayAdjustModal';
import {
  createWorkout,
  deleteWorkout,
  getPlannedType,
  getSetsForWorkout,
  getWorkoutByDateAndName,
  isDone,
  setDone as markDone,
  toDateString,
  upsertSet,
} from '../db/queries';
import { SPLITS, SETS_PER_EXERCISE, isStrengthSplit } from '../db/workoutTemplates';

type Cell = { weight: string; reps: string };
const cellKey = (exercise: string, setNo: number) => `${exercise}@@${setNo}`;
const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function WorkoutScreen() {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [plannedType, setPlannedType] = useState<string>('Rest');
  const [workoutId, setWorkoutId] = useState<number | null>(null);
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [openExercise, setOpenExercise] = useState<string | null>(null);
  const [done, setDoneFlag] = useState(false);
  const [historyExercise, setHistoryExercise] = useState<string | null>(null);
  const [importVisible, setImportVisible] = useState(false);
  const [weeklyVisible, setWeeklyVisible] = useState(false);
  const [adjustVisible, setAdjustVisible] = useState(false);

  const dateStr = toDateString(date);
  const isToday = dateStr === toDateString(new Date());
  const isStrength = isStrengthSplit(plannedType);

  const load = useCallback(async () => {
    const planned = await getPlannedType(dateStr);
    setPlannedType(planned);
    setDoneFlag(await isDone(dateStr));
    setOpenExercise(null);

    if (isStrengthSplit(planned)) {
      const existing = await getWorkoutByDateAndName(dateStr, planned);
      const next: Record<string, Cell> = {};
      if (existing) {
        const sets = await getSetsForWorkout(existing.id);
        for (const s of sets) {
          next[cellKey(s.exercise, s.set_number)] = {
            weight: s.weight_kg != null ? String(s.weight_kg) : '',
            reps: s.reps != null ? String(s.reps) : '',
          };
        }
      }
      setWorkoutId(existing ? existing.id : null);
      setCells(next);
    } else {
      setWorkoutId(null);
      setCells({});
    }
  }, [dateStr]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function filledCount(exercise: string): number {
    let n = 0;
    for (let setNo = 1; setNo <= SETS_PER_EXERCISE; setNo++) {
      const c = cells[cellKey(exercise, setNo)];
      if (c && (c.weight.trim() || c.reps.trim())) n++;
    }
    return n;
  }

  function setCell(exercise: string, setNo: number, patch: Partial<Cell>) {
    const key = cellKey(exercise, setNo);
    setCells(prev => {
      const base: Cell = prev[key] ?? { weight: '', reps: '' };
      return { ...prev, [key]: { ...base, ...patch } };
    });
  }

  // Create the workout row lazily — only once the user actually logs a set.
  async function ensureWorkout(): Promise<number> {
    if (workoutId != null) return workoutId;
    const id = await createWorkout(dateStr, plannedType);
    setWorkoutId(id);
    return id;
  }

  async function commitCell(exercise: string, setNo: number) {
    const c = cells[cellKey(exercise, setNo)] ?? { weight: '', reps: '' };
    const w = c.weight.trim() ? parseFloat(c.weight) : null;
    const r = c.reps.trim() ? parseInt(c.reps, 10) : null;
    try {
      const id = await ensureWorkout();
      await upsertSet(id, exercise, setNo, isFinite(w as number) ? w : null, isFinite(r as number) ? r : null);
      setDoneFlag(await isDone(dateStr));   // auto-done may have flipped
    } catch (e: any) {
      Alert.alert('Error saving set', e?.message ?? 'Unknown error');
    }
  }

  async function toggleDone() {
    const next = !done;
    setDoneFlag(next);
    await markDone(dateStr, next);
  }

  function handleDeleteWorkout() {
    if (workoutId == null) return;
    Alert.alert('Clear this workout?', `Removes all logged sets for ${plannedType} on this day.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => { await deleteWorkout(workoutId); await load(); } },
    ]);
  }

  const weekdayLabel = WD[date.getDay()];

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
            onChange={(_, d) => { setShowPicker(false); if (d) setDate(d); }}
          />
        )}

        {/* Plan header — always shown */}
        <View style={s.planHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.planDay}>{weekdayLabel}{isToday ? ' · Today' : ''}</Text>
            <Text style={s.planType}>{plannedType}</Text>
          </View>
          <View style={s.planActions}>
            <TouchableOpacity onPress={() => setAdjustVisible(true)}><Text style={s.headerBtn}>Change</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setWeeklyVisible(true)}><Text style={s.headerBtn}>Plan</Text></TouchableOpacity>
          </View>
        </View>

        {isStrength ? (
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            {SPLITS[plannedType].map(exercise => {
              const isOpen = openExercise === exercise;
              const filled = filledCount(exercise);
              return (
                <View key={exercise} style={s.exerciseCard}>
                  <View style={s.exerciseHeader}>
                    <TouchableOpacity
                      style={s.exerciseToggle}
                      activeOpacity={0.6}
                      onPress={() => setOpenExercise(prev => (prev === exercise ? null : exercise))}
                    >
                      <Text style={s.exerciseName}>{exercise}</Text>
                      <Text style={[s.exerciseBadge, filled > 0 && s.exerciseBadgeDone]}>{filled}/{SETS_PER_EXERCISE}</Text>
                      <Text style={s.chevron}>{isOpen ? '▾' : '▸'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.historyBtn} onPress={() => setHistoryExercise(exercise)}>
                      <Ionicons name="stats-chart-outline" size={18} color="#007aff" />
                    </TouchableOpacity>
                  </View>

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

            {/* Done — auto once sets are logged, tap to override */}
            <TouchableOpacity style={[s.doneBadge, done && s.doneBadgeOn]} onPress={toggleDone}>
              <Text style={[s.doneText, done && s.doneTextOn]}>{done ? '✓ Workout done' : 'Mark workout done'}</Text>
            </TouchableOpacity>

            {workoutId != null && (
              <TouchableOpacity style={s.clearLink} onPress={handleDeleteWorkout}>
                <Text style={s.clearText}>Clear logged sets</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.importLink} onPress={() => setImportVisible(true)}>
              <Text style={s.importLinkText}>Import past data</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={s.scroll}>
            <View style={s.restCard}>
              <Text style={s.restEmoji}>{plannedType === 'Jogging' ? '🏃' : '😴'}</Text>
              <Text style={s.restTitle}>{plannedType === 'Jogging' ? 'Jogging day' : 'Rest day'}</Text>
              <Text style={s.restSub}>
                {plannedType === 'Jogging'
                  ? 'Go for your run, then mark it done.'
                  : 'No training scheduled. Tap Change to train anyway.'}
              </Text>
              {plannedType === 'Jogging' && (
                <TouchableOpacity style={[s.doneBadge, done && s.doneBadgeOn, { marginTop: 16 }]} onPress={toggleDone}>
                  <Text style={[s.doneText, done && s.doneTextOn]}>{done ? '✓ Done' : 'Mark done'}</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={s.importLink} onPress={() => setImportVisible(true)}>
              <Text style={s.importLinkText}>Import past data</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      <ExerciseHistoryModal exercise={historyExercise} onClose={() => setHistoryExercise(null)} />
      <ImportScreen visible={importVisible} onClose={() => setImportVisible(false)} onImported={() => load()} />
      <WeeklyPlanModal visible={weeklyVisible} onClose={() => setWeeklyVisible(false)} onChanged={() => load()} />
      <DayAdjustModal
        date={adjustVisible ? dateStr : null}
        currentType={plannedType}
        onClose={() => setAdjustVisible(false)}
        onChanged={() => load()}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 16, gap: 12, paddingBottom: 48 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 20 },
  arrow: { fontSize: 28, color: '#333', paddingHorizontal: 8 },
  dateLabel: { fontSize: 17, fontWeight: '600', color: '#111' },
  planHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 },
  planDay: { fontSize: 13, color: '#888', fontWeight: '600' },
  planType: { fontSize: 22, fontWeight: '800', color: '#111' },
  planActions: { flexDirection: 'row', gap: 18 },
  headerBtn: { fontSize: 14, color: '#007aff', fontWeight: '600' },
  exerciseCard: { backgroundColor: '#f8f8f8', borderRadius: 12, padding: 14 },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center' },
  exerciseToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  exerciseName: { fontSize: 15, fontWeight: '600', color: '#222', flex: 1 },
  historyBtn: { paddingLeft: 14, paddingVertical: 2 },
  exerciseBadge: { fontSize: 12, fontWeight: '600', color: '#bbb' },
  exerciseBadgeDone: { color: '#111' },
  chevron: { fontSize: 14, color: '#999', width: 14, textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, marginTop: 8 },
  setNum: { width: 48, fontSize: 13, color: '#999', fontWeight: '600' },
  cellInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 9, fontSize: 15, textAlign: 'center' },
  doneBadge: { borderWidth: 1.5, borderColor: '#1a9e54', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  doneBadgeOn: { backgroundColor: '#1a9e54' },
  doneText: { fontSize: 15, fontWeight: '700', color: '#1a9e54' },
  doneTextOn: { color: '#fff' },
  clearLink: { alignItems: 'center', paddingVertical: 8 },
  clearText: { fontSize: 13, color: '#e00' },
  importLink: { alignItems: 'center', paddingVertical: 10 },
  importLinkText: { color: '#007aff', fontSize: 14, fontWeight: '600' },
  restCard: { backgroundColor: '#f8f8f8', borderRadius: 12, padding: 28, alignItems: 'center' },
  restEmoji: { fontSize: 40 },
  restTitle: { fontSize: 20, fontWeight: '800', color: '#111', marginTop: 8 },
  restSub: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 6 },
});
