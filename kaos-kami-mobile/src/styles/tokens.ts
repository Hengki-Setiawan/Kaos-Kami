export const mobileTokens = {
  colors: {
    primary: 'oklch(0.65 0.18 45)',          // Signal Tangerine / DTF Heat (#FF6B35)
    primaryDark: 'oklch(0.55 0.18 45)',      // Deep Flame (#E65100)
    primaryLight: 'oklch(0.75 0.15 45)',     // Soft Tangerine (#FFA06D)
    primaryGlow: 'rgba(255, 107, 53, 0.35)',

    obsidian: 'oklch(0.12 0.01 280)',        // Deep Obsidian Canvas (#0E0E10)
    surface: 'oklch(0.16 0.01 280)',         // Elevated Card Surface (#18181B)
    surfaceSubtle: 'oklch(0.22 0.01 280)',   // Subtle Border / Divider (#27272A)
    border: 'oklch(0.28 0.01 280)',          // Hairline Border (#3F3F46)

    text: '#FFFFFF',
    textMuted: '#A1A1AA',
    textSubtle: '#71717A',

    success: 'oklch(0.72 0.17 160)',         // #10B981
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
