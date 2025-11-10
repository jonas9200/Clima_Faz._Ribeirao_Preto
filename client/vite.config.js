import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Configuração padrão para Vite + React
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
  },
  server: {
    port: 5173,
    host: true
  }
});
