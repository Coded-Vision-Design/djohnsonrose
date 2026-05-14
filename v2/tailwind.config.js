/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        win: {
          blue: '#0078d4',
          bg: '#f3f3f3',
          dark: '#202020',
        },
      },
    },
  },
  plugins: [],
}
