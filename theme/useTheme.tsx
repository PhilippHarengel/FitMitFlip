import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { resolveTheme, type Theme } from './resolveTheme';

// ThemeProvider sits at the app root and subscribes to the system appearance.
// Because it re-derives the theme from useColorScheme(), flipping iOS dark mode
// while the app is open re-renders the tree with the right tokens — live, no
// restart. useTheme() is the single entry point every component reads from.
const ThemeContext = createContext<Theme>(resolveTheme('light'));

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const theme = useMemo(() => resolveTheme(scheme === 'dark' ? 'dark' : 'light'), [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
