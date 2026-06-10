import { lightColors, darkColors, type Palette, type ColorScheme } from './colors';
import { spacing, type Spacing } from './spacing';
import { radius, type Radius } from './radius';
import { typography, type Typography } from './typography';

export type Theme = {
  scheme: ColorScheme;
  colors: Palette;
  spacing: Spacing;
  radius: Radius;
  typography: Typography;
};

// Pure: scheme + optional accent override → complete theme. The accent override
// replaces both `accent` and `tabActive` so every interactive element and the
// tab bar tint stay in sync with the user's chosen color.
export function resolveTheme(scheme: ColorScheme, accentOverride?: string): Theme {
  const base = scheme === 'dark' ? darkColors : lightColors;
  const colors: Palette = accentOverride
    ? { ...base, accent: accentOverride, tabActive: accentOverride }
    : base;
  return { scheme, colors, spacing, radius, typography };
}
