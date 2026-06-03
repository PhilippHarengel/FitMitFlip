import React, { useCallback, useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
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
  toDateString,
  type DailyMacros,
  type Workout,
  type WorkoutSet,
} from '../db/queries';

type WorkoutWithSets = Workout & { sets: WorkoutSet[] };

export default function HomeScreen() {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [macros, setMacros] = useState<DailyMacros>({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  const [workouts, setWorkouts] = useState<WorkoutWithSets[]>([]);
  const [foodCount, setFoodCount] = useState(0);

  const dateStr = toDateString(date);

  const load = useCallback(async () => {
    const [m, ws, fl] = await Promise.all([
      getDailyMacros(dateStr),
      getWorkoutsForDate(dateStr),
      getFoodLogForDate(dateStr),
    ]);
    const withSets = await Promise.all(
      ws.map(async w => ({ ...w, sets: await getSetsForWorkout(w.id) }))
    );
    setMacros(m);
    setWorkouts(withSets);
    setFoodCount(fl.length);
  }, [dateStr]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
        {/* Macro card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Nutrition</Text>
          <View style={s.macroRow}>
            <MacroBox label="kcal" value={Math.round(macros.kcal)} />
            <MacroBox label="protein" value={Math.round(macros.protein_g)} unit="g" />
            <MacroBox label="carbs" value={Math.round(macros.carbs_g)} unit="g" />
            <MacroBox label="fat" value={Math.round(macros.fat_g)} unit="g" />
          </View>
          {foodCount === 0 && (
            <Text style={s.empty}>No food logged — go to Food tab to add entries.</Text>
          )}
        </View>

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
    </SafeAreaView>
  );
}

function MacroBox({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <View style={s.macroBox}>
      <Text style={s.macroValue}>{value}{unit ?? ''}</Text>
      <Text style={s.macroLabel}>{label}</Text>
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
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroBox: { alignItems: 'center', flex: 1 },
  macroValue: { fontSize: 22, fontWeight: '700', color: '#111' },
  macroLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  empty: { fontSize: 13, color: '#aaa', fontStyle: 'italic', marginTop: 4 },
  workoutBlock: { marginBottom: 12 },
  workoutName: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
  setLine: { fontSize: 14, color: '#555', paddingVertical: 2 },
});
