export const COURSE_FALLBACK_BACKGROUNDS = [
  'linear-gradient(135deg, #1a3a6b 0%, #0d6e3a 100%)',
  'linear-gradient(135deg, #0f2147 0%, #2e5fa3 100%)',
  'linear-gradient(135deg, #1a3a6b 0%, #6b1a3a 100%)',
  'linear-gradient(135deg, #1a3a6b 0%, #6d28d9 100%)',
  'linear-gradient(135deg, #1a3a6b 0%, #d97706 100%)',
  'linear-gradient(135deg, #1a3a6b 0%, #0f766e 100%)',
  'linear-gradient(135deg, #152e57 0%, #1d4ed8 100%)',
  'linear-gradient(135deg, #0f2147 0%, #be185d 100%)',
] as const;

export const COURSE_OVERLAY_PRESETS: Record<string, { from: string; to: string }> = {
  navy_emerald: { from: '#1a3a6b', to: '#0d6e3a' },
  navy_cobalt: { from: '#0f2147', to: '#2e5fa3' },
  navy_violet: { from: '#1a3a6b', to: '#6d28d9' },
  navy_crimson: { from: '#1a3a6b', to: '#6b1a3a' },
  navy_amber: { from: '#1a3a6b', to: '#d97706' },
  navy_teal: { from: '#1a3a6b', to: '#0f766e' },
  navy_rose: { from: '#0f2147', to: '#be185d' },
  slate_navy: { from: '#152e57', to: '#1d4ed8' },
};
