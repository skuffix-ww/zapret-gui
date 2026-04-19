/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI Variable',
          'Segoe UI',
          'system-ui',
          'sans-serif'
        ],
        mono: [
          'JetBrains Mono',
          'Cascadia Code',
          'Consolas',
          'ui-monospace',
          'monospace'
        ]
      },
      colors: {
        bg: {
          DEFAULT: '#0b0d10',
          subtle: '#111418',
          raised: '#171b20',
          hover: '#1d2228'
        },
        border: {
          DEFAULT: '#232830',
          strong: '#2e343d'
        },
        fg: {
          DEFAULT: '#e7ecf2',
          muted: '#9aa4b1',
          subtle: '#6b7583'
        },
        accent: {
          DEFAULT: '#6d8aff',
          hover: '#8099ff',
          soft: '#1c2340'
        },
        success: '#30c070',
        warning: '#f3b14a',
        danger: '#f05a5a'
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.02) inset, 0 8px 24px rgba(0,0,0,0.35)'
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' }
        }
      },
      animation: { pulseDot: 'pulseDot 1.6s ease-in-out infinite' }
    }
  },
  plugins: []
}
