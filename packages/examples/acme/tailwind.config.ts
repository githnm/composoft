import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "../../registry-example-crm/src/**/*.{ts,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
};
export default config;
