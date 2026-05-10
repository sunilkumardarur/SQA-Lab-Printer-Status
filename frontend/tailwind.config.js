/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brady: {
          blue: '#195BA3',
          dark: '#0f3d6e',
          light: '#e8f0fb',
        },
      },
    },
  },
  plugins: [],
}
