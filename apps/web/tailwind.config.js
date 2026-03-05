/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
      },
      boxShadow: {
        card:     '0 1px 3px rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-md':'0 4px 20px -2px rgb(0 0 0 / 0.09), 0 1px 4px -1px rgb(0 0 0 / 0.04)',
        'card-lg':'0 12px 36px -4px rgb(0 0 0 / 0.12)',
        nav:      '0 -1px 0 rgb(0 0 0 / 0.05), 0 -4px 16px -4px rgb(0 0 0 / 0.07)',
        side:     '1px 0 0 rgb(0 0 0 / 0.05)',
      },
    },
  },
  plugins: [],
}
