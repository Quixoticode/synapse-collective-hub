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

## Build & Deploy

```bash
bun install
bun run build          # erzeugt dist/server + dist/client
bunx wrangler deploy   # Cloudflare Worker (siehe wrangler.toml)
```

In Lovable wird automatisch gebaut und veröffentlicht — manuelle Befehle sind nur für eigene Deployments nötig.

## Benötigte Secrets

| Secret | Zweck |
| --- | --- |
| `LOVABLE_API_KEY` | Connector-Gateway (Brevo) |
| `BREVO_API_KEY` | Mailversand (wird vom Connector gesetzt) |
| `CF_EMAIL_WEBHOOK_SECRET` | Verifiziert eingehende Mails vom CF-Worker |

Supabase-Variablen (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) sind via Lovable Cloud automatisch verdrahtet.
