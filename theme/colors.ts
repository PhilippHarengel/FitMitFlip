// Color tokens for the FitMitFlip design system.
//
// Two palettes — light and dark — mapped to Apple's semantic system colors so
// the app looks native in both appearances. Screens NEVER hardcode hex; they
// read these tokens via useTheme(). Macro ring colors live here too so the
// nutrition rings don't introduce any hue that isn't part of the system.

export type ColorScheme = 'light' | 'dark';

export type AccentPreset = {
  readonly key: string;
  readonly label: string;
  readonly light: string;
  readonly dark: string;
};

// 6 accent presets shown in the theme color picker.
// The first entry (indigo) is the default.
export const ACCENT_PRESETS: readonly AccentPreset[] = [
  { key: 'indigo', label: 'Indigo', light: '#5856D6', dark: '#7B61FF' },
  { key: 'orange', label: 'Orange', light: '#FF9500', dark: '#FF9F0A' },
  { key: 'red',    label: 'Red',    light: '#FF3B30', dark: '#FF453A' },
  { key: 'green',  label: 'Green',  light: '#34C759', dark: '#30D158' },
  { key: 'teal',   label: 'Teal',   light: '#32ADE6', dark: '#64D2FF' },
  { key: 'gray',   label: 'Gray',   light: '#636366', dark: '#8E8E93' },
] as const;

export type Palette = {
  bg: string;            // base screen background
  bgGrouped: string;     // iOS grouped-list background (cards sit on this)
  card: string;          // grouped cell / card surface
  label: string;         // primary text
  secondaryLabel: string; // secondary text, captions
  separator: string;     // hairline dividers
  track: string;         // empty progress-bar / ring track
  accent: string;        // interactive / tint
  success: string;       // done, on-track
  warning: string;       // over target
  destructive: string;   // delete
  tabInactive: string;   // inactive bottom-tab icon
  tabActive: string;     // active floating-dock tint (indigo, dock-only — not the app accent)
  // Macro ring fills — reuse the system trio, no new hues.
  protein: string;
  carbs: string;
  fat: string;
};

export const lightColors: Palette = {
  bg: '#FFFFFF',
  bgGrouped: '#F2F2F7',
  card: '#FFFFFF',
  label: '#111111',
  secondaryLabel: '#8A8A8E',
  separator: '#C6C6C8',
  track: '#E4E4E4',
  accent: '#5856D6',
  success: '#1A9E54',
  warning: '#E6A100',
  destructive: '#FF3B30',
  tabInactive: '#AAAAAA',
  tabActive: '#5856D6',
  protein: '#007AFF',
  carbs: '#1A9E54',
  fat: '#E6A100',
};

export const darkColors: Palette = {
  bg: '#000000',
  bgGrouped: '#000000',
  card: '#1C1C1E',
  label: '#FFFFFF',
  secondaryLabel: '#98989F',
  separator: '#38383A',
  track: '#2C2C2E',
  accent: '#7B61FF',
  success: '#30D158',
  warning: '#FFD60A',
  destructive: '#FF453A',
  tabInactive: '#8E8E93',
  tabActive: '#7B61FF',
  protein: '#0A84FF',
  carbs: '#30D158',
  fat: '#FFD60A',
};
