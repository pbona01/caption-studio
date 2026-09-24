/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#090909',
        panel: '#111113',
        line: '#27272a',
        accent: '#d9ff5b',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        lift: '0 24px 80px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
}

