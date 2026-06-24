import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2563eb",
        income: "#10b981",
        expense: "#ef4444",
        warn: "#f59e0b",
        food: "#fb7185",
        traffic: "#6366f1",
        shop: "#f97316",
        house: "#8b5cf6",
        entertainment: "#14b8a6",
        medical: "#ec4899",
        salary: "#22c55e",
        parttime: "#84cc16",
        redpack: "#f43f5e",
        finance: "#0ea5e9",
        custom: "#8b5cf6",
        neutral: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
