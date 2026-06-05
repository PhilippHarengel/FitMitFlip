import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { toDateString } from '../db/queries';

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
      <TouchableOpacity onPress={() => step(-1)}>
        <Text style={s.arrow}>‹</Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={date}
          mode="date"
          display="compact"
          maximumDate={maximumDate}
          onChange={(_, d) => { if (d) onChange(d); }}
        />
      ) : (
        <>
          <TouchableOpacity onPress={() => setShow(true)}>
            <Text style={s.dateLabel}>{label}</Text>
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

      <TouchableOpacity onPress={() => step(1)}>
        <Text style={s.arrow}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 20 },
  arrow: { fontSize: 28, color: '#333', paddingHorizontal: 8 },
  dateLabel: { fontSize: 17, fontWeight: '600', color: '#111' },
});
