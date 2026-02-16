/** @type {import('tailwindcss').Config} */

function oklchWithAlpha(value) {
  return `oklch(${value} / <alpha-value>)`
}

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'cine-dark': '#0f1419',
        'cine-gray': '#1a2332',
        'cine-accent': '#3b82f6',
        'cine-gold': '#60a5fa',
        background: oklchWithAlpha('0.14 0.005 260'),
        foreground: oklchWithAlpha('0.95 0.005 260'),
        'muted-foreground': oklchWithAlpha('0.78 0.01 260'),
        muted: oklchWithAlpha('0.25 0.005 260'),
        border: oklchWithAlpha('0.40 0.005 260'),
        nav: {
          DEFAULT: oklchWithAlpha('0.18 0.005 250'),
          foreground: oklchWithAlpha('0.88 0.005 80'),
        },
        stats: {
          DEFAULT: oklchWithAlpha('0.14 0.005 250'),
          foreground: oklchWithAlpha('0.55 0.01 80'),
        },
        accent: {
          DEFAULT: oklchWithAlpha('0.72 0.08 230'),
        },
      },
      fontFamily: {
        'serif': ['var(--font-libre-caslon)', 'Georgia', 'serif'],
        'sans': ['var(--font-libre-franklin)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'shimmer': 'shimmer 2s infinite',
        'stats-scroll': 'stats-scroll 20s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'stats-scroll': {
          from: { transform: 'translate3d(0, 0, 0)' },
          to: { transform: 'translate3d(-50%, 0, 0)' },
        },
      },
    },
  },
  plugins: [],
}
