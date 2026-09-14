// P0-3: nilai DIUNIFIKASI dengan web (kaos-kami-web/src/app/globals.css,
// tema obsidian = default). accent = #E65100 (web --color-brand-accent);
// #FF6B35 dipertahankan sebagai accentHover (hover/glow legacy mobile).
export const webThemeTokens = {
  canvas: '#121214',
  surface: '#1A1A1E',
  surfaceElevated: '#26262C',
  textPrimary: '#F5F5F7',
  textMuted: '#8E8E93',
  brandAccent: '#E65100',
  accentHover: '#FF6B35',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  success: '#10B981',
} as const;

export const mobileTokens = {
  colors: {
    primary: '#E65100',                    // = web --color-brand-accent
    primaryDark: '#E65100',                // Deep Flame (tetap, = web accent)
    accentHover: '#FF6B35',                // Signal Tangerine legacy → hover/glow
    primaryLight: 'oklch(0.75 0.15 45)',   // Soft Tangerine (#FFA06D)
    primaryGlow: 'rgba(255, 107, 53, 0.35)',

    canvas: '#121214',                     // = web --color-canvas (obsidian)
    obsidian: '#0E0E10',                   // legacy canvas mobile (splash/native)
    surface: '#1A1A1E',                    // = web surface solid (#1A1A1E)
    surfaceElevated: '#26262C',
    surfaceSubtle: 'oklch(0.22 0.01 280)',   // Subtle Border / Divider (#27272A)
    border: 'oklch(0.28 0.01 280)',          // Hairline Border (#3F3F46)
    borderSubtle: 'rgba(255, 255, 255, 0.08)', // = web --color-border-subtle

    text: '#F5F5F7',                       // = web --color-text-primary
    textPrimary: '#F5F5F7',
    textMuted: '#8E8E93',                  // = web --color-text-muted
    textSubtle: '#71717A',

    success: '#10B981',
    warning: 'oklch(0.78 0.16 75)',          // #F59E0B
    error: 'oklch(0.63 0.22 25)',            // #EF4444
  },
  touch: {
    minTargetSize: 44,           // Apple HIG & Material 3 minimum target
    recommendedTargetSize: 48,
    thumbReachZoneRadius: 128,
  },
  radius: {
    sm: '8px',
    md: '12px',
    card: '16px',
    sheet: '24px',
    pill: '9999px',
  },
  spring: {
    button: { type: 'spring', stiffness: 500, damping: 25 },
    modal: { type: 'spring', stiffness: 400, damping: 30 },
    tabIndicator: { type: 'spring', stiffness: 500, damping: 30 },
  },
} as const;

export type MobileTokens = typeof mobileTokens;
