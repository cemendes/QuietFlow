/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: {
          50: 'var(--bg-app)',
          100: 'var(--bg-sidebar)',
          200: 'var(--border-color)',
          300: 'var(--border-color)',
        },
        forest: {
          50: 'var(--accent-light)',
          100: 'var(--accent-light)',
          500: 'var(--accent-color)',
          600: 'var(--accent-color)',
          700: 'var(--accent-color)',
          800: 'var(--accent-hover)',
          900: 'var(--accent-hover)',
        },
        terracotta: {
          500: '#EA580C',
          600: '#C2410C',
          700: '#9A3412',
        },
      },
    },
  },
  plugins: [],
};
