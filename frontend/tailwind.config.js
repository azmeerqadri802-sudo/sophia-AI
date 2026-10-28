/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#04070B',
          900: '#070B12',
          800: '#0D1522',
        },
        gold: {
          400: '#F3E5AB',
          500: '#D4AF37',
          600: '#AA820A',
        },
        cyanNeon: {
          400: '#00F0FF',
          500: '#00C8FF',
        },
      },
      boxShadow: {
        'cyan-glow': '0 0 20px rgba(0, 240, 255, 0.25), inset 0 0 12px rgba(0, 240, 255, 0.08)',
        'gold-glow': '0 0 20px rgba(212, 175, 55, 0.25), inset 0 0 12px rgba(212, 175, 55, 0.1)',
      },
    },
  },
  plugins: [],
};
