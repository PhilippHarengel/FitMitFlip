import { lightColors, darkColors, type Palette, type ColorScheme } from './colors';
import { spacing, type Spacing } from './spacing';
import { radius, type Radius } from './radius';
import { typography, type Typography } from './typography';

// Pure: a color scheme in, a complete theme out. No React Native imports, so
// this is unit-testable in isolation (theme/__tests__/resolveTheme.test.ts).
export type Theme = {
  scheme: ColorScheme;
  colors: Palette;
  spacing: Spacing;
  radius: Radius;
  typography: Typography;
};

export function resolveTheme(scheme: ColorScheme): Theme {
  return {
    scheme,
    colors: scheme === 'dark' ? darkColors : lightColors,
    spacing,
    radius,
    typography,
  };
}
