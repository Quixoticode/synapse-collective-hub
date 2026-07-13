import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: {
    preset: "cloudflare-module",
    output: { dir: "dist", serverDir: "dist/server", publicDir: "dist/client" },
    wasm: {
      lazy: true,
      esmImport: true,
    },
  },
  vite: {
    server: { host: "0.0.0.0", allowedHosts: true },
    build: {
      target: "es2022",
      minify: true,
    },
  },
});
