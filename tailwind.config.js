/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        bg: {
          900: '#07071a',
          800: '#0d0d24',
          700: '#13132e',
          600: '#1a1a3e',
        },
        accent: {
          purple: '#7c3aed',
          violet: '#8b5cf6',
          indigo: '#6366f1',
          cyan: '#06b6d4',
          pink: '#ec4899',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'gradient': 'gradient 4s ease infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
