import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/sensors": "http://localhost:3111",
      "/analytics": "http://localhost:3111",
      "/system": "http://localhost:3111",
      "/streams": {
        target: "ws://localhost:3112",
        ws: true,
        rewrite: (path) => path.replace(/^\/streams/, ""),
      },
    },
  },
});
