import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { scheduleRestDone, cancelRest } from '../lib/restNotify';
import { useFocusEffect } from '@react-navigation/native';
import ExerciseHistoryModal from './ExerciseHistoryModal';
import WeeklyPlanModal from './WeeklyPlanModal';
import DayAdjustModal from './DayAdjustModal';
import {
  createWorkout,
  deleteWorkout,
  getLastSessionSets,
  getPlannedType,
  getSetsForWorkout,
  getWorkoutByDateAndName,
  isDone,
  setDone as markDone,
  toDateString,
  upsertSet,
} from '../db/queries';
import {
  SPLITS,
  SETS_PER_EXERCISE,
  isStrengthSplit,
  isRepsOnly,
  WEIGHT_OPTIONS,
  REPS_OPTIONS,
  DEFAULT_WEIGHT,
  DEFAULT_REPS,
  snapWeight,
  snapReps,
} from '../db/workoutTemplates';

type Cell = { weight: string; reps: string };
const cellKey = (exercise: string, setNo: number) => `${exercise}@@${setNo}`;
const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const REST_SECONDS = 180; // 3 min rest between sets
const DONE_FLASH_MS = 3000; // how long the "Go!" cue lingers after 0:00

export default function WorkoutScreen() {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [plannedType, setPlannedType] = useState<string>('Rest');
  const [workoutId, setWorkoutId] = useState<number | null>(null);
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [lastSets, setLastSets] = useState<Record<string, Cell>>({});
  const [openExercise, setOpenExercise] = useState<string | null>(null);
  const [openSet, setOpenSet] = useState<number>(0); // which set's wheels are expanded (0 = none)
  const [done, setDoneFlag] = useState(false);
  const [historyExercise, setHistoryExercise] = useState<string | null>(null);
  const [weeklyVisible, setWeeklyVisible] = useState(false);
  const [adjustVisible, setAdjustVisible] = useState(false);

  // Rest timer — one shared countdown. restKey marks which set row owns it;
  // restEndsAt is an absolute epoch so it stays correct across backgrounding.
  const [restKey, setRestKey] = useState<string | null>(null);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [doneFlashKey, setDoneFlashKey] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const notifId = useRef<string | null>(null);

  // Tick once a second while a rest is running; fire haptic + flash at zero.
  useEffect(() => {
    if (restEndsAt == null) return;
    const finishedKey = restKey;
    const id = setInterval(() => {
      const now = Date.now();
      setNowTick(now);
      if (now >= restEndsAt) {
        clearInterval(id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setRestEndsAt(null);
        setRestKey(null);
        notifId.current = null; // the scheduled notification fires on its own
        setDoneFlashKey(finishedKey);
        setTimeout(() => setDoneFlashKey(prev => (prev === finishedKey ? null : prev)), DONE_FLASH_MS);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [restEndsAt, restKey]);

  // Cancel any pending notification when the screen unmounts.
  useEffect(() => () => { cancelRest(notifId.current); }, []);

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

      // Last-session hints: most recent prior date each exercise was logged.
      const last: Record<string, Cell> = {};
      for (const ex of SPLITS[planned] ?? []) {
        const prev = await getLastSessionSets(ex, dateStr);
        for (let setNo = 1; setNo <= SETS_PER_EXERCISE; setNo++) {
          const v = prev[setNo];
          if (v) {
            last[cellKey(ex, setNo)] = {
              weight: v.weight_kg != null ? String(v.weight_kg) : '',
              reps: v.reps != null ? String(v.reps) : '',
            };
          }
        }
      }
      setLastSets(last);
    } else {
      setWorkoutId(null);
      setCells({});
      setLastSets({});
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

  // What the wheels currently show for a set: live wheel selection (cells) →
  // last session (snapped to the grid) → sensible default. Reps-only exercises
  // have no weight. This is both the Picker's selectedValue and what ✓ saves.
  function resolveCell(exercise: string, setNo: number): { weight: number | null; reps: number } {
    const key = cellKey(exercise, setNo);
    const c = cells[key];
    const last = lastSets[key];
    const wStr = c?.weight.trim() ? c.weight : last?.weight.trim() ? last.weight : '';
    const rStr = c?.reps.trim() ? c.reps : last?.reps.trim() ? last.reps : '';
    const weight = isRepsOnly(exercise)
      ? null
      : snapWeight(wStr ? parseFloat(wStr) : DEFAULT_WEIGHT);
    const reps = snapReps(rStr ? parseInt(rStr, 10) : DEFAULT_REPS);
    return { weight, reps };
  }

  // Save a set with the values its wheels currently show, and mirror them into
  // local state so the X/3 badge and auto-done stay in sync.
  async function commitCell(exercise: string, setNo: number) {
    const { weight, reps } = resolveCell(exercise, setNo);
    setCell(exercise, setNo, { weight: weight != null ? String(weight) : '', reps: String(reps) });
    try {
      const id = await ensureWorkout();
      await upsertSet(id, exercise, setNo, weight, reps);
      setDoneFlag(await isDone(dateStr));   // auto-done may have flipped
    } catch (e: any) {
      Alert.alert('Error saving set', e?.message ?? 'Unknown error');
    }
  }

  function stopRest() {
    cancelRest(notifId.current);
    notifId.current = null;
    setRestEndsAt(null);
    setRestKey(null);
  }

  // Green button: save the set, then (re)start the 3:00 rest countdown on it.
  async function handleConfirmSet(exercise: string, setNo: number) {
    await commitCell(exercise, setNo);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    cancelRest(notifId.current); // only one timer at a time
    const key = cellKey(exercise, setNo);
    setDoneFlashKey(prev => (prev === key ? null : prev));
    setRestKey(key);
    setRestEndsAt(Date.now() + REST_SECONDS * 1000);
    setNowTick(Date.now());
    notifId.current = await scheduleRestDone(REST_SECONDS);
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
                      onPress={() => { setOpenExercise(prev => (prev === exercise ? null : exercise)); setOpenSet(0); }}
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
                    const key = cellKey(exercise, setNo);
                    const repsOnly = isRepsOnly(exercise);
                    const sel = resolveCell(exercise, setNo);
                    const resting = restKey === key && restEndsAt != null;
                    const remaining = resting ? Math.max(0, Math.ceil((restEndsAt! - nowTick) / 1000)) : 0;
                    const flashing = doneFlashKey === key;
                    const setOpen = openSet === setNo;
                    const summary = repsOnly ? `${sel.reps} reps` : `${sel.weight} kg × ${sel.reps}`;
                    return (
                      <View key={setNo} style={s.setBlock}>
                        <View style={s.setHeader}>
                          <TouchableOpacity
                            style={s.setHeaderTap}
                            activeOpacity={0.6}
                            onPress={() => setOpenSet(prev => (prev === setNo ? 0 : setNo))}
                          >
                            <Text style={s.setNum}>Set {setNo}</Text>
                            <Text style={s.setSummary}>{summary}</Text>
                            <Text style={s.chevron}>{setOpen ? '▾' : '▸'}</Text>
                          </TouchableOpacity>
                          {resting ? (
                            <TouchableOpacity style={[s.confirmBtn, s.restBtn]} onPress={stopRest} activeOpacity={0.7}>
                              <Text style={s.restCountdown}>
                                {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
                              </Text>
                            </TouchableOpacity>
                          ) : flashing ? (
                            <View style={[s.confirmBtn, s.goBtn]}>
                              <Text style={s.goText}>Go!</Text>
                            </View>
                          ) : (
                            <TouchableOpacity style={s.confirmBtn} onPress={() => handleConfirmSet(exercise, setNo)} activeOpacity={0.7}>
                              <Ionicons name="checkmark" size={22} color="#fff" />
                            </TouchableOpacity>
                          )}
                        </View>
                        {setOpen && (
                        <View style={s.wheelRow}>
                          {!repsOnly && (
                            <View style={s.wheelCol}>
                              <Text style={s.wheelCap}>kg</Text>
                              <Picker
                                selectedValue={sel.weight as number}
                                onValueChange={v => setCell(exercise, setNo, { weight: String(v) })}
                                style={s.wheel}
                                itemStyle={s.wheelItem}
                              >
                                {WEIGHT_OPTIONS.map(w => <Picker.Item key={w} label={String(w)} value={w} />)}
                              </Picker>
                            </View>
                          )}
                          <View style={s.wheelCol}>
                            <Text style={s.wheelCap}>reps</Text>
                            <Picker
                              selectedValue={sel.reps}
                              onValueChange={v => setCell(exercise, setNo, { reps: String(v) })}
                              style={s.wheel}
                              itemStyle={s.wheelItem}
                            >
                              {REPS_OPTIONS.map(r => <Picker.Item key={r} label={String(r)} value={r} />)}
                            </Picker>
                          </View>
                        </View>
                        )}
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
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      <ExerciseHistoryModal exercise={historyExercise} onClose={() => setHistoryExercise(null)} />
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
  setBlock: { marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e8e8e8', paddingTop: 6 },
  setHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  setHeaderTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  setNum: { fontSize: 13, color: '#999', fontWeight: '600' },
  setSummary: { flex: 1, fontSize: 14, color: '#222', fontWeight: '600' },
  wheelRow: { flexDirection: 'row', gap: 12 },
  wheelCol: { flex: 1, alignItems: 'center' },
  wheelCap: { fontSize: 11, color: '#aaa', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  wheel: { width: '100%', height: 132 },
  wheelItem: { fontSize: 20, height: 132 },
  confirmBtn: { width: 56, height: 38, borderRadius: 8, backgroundColor: '#1a9e54', alignItems: 'center', justifyContent: 'center' },
  restBtn: { backgroundColor: '#222' },
  restCountdown: { color: '#fff', fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  goBtn: { backgroundColor: '#1a9e54' },
  goText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  doneBadge: { borderWidth: 1.5, borderColor: '#1a9e54', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  doneBadgeOn: { backgroundColor: '#1a9e54' },
  doneText: { fontSize: 15, fontWeight: '700', color: '#1a9e54' },
  doneTextOn: { color: '#fff' },
  clearLink: { alignItems: 'center', paddingVertical: 8 },
  clearText: { fontSize: 13, color: '#e00' },
  restCard: { backgroundColor: '#f8f8f8', borderRadius: 12, padding: 28, alignItems: 'center' },
  restEmoji: { fontSize: 40 },
  restTitle: { fontSize: 20, fontWeight: '800', color: '#111', marginTop: 8 },
  restSub: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 6 },
});
