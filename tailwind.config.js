/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        explode: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(1.5)', opacity: '0' }
        },
        fallIn: {
          '0%': { transform: 'translateY(-100px)', opacity: '0.3' },
          '20%': { transform: 'translateY(-80px)', opacity: '0.5' },
          '50%': { transform: 'translateY(-40px)', opacity: '0.7' },
          '80%': { transform: 'translateY(-10px)', opacity: '0.9' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      },
      animation: {
        'explode': 'explode 0.3s ease-in-out forwards',
        'fallIn': 'fallIn 0.6s ease-in-out forwards'
      }
    },
  },
  plugins: [],
} 