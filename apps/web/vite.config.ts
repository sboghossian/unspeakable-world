import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 4500,
    strictPort: true,
    allowedHosts: ["unspeakable-world.dashable.dev", "localhost", "127.0.0.1"],
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
      // JPL Sentry impact-risk table — mirrors functions/api/sentry.ts.
      "/api/sentry": {
        target: "https://ssd-api.jpl.nasa.gov",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sentry/, "/sentry.api"),
      },
      // Lasair UK ZTF broker — mirrors functions/api/lasair.ts.
      // The dev proxy hits the `objects` endpoint directly; in prod the
      // Pages Function picks the subpath from `?endpoint=…`. Callers
      // append the `?endpoint=` query param either way for symmetry —
      // the dev rewrite just ignores it.
      "/api/lasair": {
        target: "https://lasair-ztf.lsst.ac.uk",
        changeOrigin: true,
        rewrite: (path) =>
          path
            .replace(/^\/api\/lasair/, "/api/objects")
            .replace(/([?&])endpoint=[^&]*/g, "$1")
            .replace(/[?&]$/, ""),
      },
      // Celestrak TLE GP feed — mirrors functions/api/celestrak.ts.
      "/api/celestrak": {
        target: "https://celestrak.org",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/celestrak/, "/NORAD/elements/gp.php"),
      },
    },
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
