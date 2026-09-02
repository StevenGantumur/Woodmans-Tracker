/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0b0b0b", // page base, behind the glow
          800: "#1c1c1c", // panel
          700: "#272727", // raised surface
          600: "#3a3a3a", // border
        },
        haze: {
          100: "#ededed", // primary text
          300: "#a8a8a8", // secondary text
          500: "#757575", // muted
        },
        signal: {
          go: "#22c55e",
          watch: "#f59e0b",
          stop: "#ef4444",
          route: "#38bdf8",
        },
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
