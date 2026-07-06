/**
 * Trendzo Partner — design system, ported from the Trenzo mockup app.
 * Editorial / minimal: warm light-gray canvas, monochrome black/white, rounded
 * cards, Inter typography, 8pt grid. (Replaces the old brutalist theme.)
 */

export const colors = {
  canvas: '#E7E7E5', // warm light-gray app background
  surface: '#FFFFFF',
  ink: '#0A0A0A', // primary text / headlines
  inkMuted: '#ABABA9', // muted / placeholder
  meta: '#77776F', // small captions
  cardGray: '#C6C6C4',
  // Monochrome accent: primary = black, text on it = white.
  accent: '#0A0A0A',
  accentInk: '#FFFFFF',
  accentSub: 'rgba(255,255,255,0.62)',
  onDarkMuted: 'rgba(255,255,255,0.62)',
  danger: '#E5484D',
  success: '#30A46C',
  scrim: 'rgba(10,10,10,0.55)',
  hairline: 'rgba(10,10,10,0.08)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  screenH: 24,
} as const;

export const radii = {
  card: 18,
  sheet: 24,
  pill: 999,
  sm: 10,
} as const;

// Inter is loaded in App.tsx via @expo-google-fonts/inter.
export const fonts = {
  black: 'Inter_900Black',
  bold: 'Inter_700Bold',
  semiBold: 'Inter_600SemiBold',
  medium: 'Inter_500Medium',
  regular: 'Inter_400Regular',
} as const;

export const type = {
  display: {
    fontFamily: fonts.black,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.1,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 23,
    letterSpacing: -0.2,
  },
  sectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  meta: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  navLabel: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20 },
  navCounter: { fontFamily: fonts.semiBold, fontSize: 9, lineHeight: 10 },
  button: {
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
} as const;

export const radius = radii; // alias
