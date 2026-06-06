import React, { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useTheme } from '../../theme';
import { Icon } from './Icon';

// Swipe a row left to reveal a destructive action. Replaces the explicit
// delete buttons / long-press-to-delete used before. Works in Expo Go
// (gesture-handler + reanimated are bundled).
export function SwipeRow({
  children,
  onDelete,
  deleteLabel = 'Delete',
}: {
  children: React.ReactNode;
  onDelete: () => void;
  deleteLabel?: string;
}) {
  const t = useTheme();
  const ref = useRef<SwipeableMethods>(null);

  const renderRightActions = () => (
    <Pressable
      onPress={() => {
        ref.current?.close();
        onDelete();
      }}
      style={{
        backgroundColor: t.colors.destructive,
        justifyContent: 'center',
        alignItems: 'center',
        width: 84,
        gap: 2,
      }}
    >
      <Icon name="trash" color="#FFFFFF" size={20} weight="semibold" />
      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>{deleteLabel}</Text>
    </Pressable>
  );

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={renderRightActions}
    >
      <View style={{ backgroundColor: t.colors.card }}>{children}</View>
    </ReanimatedSwipeable>
  );
}
