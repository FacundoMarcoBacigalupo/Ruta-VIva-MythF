/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    screens: {
      xs: "420px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px"
    },
    extend: {
      colors: {
        // Paleta alineada con mythf.site (monocromática: near-black + cream + grises)
        brand: {
          50: "#fafafa",
          100: "#f2f2f2",
          200: "#eaeaea",
          300: "#d4d4d4",
          400: "#a0a0a0",
          500: "#696969",
          600: "#444444",
          700: "#2c2c2c",
          800: "#1a1a1a",
          900: "#0a0a0a"
        },
        cream: {
          DEFAULT: "#E4E2DD",
          50: "#faf9f7",
          100: "#f2f1ec",
          200: "#E4E2DD",
          300: "#d0cec8",
          400: "#b8b5af"
        },
        ink: {
          900: "#0a0a0a",
          800: "#1a1a1a",
          700: "#2c2c2c",
          600: "#444444"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "fade-in-slow": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "pop": {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" }
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "fade-in": "fade-in 220ms ease-out both",
        "fade-in-slow": "fade-in-slow 400ms ease-out both",
        "pop": "pop 180ms ease-out both",
        "slide-down": "slide-down 180ms ease-out both"
      },
      transitionTimingFunction: {
        "smooth": "cubic-bezier(0.22, 1, 0.36, 1)"
      }
    }
  },
  plugins: []
};
