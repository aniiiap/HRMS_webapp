/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        surface: {
          DEFAULT: '#faf7f2',
          card: '#fffcfa',
          muted: '#f3ede4',
          border: '#e8dfd3',
        },
        warm: {
          50: '#faf7f2',
          100: '#f3ede4',
          200: '#e8dfd3',
          800: '#44403c',
          900: '#292524',
        },
      },
      boxShadow: {
        soft: '0 4px 24px -4px rgba(28, 25, 23, 0.08), 0 2px 8px -2px rgba(28, 25, 23, 0.04)',
        card: '0 1px 2px rgba(28, 25, 23, 0.04), 0 8px 32px -8px rgba(13, 148, 136, 0.12)',
        glow: '0 0 0 1px rgba(13, 148, 136, 0.08), 0 12px 40px -12px rgba(13, 148, 136, 0.25)',
        'inner-warm': 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        floatY: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.75' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'float-slow': 'floatY 6s ease-in-out infinite',
        'float-slower': 'floatY 8s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 5.5s ease-in-out infinite',
        'slide-in-left': 'slideInLeft 0.35s ease-out forwards',
        shimmer: 'shimmer 1.8s ease-in-out infinite',
      },
      backgroundImage: {
        'mesh-light':
          'radial-gradient(at 0% 0%, rgba(20, 184, 166, 0.12) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(245, 158, 11, 0.08) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(13, 148, 136, 0.06) 0px, transparent 50%)',
        'mesh-dark':
          'radial-gradient(at 0% 0%, rgba(20, 184, 166, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(245, 158, 11, 0.06) 0px, transparent 50%)',
      },
    },
  },
  plugins: [],
}
