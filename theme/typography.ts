import type { TextStyle } from 'react-native';

// iOS-matched type scale. Components spread these onto <Text>. Dynamic Type is
// honored via the default `allowFontScaling` (true); fixed-height containers
// (scroll wheels, ring labels) cap scaling themselves where clipping is a risk.
export const typography = {
  largeTitle: { fontSize: 34, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '700' },
  headline: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 17, fontWeight: '400' },
  subhead: { fontSize: 15, fontWeight: '400' },
  footnote: { fontSize: 13, fontWeight: '400' },
  caption: { fontSize: 12, fontWeight: '400' },
} satisfies Record<string, TextStyle>;

export type Typography = typeof typography;
