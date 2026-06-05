import React from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

// Screen body for a tab wrapped in a native-stack navigator. The header (with
// the large title) is provided by the navigator; Screen renders the scrolling
// content on the grouped background. `contentInsetAdjustmentBehavior="automatic"`
// is what makes the large title collapse into the nav bar as you scroll.
export function Screen({
  children,
  scroll = true,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();

  if (!scroll) {
    return <View style={{ flex: 1, backgroundColor: t.colors.bgGrouped }}>{children}</View>;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.colors.bgGrouped }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[{ padding: t.spacing.lg, gap: t.spacing.lg }, contentStyle]}
    >
      {children}
    </ScrollView>
  );
}
