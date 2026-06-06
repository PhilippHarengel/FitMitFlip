import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
// dock never renders empty. Each tab is icon + label; the active tab's icon and
// label turn indigo and a raised glass capsule sits behind it. The capsule can
// be tapped (tap a tab) or dragged along the bar to change tabs.
export const FLOATING_TAB_BAR_HEIGHT = 72;

// Per-tab icon box (keeps labels aligned whether or not the tab is active).
const ICON_BOX = 40;
const ICON_SIZE = 24;

// Raised glass capsule (the moving active indicator) — inset from the slot edges
// and fully rounded so it echoes the bar's pill shape.
const CAPSULE_INSET_V = 6;
const CAPSULE_INSET_H = 8;
const CAPSULE_RADIUS = (FLOATING_TAB_BAR_HEIGHT - CAPSULE_INSET_V * 2) / 2;

// Near-critically damped + clamped so the capsule glides to the tab and stops
// dead — no overshoot/wiggle when jumping across (e.g. Workout → Food).
const SPRING = { damping: 26, stiffness: 200, overshootClamping: true };

// Snappy spring for the press grow/shrink (no overshoot needed there).
const PRESS_SPRING = { damping: 15, stiffness: 320 };
// Bouncy spring for the bubble's landing wiggle — low damping = a little wobble.
const WIGGLE_SPRING = { damping: 7, stiffness: 230 };
const PRESS_SCALE = 1.04; // bar + bubble grow this much while pressing
const WIGGLE_SCALE = 1.12; // bubble pops to this then wobbles back to 1

// Fallback background when Liquid Glass is unavailable (iOS <26). These are the
// only hardcoded colors in the component — a translucent take on the `card`
// token for each appearance — because the glass material itself can't come from
// a theme token. Documented per the spec.
const SOLID_LIGHT = 'rgba(255, 255, 255, 0.92)';
const SOLID_DARK = 'rgba(28, 28, 30, 0.92)';

// Translucent "frosted" surface for the active capsule, sitting on top of the
// glass bar so the selected tab reads as lifted.
const CAPSULE_LIGHT = 'rgba(255, 255, 255, 0.6)';
const CAPSULE_DARK = 'rgba(255, 255, 255, 0.12)';

// Ionicons used per route — filled when active, outline when inactive.
const ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Workout: { active: 'barbell', inactive: 'barbell-outline' },
  Home: { active: 'home', inactive: 'home-outline' },
  Food: { active: 'nutrition', inactive: 'nutrition-outline' },
};

