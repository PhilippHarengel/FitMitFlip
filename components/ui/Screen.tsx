import React from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { FLOATING_TAB_BAR_HEIGHT } from './FloatingTabBar';

// Screen body for a tab wrapped in a native-stack navigator. The native header
// (with the large title) is provided by the navigator.
//
// `header` is an optional pinned row (e.g. the DateNavigator) that stays fixed at
// the top while the content beneath it scrolls. In the scroll branch it's a real
// sticky header (`stickyHeaderIndices`), so the native large title still collapses
// on scroll and the header rides up under the collapsing nav bar. In the
// non-scroll branch it sits on top of static content.
//
// `contentInsetAdjustmentBehavior="automatic"` is what makes the large title
// collapse into the nav bar as you scroll.
export function Screen({
  children,
  header,
  scroll = true,
  topSafeArea = false,
  contentStyle,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  scroll?: boolean;
  // When the native nav header is hidden (e.g. Home), the pinned header must
  // clear the notch/status bar itself. Adds the top safe-area inset.
  topSafeArea?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  // Clear the floating dock so the last row / content isn't hidden behind it.
  const dockClearance = insets.bottom + FLOATING_TAB_BAR_HEIGHT + 24;

  // Pinned header: opaque grouped background so scrolling content never shows
  // through behind it. Supplies the top padding so content starts flush below.
  const headerStyle: ViewStyle = {
    backgroundColor: t.colors.bgGrouped,
    paddingHorizontal: t.spacing.lg,
    paddingTop: topSafeArea ? insets.top + t.spacing.sm : t.spacing.lg,
    paddingBottom: t.spacing.sm,
  };

  // Content padding. With a pinned header the header already padded the top, so
  // content tucks just below it; without one, pad the top fully.
  const contentPad: ViewStyle = {
    paddingHorizontal: t.spacing.lg,
    paddingTop: header ? t.spacing.md : t.spacing.lg,
    gap: t.spacing.lg,
  };

  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.bgGrouped }}>
        {header ? <View style={headerStyle}>{header}</View> : null}
        <View style={[{ flex: 1, paddingBottom: dockClearance }, contentPad, contentStyle]}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.colors.bgGrouped }}
      // With a hidden native header (topSafeArea) our pinned header owns the top
      // inset; "automatic" would double it. With a native large title, "automatic"
      // is what collapses it on scroll.
      contentInsetAdjustmentBehavior={topSafeArea ? 'never' : 'automatic'}
      keyboardShouldPersistTaps="handled"
      stickyHeaderIndices={header ? [0] : undefined}
      contentContainerStyle={{ paddingBottom: dockClearance }}
    >
      {header ? <View style={headerStyle}>{header}</View> : null}
      <View style={[contentPad, contentStyle]}>{children}</View>
    </ScrollView>
  );
}
