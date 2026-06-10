import React, { useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { toDateString } from '../db/queries';
import { useTheme } from '../theme';

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
  const [pickerOpen, setPickerOpen] = useState(false);
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

      {/* Themed pill — replaces the native compact picker so the background
          follows the accent color. Tapping opens a spinner sheet. */}
      <TouchableOpacity
        onPress={() => setPickerOpen(true)}
        activeOpacity={0.75}
        style={[s.datePill, { backgroundColor: withAlpha(t.colors.accent, 0.12) }]}
      >
        <Text style={[s.dateLabel, { color: t.colors.accent }]}>{label}</Text>
      </TouchableOpacity>

      {/* Spinner picker modal — iOS and Android */}
      {pickerOpen && (
        <Modal transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
          <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setPickerOpen(false)} />
          <View style={[s.pickerSheet, { backgroundColor: t.colors.bgGrouped }]}>
            <View style={[s.pickerSheetHandle, { backgroundColor: t.colors.separator }]} />
            <View style={s.pickerDoneRow}>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <Text style={[s.pickerDone, { color: t.colors.accent }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={date}
              mode="date"
              display="spinner"
              maximumDate={maximumDate}
              themeVariant={t.scheme}
              accentColor={t.colors.accent}
              style={{ width: '100%' }}
              onChange={(_, d) => { if (d) onChange(d); }}
            />
          </View>
        </Modal>
      )}

      <TouchableOpacity onPress={() => step(1)} hitSlop={8}>
        <Text style={[s.arrow, { color: t.colors.secondaryLabel }]}>›</Text>
      </TouchableOpacity>

      {!isToday && (
        <TouchableOpacity style={[s.todayBtn, { backgroundColor: t.colors.card }]} onPress={() => onChange(new Date())} activeOpacity={0.7}>
          <Text style={[s.todayText, { color: t.colors.accent }]}>Today</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}

const s = StyleSheet.create({
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 4, gap: 20 },
  arrow: { fontSize: 28, paddingHorizontal: 8 },
  datePill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999 },
  dateLabel: { fontSize: 17, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  pickerSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  pickerSheetHandle: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: 10 },
  pickerDoneRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingVertical: 10 },
  pickerDone: { fontSize: 17, fontWeight: '600' },
  todayBtn: { position: 'absolute', right: 0, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  todayText: { fontSize: 13, fontWeight: '700' },
});
