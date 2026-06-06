import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { ScrollView, Text, View } from 'react-native';

// Deterministic safe-area insets so we can assert the exact bottom clearance.
const BOTTOM_INSET = 34;
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: BOTTOM_INSET, left: 0, right: 0 }),
}));

import { Screen } from '../Screen';
import { FLOATING_TAB_BAR_HEIGHT } from '../FloatingTabBar';

// Flatten a (possibly array) style into a single object.
function flatten(style: any) {
  return Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity).filter(Boolean)) : style;
}

describe('Screen bottom inset for the floating dock', () => {
  it('pads the scroll content past the dock (inset + bar height + 24)', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        <Screen>
          <Text>content</Text>
        </Screen>
      );
    });
    const scroll = r.root.findByType(ScrollView);
    const style = flatten(scroll.props.contentContainerStyle);
    expect(style.paddingBottom).toBe(BOTTOM_INSET + FLOATING_TAB_BAR_HEIGHT + 24);
  });

  it('pads the non-scroll branch by the same clearance', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        <Screen scroll={false}>
          <Text>content</Text>
        </Screen>
      );
    });
    const container = r.root.findAllByType(View)[0];
    const style = flatten(container.props.style);
    expect(style.paddingBottom).toBe(BOTTOM_INSET + FLOATING_TAB_BAR_HEIGHT + 24);
  });
});
