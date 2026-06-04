import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getExerciseHistory, type ExerciseDay } from '../db/queries';

function shortDate(iso: string): string {
  // 'YYYY-MM-DD' → 'DD.MM'
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

export default function ExerciseHistoryModal({ exercise, onClose }: {
  exercise: string | null;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<ExerciseDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (exercise == null) return;
    setLoading(true);
    getExerciseHistory(exercise).then(rows => {
      if (alive) { setHistory(rows); setLoading(false); }
    });
    return () => { alive = false; };
  }, [exercise]);

  // Bodyweight exercises have no weight → fall back to charting average reps.
  const hasWeight = history.some(d => d.avg_weight != null);
  const metricLabel = hasWeight ? 'Avg weight (kg)' : 'Avg reps';
  const metricOf = (d: ExerciseDay) => (hasWeight ? d.avg_weight : d.avg_reps);

  const points = history.filter(d => metricOf(d) != null);
  const values = points.map(d => Math.round((metricOf(d) as number) * 10) / 10);
  const labels = points.map(d => shortDate(d.date));

  const first = values[0];
  const last = values[values.length - 1];
  const delta = first != null && last != null ? Math.round((last - first) * 10) / 10 : null;

  const chartWidth = Dimensions.get('window').width - 32;

  return (
    <Modal visible={exercise != null} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose}><Text style={s.done}>Done</Text></TouchableOpacity>
          <Text style={s.title} numberOfLines={1}>{exercise}</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={s.body}>
          {loading ? (
            <Text style={s.empty}>Loading…</Text>
          ) : points.length === 0 ? (
            <Text style={s.empty}>No history yet. Log this exercise to start tracking progression.</Text>
          ) : (
            <>
              <Text style={s.metricLabel}>{metricLabel} per session</Text>

              {/* Summary line */}
              <View style={s.summary}>
                <Text style={s.summaryBig}>{last}{hasWeight ? ' kg' : ' reps'}</Text>
                {delta != null && points.length > 1 && (
                  <Text style={[s.delta, delta > 0 ? s.up : delta < 0 ? s.down : s.flat]}>
                    {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} {Math.abs(delta)} vs first ({first})
                  </Text>
                )}
              </View>

              {points.length === 1 ? (
                <Text style={s.hint}>One session logged — log more to see the trend line.</Text>
              ) : (
                <LineChart
                  data={{ labels, datasets: [{ data: values }] }}
                  width={chartWidth}
                  height={240}
                  yAxisSuffix={hasWeight ? '' : ''}
                  chartConfig={{
                    backgroundColor: '#fff',
                    backgroundGradientFrom: '#fff',
                    backgroundGradientTo: '#fff',
                    decimalPlaces: hasWeight ? 1 : 0,
                    color: (o = 1) => `rgba(17,17,17,${o})`,
                    labelColor: (o = 1) => `rgba(120,120,120,${o})`,
                    propsForDots: { r: '4', strokeWidth: '2', stroke: '#111' },
                  }}
                  bezier
                  style={s.chart}
                />
              )}

              {/* Per-session table */}
              <View style={s.table}>
                {[...points].reverse().map(d => (
                  <View key={d.date} style={s.tableRow}>
                    <Text style={s.tDate}>{shortDate(d.date)}</Text>
                    <Text style={s.tVal}>
                      {d.avg_weight != null ? `${Math.round(d.avg_weight * 10) / 10} kg` : '–'}
                      {d.avg_reps != null ? `  ×${Math.round(d.avg_reps * 10) / 10}` : ''}
                    </Text>
                    <Text style={s.tSets}>{d.set_count} sets</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd' },
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: '#111', marginHorizontal: 8 },
  done: { fontSize: 15, color: '#007aff', fontWeight: '600', width: 44 },
  body: { padding: 16, gap: 12 },
  empty: { fontSize: 14, color: '#aaa', fontStyle: 'italic', textAlign: 'center', marginTop: 40 },
  metricLabel: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  summary: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  summaryBig: { fontSize: 32, fontWeight: '800', color: '#111' },
  delta: { fontSize: 14, fontWeight: '600' },
  up: { color: '#1a9e54' },
  down: { color: '#e6a100' },
  flat: { color: '#999' },
  hint: { fontSize: 13, color: '#999', fontStyle: 'italic' },
  chart: { borderRadius: 12, marginVertical: 4 },
  table: { marginTop: 8, gap: 2 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  tDate: { width: 56, fontSize: 13, color: '#999', fontWeight: '600' },
  tVal: { flex: 1, fontSize: 14, color: '#222' },
  tSets: { fontSize: 12, color: '#aaa' },
});
