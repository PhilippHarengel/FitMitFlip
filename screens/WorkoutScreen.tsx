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
  deleteSet,
  deleteWorkout,
  getSetsForWorkout,
  getWorkoutsForDate,
  logSet,
  toDateString,
  type Workout,
  type WorkoutSet,
} from '../db/queries';

type WorkoutWithSets = Workout & { sets: WorkoutSet[] };

export default function WorkoutScreen() {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [workouts, setWorkouts] = useState<WorkoutWithSets[]>([]);

  // New set form
  const [exercise, setExercise] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [reps, setReps] = useState('');
  const [activeWorkoutId, setActiveWorkoutId] = useState<number | null>(null);

  const dateStr = toDateString(date);

  const load = useCallback(async () => {
    const ws = await getWorkoutsForDate(dateStr);
    const withSets = await Promise.all(
      ws.map(async w => ({ ...w, sets: await getSetsForWorkout(w.id) }))
    );
    setWorkouts(withSets);
    if (withSets.length > 0 && activeWorkoutId === null) {
      setActiveWorkoutId(withSets[withSets.length - 1].id);
    }
  }, [dateStr]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleStartWorkout() {
    const id = await createWorkout(dateStr);
    setActiveWorkoutId(id);
    await load();
  }

  async function handleLogSet() {
    if (!exercise.trim()) {
      Alert.alert('Missing exercise', 'Enter an exercise name.');
      return;
    }
    try {
      let wId = activeWorkoutId;
      if (!wId) {
        wId = await createWorkout(dateStr);
        setActiveWorkoutId(wId);
      }

      const currentSets = workouts.find(w => w.id === wId)?.sets ?? [];
      const nextSetNumber = currentSets.length + 1;
      const kg = weightKg.trim() ? parseFloat(weightKg) : null;
      const r = reps.trim() ? parseInt(reps, 10) : null;

      await logSet(wId, nextSetNumber, exercise.trim(), kg, r);
      setWeightKg('');
      setReps('');
      await load();
    } catch (e: any) {
      Alert.alert('Error saving set', e?.message ?? 'Unknown error');
    }
  }

  async function handleDeleteSet(setId: number) {
    await deleteSet(setId);
    await load();
  }

  async function handleDeleteWorkout(workoutId: number) {
    Alert.alert('Delete workout?', 'This removes the workout and all its sets.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteWorkout(workoutId);
          if (activeWorkoutId === workoutId) setActiveWorkoutId(null);
          await load();
        }
      },
    ]);
  }

  const isToday = dateStr === toDateString(new Date());

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

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Add set form */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Log Set</Text>
            <TextInput
              style={s.input}
              placeholder="Exercise (e.g. Bench Press)"
              value={exercise}
              onChangeText={setExercise}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <View style={s.row}>
              <TextInput
                style={[s.input, { flex: 1, marginRight: 8 }]}
                placeholder="Weight (kg)"
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="Reps (optional)"
                value={reps}
                onChangeText={setReps}
                keyboardType="number-pad"
              />
            </View>
            <TouchableOpacity style={s.btn} onPress={handleLogSet}>
              <Text style={s.btnText}>Add Set</Text>
            </TouchableOpacity>
          </View>

          {/* Workout list */}
          {workouts.length === 0 ? (
            <Text style={s.empty}>No workout yet. Add a set above to start.</Text>
          ) : (
            workouts.map(w => (
              <View key={w.id} style={s.card}>
                <View style={s.workoutHeader}>
                  <Text style={s.cardTitle}>Workout {w.id}</Text>
                  <TouchableOpacity onPress={() => handleDeleteWorkout(w.id)}>
                    <Text style={s.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
                {w.sets.map(set => (
                  <TouchableOpacity
                    key={set.id}
                    style={s.setRow}
                    onLongPress={() => Alert.alert('Delete set?', `Set ${set.set_number}: ${set.exercise}`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => handleDeleteSet(set.id) },
                    ])}
                  >
                    <Text style={s.setNum}>{set.set_number}</Text>
                    <Text style={s.setExercise}>{set.exercise}</Text>
                    <Text style={s.setDetail}>
                      {set.weight_kg != null ? `${set.weight_kg} kg` : 'BW'}
                      {set.reps != null ? `  ×${set.reps}` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
                {w.sets.length === 0 && <Text style={s.empty}>No sets yet.</Text>}
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 20 },
  arrow: { fontSize: 28, color: '#333', paddingHorizontal: 8 },
  dateLabel: { fontSize: 17, fontWeight: '600', color: '#111' },
  card: { backgroundColor: '#f8f8f8', borderRadius: 12, padding: 16 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 10, fontSize: 15, marginBottom: 8 },
  row: { flexDirection: 'row' },
  btn: { backgroundColor: '#111', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deleteText: { color: '#e00', fontSize: 13 },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e0e0e0' },
  setNum: { width: 28, fontSize: 13, color: '#aaa', fontWeight: '600' },
  setExercise: { flex: 1, fontSize: 14, color: '#222' },
  setDetail: { fontSize: 14, color: '#555', fontWeight: '500' },
  empty: { fontSize: 13, color: '#aaa', fontStyle: 'italic', marginTop: 4 },
});
