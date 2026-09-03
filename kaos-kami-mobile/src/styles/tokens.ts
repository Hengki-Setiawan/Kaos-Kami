export const mobileTokens = {
  colors: {
    primary: '#FF6B35',          // Signal Tangerine / DTF Heat
    primaryDark: '#E65100',      // Deep Flame
    primaryLight: '#FFA06D',     // Soft Tangerine
    primaryGlow: 'rgba(255, 107, 53, 0.35)',

    obsidian: '#0E0E10',         // Deep Obsidian Canvas
    surface: '#18181B',          // Elevated Card Surface
    surfaceSubtle: '#27272A',    // Subtle Border / Divider
    border: '#3F3F46',           // Hairline Border

    text: '#FFFFFF',
    textMuted: '#A1A1AA',
    textSubtle: '#71717A',

    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
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
