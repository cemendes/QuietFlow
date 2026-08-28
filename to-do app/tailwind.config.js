/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: {
          50: '#FAF9F6',
          100: '#F5F3EF',
          200: '#EBE7DF',
          300: '#DCD5C8',
        },
        forest: {
          500: '#0D9488',
          600: '#0F766E',
          700: '#065F46',
          800: '#064E3B',
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
