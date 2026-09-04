/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors:{
        primary: 'var(--accent)',
        secondary: 'var(--accent-hover)',
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-chat': 'var(--bg-chat)',
        'bg-bubble-me': 'var(--bg-bubble-me)',
        'bg-bubble-other': 'var(--bg-bubble-other)',
        'bg-input': 'var(--bg-input)',
        'bg-sidebar': 'var(--bg-sidebar)',
        'bg-header': 'var(--bg-header)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'border-theme': 'var(--border-color)',
      }
    },
  },
  plugins: [],
}

