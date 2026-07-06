// Trendzo Partner — design tokens, restyled to the Trenzo mockup system.
// Same export surface (C, T, SP, RADIUS, BORDER, HAIRLINE, setNight …) so every
// screen picks up the new look with no structural changes. Monochrome, warm-gray
// canvas, white rounded cards, Inter typography. (Night mode is now a no-op.)

export type Palette = {
  bg: string; // page background (warm gray canvas)
  ink: string; // primary text
  inkSoft: string;
  dim: string; // secondary text / captions
  faint: string; // muted / placeholder
  hairline: string; // thin separators / soft borders
  white: string; // card / raised surface
  mute: string; // subtle inset surface
  go: string;
  stop: string;
  cash: string;
};

export const LIGHT: Palette = {
  bg: '#E7E7E5',
  ink: '#0A0A0A',
  inkSoft: '#1F1F1D',
  dim: '#77776F',
  faint: '#ABABA9',
  hairline: 'rgba(10,10,10,0.08)',
  white: '#FFFFFF',
  mute: '#EFEFED',
  go: '#0A0A0A',
  stop: '#0A0A0A',
  cash: '#0A0A0A',
};

// Night mode dropped — dark == light so any lingering toggle is a no-op.
export const DARK: Palette = { ...LIGHT };

let _active: Palette = LIGHT;

const subscribers = new Set<() => void>();
export function subscribeTheme(fn: () => void) {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}
export function setNight(on: boolean) {
  _active = on ? DARK : LIGHT;
  subscribers.forEach((fn) => fn());
}
export function isNight() {
  return false;
}

// Proxy forwards every property read to the current active palette.
export const C: Palette = new Proxy({} as Palette, {
  get(_, key: string | symbol) {
    return (_active as any)[key];
  },
  has(_, key: string | symbol) {
    return key in _active;
  },
  ownKeys() {
    return Object.keys(_active);
  },
  getOwnPropertyDescriptor(_, key) {
    return Object.getOwnPropertyDescriptor(_active, key);
  },
});

export const SP = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, huge: 48 };

export const RADIUS = { none: 0, sm: 10, md: 14, lg: 18, pill: 999 };

// Soft rounded card outline (was a sharp brutalist border). Colour/radius read
// at call time so it stays theme-consistent.
export const BORDER = (w = 1) => ({
  borderWidth: w,
  get borderColor() {
    return C.hairline;
  },
  borderRadius: RADIUS.lg,
});

export const HAIRLINE = {
  borderWidth: 1,
  get borderColor() {
    return C.hairline;
  },
};

// Typography — Proxy so each access rebuilds the style with the live color.
export const T: any = new Proxy(
  {},
  {
    get(_, key: string) {
      const map: any = {
        display: {
          fontFamily: 'Inter_900Black',
          fontSize: 32,
          color: C.ink,
          letterSpacing: -1,
          lineHeight: 36,
        },
        h1: {
          fontFamily: 'Inter_700Bold',
          fontSize: 24,
          color: C.ink,
          letterSpacing: -0.5,
          lineHeight: 28,
        },
        h2: {
          fontFamily: 'Inter_700Bold',
          fontSize: 20,
          color: C.ink,
          letterSpacing: -0.4,
          lineHeight: 25,
        },
        h3: {
          fontFamily: 'Inter_700Bold',
          fontSize: 17,
          color: C.ink,
          letterSpacing: -0.2,
          lineHeight: 23,
        },
        body: { fontFamily: 'Inter_400Regular', fontSize: 15, color: C.ink, lineHeight: 22 },
        bodyB: { fontFamily: 'Inter_500Medium', fontSize: 15, color: C.ink, lineHeight: 22 },
        caption: { fontFamily: 'Inter_500Medium', fontSize: 13, color: C.dim, lineHeight: 18 },
        label: {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 12,
          color: C.dim,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        },
        mono: { fontFamily: 'Inter_500Medium', fontSize: 13, color: C.dim, letterSpacing: 0.2 },
        monoB: { fontFamily: 'Inter_700Bold', fontSize: 13, color: C.ink, letterSpacing: 0.2 },
      };
      return map[key];
    },
  },
);

export const ASCII = {
  hr: '',
  hrFaint: '',
  hrDot: '',
  caret: '',
  arrowR: '→',
  arrowL: '←',
  plus: '+',
  check: '✓',
  cross: '✕',
  bracket: (s: string) => s,
  loading: '',
};

export const ANIM = {
  fast: 180,
  base: 280,
  slow: 480,
  spring: { damping: 18, stiffness: 220, mass: 0.7 },
  springTight: { damping: 20, stiffness: 260, mass: 0.7 },
};
