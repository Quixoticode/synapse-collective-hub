# SynCRM

Zentrales Management-System des xSyna-Kollektivs.

## Module

- **Kontakte** — CRM (Leads, Kunden, Status, Tags, Notizen).
- **Kollektiv** *(HL ≥ 5 / Superuser)* — Mitarbeiter, Partner, Kunden verwalten.
- **Chat** — 1:1 und Gruppen-Threads zwischen Mitgliedern.
- **Tresor** — verschlüsselter Passwort-Speicher (AES-GCM, Key aus PIK abgeleitet — Server sieht nur Ciphertext).
- **SynMail** — Versand via Brevo, Empfang via Cloudflare Email Routing → Worker → Webhook. Setup-Konzept siehe `docs/synmail-setup.md`.
- **Workspace** — gemeinsame Markdown-Dokumente, Sichtbarkeit privat/team/alle.
- **xSyna Basics** — Regeln, AGBs, Verträge, Infos (Schreibrecht: HL ≥ 5 / Superuser).

## Rollen

- `superuser` → darf alles, sieht alles. Jake Ruck (SLID `20090626`) ist initial Superuser.
- `admin`, `mitarbeiter`, `partner`, `kunde` → über Tabelle `employee_roles` erweiterbar.
- HL-basierte Gates (HL ≥ 5) bleiben zusätzlich aktiv.

## Auth

Custom SynID-Anmeldung (kein Supabase Auth): SLID + PIK werden serverseitig gegen `employees` geprüft. SSO via `synid.xsyna.de` per URL-Parameter (`?slid=…&pik=…`) wird ebenfalls unterstützt.

## Build & Deploy (Cloudflare Worker)

| Schritt | Befehl |
| --- | --- |
| Dependencies | `bun install` |
| Build | `bun run build` |
| Lokal testen | `bunx wrangler dev` |
| Deploy | `bunx wrangler deploy` |

**Pfade** (aus `wrangler.toml`):
- Worker-Entry (SSR): `dist/server/index.mjs`
- Static Assets / Client-Bundle: `dist/client/`

In Lovable wird automatisch gebaut und veröffentlicht — manuelle Befehle sind nur für eigene Cloudflare-Deployments nötig.

## Benötigte Secrets

Setzen via `bunx wrangler secret put <NAME>`:

| Secret | Zweck |
| --- | --- |
| `SUPABASE_URL` | Supabase-Endpoint (server) |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable Key (server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin-Operationen (server-only) |
| `LOVABLE_API_KEY` | Connector-Gateway (Brevo) |
| `BREVO_API_KEY` | Mailversand (wird vom Connector gesetzt) |
| `CF_EMAIL_WEBHOOK_SECRET` | Verifiziert eingehende Mails vom CF-Worker |

In Lovable Cloud sind die `SUPABASE_*`-Variablen automatisch verdrahtet.

## Externe xSyna-Systeme (SynID Gateway)

Verbindungen zu weiteren xSyna-Instanzen werden in der Tabelle `syn_external_configs` gepflegt — UI: **Sidebar → Integrations** (nur Superuser). Felder: `supabase_url`, `anon_key`, optional `service_key`. SynID ist initial mit URL und anon-Key vorbefüllt; Service-Key kann ergänzt werden.