// Display label per route (the Home tab reads "Today").
const LABELS: Record<string, string> = {
  Workout: 'Workout',
  Home: 'Today',
  Food: 'Food',
};

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const glass = isLiquidGlassAvailable();
  const n = state.routes.length;

  // Per-item layout (x + width) so the active capsule can be positioned/animated.
  const [layouts, setLayouts] = useState<Record<number, { x: number; width: number }>>({});
  const capX = useSharedValue(0);
  const capW = useSharedValue(0);
  const itemW = useSharedValue(0); // measured slot width, shared so the pan worklet can read it

  // While dragging, the tab the capsule is currently over pre-selects (its icon +
  // label light up live, like the iOS 26 / WhatsApp dock) before the drag commits.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const hoverSV = useSharedValue(-1); // last hovered slot, on the UI thread, to throttle JS hops

  // Press feedback: the whole bar (and the bubble inside it) grows a touch while
  // tapping/dragging; the bubble adds its own little wobble when it lands.
  const barScale = useSharedValue(1);
  const capScale = useSharedValue(1);

  const onItemLayout = (index: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    // Keep this updater pure — no shared-value writes during render. The effect
    // below springs the capsule once `layouts` updates (covers initial + resize).
    setLayouts((prev) => {
      if (prev[index]?.x === x && prev[index]?.width === width) return prev;
      return { ...prev, [index]: { x, width } };
    });
  };

  // Re-spring the capsule whenever the active route changes (and its layout
  // exists), and keep the slot width available to the drag gesture.
  React.useEffect(() => {
    const active = layouts[state.index];
    if (active) {
      capX.value = withSpring(active.x + CAPSULE_INSET_H, SPRING);
      capW.value = withSpring(active.width - CAPSULE_INSET_H * 2, SPRING);
    }
    const iw = layouts[0]?.width ?? active?.width ?? 0;
    if (iw > 0) itemW.value = iw;
  }, [state.index, layouts, capX, capW, itemW]);

  const capsuleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: capX.value }, { scale: capScale.value }],
    width: capW.value,
  }));
  const barAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: barScale.value }] }));

  // Press feedback helpers.
  const pressIn = () => {
    barScale.value = withSpring(PRESS_SCALE, PRESS_SPRING);
  };
  const pressOut = () => {
    barScale.value = withSpring(1, PRESS_SPRING);
  };
  // Bubble pops then wobbles to rest after a tab is chosen.
  const wiggle = () => {
    capScale.value = withSequence(
      withTiming(WIGGLE_SCALE, { duration: 90 }),
      withSpring(1, WIGGLE_SPRING),
    );
  };

  // Tap or drag both route through here.
  const go = (index: number) => {
    const route = state.routes[index];
    if (!route) return;
    const focused = state.index === index;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    Haptics.selectionAsync();
    wiggle();
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  // Live pre-select as the capsule crosses into a new tab (with a haptic tick).
  const onHover = (idx: number) => {
    setDragIndex(idx);
    Haptics.selectionAsync();
  };
  // Commit on release; keep the highlight on the chosen tab until navigation lands
  // so the icon doesn't flash back to the old tab for a frame.
  const onDragEnd = (idx: number) => {
    setDragIndex(idx);
    go(idx);
  };
  React.useEffect(() => {
    if (dragIndex !== null && dragIndex === state.index) setDragIndex(null);
  }, [dragIndex, state.index]);

  // Drag the glass capsule along the bar; it free-follows the finger, pre-selects
  // the hovered tab live, and snaps to it (navigating there) on release.
  const pan = Gesture.Pan()
    .onBegin(() => {
      hoverSV.value = state.index;
      barScale.value = withSpring(PRESS_SCALE, PRESS_SPRING);
    })
    .onUpdate((e) => {
      const iw = itemW.value;
      if (iw <= 0) return;
      const maxX = (n - 1) * iw + CAPSULE_INSET_H;
      let cx = e.x - iw / 2 + CAPSULE_INSET_H;
      cx = Math.max(CAPSULE_INSET_H, Math.min(cx, maxX));
      capX.value = cx;
      capW.value = iw - CAPSULE_INSET_H * 2;
      let idx = Math.floor(e.x / iw);
      idx = Math.max(0, Math.min(idx, n - 1));
      if (idx !== hoverSV.value) {
        hoverSV.value = idx;
        runOnJS(onHover)(idx);
      }
    })
    .onEnd(() => {
      const iw = itemW.value;
      if (iw <= 0) return;
      let idx = hoverSV.value >= 0 ? hoverSV.value : state.index;
      idx = Math.max(0, Math.min(idx, n - 1));
      capX.value = withSpring(idx * iw + CAPSULE_INSET_H, SPRING);
      capW.value = withSpring(iw - CAPSULE_INSET_H * 2, SPRING);
      hoverSV.value = -1;
      runOnJS(onDragEnd)(idx);
    })
    .onFinalize(() => {
      barScale.value = withSpring(1, PRESS_SPRING);
    });

  const bar: ViewStyle = {
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

  // During a drag the hovered tab pre-selects; otherwise the real active route.
  const visualActive = dragIndex ?? state.index;
  const items = state.routes.map((route, index) => {
    const focused = visualActive === index;
    const names = ICONS[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };
    const label = LABELS[route.name] ?? route.name;
    const tint = focused ? t.colors.tabActive : t.colors.label;

    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        accessibilityLabel={label}
        onPress={() => go(index)}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onLayout={onItemLayout(index)}
        style={{ flex: 1, height: FLOATING_TAB_BAR_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 2 }}
      >
        {/* Icon turns indigo when selected (no filled badge); the box keeps a
            constant size so labels stay aligned across tabs. */}
        <View style={{ width: ICON_BOX, height: ICON_BOX, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={focused ? names.active : names.inactive} size={ICON_SIZE} color={tint} />
        </View>
        <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: focused ? '700' : '600', color: tint }}>
          {label}
        </Text>
      </Pressable>
    );
  });

  // Raised frosted capsule behind the active tab. Anchored at left:0 so the
  // spring/drag-driven translateX is absolute. Fully rounded to match the bar.
  const capsule = (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: 0,
          top: CAPSULE_INSET_V,
          height: FLOATING_TAB_BAR_HEIGHT - CAPSULE_INSET_V * 2,
          borderRadius: CAPSULE_RADIUS,
          backgroundColor: t.scheme === 'dark' ? CAPSULE_DARK : CAPSULE_LIGHT,
          borderWidth: 1,
          borderColor: t.scheme === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.8)',
          shadowColor: '#000',
          shadowOpacity: t.scheme === 'dark' ? 0.3 : 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
        },
        capsuleStyle,
      ]}
    />
  );

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[bar, glass ? null : fallbackStyle, barAnimStyle]}>
        {glass ? (
          <GlassView
            style={StyleSheet.absoluteFill}
            glassEffectStyle="regular"
            pointerEvents="none"
          />
        ) : null}
        {capsule}
        {items}
      </Animated.View>
    </GestureDetector>
  );
}
