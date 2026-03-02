import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "same-runtime/dist/jsx-runtime",
      "same-runtime/dist/jsx-dev-runtime",
    ],
    exclude: [],
  },
  // Force Vite to treat same-runtime as ESM
  build: {
    commonjsOptions: {
      include: [/same-runtime/, /node_modules/],
    },
  },
  server: {
    host: true, // 0.0.0.0, allows Render or Docker to access
    port: 5173, // Vite default, can change if needed
    allowedHosts: ["aitrader-web.onrender.com"], // fix the blocked host issue
  },
});
