/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Purolator-inspired brand system (see ../Weather/Design.md):
        // blue-dominant, with vibrant red reserved for critical attention.
        brand: {
          red: '#E11B22',
          redDark: '#B4131A',
          blue: '#0033A0',
          blueDark: '#002266',
          navy: '#001A4D',
        },
        ink: {
          DEFAULT: '#1A2233',
          soft: '#5B6577',
          faint: '#8A93A5',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F4F6F9',
          line: '#E3E8EF',
        },
        risk: {
          red: '#D7263D',
          orange: '#F46036',
          yellow: '#F2C037',
          green: '#3FA34D',
          grey: '#9AA3B2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 10px 40px -12px rgba(0, 26, 77, 0.28)',
        card: '0 1px 3px rgba(26, 34, 51, 0.08), 0 1px 2px rgba(26, 34, 51, 0.06)',
      },
      keyframes: {
        'slide-in': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
