import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 4500,
    strictPort: true,
    allowedHosts: ["space.dashable.dev", "localhost", "127.0.0.1"],
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
