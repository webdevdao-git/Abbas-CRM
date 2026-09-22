/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f6f6f7', 100: '#e9e9ec', 200: '#d3d4d9', 300: '#aeb0b9',
          400: '#838694', 500: '#656878', 600: '#515462', 700: '#424551',
          800: '#393b44', 900: '#1f2027', 950: '#131419',
        },
        brand: {
          50: '#fdf4f3', 100: '#fce7e5', 200: '#f9d2ce', 300: '#f3b2ab',
          400: '#ea847a', 500: '#dc5c4f', 600: '#c74032', 700: '#a63327',
          800: '#8a2d23', 900: '#742b23', 950: '#3f120e',
        },
        gold: {
          50: '#fbf8ef', 100: '#f4ecd2', 200: '#e8d8a6', 300: '#dabd71',
          400: '#cfa249', 500: '#c08d3a', 600: '#a56f2f', 700: '#85532a',
          800: '#6f4429', 900: '#5f3a26',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(19,20,25,0.04), 0 4px 16px rgba(19,20,25,0.06)',
        lift: '0 2px 4px rgba(19,20,25,0.05), 0 12px 32px rgba(19,20,25,0.10)',
      },
    },
  },
  plugins: [],
};
