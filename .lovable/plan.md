## Ziel

1. Eigene SynID-Supabase-Instanz in SynCRM hinterlegen und nutzen.
2. Sidebar-Link „SynID" → `https://synid.xsyna.de` mit Zusatz „BETA".
3. `wrangler.toml` komplett überarbeiten und Build-/Deploy-Befehle dokumentieren.

---

## 1) SynID-Verbindung in der DB konfigurierbar

Neue Tabelle in der SynCRM-Cloud, in der **du als Superuser** die SynID-Zugänge einträgst. So bleibt SynCRM auf seiner eigenen Cloud, kann aber SynID lesen/schreiben.

Schema:

```text
syn_external_configs
  key            text PK            -- z. B. 'synid'
  label          text
  supabase_url   text
  anon_key       text               -- publishable key (browser-safe)
  service_key    text               -- nur server-seitig genutzt
  notes          text
  updated_by     text (slid)
  updated_at     timestamptz
```

- RLS `deny all`; Zugriff nur über Server-Functions.
- Lese-Function `syn-external.functions.ts → externalGet(key)` gibt nur `url + anon_key` an den Client zurück; `service_key` bleibt server-only.
- Admin-UI unter `/settings/integrations` (nur Superuser): Formular „SynID-Verbindung" mit Feldern URL / anon key / service key / Notiz.
- Neue Helper-Function `getSynIdClient()` baut bei Bedarf einen zweiten Supabase-Client (`createClient(url, service_key)`) für SynID-Operationen — wird später für Sync/Lookup-Features genutzt.

Damit kannst du jederzeit in der DB (oder UI) URL/Keys aktualisieren, ohne Code zu ändern.

## 2) Sidebar: SynID-Link mit BETA-Badge

In der Sidebar (`_authenticated/route.tsx`) externen Link einbauen:

```tsx
<a href="https://synid.xsyna.de" target="_blank" rel="noreferrer">
  SynID <span className="ml-2 rounded bg-gradient-to-r from-[#00FFD1] to-[#FF3CAC] px-1.5 py-0.5 text-[10px] font-bold text-black">BETA</span>
</a>
```

Stil passt zum SynDLS-Discharge-Gradient; öffnet in neuem Tab.

## 3) Cloudflare Worker — Build & Deploy

### Befehle (lokal, in Projekt-Root)

```bash
bun install                 # Dependencies
bun run build               # Vite + Nitro → dist/client + dist/server/index.mjs
bunx wrangler deploy        # Worker + Static Assets nach Cloudflare
```

Optional Preview/Dev:

```bash
bun run dev                 # lokaler Vite-Dev (Port 8080)
bunx wrangler dev           # Worker-Runtime lokal gegen dist/
```

### Neue `wrangler.toml` (komplett überarbeitet)

```toml
name = "syncrm"
main = "dist/server/index.mjs"
compatibility_date = "2024-11-06"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "dist/client"
binding = "ASSETS"
not_found_handling = "single-page-application"

[observability]
enabled = true

[vars]
# Öffentliche, nicht-geheime Vars hier eintragen. Geheimnisse via `wrangler secret put`.
# SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY → als Secrets setzen:
#   bunx wrangler secret put SUPABASE_URL
#   bunx wrangler secret put SUPABASE_PUBLISHABLE_KEY
#   bunx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

### Prüfung, die ich nach dem Generieren ausführe

- `main` zeigt auf existierendes Build-Artefakt `dist/server/index.mjs` (TanStack/Nitro-Output).
- `[assets].directory = dist/client` matched Vite-Client-Build.
- `nodejs_compat` aktiv (benötigt für Supabase-Client/Crypto).
- SPA-Fallback an, damit Deep-Links der Auth-Routen funktionieren.
- Keine `[build]`-Section (Lovable/CI baut selbst; Wrangler soll nicht erneut bauen).

### Pfade (Übersicht)


| Zweck                         | Pfad                    |
| ----------------------------- | ----------------------- |
| Worker-Entry (SSR)            | `dist/server/index.mjs` |
| Static Assets / Client-Bundle | `dist/client/`          |
| Wrangler-Config               | `wrangler.toml` (Root)  |
| Supabase-Migrations           | `supabase/migrations/`  |


---

## Was nach Approval passiert

1. Migration für `syn_external_configs` (+ Grants + RLS deny-all + updated_at-Trigger).
2. Neue Server-Functions `src/lib/syn-external.functions.ts` (get/list/upsert, Superuser-gated).
3. Neue Route `src/routes/_authenticated/settings.integrations.tsx` mit Formular und Seed deiner SynID-Daten leer (du trägst URL+Keys ein).
4. Sidebar-Link „SynID BETA" in `_authenticated/route.tsx`.
5. `wrangler.toml` ersetzt durch die Variante oben.
6. `README.md` um die Build-/Deploy-Befehle erweitert.

Sag Bescheid, wenn ich loslegen soll — oder ob du die SynID-Verbindung schon jetzt mit konkreten Werten (URL/anon/service) vorbefüllt haben willst.

SynID-Supabase-Config:

- URL:  [https://dyhyqgtvmkgsycwvwrfl.supabase.co](https://dyhyqgtvmkgsycwvwrfl.supabase.co)
- ANON: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aHlxZ3R2bWtnc3ljd3Z3cmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwOTU5MTYsImV4cCI6MjA5NjY3MTkxNn0.aYXhmhfnyA3MQfYQ41Dbi8C61oV3zI01ysLtZvPBQLY