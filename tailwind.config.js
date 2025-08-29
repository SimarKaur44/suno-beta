/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
extend: {
colors: {
primary: {
50: '#eef6ff',
100: '#dceefe',
200: '#c0ddfd',
300: '#94c5fc',
400: '#61a5f9',
500: '#3b82f6',
600: '#2563eb',
700: '#1d4ed8',
800: '#1e40af',
900: '#1e3a8a',
},
},
},
},
  plugins: [],
}
