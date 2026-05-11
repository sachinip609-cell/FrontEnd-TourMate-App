/**
 * AppSizes
 *
 * Component-specific, engineering-level dimensions.
 * Design tokens (font sizes, radii, line heights) live in `theme/tokens.ts`.
 *
 *  ─ ComponentSize : fixed heights / widths / padding for interactive elements
 *  ─ IconSize       : icon dimensions used across the app
 */

export const ComponentSize = {
  inputHeight: 34,
  inputPaddingH: 16,
  inputPaddingV: 6,
  buttonHeight: 54,
  buttonPaddingH: 24,
  biometricButton: 52,
  biometricIconSize: 26,
  fingerprintSize: 34,
  starDotMin: 0.5,
  starDotMax: 2.5,
} as const;

export const IconSize = {
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
} as const;
