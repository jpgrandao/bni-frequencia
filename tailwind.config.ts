import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bni: {
          red: "#C8102E",
          darkred: "#9E0B22",
          lightred: "#FDE8EB",
          gray: "#4A4A4A",
        },
      },
    },
  },
  plugins: [],
};
export default config;
