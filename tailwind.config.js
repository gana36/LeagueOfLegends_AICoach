/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-gold': '#FFD700',
        'team-blue': '#00D9FF',
        'enemy-red': '#FF4655',
        'bg-dark': '#0A1428',
        'surface': '#162236',
        'accent-purple': '#C96DD8',
        'text-primary': '#FFFFFF',
        'text-secondary': '#A0A0A0',
        'timeline-bg': '#1a2332',
      },
    },
  },
  plugins: [],
}
