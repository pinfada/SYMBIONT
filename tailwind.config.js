/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
    './src/**/*.html',
    './src/**/*.css',
    './src/**/*.md',
  ],
  safelist: [
    'max-w-2xl', 'max-w-xl', 'p-6', 'mb-6', 'mb-2', 'mt-8', 'my-8', 'gap-6', 'gap-8',
    'text-2xl', 'text-lg', 'text-xl', 'text-sm', 'font-bold', 'font-semibold',
    'rounded-xl', 'rounded-lg', 'shadow-lg', 'bg-white', 'grid', 'grid-cols-2'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}