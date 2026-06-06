import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme';
import { ringPct, isOver } from './ringMath';

// Slim progress bar (used for the calorie total on Today). Fill clamps at 100%
// and turns warning-colored when over target. Shares ringPct/isOver with Ring.
export function ProgressBar({
  value,
  target,
  height = 8,
  color,
}: {
  value: number;
  target: number | null;
  height?: number;
  color?: string;
}) {
  const t = useTheme();
  const pct = ringPct(value, target);
  const over = isOver(value, target);
  const fill = over ? t.colors.warning : color ?? t.colors.accent;

  return (
    <View style={{ height, backgroundColor: t.colors.track, borderRadius: height / 2, overflow: 'hidden' }}>
      <View style={{ height, width: `${pct * 100}%`, backgroundColor: fill, borderRadius: height / 2 }} />
    </View>
  );
}
