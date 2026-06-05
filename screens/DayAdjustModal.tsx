import React, { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Sheet, Chip } from '../components/ui';
import { useTheme } from '../theme';
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
  const t = useTheme();
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

  const sectionStyle = { fontSize: 13, fontWeight: '700' as const, color: t.colors.secondaryLabel, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginTop: t.spacing.sm };

  return (
    <Sheet visible={date != null} title="Adjust this day" onClose={onClose} leftLabel="Cancel">
      <Text style={sectionStyle}>Set this day to</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm }}>
        {WORKOUT_TYPES.map(type => (
          <Chip key={type} label={type} active={type === currentType} onPress={() => setType(type)} />
        ))}
      </View>

      <Text style={sectionStyle}>Or swap with another day this week</Text>
      {others.map(o => (
        <TouchableOpacity
          key={o.date}
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.colors.card, borderRadius: t.radius.control, padding: t.spacing.md, gap: t.spacing.md }}
          onPress={() => swapWith(o)}
        >
          <Text style={{ width: 80, fontSize: 14, color: t.colors.label, fontWeight: '600' }}>{label(o.date)}</Text>
          <Text style={{ flex: 1, fontSize: 14, color: t.colors.secondaryLabel }}>{o.type}</Text>
          <Text style={{ fontSize: 18, color: t.colors.accent }}>⇄</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={{ padding: t.spacing.md, alignItems: 'center', marginTop: t.spacing.sm }} onPress={reset}>
        <Text style={{ fontSize: 14, color: t.colors.destructive }}>Reset to weekly plan</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 12, color: t.colors.secondaryLabel, textAlign: 'center' }}>Changes apply to this week only and reset next week.</Text>
    </Sheet>
  );
}
