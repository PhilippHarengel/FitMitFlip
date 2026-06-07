import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { isLiquidGlassAvailable } from 'expo-glass-effect';

// Reanimated needs its jest setup to provide withSpring/useSharedValue etc.
require('react-native-reanimated').setUpTests?.();

// Safe-area: deterministic insets without a provider.
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

// Haptics: spy on the selection feedback.
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn() }));

// Gesture handler: passthrough GestureDetector + a chainable Gesture.Pan() stub
// so the component renders without the native gesture runtime under jest.
jest.mock('react-native-gesture-handler', () => {
  const chain = () => {
    const g: any = {};
    for (const k of ['onBegin', 'onStart', 'onUpdate', 'onChange', 'onEnd', 'onFinalize']) {
      g[k] = () => g;
    }
    return g;
  };
  return {
    GestureDetector: ({ children }: any) => children,
    Gesture: { Pan: chain },
  };
});

// Glass: a controllable availability flag + a tagged GlassView so we can assert
// which background branch rendered. isLiquidGlassAvailable is reset per test.
const mockGlassAvailable = jest.fn(() => true);
jest.mock('expo-glass-effect', () => {
  const { View: RNView } = require('react-native');
  return {
    isLiquidGlassAvailable: () => mockGlassAvailable(),
    GlassView: (props: any) => <RNView testID="glass-view" {...props} />,
  };
});

import { FloatingTabBar, FLOATING_TAB_BAR_HEIGHT } from '../FloatingTabBar';

// Minimal BottomTabBarProps fixture for three routes with a chosen active index.
function makeProps(activeIndex: number, navigate = jest.fn(), emit = jest.fn(() => ({ defaultPrevented: false }))) {
  const routes = [
    { key: 'Workout-1', name: 'Workout' },
    { key: 'Home-1', name: 'Home' },
    { key: 'Food-1', name: 'Food' },
  ];
  return {
    state: { index: activeIndex, routes, routeNames: routes.map((r) => r.name) },
    navigation: { emit, navigate },
    descriptors: {},
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  } as any;
}

// Pull the tab buttons out of the tree by their accessibility role. (Querying by
// Pressable type is brittle under jest-expo's RN mocks.)
function tabButtons(root: TestRenderer.ReactTestRenderer) {
  return root.root.findAll(
    (node) => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function'
  );
}

// The mocked GlassView renders a single host View tagged with testID; querying
// the host instance avoids double-counting composite + host.
function glassViews(root: TestRenderer.ReactTestRenderer) {
  return root.root.findAll(
    (node) => node.props.testID === 'glass-view' && typeof node.type === 'string'
  );
}

describe('FloatingTabBar', () => {
  beforeEach(() => {
    mockGlassAvailable.mockReturnValue(true);
    (Haptics.selectionAsync as jest.Mock).mockClear();
  });

  it('renders exactly three tabs', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(<FloatingTabBar {...makeProps(1)} />);
    });
    expect(tabButtons(r)).toHaveLength(3);
  });

  it('labels the Home route "Home" (not "Today")', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(<FloatingTabBar {...makeProps(1)} />);
    });
    const labels = tabButtons(r).map((b) => b.props.accessibilityLabel);
    expect(labels).toEqual(['Workout', 'Home', 'Food']);
  });

  it('marks the correct active tab with the filled accent icon', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(<FloatingTabBar {...makeProps(0)} />);
    });
    const icons = r.root.findAllByType(Ionicons);
    // Active (Workout) is filled; the others are outline.
    expect(icons[0].props.name).toBe('barbell');
    expect(icons[1].props.name).toBe('home-outline');
    expect(icons[2].props.name).toBe('nutrition-outline');
  });

  it('navigates and fires a haptic when a non-focused tab is pressed', () => {
    const navigate = jest.fn();
    const emit = jest.fn(() => ({ defaultPrevented: false }));
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(<FloatingTabBar {...makeProps(1, navigate, emit)} />);
    });
    // Press the Food tab (index 2), which is not focused.
    act(() => {
      tabButtons(r)[2].props.onPress();
    });
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tabPress', target: 'Food-1', canPreventDefault: true })
    );
    expect(navigate).toHaveBeenCalledWith('Food');
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('does not navigate when the focused tab is pressed', () => {
    const navigate = jest.fn();
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(<FloatingTabBar {...makeProps(1, navigate)} />);
    });
    act(() => {
      tabButtons(r)[1].props.onPress(); // Home is already focused.
    });
    expect(navigate).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('uses GlassView when Liquid Glass is available', () => {
    mockGlassAvailable.mockReturnValue(true);
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(<FloatingTabBar {...makeProps(1)} />);
    });
    expect(glassViews(r).length).toBe(1);
  });

  it('falls back to a solid View when Liquid Glass is unavailable', () => {
    mockGlassAvailable.mockReturnValue(false);
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(<FloatingTabBar {...makeProps(1)} />);
    });
    expect(glassViews(r).length).toBe(0);
    // The bar is a plain View with the floating-bar geometry.
    const barView = r.root.findAll((node) => {
      const style = node.props.style;
      const flat = Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity).filter(Boolean)) : style;
      return !!flat && flat.height === FLOATING_TAB_BAR_HEIGHT && flat.borderRadius === FLOATING_TAB_BAR_HEIGHT / 2;
    });
    expect(barView.length).toBeGreaterThan(0);
  });
});
