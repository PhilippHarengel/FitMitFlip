import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { toDateString } from '../db/queries';
import { useTheme } from '../theme';

// Shared date navigator: ‹ date › with day-stepping arrows. The center control
// is a calendar — a compact popover chip on iOS, a tap-to-open calendar dialog
// on Android (iOS has no `calendar` display; Android has no `compact`).
export default function DateNavigator({
  date,
  onChange,
  maximumDate,
}: {
  date: Date;
  onChange: (d: Date) => void;
  maximumDate?: Date;
}) {
  const t = useTheme();
  const [show, setShow] = useState(false);
  const isToday = toDateString(date) === toDateString(new Date());
  const step = (delta: number) => {
    const n = new Date(date);
    n.setDate(n.getDate() + delta);
    onChange(n);
  };
  const label = isToday
    ? 'Today'
    : date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <View style={s.dateRow}>
      <TouchableOpacity onPress={() => step(-1)} hitSlop={8}>
        <Text style={[s.arrow, { color: t.colors.secondaryLabel }]}>‹</Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={date}
          mode="date"
          display="compact"
          maximumDate={maximumDate}
          themeVariant={t.scheme}
          accentColor={t.colors.accent}
          onChange={(_, d) => { if (d) onChange(d); }}
        />
      ) : (
        <>
          <TouchableOpacity onPress={() => setShow(true)}>
            <Text style={[s.dateLabel, { color: t.colors.label }]}>{label}</Text>
          </TouchableOpacity>
          {show && (
            <DateTimePicker
              value={date}
              mode="date"
              display="calendar"
              maximumDate={maximumDate}
              onChange={(_, d) => { setShow(false); if (d) onChange(d); }}
            />
          )}
        </>
      )}

      <TouchableOpacity onPress={() => step(1)} hitSlop={8}>
        <Text style={[s.arrow, { color: t.colors.secondaryLabel }]}>›</Text>
      </TouchableOpacity>

      {/* Jump back to today — only shown when viewing another day. Absolutely
          positioned so it doesn't shift the centered date. */}
      {!isToday && (
        <TouchableOpacity style={[s.todayBtn, { backgroundColor: t.colors.card }]} onPress={() => onChange(new Date())} activeOpacity={0.7}>
          <Text style={[s.todayText, { color: t.colors.accent }]}>Today</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 4, gap: 20 },
  arrow: { fontSize: 28, paddingHorizontal: 8 },
  dateLabel: { fontSize: 17, fontWeight: '600' },
  todayBtn: { position: 'absolute', right: 0, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  todayText: { fontSize: 13, fontWeight: '700' },
});
