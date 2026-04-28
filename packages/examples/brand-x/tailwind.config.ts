import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "../../packages/registry-acme/dist/**/*.{js,jsx}",
  ],
  theme: { extend: {} },
  plugins: [],
};
export default config;
