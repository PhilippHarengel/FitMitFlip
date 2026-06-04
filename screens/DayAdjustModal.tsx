import React, { useCallback, useEffect, useState } from 'react';
import { Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { clearOverride, getPlannedType, setOverride, toDateString } from '../db/queries';
import { WORKOUT_TYPES } from '../db/workoutTemplates';

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// The 7 dates of the Monday-first week containing `date`.
function weekDates(dateStr: string): string[] {
  const [y, m, d] = dateStr.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  const day = base.getDay();                 // 0=Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setDate(base.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return toDateString(dt);
  });
}

export default function DayAdjustModal({ date, currentType, onClose, onChanged }: {
  date: string | null;
  currentType: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [others, setOthers] = useState<{ date: string; type: string }[]>([]);

  const load = useCallback(async () => {
    if (!date) return;
    const week = weekDates(date).filter(d => d !== date);
    const withTypes = await Promise.all(week.map(async d => ({ date: d, type: await getPlannedType(d) })));
    setOthers(withTypes);
  }, [date]);

  useEffect(() => { if (date) load(); }, [date, load]);

  async function setType(type: string) {
    if (!date) return;
    await setOverride(date, type);
    onChanged();
    onClose();
  }

  async function swapWith(other: { date: string; type: string }) {
    if (!date) return;
    await setOverride(date, other.type);
    await setOverride(other.date, currentType);
    onChanged();
    onClose();
  }

  async function reset() {
    if (!date) return;
    await clearOverride(date);
    onChanged();
    onClose();
  }

  function label(d: string): string {
    const [y, m, da] = d.split('-').map(Number);
    return `${WD[new Date(y, m - 1, da).getDay()]} ${String(da).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
  }

  return (
    <Modal visible={date != null} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
          <Text style={s.title}>Adjust this day</Text>
          <View style={{ width: 56 }} />
        </View>
        <ScrollView contentContainerStyle={s.body}>
          <Text style={s.section}>Set this day to</Text>
          <View style={s.chips}>
            {WORKOUT_TYPES.map(type => {
              const active = type === currentType;
              return (
                <TouchableOpacity key={type} style={[s.chip, active && s.chipActive]} onPress={() => setType(type)}>
                  <Text style={[s.chipText, active && s.chipTextActive]}>{type}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={s.section}>Or swap with another day this week</Text>
          {others.map(o => (
            <TouchableOpacity key={o.date} style={s.swapRow} onPress={() => swapWith(o)}>
              <Text style={s.swapDay}>{label(o.date)}</Text>
              <Text style={s.swapType}>{o.type}</Text>
              <Text style={s.swapArrow}>⇄</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={s.resetBtn} onPress={reset}>
            <Text style={s.resetText}>Reset to weekly plan</Text>
          </TouchableOpacity>
          <Text style={s.note}>Changes apply to this week only and reset next week.</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd' },
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: '#111' },
  cancel: { fontSize: 15, color: '#666', width: 56 },
  body: { padding: 16, gap: 10, paddingBottom: 48 },
  section: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: '#111', borderColor: '#111' },
  chipText: { fontSize: 14, color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  swapRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 10, padding: 12, gap: 10 },
  swapDay: { width: 80, fontSize: 14, color: '#222', fontWeight: '600' },
  swapType: { flex: 1, fontSize: 14, color: '#555' },
  swapArrow: { fontSize: 18, color: '#007aff' },
  resetBtn: { padding: 12, alignItems: 'center', marginTop: 8 },
  resetText: { fontSize: 14, color: '#e00' },
  note: { fontSize: 12, color: '#999', textAlign: 'center' },
});
