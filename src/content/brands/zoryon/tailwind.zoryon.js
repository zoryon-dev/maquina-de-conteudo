/** ═══════════════════════════════════════════════════
 *  ZORYON — Tailwind CSS Theme Extension
 *  v2.0 | Abril 2026
 *
 *  Uso:
 *  // tailwind.config.js
 *  const zoryonTheme = require('./tailwind.zoryon');
 *  module.exports = {
 *    theme: {
 *      extend: zoryonTheme,
 *    },
 *  };
 *  ═══════════════════════════════════════════════════ */

module.exports = {
  colors: {
    zoryon: {
      // Brand
      purple: {
        DEFAULT: '#837BF4',
        light: '#A9A3F7',
        dark: '#6A62D4',
        50: 'rgba(131, 123, 244, 0.05)',
        100: 'rgba(131, 123, 244, 0.10)',
        200: 'rgba(131, 123, 244, 0.20)',
      },
      // Accents
      tangerine: {
        DEFAULT: '#FF7D3B',
        light: '#FF9E6B',
        dark: '#E5682A',
      },
      emerald: {
        DEFAULT: '#2BD0A8',
        light: '#5EDDC0',
        dark: '#1FA882',
      },
      // Neutral
      bg: '#F2F2FA',
      surface: '#FFFFFF',
      'surface-raised': '#F7F7FC',
      border: '#E8E8F0',
      'border-subtle': '#EDEDF5',
      // Text
      ink: '#212130',
      slate: '#6E7191',
      muted: '#B0B0C8',
      // Semantic
      success: '#2BD0A8',
      warning: '#FF7D3B',
      error: '#E5484D',
      info: '#837BF4',
    },
  },

  fontFamily: {
    display: ['Sora', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
    body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
    mono: ['SF Mono', 'Fira Code', 'JetBrains Mono', 'monospace'],
  },

  fontSize: {
    'xs': ['0.6875rem', { lineHeight: '1.4' }],      // 11px
    'sm': ['0.875rem', { lineHeight: '1.5' }],        // 14px
    'base': ['1rem', { lineHeight: '1.7' }],           // 16px
    'lg': ['1.25rem', { lineHeight: '1.5' }],          // 20px
    'xl': ['1.5rem', { lineHeight: '1.3' }],           // 24px
    '2xl': ['2rem', { lineHeight: '1.2' }],            // 32px
    '3xl': ['2.5rem', { lineHeight: '1.15' }],         // 40px
    '4xl': ['3rem', { lineHeight: '1.1' }],            // 48px
    '5xl': ['3.5rem', { lineHeight: '1.1' }],          // 56px
  },

  letterSpacing: {
    tighter: '-1.5px',
    tight: '-0.8px',
    snug: '-0.3px',
    normal: '0',
    wide: '1px',
    wider: '2px',
  },

  borderRadius: {
    'sm': '6px',
    'md': '10px',
    'lg': '16px',
    'xl': '24px',
    'full': '9999px',
  },

  boxShadow: {
    'sm': '0 1px 2px rgba(33, 33, 48, 0.04)',
    'md': '0 4px 12px rgba(33, 33, 48, 0.06)',
    'lg': '0 12px 32px rgba(33, 33, 48, 0.08)',
    'xl': '0 24px 48px rgba(33, 33, 48, 0.12)',
    'primary': '0 4px 16px rgba(131, 123, 244, 0.25)',
  },

  transitionDuration: {
    'fast': '150ms',
    'base': '200ms',
    'slow': '300ms',
  },

  maxWidth: {
    'content': '720px',
  },
};
