import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { ScrollView, Text, View } from 'react-native';

// Deterministic safe-area insets so we can assert the exact bottom clearance.
const BOTTOM_INSET = 34;
const TOP_INSET = 47;
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: TOP_INSET, bottom: BOTTOM_INSET, left: 0, right: 0 }),
}));

import { Screen, NATIVE_TAB_BAR_HEIGHT } from '../Screen';

// No BottomTabBarHeightContext provider in the test tree, so Screen falls back
// to safe-area inset + the native tab bar height.
const CLEARANCE = BOTTOM_INSET + NATIVE_TAB_BAR_HEIGHT;

// Flatten a (possibly array) style into a single object.
function flatten(style: any) {
  return Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity).filter(Boolean)) : style;
}

// True if any rendered View carries the given flattened-style paddingBottom.
function hasViewWithPaddingBottom(r: TestRenderer.ReactTestRenderer, value: number) {
  return r.root.findAllByType(View).some((v) => flatten(v.props.style)?.paddingBottom === value);
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
    expect(style.paddingBottom).toBe(CLEARANCE);
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
    expect(hasViewWithPaddingBottom(r, CLEARANCE)).toBe(true);
  });

  it('keeps padding and gap on the non-scroll content (no edge-to-edge regression)', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        <Screen scroll={false}>
          <Text>content</Text>
        </Screen>
      );
    });
    const content = r.root
      .findAllByType(View)
      .map((v) => flatten(v.props.style))
      .find((s) => s?.paddingBottom === CLEARANCE);
    expect(content?.paddingHorizontal).toBeGreaterThan(0);
    expect(content?.gap).toBeGreaterThan(0);
  });
});

describe('Screen pinned header', () => {
  it('renders the header as the sticky first child in the scroll branch', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        <Screen header={<Text>date</Text>}>
          <Text>content</Text>
        </Screen>
      );
    });
    const scroll = r.root.findByType(ScrollView);
    expect(scroll.props.stickyHeaderIndices).toEqual([0]);
    // The header text renders ahead of the content text in the tree.
    const texts = r.root.findAllByType(Text).map((t) => t.props.children);
    expect(texts.indexOf('date')).toBeLessThan(texts.indexOf('content'));
  });

  it('disables automatic content inset when topSafeArea is set (our header owns the top)', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        <Screen topSafeArea header={<Text>date</Text>}>
          <Text>content</Text>
        </Screen>
      );
    });
    expect(r.root.findByType(ScrollView).props.contentInsetAdjustmentBehavior).toBe('never');
  });

  it('uses automatic content inset without topSafeArea (native large title collapse)', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        <Screen header={<Text>date</Text>}>
          <Text>content</Text>
        </Screen>
      );
    });
    expect(r.root.findByType(ScrollView).props.contentInsetAdjustmentBehavior).toBe('automatic');
  });

  it('does not set sticky indices when there is no header', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        <Screen>
          <Text>content</Text>
        </Screen>
      );
    });
    expect(r.root.findByType(ScrollView).props.stickyHeaderIndices).toBeUndefined();
  });

  it('renders the header above static content in the non-scroll branch', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        <Screen scroll={false} header={<Text>date</Text>}>
          <Text>content</Text>
        </Screen>
      );
    });
    const texts = r.root.findAllByType(Text).map((t) => t.props.children);
    expect(texts).toContain('date');
    expect(texts.indexOf('date')).toBeLessThan(texts.indexOf('content'));
  });

  it('adds the top safe-area inset to the header when topSafeArea is set', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        <Screen scroll={false} topSafeArea header={<Text>date</Text>}>
          <Text>content</Text>
        </Screen>
      );
    });
    const insetHeader = r.root
      .findAllByType(View)
      .some((v) => (flatten(v.props.style)?.paddingTop ?? 0) >= TOP_INSET);
    expect(insetHeader).toBe(true);
  });

  it('does not add the top inset when topSafeArea is not set', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        <Screen scroll={false} header={<Text>date</Text>}>
          <Text>content</Text>
        </Screen>
      );
    });
    const anyInset = r.root
      .findAllByType(View)
      .some((v) => (flatten(v.props.style)?.paddingTop ?? 0) >= TOP_INSET);
    expect(anyInset).toBe(false);
  });

  it('honors contentStyle on the content wrapper', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        <Screen header={<Text>date</Text>} contentStyle={{ paddingTop: 99 }}>
          <Text>content</Text>
        </Screen>
      );
    });
    const matched = r.root
      .findAllByType(View)
      .some((v) => flatten(v.props.style)?.paddingTop === 99);
    expect(matched).toBe(true);
  });
});
