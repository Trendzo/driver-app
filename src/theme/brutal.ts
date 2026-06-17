// Trendzo Partner — Modern Brutalism design system (monochrome / ASCII).
// Now theme-aware: a Proxy palette `C` reads from the active LIGHT/DARK table,
// so styles built at render time flip instantly when the rider toggles night
// mode. The root view is keyed on `night` (see RootNav) so every screen
// remounts and re-reads the palette on toggle.

export type Palette = {
  bg: string;       // page background
  ink: string;      // primary text + borders
  inkSoft: string;
  dim: string;      // secondary text
  faint: string;    // disabled / hairline-ish
  hairline: string; // thin separators
  white: string;    // card / raised surface
  mute: string;     // subtle inset surface (e.g. map, toggle gutter)
  go: string;
  stop: string;
  cash: string;
};

export const LIGHT: Palette = {
  bg: '#FFFFFF',
  ink: '#000000',
  inkSoft: '#1a1a1a',
  dim: '#666666',
  faint: '#bdbdbd',
  hairline: '#e6e6e6',
  white: '#FFFFFF',
  mute: '#f3f3f3',
  go: '#000000',
  stop: '#000000',
  cash: '#000000',
};

export const DARK: Palette = {
  bg: '#0a0a0a',
  ink: '#FFFFFF',
  inkSoft: '#e6e6e6',
  dim: '#9a9a9a',
  faint: '#4a4a4a',
  hairline: '#2a2a2a',
  white: '#161616',   // raised card surface, lighter than bg
  mute: '#1f1f1f',
  go: '#FFFFFF',
  stop: '#FFFFFF',
  cash: '#FFFFFF',
};

let _active: Palette = LIGHT;

const subscribers = new Set<() => void>();
export function subscribeTheme(fn: () => void) {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}
export function setNight(on: boolean) {
  _active = on ? DARK : LIGHT;
  subscribers.forEach(fn => fn());
}
export function isNight() { return _active === DARK; }

// Proxy forwards every property read to the current active palette.
export const C: Palette = new Proxy({} as Palette, {
  get(_, key: string | symbol) { return (_active as any)[key]; },
  has(_, key: string | symbol) { return key in _active; },
  ownKeys() { return Object.keys(_active); },
  getOwnPropertyDescriptor(_, key) { return Object.getOwnPropertyDescriptor(_active, key); },
});

export const SP = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, huge: 48 };

export const RADIUS = { none: 0, sm: 0, md: 0, lg: 0 };

// Sharp brutalist borders; borderColor read at call time so it flips with theme.
export const BORDER = (w = 1) => ({
  borderWidth: w,
  get borderColor() { return C.ink; },
  borderRadius: 0,
});

export const HAIRLINE = { borderWidth: 1, get borderColor() { return C.hairline; } };

// Typography — a Proxy so each access rebuilds the style with the live color.
export const T: any = new Proxy({}, {
  get(_, key: string) {
    const map: any = {
      display: { fontFamily: 'Inter_900Black', fontSize: 36, color: C.ink, letterSpacing: -1.2, lineHeight: 38 },
      h1: { fontFamily: 'Inter_900Black', fontSize: 26, color: C.ink, letterSpacing: -0.8 },
      h2: { fontFamily: 'Inter_900Black', fontSize: 20, color: C.ink, letterSpacing: -0.5 },
      h3: { fontFamily: 'Inter_700Bold', fontSize: 16, color: C.ink, letterSpacing: -0.2 },
      body: { fontFamily: 'Inter_400Regular', fontSize: 14, color: C.ink, lineHeight: 19 },
      bodyB: { fontFamily: 'Inter_700Bold', fontSize: 14, color: C.ink },
      caption: { fontFamily: 'Inter_500Medium', fontSize: 12, color: C.dim },
      label: { fontFamily: 'Inter_900Black', fontSize: 11, color: C.ink, letterSpacing: 1 },
      mono: { fontFamily: 'SpaceMono_400Regular', fontSize: 11, color: C.ink, letterSpacing: 0.5 },
      monoB: { fontFamily: 'SpaceMono_700Bold', fontSize: 11, color: C.ink, letterSpacing: 0.5 },
    };
    return map[key];
  },
});

export const ASCII = {
  hr: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  hrFaint: '░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░',
  hrDot: '· · · · · · · · · · · · · · · · · · · · ·',
  caret: '▌',
  arrowR: '──▶',
  arrowL: '◀──',
  plus: '[ + ]',
  check: '[✓]',
  cross: '[✕]',
  bracket: (s: string) => `[${s}]`,
  loading: '░▒▓█▓▒░',
};

export const ANIM = {
  fast: 180,
  base: 280,
  slow: 480,
  spring: { damping: 14, stiffness: 180, mass: 0.9 },
  springTight: { damping: 18, stiffness: 240, mass: 0.8 },
};
