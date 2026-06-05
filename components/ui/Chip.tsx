import React from 'react';
import { Pressable, Text } from 'react-native';
import { useTheme } from '../../theme';

// Pill selector chip (used in the weekly-plan and day-adjust modals).
export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: active ? t.colors.accent : t.colors.separator,
        backgroundColor: active ? t.colors.accent : 'transparent',
        borderRadius: t.radius.full,
        paddingHorizontal: 14,
        paddingVertical: 7,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontSize: 14, color: active ? '#FFFFFF' : t.colors.label, fontWeight: active ? '600' : '400' }}>{label}</Text>
    </Pressable>
  );
}
