import React, { useEffect, useState } from 'react';
import { Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getScheduleBase, setScheduleDay } from '../db/queries';
import { WORKOUT_TYPES } from '../db/workoutTemplates';

// Display Monday-first; values are JS getDay() indices.
const DAYS: { dow: number; label: string }[] = [
  { dow: 1, label: 'Mon' }, { dow: 2, label: 'Tue' }, { dow: 3, label: 'Wed' },
  { dow: 4, label: 'Thu' }, { dow: 5, label: 'Fri' }, { dow: 6, label: 'Sat' },
  { dow: 0, label: 'Sun' },
];

export default function WeeklyPlanModal({ visible, onClose, onChanged }: {
  visible: boolean; onClose: () => void; onChanged: () => void;
}) {
  const [base, setBase] = useState<Record<number, string>>({});

  useEffect(() => {
    if (visible) getScheduleBase().then(setBase);
  }, [visible]);

  async function pick(dow: number, type: string) {
    await setScheduleDay(dow, type);
    setBase(prev => ({ ...prev, [dow]: type }));
    onChanged();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose}><Text style={s.done}>Done</Text></TouchableOpacity>
          <Text style={s.title}>Weekly Plan</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={s.body}>
          <Text style={s.hint}>Your recurring plan. Changes here repeat every week.</Text>
          {DAYS.map(({ dow, label }) => (
            <View key={dow} style={s.dayRow}>
              <Text style={s.dayLabel}>{label}</Text>
              <View style={s.chips}>
                {WORKOUT_TYPES.map(type => {
                  const active = base[dow] === type;
                  return (
                    <TouchableOpacity key={type} style={[s.chip, active && s.chipActive]} onPress={() => pick(dow, type)}>
                      <Text style={[s.chipText, active && s.chipTextActive]}>{type}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd' },
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: '#111' },
  done: { fontSize: 15, color: '#007aff', fontWeight: '600', width: 44 },
  body: { padding: 16, gap: 14, paddingBottom: 48 },
  hint: { fontSize: 13, color: '#888' },
  dayRow: { gap: 6 },
  dayLabel: { fontSize: 14, fontWeight: '700', color: '#222' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: '#111', borderColor: '#111' },
  chipText: { fontSize: 13, color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
});
