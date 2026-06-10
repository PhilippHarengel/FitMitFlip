import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { resolveTheme, type Theme } from './resolveTheme';
import { ACCENT_PRESETS } from './colors';
import { getPreference, setPreference } from '../db/queries';

type ThemeContextValue = {
  theme: Theme;
  accentKey: string;
  setAccentColor: (key: string) => Promise<void>;
};

const DEFAULT_ACCENT_KEY = 'indigo';

const ThemeContext = createContext<ThemeContextValue>({
  theme: resolveTheme('light'),
  accentKey: DEFAULT_ACCENT_KEY,
  setAccentColor: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const [accentKey, setAccentKeyState] = useState(DEFAULT_ACCENT_KEY);

  useEffect(() => {
    getPreference('accentColor').then(val => {
      if (val && ACCENT_PRESETS.some(p => p.key === val)) {
        setAccentKeyState(val);
      }
    }).catch(() => {});
  }, []);

  const accentPreset = ACCENT_PRESETS.find(p => p.key === accentKey) ?? ACCENT_PRESETS[0];
  const accentColor = scheme === 'dark' ? accentPreset.dark : accentPreset.light;

  const theme = useMemo(
    () => resolveTheme(scheme === 'dark' ? 'dark' : 'light', accentColor),
    [scheme, accentColor],
  );

  const setAccentColor = useCallback(async (key: string) => {
    setAccentKeyState(key);
    await setPreference('accentColor', key);
  }, []);

  const value = useMemo(
    () => ({ theme, accentKey, setAccentColor }),
    [theme, accentKey, setAccentColor],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

// Returns the current accent key and a setter. Only needed by the color picker.
export function useAccentColor(): { accentKey: string; setAccentColor: (key: string) => Promise<void> } {
  const { accentKey, setAccentColor } = useContext(ThemeContext);
  return { accentKey, setAccentColor };
}
