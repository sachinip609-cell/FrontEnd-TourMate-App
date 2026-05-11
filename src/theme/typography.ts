import { TextStyle } from 'react-native';
import { Colors } from './colors';
import { FontWeight, LetterSpacing, FontSizes, LineHeight } from './tokens';

export const Typography: Record<string, TextStyle> = {
  brandLogo: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    letterSpacing: LetterSpacing.normal,
  },
  headline: {
    fontSize: FontSizes.display,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    lineHeight: LineHeight.heading,
  },
  subtitle: {
    fontSize: FontSizes.base,
    fontWeight: FontWeight.regular,
    color: Colors.textSecondary,
    lineHeight: LineHeight.body,
  },
  inputLabel: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.inputLabel,
    letterSpacing: LetterSpacing.wide,
    textTransform: 'uppercase',
  },
  inputText: {
    fontSize: FontSizes.base,
    fontWeight: FontWeight.regular,
    color: Colors.textPrimary,
  },
  buttonText: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  rightLabelText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    letterSpacing: LetterSpacing.wide,
    textTransform: 'uppercase',
  },
  biometricLabel: {
    fontSize: FontSizes.xxs,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.wider,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  footerText: {
    fontSize: FontSizes.base,
    fontWeight: FontWeight.regular,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: FontSizes.base,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
};
