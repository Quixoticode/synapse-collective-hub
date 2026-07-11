// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // This app runs as a Node server (not a static site or Cloudflare Worker) —
  // it has real server functions (webauthn, supabase admin, sessions), so
  // Nitro must target Node instead of the package's Cloudflare default.
  nitro: {
    preset: "node-server",
    output: { dir: "dist", serverDir: "dist/server", publicDir: "dist/client" },
  },
  // Replit's container network stack doesn't support IPv6 ("::") binding;
  // use IPv4 instead. Only applies outside the Lovable sandbox (see
  // isSandboxEnvironment in @lovable.dev/vite-tanstack-config), where this
  // override wins over the package's own server defaults.
  vite: {
    server: { host: "0.0.0.0", allowedHosts: true },
  },
});
