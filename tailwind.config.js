/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          dark:   '#323347',
          mid:    '#4a4b65',
          card:   '#3d3e58',
          border: '#5a5b80',
          accent: '#aaa8f8',
          soft:   '#8886e8',
          cyan:   '#c5c4ff',
        },
      },
    },
  },
  plugins: [],
};
