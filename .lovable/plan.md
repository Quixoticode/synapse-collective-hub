## Wichtiger Hinweis vorab: Lovable Cloud teilen

Du wünschst, dass SynCRM dieselbe Lovable Cloud nutzt wie **SynID Gateway** (Projekt-Ref `fhnjfiazvjdhwnanqlgo`). Das ist **technisch nicht direkt möglich**: jedes Lovable-Projekt bekommt automatisch seine *eigene* Cloud-Instanz, deren Service-Role-Key und DB-Verbindung intern verdrahtet sind. Ich kann die Env-Variablen nicht auf ein fremdes Projekt umbiegen, weil der Service-Role-Key dieses Projekts hier nicht verfügbar ist.

**Zwei mögliche Wege — bitte entscheiden:**

- **A) SynCRM bleibt auf eigener Cloud** (aktuell `yfqgimfcurrxqyqxjpal`). Ich migriere das gesamte Employees-/CRM-Schema und seede deinen Account erneut. Sauberste Variante, voll funktionsfähig, kein manueller Eingriff. *(Empfohlen)*
- **B) Geteilte Cloud:** Du übernimmst SynID Gateway als Single-Source-of-Truth. Dafür müsstest du den Service-Role-Key des SynID-Projekts manuell als Secret hier hinterlegen, ich tausche Client + Middleware. Funktioniert, aber Lovable verwaltet die Cloud nicht mehr für dieses Projekt (kein "Backend"-Knopf, keine Auto-Migrations gegen das andere Projekt).

Ohne deine Auswahl baue ich **Variante A**.

---

## Build & Deploy (Sofort-Fixes)

- `wrangler.toml` ist korrekt (`dist/server/index.mjs` + `[assets]` auf `dist/client`).
- Builds laufen über Lovables Standard — kein manueller Befehl nötig. Für lokales Bauen dokumentiere ich in der `README.md`: `bun install` → `bun run build` → `bunx wrangler deploy`.
- `supabase/config.toml` korrigiere ich falls projektref-Drift.

## Rollen & Superuser

- Neue Tabelle `app_roles` (enum: `superuser`, `admin`, `mitarbeiter`, `partner`, `kunde`) + `user_roles`-Pattern aus dem Guideline.
- `has_role(slid, role)`-RPC für Server-Funktionen.
- Jake Ruck (SLID `20090626`) bekommt `superuser` → darf alles editieren (alle Mitarbeiter, alle CRM-Daten, alle Module).
- Bestehende HL≥5-Checks werden durch `has_role` ergänzt.

## Neue Module (Sidebar-Tabs)

Jeweils mit eigener Route unter `_authenticated/`, Server-Functions, RLS deny-all + Server-side Auth via PIK/SLID:

1. **Chat** (`/chat`)
   - Tabellen: `chat_threads`, `chat_members`, `chat_messages`.
   - 1:1 und Gruppen-Threads zwischen Employees, Realtime via Supabase-Channels.
2. **Passwort-Tresor** (`/vault`)
   - Tabelle `vault_entries(owner_slid, label, url, username, secret_enc, notes)`.
   - Secrets verschlüsselt (AES-GCM) mit aus PIK abgeleitetem Key — client-seitige Ver-/Entschlüsselung, Server sieht nur Ciphertext.
   - Nur Eigentümer + Superuser sehen Einträge.
3. **SynMail** (`/mail`)
   - Tabellen: `mail_accounts(slid, address)`, `mail_messages(account_id, direction, from, to, subject, body_html, body_text, received_at, sent_at, read_at)`.
   - **Senden:** Server-Function ruft Brevo via Connector-Gateway auf (`Authorization: Bearer LOVABLE_API_KEY` + `X-Connection-Api-Key`). Du wirst beim ersten Senden gebeten, den Brevo-Connector zu verknüpfen.
   - **Empfangen:** Public server-route `/api/public/mail/cf-inbound` empfängt Cloudflare Email Worker POSTs (HMAC-signiert mit Secret `CF_EMAIL_WEBHOOK_SECRET`). Konzept-Doku in `docs/synmail-setup.md` beschreibt den Cloudflare Email Routing → Worker → Webhook-Flow inkl. Beispiel-Worker.
   - Liste/Detail/Compose-UI im SynDLS-Look.
4. **Workspace** (`/workspace`)
   - Tabelle `workspace_docs(id, title, content_md, tags, owner_slid, visibility: private|team|all)`.
   - Markdown-Editor + Liste + Such-/Tag-Filter. Versionierung optional als `workspace_doc_versions`.
5. **xSyna Basics** (`/basics`)
   - Tabelle `basics_docs(slug, title, kind: rule|agb|contract|info, body_md, file_url, pinned, updated_by)`.
   - Lesezugriff für alle eingeloggten Mitglieder, Schreibzugriff nur Superuser/HL≥5.

## Tech-Details

- Alle neuen Tabellen: `GRANT … TO authenticated`, `service_role`; RLS `deny all` + Server-Functions als einzige Schreib-/Lese-Pfade (analog bestehender Pattern).
- Neue Server-Functions in `src/lib/chat.functions.ts`, `vault.functions.ts`, `mail.functions.ts`, `workspace.functions.ts`, `basics.functions.ts`.
- Sidebar zeigt alle Tabs allen Eingeloggten; Schreibrechte/Adminflächen nur bei `superuser` oder passender HL.
- Lovable AI Gateway optional als Compose-Helper in SynMail (Antwortvorschläge) — nur wenn du willst.

## Was du danach noch einmalig tun musst

- **Brevo-Connector** verknüpfen (1 Klick beim ersten Mailversand).
- **Cloudflare Email Worker** nach mitgelieferter Doku deployen + Webhook-Secret in den Lovable-Secrets hinterlegen.
- *(nur bei Variante B)* SynID-Service-Role-Key als Secret eintragen.

---

**Bitte bestätigen:**
1. Variante **A** (eigene Cloud, empfohlen) oder **B** (geteilt, manuell)?
2. Soll ich alle fünf Module in einem Rutsch bauen, oder priorisieren (z. B. erst Chat + Vault, dann Mail)?
