import React, { useState } from 'react';
import { Pressable, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../theme';

// Floating iOS Liquid Glass dock that replaces the stock bottom tab bar. A
// rounded capsule lifted off the bottom edge with side margins. On iOS 26+ the
// background is real Liquid Glass (UIGlassEffect); on older iOS / when the glass
// API is unavailable we fall back to a solid translucent pill + shadow so the
// dock never renders empty. Icon-only, with an accent pill that springs behind
// the active tab.
export const FLOATING_TAB_BAR_HEIGHT = 64;

// Active-pill geometry inside an item slot.
const PILL_HEIGHT = 44;
const PILL_RADIUS = 22;

// Fallback background when Liquid Glass is unavailable (iOS <26). These are the
// only hardcoded colors in the component — a translucent take on the `card`
// token for each appearance — because the glass material itself can't come from
// a theme token. Documented per the spec.
const SOLID_LIGHT = 'rgba(255, 255, 255, 0.92)';
const SOLID_DARK = 'rgba(28, 28, 30, 0.92)';

// Ionicons used per route — filled when active, outline when inactive.
const ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Workout: { active: 'barbell', inactive: 'barbell-outline' },
  Home: { active: 'home', inactive: 'home-outline' },
  Food: { active: 'nutrition', inactive: 'nutrition-outline' },
};

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const glass = isLiquidGlassAvailable();

  // Per-item layout (x + width) so the active pill can be positioned/animated.
  const [layouts, setLayouts] = useState<Record<number, { x: number; width: number }>>({});
  const pillX = useSharedValue(0);
  const pillW = useSharedValue(0);

  const onItemLayout = (index: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    // Keep this updater pure — no shared-value writes during render. The effect
    // below springs the pill once `layouts` updates (covers initial + resize).
    setLayouts((prev) => {
      if (prev[index]?.x === x && prev[index]?.width === width) return prev;
      return { ...prev, [index]: { x, width } };
    });
  };

  // Re-spring the pill whenever the active route changes (and its layout exists).
  React.useEffect(() => {
    const active = layouts[state.index];
    if (active) {
      pillX.value = withSpring(active.x, { damping: 18, stiffness: 180 });
      pillW.value = withSpring(active.width, { damping: 18, stiffness: 180 });
    }
  }, [state.index, layouts, pillX, pillW]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
    width: pillW.value,
  }));

  const pill: ViewStyle = {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: insets.bottom,
    height: FLOATING_TAB_BAR_HEIGHT,
    borderRadius: FLOATING_TAB_BAR_HEIGHT / 2,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    overflow: 'hidden',
  };

  // Solid fallback gets a subtle shadow + hairline border so it reads as a
  // floating surface; the glass material provides its own depth.
  const fallbackStyle: ViewStyle = {
    backgroundColor: t.scheme === 'dark' ? SOLID_DARK : SOLID_LIGHT,
    borderWidth: 1,
    borderColor: t.colors.separator,
    shadowColor: '#000',
    shadowOpacity: t.scheme === 'dark' ? 0.4 : 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  };

  const items = state.routes.map((route, index) => {
    const focused = state.index === index;
    const names = ICONS[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      Haptics.selectionAsync();
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        accessibilityLabel={route.name}
        onPress={onPress}
        onLayout={onItemLayout(index)}
        style={{ flex: 1, height: FLOATING_TAB_BAR_HEIGHT, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons
          name={focused ? names.active : names.inactive}
          size={26}
          color={focused ? t.colors.accent : t.colors.tabInactive}
        />
      </Pressable>
    );
  });

  // Accent pill behind the active icon — accent at ~15% opacity. Sits centered
  // vertically inside the capsule and slides to the active item with a spring.
  const activePill = (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: (FLOATING_TAB_BAR_HEIGHT - PILL_HEIGHT) / 2,
          height: PILL_HEIGHT,
          borderRadius: PILL_RADIUS,
          backgroundColor: t.colors.accent + '26', // ~15% opacity
        },
        pillStyle,
      ]}
    />
  );

  if (glass) {
    return (
      <GlassView style={pill} glassEffectStyle="regular" isInteractive>
        {activePill}
        {items}
      </GlassView>
    );
  }

  return (
    <View style={[pill, fallbackStyle]}>
      {activePill}
      {items}
    </View>
  );
}
