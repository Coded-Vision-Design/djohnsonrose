/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.php",
    "./router.php",
    "./api/**/*.php",
    "./partials/**/*.php",
    "./assets/js/**/*.js",
    "./data/**/*.php"
  ],
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
