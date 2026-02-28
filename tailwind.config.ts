import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'inherit',
            a: { color: '#4f46e5', textDecoration: 'underline' },
            'h1,h2,h3,h4': { color: 'inherit', fontWeight: '700' },
            code: { color: '#4f46e5', background: '#eef2ff', borderRadius: '4px', padding: '2px 6px' },
            'code::before': { content: '""' },
            'code::after':  { content: '""' },
          },
        },
        invert: {
          css: {
            a: { color: '#818cf8' },
            code: { color: '#a5b4fc', background: 'rgba(99,102,241,0.15)' },
          },
        },
      },
    },
  },
  plugins: [typography],
};

export default config;
