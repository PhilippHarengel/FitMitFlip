import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

import { Sheet } from '../Sheet';

function flatten(style: any) {
  return Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity).filter(Boolean)) : style;
}

// The TouchableOpacity whose rendered Text equals `text`.
function buttonWithText(r: TestRenderer.ReactTestRenderer, text: string) {
  return r.root.findAll(
    (n) =>
      n.type === TouchableOpacity &&
      n.findAll((c) => c.type === Text && c.props.children === text).length > 0
  )[0];
}

function textValues(r: TestRenderer.ReactTestRenderer) {
  return r.root.findAllByType(Text).map((t) => t.props.children);
}

describe('Sheet', () => {
  it('presents as an iOS pageSheet with a grabber handle', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        <Sheet visible title="X" onClose={() => {}}>
          <Text>body</Text>
        </Sheet>
      );
    });
    expect(r.root.findByType(Modal).props.presentationStyle).toBe('pageSheet');
    const grabber = r.root
      .findAllByType(View)
      .some((v) => { const s = flatten(v.props.style); return s?.width === 36 && s?.height === 5; });
    expect(grabber).toBe(true);
  });

  it('with an action: bottom button runs onAction and header shows Cancel', () => {
    const onAction = jest.fn();
    const onClose = jest.fn();
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        <Sheet visible title="Daily Goals" onClose={onClose} actionLabel="Save" onAction={onAction}>
          <Text>body</Text>
        </Sheet>
      );
    });
    expect(textValues(r)).toContain('Cancel');
    const btn = buttonWithText(r, 'Save');
    expect(btn).toBeTruthy();
    act(() => btn.props.onPress());
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('without an action: bottom button is Done and dismisses', () => {
    const onClose = jest.fn();
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        <Sheet visible title="Settings" onClose={onClose}>
          <Text>body</Text>
        </Sheet>
      );
    });
    // No header Cancel when there is no action.
    expect(textValues(r)).not.toContain('Cancel');
    const btn = buttonWithText(r, 'Done');
    expect(btn).toBeTruthy();
    act(() => btn.props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables the bottom button when actionDisabled', () => {
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        <Sheet visible title="Add" onClose={() => {}} actionLabel="Add" onAction={() => {}} actionDisabled>
          <Text>body</Text>
        </Sheet>
      );
    });
    expect(buttonWithText(r, 'Add').props.disabled).toBe(true);
  });

  it('renders a secondary header link when provided', () => {
    const onSecondary = jest.fn();
    let r!: TestRenderer.ReactTestRenderer;
    act(() => {
      r = TestRenderer.create(
        <Sheet visible title="Nutrients" onClose={() => {}} secondaryLabel="Goals" onSecondary={onSecondary}>
          <Text>body</Text>
        </Sheet>
      );
    });
    const link = buttonWithText(r, 'Goals');
    expect(link).toBeTruthy();
    act(() => link.props.onPress());
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });
});
