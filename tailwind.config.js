/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lexend', 'system-ui', 'sans-serif'],
      },
      colors: {
        cream: '#F9F6F0',
        'warm-gray': '#E8E4DC',
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        success: '#16A34A',
        error: '#DC2626',
      },
      fontSize: {
        base: ['1.0625rem', { lineHeight: '1.75' }],
        lg: ['1.175rem', { lineHeight: '1.8' }],
        xl: ['1.3125rem', { lineHeight: '1.75' }],
      },
      letterSpacing: {
        reading: '0.01em',
      },
    },
  },
  plugins: [],
}
