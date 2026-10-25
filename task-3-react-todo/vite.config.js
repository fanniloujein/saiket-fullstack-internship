import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative paths so the build works from any folder (Render, GitHub Pages, a sub-directory…)
  base: "./",
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
  },
});
