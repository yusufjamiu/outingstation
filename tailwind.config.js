/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#22d3ee', // cyan-400
          dark: '#0891b2', // cyan-600
        },
        secondary: {
          DEFAULT: '#f0fdfa', // cyan-50
          dark: '#cffafe', // cyan-100
        }
      },
      fontFamily: {
        sans: ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}