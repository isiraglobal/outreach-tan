/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#F8F5F2',
          surface: '#E8E2DC',
          primary: '#3A2E27',
          secondary: '#6B5E57',
          green: '#9BA77D',
          gold: '#C9B37B'
        }
      }
    },
  },
  plugins: [],
}
