import { TextStyle } from 'react-native';

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
};

export const Typography: Record<string, TextStyle> = {
  h1: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
    fontWeight: FontWeight.bold,
  },
  h2: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
    fontWeight: FontWeight.bold,
  },
  h3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: FontWeight.semiBold,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: FontWeight.regular,
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: FontWeight.regular,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: FontWeight.regular,
  },
  button: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: FontWeight.semiBold,
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: FontWeight.medium,
  },
};
