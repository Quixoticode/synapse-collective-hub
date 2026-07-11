---
name: Lovable vite-tanstack-config on Replit
description: How to run a project using @lovable.dev/vite-tanstack-config's vite dev server inside Replit's container network.
---

Projects imported from Lovable that use `defineConfig` from `@lovable.dev/vite-tanstack-config`
(TanStack Start apps) hardcode the dev server to `host: "::"`, `port: 8080`,
`strictPort: true` outside of Lovable's own sandbox (detected via
`LOVABLE_SANDBOX` / `DEV_SERVER__PROJECT_PATH` env vars, which aren't set on Replit).

**Why:** Replit's container network stack doesn't support binding to `::` (IPv6) —
`vite dev` fails immediately with `EAFNOSUPPORT`. The port is also fixed at 8080
(not 5000), so the workflow must use `outputType: "console"` with `waitForPort: 8080`,
not the webview/5000 default.

**How to apply:** In the project's own `vite.config.ts`, pass an `options.vite`
override to `defineConfig(...)`:
```ts
export default defineConfig({
  ...,
  vite: { server: { host: "0.0.0.0", allowedHosts: true } },
});
```
This works because outside Lovable's sandbox, the package merges the user's
`options.vite` on top of its own `{ host: "::", port: 8080 }` defaults (user config
wins); inside the sandbox, the package's hardcoded values always win and can't be
overridden.
