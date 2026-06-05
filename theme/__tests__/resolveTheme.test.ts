import { resolveTheme } from '../resolveTheme';
import { lightColors, darkColors } from '../colors';

describe('resolveTheme', () => {
  it('returns the light palette for the light scheme', () => {
    const t = resolveTheme('light');
    expect(t.scheme).toBe('light');
    expect(t.colors).toBe(lightColors);
    expect(t.colors.bg).toBe('#FFFFFF');
  });

  it('returns the dark palette for the dark scheme', () => {
    const t = resolveTheme('dark');
    expect(t.scheme).toBe('dark');
    expect(t.colors).toBe(darkColors);
    expect(t.colors.bg).toBe('#000000');
  });

  it('carries the shared scales on both schemes', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const t = resolveTheme(scheme);
      expect(t.spacing.lg).toBe(16);
      expect(t.radius.card).toBe(12);
      expect(t.typography.largeTitle.fontSize).toBe(34);
    }
  });

  it('exposes a distinct macro color per ring', () => {
    const t = resolveTheme('light');
    const macros = [t.colors.protein, t.colors.carbs, t.colors.fat];
    expect(new Set(macros).size).toBe(3);
  });
});
