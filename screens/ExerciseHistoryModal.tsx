import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Sheet } from '../components/ui';
import { useTheme } from '../theme';
import { getExerciseHistory, type ExerciseDay } from '../db/queries';
import { isRepsOnly } from '../db/workoutTemplates';

function shortDate(iso: string): string {
  // 'YYYY-MM-DD' → 'DD.MM'
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

// '#RRGGBB' + opacity → 'rgba(r,g,b,o)' so chart-kit's color callbacks can be
// driven by theme tokens (it expects rgba strings).
function rgba(hex: string, o: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${o})`;
}

export default function ExerciseHistoryModal({ exercise, onClose }: {
  exercise: string | null;
  onClose: () => void;
}) {
  const t = useTheme();
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

  // Chart the top set per session — the heaviest weight lifted that day, so the
  // line tracks "am I getting stronger" without warm-up sets dragging it down.
  const repsOnly = exercise != null && isRepsOnly(exercise);
  const hasWeight = !repsOnly && history.some(d => d.top_weight != null);
  const metricLabel = hasWeight ? 'Top set (kg)' : 'Best set (reps)';
  const unit = hasWeight ? 'kg' : 'reps';
  const metricOf = (d: ExerciseDay) => (hasWeight ? d.top_weight : d.top_reps);

  const fmt = (n: number) => (hasWeight ? (Math.round(n * 10) / 10).toString() : Math.round(n).toString());

  const points = history.filter(d => metricOf(d) != null);
  const values = points.map(d =>
    hasWeight ? Math.round((metricOf(d) as number) * 10) / 10 : Math.round(metricOf(d) as number)
  );
  const labels = points.map(d => shortDate(d.date));

  const first = values[0];
  const last = values[values.length - 1];
  const delta = first != null && last != null ? last - first : null;

  const chartWidth = Dimensions.get('window').width - 32;
  const deltaColor = delta == null ? t.colors.secondaryLabel : delta > 0 ? t.colors.success : delta < 0 ? t.colors.warning : t.colors.secondaryLabel;

  return (
    <Sheet visible={exercise != null} title={exercise ?? ''} onClose={onClose}>
      {loading ? (
        <Text style={[s.empty, { color: t.colors.secondaryLabel }]}>Loading…</Text>
      ) : points.length === 0 ? (
        <Text style={[s.empty, { color: t.colors.secondaryLabel }]}>No history yet. Log this exercise to start tracking progression.</Text>
      ) : (
        <>
          <Text style={{ fontSize: 13, fontWeight: '700', color: t.colors.secondaryLabel, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {metricLabel} per session
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: t.spacing.md }}>
            <Text style={{ fontSize: 32, fontWeight: '800', color: t.colors.label }}>{fmt(last)} {unit}</Text>
            {delta != null && points.length > 1 && (
              <Text style={{ fontSize: 14, fontWeight: '600', color: deltaColor }}>
                {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} {fmt(Math.abs(delta))} vs first ({fmt(first)})
              </Text>
            )}
          </View>

          {points.length === 1 ? (
            <Text style={{ fontSize: 13, color: t.colors.secondaryLabel, fontStyle: 'italic' }}>One session logged — log more to see the trend line.</Text>
          ) : (
            <LineChart
              data={{ labels, datasets: [{ data: values }] }}
              width={chartWidth}
              height={240}
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: t.colors.card,
                backgroundGradientFrom: t.colors.card,
                backgroundGradientTo: t.colors.card,
                decimalPlaces: hasWeight ? 1 : 0,
                color: (o = 1) => rgba(t.colors.accent, o),
                labelColor: (o = 1) => rgba(t.colors.secondaryLabel, o),
                propsForDots: { r: '4', strokeWidth: '2', stroke: t.colors.accent },
              }}
              bezier
              style={{ borderRadius: t.radius.card, marginVertical: 4 }}
            />
          )}

          {/* Per-session table */}
          <View style={{ marginTop: t.spacing.sm }}>
            {[...points].reverse().map(d => (
              <View key={d.date} style={[s.tableRow, { borderBottomColor: t.colors.separator }]}>
                <Text style={{ width: 56, fontSize: 13, color: t.colors.secondaryLabel, fontWeight: '600' }}>{shortDate(d.date)}</Text>
                <Text style={{ flex: 1, fontSize: 13, color: t.colors.secondaryLabel }}>
                  <Text style={{ fontSize: 14, color: t.colors.label, fontWeight: '600' }}>{fmt(metricOf(d) as number)} {unit}</Text>
                  {hasWeight && d.avg_reps != null ? `   × ${Math.round(d.avg_reps)} reps avg` : ''}
                </Text>
                <Text style={{ fontSize: 12, color: t.colors.secondaryLabel }}>{d.set_count} sets</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </Sheet>
  );
}

const s = StyleSheet.create({
  empty: { fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginTop: 40 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
});
