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
          '0%': { transform: 'translateY(-150px)', opacity: '0.2' },
          '20%': { transform: 'translateY(-120px)', opacity: '0.4' },
          '40%': { transform: 'translateY(-90px)', opacity: '0.6' },
          '60%': { transform: 'translateY(-60px)', opacity: '0.7' },
          '80%': { transform: 'translateY(-30px)', opacity: '0.9' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      },
      animation: {
        'explode': 'explode 0.3s ease-in-out forwards',
        'fallIn': 'fallIn 0.5s ease-in-out forwards'
      }
    },
  },
  plugins: [],
} 