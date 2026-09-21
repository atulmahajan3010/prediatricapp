/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0F2620',
        teal: {
          DEFAULT: '#C45B3C',
          dark: '#96432E',
          light: '#FBEAE4'
        },
        paper: '#FBF9F3',
        amber: {
          DEFAULT: '#C97A2B',
          light: '#FBEEDD'
        },
        rose: {
          DEFAULT: '#B4433A',
          light: '#FBEAE8'
        },
        slate: {
          50: '#F6F7F6',
          100: '#EBEEEC',
          200: '#D6DCD9',
          400: '#8B9591',
          500: '#5F6B66',
          700: '#374440',
          900: '#1C2622'
        }
      },
      fontFamily: {
        display: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans: ['"Segoe UI"', 'system-ui', '-apple-system', 'Roboto', 'Arial', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,38,32,0.06), 0 1px 8px rgba(15,38,32,0.05)'
      }
    }
  },
  plugins: []
}
