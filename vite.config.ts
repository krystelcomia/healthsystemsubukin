import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      // Proxy Lovable AI gateway through the Vite dev server to avoid CORS.
      // Browser calls /api/lovable-ai → Vite Node server → ai.gateway.lovable.dev
      "/api/lovable-ai": {
        target: "https://ai.gateway.lovable.dev",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/lovable-ai/, ""),
        secure: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
