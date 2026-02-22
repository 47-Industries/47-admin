export const colors = {
  // Base
  background: '#0a0a0a',
  surface: '#18181b',
  surfaceHover: '#27272a',
  border: '#27272a',
  borderLight: '#3f3f46',

  // Text
  text: '#ffffff',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',

  // Primary
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  primaryBg: 'rgba(59, 130, 246, 0.1)',

  // Status
  success: '#10b981',
  successBg: 'rgba(16, 185, 129, 0.1)',
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.1)',
  error: '#ef4444',
  errorBg: 'rgba(239, 68, 68, 0.1)',

  // Others
  purple: '#8b5cf6',
  purpleBg: 'rgba(139, 92, 246, 0.1)',
  purpleBg30: 'rgba(139, 92, 246, 0.3)',
  purpleBgSubtle: 'rgba(168, 85, 247, 0.15)',
  purpleAlt: '#a855f7',
  pink: '#ec4899',
  pinkBg: 'rgba(236, 72, 153, 0.1)',
  cyan: '#06b6d4',
  cyanBg: 'rgba(6, 182, 212, 0.1)',
  orange: '#f97316',
  orangeBg: 'rgba(249, 115, 22, 0.1)',
  // Subtle tinted backgrounds (0.15 alpha — for icon containers)
  primaryBgSubtle: 'rgba(59, 130, 246, 0.15)',
  successBgSubtle: 'rgba(34, 197, 94, 0.15)',
  neutralBgSubtle: 'rgba(113, 113, 122, 0.15)',
  // Extended greens not in success palette
  green400: '#22c55e',
  amber300: '#fbbf24',
}

// Portal-specific accent colors
export const portalColors = {
  admin: '#3b82f6',     // Blue
  partner: '#10b981',   // Green
  client: '#8b5cf6',    // Purple
  affiliate: '#f59e0b', // Amber
}

export const portalColorsBg = {
  admin: 'rgba(59, 130, 246, 0.1)',
  partner: 'rgba(16, 185, 129, 0.1)',
  client: 'rgba(139, 92, 246, 0.1)',
  affiliate: 'rgba(245, 158, 11, 0.1)',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
}

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
}

export const fontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  display: 28,
  hero: 36,
}

export const fontWeight: { [key: string]: '400' | '500' | '600' | '700' } = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
}
