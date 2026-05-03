/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "km-green": "#1a7a4a",
        "km-gold": "#e6a817",
        "km-saffron": "#f47920",
        "km-dark": "#1a1a2e",
      },
      fontFamily: {
        kannada: ["Noto Sans Kannada", "sans-serif"],
      },
    },
  },
  plugins: [],
};
