import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#102538",
        canvas: "#f4f7fb",
        line: "#dbe4ee",
        accent: "#124c76",
        accentSoft: "#d8e8f3",
        success: "#1f6a62",
        warning: "#9a6b18",
        danger: "#a13f36",
      },
      boxShadow: {
        panel: "0 24px 50px rgba(13, 39, 66, 0.08)",
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
        body: ["IBM Plex Sans", "sans-serif"],
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top left, rgba(18,76,118,0.16), transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.98))",
      },
    },
  },
  plugins: [],
} satisfies Config;

