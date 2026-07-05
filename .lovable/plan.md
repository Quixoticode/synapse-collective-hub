
# Juli-Update #5 — "Neuromorphic Refresh" (v2026.07.05)

Große Umstrukturierung: xSyna Central ist nicht mehr eine Login-First-App, sondern eine öffentlich zugängliche Präsenz mit News, Leaks, Stellenausschreibungen und Docs. Login rückt in den Hintergrund.

## Bugfixes

- **Markdown**: `# **_` etc. werden immer noch roh dargestellt. Ursache: `syn-markdown` CSS resettet Typo aggressiv (kein `list-style`, keine Heading-Größen). Fix in `src/styles.css` unter `.syn-markdown` — echte Heading-, List-, Blockquote-, Table-Styles definieren.
- **Sync-Loader**: Neues wiederverwendbares `<SyncSpinner>` + Toast-Utility `useSync()` in `src/lib/use-sync.ts`. Alle Mutations-Handler (Apply, Teams, WorkTime, Docs, News, etc.) zeigen während des Requests einen Overlay-/Inline-Spinner.

## Neue Funktionen

### 1. Öffentliche Startseite (`/`)
Ersetzt die aktuelle Redirect-Only-Index. Neuromorphic-Liquid Layout:
- Hero mit sanftem, pulsierendem neuronalen Netz-Hintergrund
- News-Feed (Releases, Leaks, Insider — sichtbar je nach `visibility`)
- Aktive Stellenausschreibungen (`apply_positions` where `active = true`)
- Docs-Einstieg (Kachelgrid)
- Diskreter „Login" Button oben rechts → `/auth`

Angemeldete User werden **nicht** automatisch weitergeleitet — sie sehen den Public-Landing plus einen Button „Zum System" → `/home`. PWA-Installationen starten weiterhin direkt auf `/auth` bzw. `/home` (Manifest `start_url` bleibt `/home`).

### 2. Docs (`/docs`, `/docs/$slug`)
Neue Tabelle `public_docs` (öffentlich lesbar wenn `published = true`):
- Felder: `slug`, `title`, `summary`, `category` (feature/customer/employee/partnership/other), `body_md`, `cover_url`, `sort_order`, `published`, `created_by`, timestamps
- Public-Server-Function `docsListPublic`, `docsGetPublic` (Publishable-Key Client, `TO anon` Policy)
- Auth-Server-Function `docsUpsert`, `docsDelete` (HL ≥ 5 oder Superuser)
- Route `/docs` — Grid mit Cover + Kategorie-Filter
- Route `/docs/$slug` — Vollansicht mit `<Markdown>` und Cover
- Verwaltungs-Route unter `/_authenticated/docs-admin` (HL ≥ 5)

### 3. News-Verwaltung (Leaks / Releases / Insider)
Erweitert `/news` (bestehende Route). Bestehende `app_versions` bekommt `kind` (`release` | `leak` | `insider`) und `visibility` (`public` | `authenticated` | `insider`). Migration:
- Neue Spalten `kind text default 'release'`, `visibility text default 'authenticated'`
- Öffentliche Sicht via `TO anon` Policy: `published = true AND visibility = 'public'`
- Authenticated-Sicht: `published = true AND visibility IN ('public','authenticated')` (via has_role Check für insider)
- Admin-UI (HL ≥ 6) mit Tabs Leaks/Releases/Insider

### 4. Startseite (angemeldet) → Standard-Route + Quick-Login-Shortcut
- `/_authenticated/route.tsx` redirect nach Login → `/home` (statt bisher `/apps`)
- Home-Widget „Mein Quick-Login" oben mit One-Click-Button (nutzt bereits vorhandene `quickLoginIssue`) und Code-Anzeige

### 5. WorkTime — Schicht löschen (HL ≥ 7)
- `wtShiftDelete` bereits vorhanden — Zugriff auf HL ≥ 7 anheben (bisher HL 4)
- In `/worktime` UI: Löschen-Button nur für HL ≥ 7 sichtbar

## Sicherheitsfixes (alle 14 Findings)

Eine Migration ersetzt alle betroffenen Policies:

| Table | Alte Policy | Neu |
|-------|-------------|-----|
| `team_members` | SELECT `USING (true)` | `authenticated`: eigene Zeile ODER `has_role(slid, 'admin'/'superuser')` |
| `teams` | SELECT `USING (true)` | `authenticated` only |
| `work_sessions` | SELECT `USING (true)` | `slid = current_slid()` ODER HL ≥ 4 |
| `work_shifts` | SELECT `USING (true)` | `slid = current_slid()` ODER HL ≥ 4 |
| `pdf_templates` | SELECT `USING (true)` | `authenticated` only |
| `app_versions` | SELECT `USING (true)` | `published = true` (plus insider-Check via has_role) |
| `roadmap_items` | SELECT `USING (true)` | `authenticated` only |
| `apply_positions` INSERT/UPDATE/DELETE `true` | HL ≥ 5 via has_role |
| `apply_applications` ALL `true` | HL ≥ 5 via has_role |

Serverseitige Reads laufen weiterhin über `supabaseAdmin` (RLS-Bypass) — die App bleibt funktional. Public-Reads (Docs, News, Positions) laufen über publishable-key Clients mit `TO anon` SELECT Policies auf explizite Spalten.

### Zusätzliche Client-Härtung
Da `pik_in_localstorage` bereits gemeldet ist: keine Restrukturierung der SynID-Session in diesem Update (würde jede Server-Funktion brechen). Wird als „acknowledged, tracked" markiert (bereits erledigt in vorheriger Iteration).

## Version & Registry

- `src/lib/app-version.ts` → `2026.07.05` "Neuromorphic Refresh"
- `tabs-registry.ts` → neuer Tab `docs`
- Neue Route-Dateien:
  - `src/routes/index.tsx` — komplette Neufassung (öffentlich)
  - `src/routes/docs.tsx` (Layout mit `<Outlet />`)
  - `src/routes/docs.index.tsx`
  - `src/routes/docs.$slug.tsx`
  - `src/routes/_authenticated/docs-admin.tsx`
- Neue Lib:
  - `src/lib/docs.functions.ts`
  - `src/lib/use-sync.ts`
  - `src/components/SyncSpinner.tsx`
  - `src/components/PublicHeader.tsx` (Login-Button + Nav)

## Migration (SQL, eine Datei)

1. `public_docs` Tabelle + GRANTs + RLS (anon SELECT wenn published, HL ≥ 5 write)
2. `app_versions` `kind`, `visibility` Spalten
3. Alle SELECT/ALL-Policies mit `USING (true)` ersetzen (siehe Tabelle)
4. `apply_positions` public SELECT für `active = true` (anon)
5. GRANTs (`SELECT ... TO anon` für `public_docs`, `apply_positions`, `app_versions` — nur wo öffentlich)

## Nicht-Ziele

- Kein Umbau der SynID-Auth-Architektur
- Keine Änderung an Markdown-Renderer-Komponente (nur CSS)
- Startanimation bleibt unverändert
