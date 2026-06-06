import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Sheet, Chip } from '../components/ui';
import { useTheme } from '../theme';
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
  const t = useTheme();
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
    <Sheet visible={visible} title="Weekly Plan" onClose={onClose} leftLabel="Done">
      <Text style={{ fontSize: 13, color: t.colors.secondaryLabel }}>Your recurring plan. Changes here repeat every week.</Text>
      {DAYS.map(({ dow, label }) => (
        <View key={dow} style={{ gap: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: t.colors.label }}>{label}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {WORKOUT_TYPES.map(type => (
              <Chip key={type} label={type} active={base[dow] === type} onPress={() => pick(dow, type)} />
            ))}
          </View>
        </View>
      ))}
    </Sheet>
  );
}
