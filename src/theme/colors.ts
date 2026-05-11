export const Colors = {
  // Backgrounds
  // Slight warm-tinted off-white to match the reference's soft backdrop
  background: '#F4F8F6',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',

  // Brand
  // Teal / turquoise primary for buttons and accents
  primary: '#2F9E88',
  primaryDark: '#1F7A66',
  onPrimary: '#FFFFFF',
  // Warm accent used for highlights and secondary badges
  accent: '#E07B39',

  // Text
  textPrimary: '#0D2B26',
  textSecondary: '#4A6760',
  textMuted: '#8FA8A0',
  textLink: '#2F9E88',

  // Input
  inputBackground: '#FFFFFF',
  inputBorder: '#E6EEF0',
  inputPlaceholder: '#9AB2A9',
  inputLabel: '#4A6760',

  // Border / surface separators
  border: '#E9F2F0',

  // Utility
  white: '#FFFFFF',
  error: '#E53935',
  transparent: 'transparent',

  // Extras kept for backward compat
  backgroundDark: '#0D1E30',
} as const;

export type ColorKeys = keyof typeof Colors;
