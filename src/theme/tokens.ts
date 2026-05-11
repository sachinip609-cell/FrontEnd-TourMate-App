/**
 * theme/tokens.ts
 *
 * Raw design tokens — the single source of truth for every
 * stylistic value in the design system.
 *
 * Rule: nothing outside `theme/` should import from here directly;
 * consumers import from `theme/index.ts`.
 *
 *  ─ FontFamily    : typeface names (swap here to change app-wide font)
 *  ─ FontWeight    : weight literals (typed as TextStyle['fontWeight'])
 *  ─ FontSizes     : type-scale
 *  ─ LetterSpacing : tracking scale
 *  ─ LineHeight    : leading scale
 *  ─ Radius        : border-radius scale
 */
import { TextStyle } from 'react-native';

// ─── Typography tokens ────────────────────────────────────────────────────────

export const FontFamily = {
  regular: undefined as string | undefined,
  // Swap in a linked custom font here, e.g.:
  // regular: 'Inter-Regular',
  // semibold: 'Inter-SemiBold',
  // bold: 'Inter-Bold',
} as const;

export const FontWeight: Record<string, TextStyle['fontWeight']> = {
  regular: '400',
  semibold: '600',
  bold: '700',
} as const;

export const FontSizes = {
  xxs: 9,
  xs: 10,
  sm: 12,
  base: 13,
  md: 15,
  lg: 16,
  xl: 20,
  xxl: 26,
  display: 30,
} as const;

export const LetterSpacing = {
  tight: 0.3,
  normal: 0.5,
  wide: 1.0,
  wider: 2.0,
} as const;

export const LineHeight = {
  body: 20,
  heading: 38,
} as const;

// ─── Shape tokens ─────────────────────────────────────────────────────────────

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;
