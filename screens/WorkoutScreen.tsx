import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Haptics from 'expo-haptics';
import { scheduleRestDone, cancelRest } from '../lib/restNotify';
import { useFocusEffect } from '@react-navigation/native';
import ExerciseHistoryModal from './ExerciseHistoryModal';
import WeeklyPlanModal from './WeeklyPlanModal';
import DayAdjustModal from './DayAdjustModal';
import DateNavigator from '../components/DateNavigator';
import { useSelectedDate } from '../components/DateContext';
import { Screen, SwipeRow, Icon, RestDoneBanner } from '../components/ui';
import { useTheme } from '../theme';
import {
  createWorkout,
  deleteWorkout,
  deleteSetEntry,
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
  const t = useTheme();
  const { date, setDate } = useSelectedDate();
  const [plannedType, setPlannedType] = useState<string>('Rest');
  const [workoutId, setWorkoutId] = useState<number | null>(null);
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [lastSets, setLastSets] = useState<Record<string, Cell>>({});
  const [committed, setCommitted] = useState<Set<string>>(new Set()); // sets saved via ✓ / loaded from DB
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
        cancelRest(notifId.current);
        notifId.current = null;
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
      const saved = new Set<string>();
      if (existing) {
        const sets = await getSetsForWorkout(existing.id);
        for (const sset of sets) {
          const k = cellKey(sset.exercise, sset.set_number);
          next[k] = {
            weight: sset.weight_kg != null ? String(sset.weight_kg) : '',
            reps: sset.reps != null ? String(sset.reps) : '',
          };
          saved.add(k);
        }
      }
      setWorkoutId(existing ? existing.id : null);
      setCells(next);
      setCommitted(saved);

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
      setCommitted(new Set());
    }
  }, [dateStr]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function filledCount(exercise: string): number {
    let n = 0;
    for (let setNo = 1; setNo <= SETS_PER_EXERCISE; setNo++) {
      if (committed.has(cellKey(exercise, setNo))) n++;
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
      setCommitted(prev => new Set(prev).add(cellKey(exercise, setNo)));
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

  // Green button: save the set, (re)start the 3:00 rest countdown, then collapse
  // this set's wheels and open the next uncommitted set so logging flows along.
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

    // Advance: first set in this exercise that's still unlogged.
    let next = 0;
    for (let n = 1; n <= SETS_PER_EXERCISE; n++) {
      if (n !== setNo && !committed.has(cellKey(exercise, n))) { next = n; break; }
    }
    setOpenSet(next);
  }

  // Un-log a confirmed set — remove the saved row, mark it not finished, reset
  // its wheels to last session's numbers, stop its timer.
  async function handleDeleteSet(exercise: string, setNo: number) {
    const key = cellKey(exercise, setNo);
    if (restKey === key) stopRest();
    try {
      if (workoutId != null) await deleteSetEntry(workoutId, exercise, setNo);
    } catch (e: any) {
      Alert.alert('Error deleting set', e?.message ?? 'Unknown error');
      return;
    }
    setCommitted(prev => { const n = new Set(prev); n.delete(key); return n; });
    setCells(prev => { const n = { ...prev }; delete n[key]; return n; });
    setDoneFlashKey(prev => (prev === key ? null : prev));
    setDoneFlag(await isDone(dateStr));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  // Clear every committed set for one exercise (from the exercise context menu).
  async function clearExercise(exercise: string) {
    if (workoutId == null) return;
    for (let n = 1; n <= SETS_PER_EXERCISE; n++) {
      const key = cellKey(exercise, n);
      if (committed.has(key)) {
        if (restKey === key) stopRest();
        try { await deleteSetEntry(workoutId, exercise, n); } catch { /* keep going */ }
      }
    }
    setCommitted(prev => { const n = new Set(prev); for (let i = 1; i <= SETS_PER_EXERCISE; i++) n.delete(cellKey(exercise, i)); return n; });
    setCells(prev => { const n = { ...prev }; for (let i = 1; i <= SETS_PER_EXERCISE; i++) delete n[cellKey(exercise, i)]; return n; });
    setDoneFlag(await isDone(dateStr));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  // Long-press an exercise → native action menu. iOS uses ActionSheetIOS; Android
  // falls back to Alert (ActionSheetIOS is iOS-only). Both work in Expo Go.
  function showExerciseMenu(exercise: string) {
    const filled = filledCount(exercise);
    const actions: { label: string; destructive?: boolean; run: () => void }[] = [
      { label: 'View history', run: () => setHistoryExercise(exercise) },
    ];
    if (filled > 0) actions.push({ label: 'Clear logged sets', destructive: true, run: () => clearExercise(exercise) });

    if (Platform.OS === 'ios') {
      const options = [...actions.map(a => a.label), 'Cancel'];
      const destructiveButtonIndex = actions.findIndex(a => a.destructive);
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: exercise,
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
        },
        i => { if (i < actions.length) actions[i].run(); }
      );
    } else {
      Alert.alert(exercise, undefined, [
        ...actions.map(a => ({ text: a.label, style: (a.destructive ? 'destructive' : 'default') as 'destructive' | 'default', onPress: a.run })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
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
    <View style={{ flex: 1 }}>
    <Screen topSafeArea header={<DateNavigator date={date} onChange={setDate} />}>
      {/* Plan header */}
      <View style={L.planHeader}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: t.colors.secondaryLabel, fontWeight: '600' }}>{weekdayLabel}{isToday ? ' · Today' : ''}</Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: t.colors.label }}>{plannedType}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: t.spacing.lg }}>
          <TouchableOpacity onPress={() => setAdjustVisible(true)}><Text style={{ fontSize: 15, color: t.colors.accent, fontWeight: '600' }}>Change</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setWeeklyVisible(true)}><Text style={{ fontSize: 15, color: t.colors.accent, fontWeight: '600' }}>Plan</Text></TouchableOpacity>
        </View>
      </View>

      {isStrength ? (
        <>
          {SPLITS[plannedType].map(exercise => {
            const isOpen = openExercise === exercise;
            const filled = filledCount(exercise);
            return (
              <View key={exercise} style={{ backgroundColor: t.colors.card, borderRadius: t.radius.card, padding: t.spacing.md, overflow: 'hidden' }}>
                <View style={L.exerciseHeader}>
                  <Pressable
                    style={L.exerciseToggle}
                    onPress={() => { setOpenExercise(prev => (prev === exercise ? null : exercise)); setOpenSet(0); }}
                    onLongPress={() => showExerciseMenu(exercise)}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '600', color: t.colors.label, flex: 1 }}>{exercise}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: filled > 0 ? t.colors.label : t.colors.secondaryLabel }}>{filled}/{SETS_PER_EXERCISE}</Text>
                    <Icon name={isOpen ? 'chevron.down' : 'chevron.right'} color={t.colors.secondaryLabel} size={13} />
                  </Pressable>
                  <TouchableOpacity style={{ paddingLeft: t.spacing.md, paddingVertical: 2 }} onPress={() => setHistoryExercise(exercise)}>
                    <Icon name="chart.xyaxis.line" color={t.colors.accent} size={20} />
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
                  const isCommitted = committed.has(key);
                  const summary = repsOnly ? `${sel.reps} reps` : `${sel.weight} kg × ${sel.reps}`;

                  const header = (
                    <View style={[L.setHeader, { backgroundColor: t.colors.card }]}>
                      <Pressable style={L.setHeaderTap} onPress={() => setOpenSet(prev => (prev === setNo ? 0 : setNo))}>
                        <Text style={{ fontSize: 13, color: t.colors.secondaryLabel, fontWeight: '600' }}>Set {setNo}</Text>
                        <Text style={{ flex: 1, fontSize: 14, color: t.colors.label, fontWeight: '600' }}>{summary}</Text>
                        <Icon name={setOpen ? 'chevron.down' : 'chevron.right'} color={t.colors.secondaryLabel} size={13} />
                      </Pressable>
                      {resting ? (
                        <TouchableOpacity style={[L.actionBtn, { backgroundColor: t.colors.label }]} onPress={stopRest} activeOpacity={0.7}>
                          <Text style={{ color: t.colors.bg, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ) : flashing ? (
                        <View style={[L.actionBtn, { backgroundColor: t.colors.success }]}>
                          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>Go!</Text>
                        </View>
                      ) : (
                        <TouchableOpacity style={[L.actionBtn, { backgroundColor: t.colors.success }]} onPress={() => handleConfirmSet(exercise, setNo)} activeOpacity={0.7}>
                          <Icon name="checkmark" color="#fff" size={20} weight="bold" />
                        </TouchableOpacity>
                      )}
                    </View>
                  );

                  return (
                    <View key={setNo} style={[L.setBlock, { borderTopColor: t.colors.separator }]}>
                      {isCommitted
                        ? <SwipeRow onDelete={() => handleDeleteSet(exercise, setNo)} deleteLabel="Un-log">{header}</SwipeRow>
                        : header}
                      {setOpen && (
                        <View style={L.wheelRow}>
                          {!repsOnly && (
                            <View style={L.wheelCol}>
                              <Text style={[L.wheelCap, { color: t.colors.secondaryLabel }]}>kg</Text>
                              <Picker
                                selectedValue={sel.weight as number}
                                onValueChange={v => setCell(exercise, setNo, { weight: String(v) })}
                                style={L.wheel}
                                itemStyle={{ fontSize: 20, height: 132, color: t.colors.label }}
                              >
                                {WEIGHT_OPTIONS.map(w => <Picker.Item key={w} label={String(w)} value={w} color={t.colors.label} />)}
                              </Picker>
                            </View>
                          )}
                          <View style={L.wheelCol}>
                            <Text style={[L.wheelCap, { color: t.colors.secondaryLabel }]}>reps</Text>
                            <Picker
                              selectedValue={sel.reps}
                              onValueChange={v => setCell(exercise, setNo, { reps: String(v) })}
                              style={L.wheel}
                              itemStyle={{ fontSize: 20, height: 132, color: t.colors.label }}
                            >
                              {REPS_OPTIONS.map(r => <Picker.Item key={r} label={String(r)} value={r} color={t.colors.label} />)}
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
          <TouchableOpacity
            style={[L.doneBadge, { borderColor: t.colors.success }, done && { backgroundColor: t.colors.success }]}
            onPress={toggleDone}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: done ? '#fff' : t.colors.success }}>
              {done ? '✓ Workout done' : 'Mark workout done'}
            </Text>
          </TouchableOpacity>

          {workoutId != null && (
            <TouchableOpacity style={{ alignItems: 'center', paddingVertical: t.spacing.sm }} onPress={handleDeleteWorkout}>
              <Text style={{ fontSize: 13, color: t.colors.destructive }}>Clear logged sets</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <View style={{ backgroundColor: t.colors.card, borderRadius: t.radius.card, padding: 28, alignItems: 'center' }}>
          <Icon name={plannedType === 'Jogging' ? 'figure.run' : 'moon.zzz.fill'} color={t.colors.secondaryLabel} size={40} />
          <Text style={{ fontSize: 20, fontWeight: '800', color: t.colors.label, marginTop: t.spacing.sm }}>
            {plannedType === 'Jogging' ? 'Jogging day' : 'Rest day'}
          </Text>
          <Text style={{ fontSize: 14, color: t.colors.secondaryLabel, textAlign: 'center', marginTop: 6 }}>
            {plannedType === 'Jogging' ? 'Go for your run, then mark it done.' : 'No training scheduled. Tap Change to train anyway.'}
          </Text>
          {plannedType === 'Jogging' && (
            <TouchableOpacity
              style={[L.doneBadge, { borderColor: t.colors.success, marginTop: t.spacing.lg, alignSelf: 'stretch' }, done && { backgroundColor: t.colors.success }]}
              onPress={toggleDone}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: done ? '#fff' : t.colors.success }}>{done ? '✓ Done' : 'Mark done'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ExerciseHistoryModal exercise={historyExercise} onClose={() => setHistoryExercise(null)} />
      <WeeklyPlanModal visible={weeklyVisible} onClose={() => setWeeklyVisible(false)} onChanged={() => load()} />
      <DayAdjustModal
        date={adjustVisible ? dateStr : null}
        currentType={plannedType}
        onClose={() => setAdjustVisible(false)}
        onChanged={() => load()}
      />
    </Screen>
    <RestDoneBanner visible={doneFlashKey !== null} onDismiss={() => setDoneFlashKey(null)} />
    </View>
  );
}

// Layout-only styles (no colors — those come from theme tokens inline).
const L = StyleSheet.create({
  planHeader: { flexDirection: 'row', alignItems: 'center' },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center' },
  exerciseToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  setBlock: { marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6 },
  setHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  setHeaderTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  wheelRow: { flexDirection: 'row', gap: 12 },
  wheelCol: { flex: 1, alignItems: 'center' },
  wheelCap: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  wheel: { width: '100%', height: 132 },
  actionBtn: { minWidth: 56, height: 38, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  doneBadge: { borderWidth: 1.5, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
});
