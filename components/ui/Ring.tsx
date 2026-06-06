import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../theme';
import { ringPct, isOver } from './ringMath';

// A single progress ring — used for the Protein / Carbs / Fat macros on Today.
//
//   value/target → ringPct → strokeDashoffset
//   ┌── track (full circle, theme.track) ──┐
//   └── fill  (arc from 12 o'clock, color) ┘   center: value   below: label
//
// A11y: the numeric value is always shown in the center, so the ring never
// relies on color alone to communicate state (colorblind-safe). When over the
// target, the value turns warning-colored AND the ring fills completely.
export function Ring({
  value,
  target,
  color,
  label,
  unit = 'g',
  size = 64,
  stroke = 8,
}: {
  value: number;
  target: number | null;
  color: string;
  label?: string;
  unit?: string;
  size?: number;
  stroke?: number;
}) {
  const t = useTheme();
  const pct = ringPct(value, target);
  const over = isOver(value, target);
  const hasGoal = target != null && target > 0;

  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct);
  const valueColor = over ? t.colors.warning : t.colors.label;

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.colors.track} strokeWidth={stroke} fill="none" />
          {hasGoal && (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={over ? t.colors.warning : color}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          )}
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={[styles.value, { color: valueColor }]} maxFontSizeMultiplier={1.3}>
            {Math.round(value)}
          </Text>
          {hasGoal && (
            <Text style={[styles.unit, { color: t.colors.secondaryLabel }]} maxFontSizeMultiplier={1.3}>
              /{Math.round(target!)}{unit}
            </Text>
          )}
        </View>
      </View>
      {label && (
        <Text style={[styles.label, { color: t.colors.secondaryLabel }]} maxFontSizeMultiplier={1.3}>
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6 },
  center: { alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  unit: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  label: { fontSize: 12, fontWeight: '600' },
});
