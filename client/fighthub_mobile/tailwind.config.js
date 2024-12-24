/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}", // Add this line to include the screens directory
    "./component/**/*.{js,jsx,ts,tsx}",
    "./<custom directory>/**/*.{js,jsx,ts,tsx}", // Keep this if you have other custom directories
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
