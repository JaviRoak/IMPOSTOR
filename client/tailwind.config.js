// client/tailwind.config.js — design tokens from GDD §5.1 ("Night Lounge Game Show")
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: { xs: '380px' },
      colors: {
        base: '#14151F',
        raised: '#1E2030',
        overlay: '#262940',
        violet: '#FB0236', // primary brand red
        brand: '#FB0236',
        candy: '#FF3D63', // lighter brand red (gradient depth / impostor accent)
        amber: '#FFB85C',
        mint: '#3DDC97',
        danger: '#FF5C7A',
        sky: '#5CC8FF',
        ink: '#F2F3F8',
        muted: '#A7ABC4',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '24px', chip: '999px' },
      boxShadow: {
        glow: '0 0 40px -8px rgba(251,2,54,.55)',
        card: '0 1px 0 rgba(255,255,255,.06) inset, 0 12px 32px -12px rgba(0,0,0,.6)',
      },
      keyframes: {
        pop: { '0%': { transform: 'scale(.6)', opacity: '0' }, '70%': { transform: 'scale(1.06)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        rise: { from: { transform: 'translateY(14px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '25%': { transform: 'translateX(-6px)' }, '75%': { transform: 'translateX(6px)' } },
        drift: { '0%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' }, '100%': { backgroundPosition: '0% 50%' } },
        blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0' } },
        confetti: { '0%': { transform: 'translateY(-10vh) rotate(0deg)', opacity: '1' }, '100%': { transform: 'translateY(110vh) rotate(720deg)', opacity: '0' } },
        wiggle: { '0%,100%': { transform: 'rotate(-4deg)' }, '50%': { transform: 'rotate(4deg)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
      animation: {
        pop: 'pop .35s cubic-bezier(.2,1.4,.4,1) both',
        rise: 'rise .3s ease-out both',
        shake: 'shake .3s ease-in-out',
        drift: 'drift 14s ease infinite',
        blink: 'blink 1s steps(1) infinite',
        wiggle: 'wiggle 2.5s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
