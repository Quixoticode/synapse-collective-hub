# SynCRM (xSyna Central)

Imported from a Lovable/GitHub project. German-language internal CRM + collective
management platform ("SynCRM") for the xSyna collective: contacts/CRM, staff
management, chat, an encrypted password vault, mail (Brevo + Cloudflare Email
Routing), a shared workspace, and public docs/news/careers pages.

## Stack
- **Framework**: TanStack Start (React 19) + TanStack Router, built with Vite.
- **Styling**: Tailwind CSS v4 + shadcn/radix UI components (`src/components/ui`).
- **Backend**: Supabase (Postgres + generated types in `src/integrations/supabase`).
  Auth is custom (SynID: SLID + PIK checked server-side against `employees`), **not**
  Supabase Auth.
- **Production target**: Cloudflare Workers (see `wrangler.toml`, `src/server.ts`).
  Deploying there is out of scope for Replit — Replit only runs the Vite dev server.

## Running on Replit
- Package manager: **bun** (`bun.lock` is the lockfile — use `bun install`, not npm/yarn).
- Dev workflow: `bun run dev` (`vite dev`), configured as the "Start application"
  workflow, serving on port 8080 (console output type — the port is hardcoded by
  `@lovable.dev/vite-tanstack-config` and can't be moved to 5000).
- `vite.config.ts` overrides `server.host` to `0.0.0.0` (via the package's
  `options.vite` escape hatch) because this container's network stack doesn't support
  binding to `::` (IPv6), which is the package's non-sandbox default.
- Client-side public config comes from `.env` (`VITE_SUPABASE_*`, already present).
  See `.env.example` for the full list of expected keys.

## Secrets
- `SESSION_SECRET` — already configured (used by WebAuthn session signing).
- `SUPABASE_SERVICE_ROLE_KEY` — **not yet configured**. Required for admin-level
  Supabase operations, including the SynID login flow (`src/integrations/supabase/client.server.ts`).
  Until it's set, most authenticated features will throw at request time (the app
  itself still boots and public pages render).
  - Note: the original value was found hardcoded in plain text in `wrangler.toml`
    (committed to git). It has been scrubbed from that file. Since it was exposed
    in version control, rotate it in the Supabase project dashboard before using it
    here — don't reuse the old value.
- Optional, only needed for the mail features (`src/lib/mail.functions.ts`,
  `src/routes/api/public/mail/cf-inbound.ts`): `LOVABLE_API_KEY`, `BREVO_API_KEY`,
  `CF_EMAIL_WEBHOOK_SECRET`.

## User preferences
(none recorded yet)
