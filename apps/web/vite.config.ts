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
    // `hidden` keeps the .map files on disk for Sentry uploads but
    // skips the `//# sourceMappingURL=` comment in the bundles, so
    // browsers don't fetch them and casual viewers don't see our
    // unminified source in the network tab.
    sourcemap: "hidden",
    rollupOptions: {
      output: {
        // Hand-split the heaviest deps so a Three.js / WebGPU swap
        // doesn't bust the React cache (and vice-versa). Anything
        // touching `three.webgpu` lands in its own chunk because the
        // WebGPU paths haul in ~250 KB of extra code we only want
        // when the user explicitly opts in.
        manualChunks: (id) => {
          if (
            id.includes("node_modules/three/examples/jsm/webgpu") ||
            id.includes("three.webgpu")
          )
            return "three-webgpu";
          if (id.includes("node_modules/three")) return "three";
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/scheduler")
          )
            return "react";
          return undefined;
        },
      },
    },
  },
});
