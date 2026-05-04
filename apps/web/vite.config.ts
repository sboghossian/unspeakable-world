import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 4500,
    strictPort: true,
    allowedHosts: ["space.dashable.dev", "localhost", "127.0.0.1"],
    proxy: {
      // Dev-time CORS proxy for JPL Solar System Dynamics endpoints —
      // mirrors the Pages Function in apps/web/functions/api/. The
      // browser hits /api/cad, both dev and prod, and the platform
      // unwraps it.
      "/api/cad": {
        target: "https://ssd-api.jpl.nasa.gov",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cad/, "/cad.api"),
      },
    },
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
