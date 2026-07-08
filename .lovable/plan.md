
# Juli-Endupdate #6 — „xSyna Neuromorphic Refresh Final" (v2026.07.08)

Deine Kernwünsche im Detail sind in **Phase 1** dieses Plans umgesetzt. Alles darüber hinaus (SSO-Server für Drittseiten mit `?target=`, xSyna-Account als OAuth-Provider für GitHub etc., SynAI Context Auth, kontinuierliche DB-Sync) verschiebe ich bewusst in **Phase 2/3** — Begründung unten.

---

## Was in diesem Update umgesetzt wird (Phase 1)

### 1. Neuromorphic-Design vollständig übernehmen
Design-Referenz: `Quixoticode/Neuromorphic` (öffentliches Repo, Replit-Monorepo). Die Design-Sprache lebt in `artifacts/mockup-sandbox/src/components/mockups/neuromorphic-liquid/` (DesignSystem.tsx, DesignSystemV3.tsx, LoginScreen.tsx) und `index.css`.

Übernahme:
- **Design-Tokens**: `src/styles.css` bekommt die Neuromorphic-Token-Struktur (HSL-Trippel, `--elevate-1/2`, `--button-outline`, `--badge-outline`, Radius/Spacing-Skala, `text-*` Skala). Dark-Mode als Default beibehalten, aber mit Neuromorphic-Werten.
- **Komponenten-Bibliothek**: shadcn-Komponenten (`src/components/ui/*`) auf Neuromorphic-Varianten anheben (Button/Card/Input/Dialog/Tabs/Badge/Sheet) — weiche „Liquid"-Shadows, `.elevate-1/.elevate-2` Utilities, softere Radien, `backdrop-filter` konform zur Modern-Stack-Regel (Tailwind-Utility, kein `-webkit-` von Hand).
- **App-Shell**: `PublicHeader`, `_authenticated/route.tsx` Layout, Sidebar/Tabbar und Home-Widgets im neuen Look. Der animierte NeuromorphicBackground bleibt, wird aber neu getuned (weichere Blobs, weniger Intensität als Default).
- **Startanimation**: bleibt inhaltlich, wird typografisch und farblich aufs neue System gezogen.

### 2. „xSyna Account" — Passkey-Login (WebAuthn) mit PIK-Migration
Der Auth-Flow wird umgebaut, aber **rückwärtskompatibel**: alte SLIDs/PIKs funktionieren bis jeder User migriert ist.

Datenbank (eine Migration):
- Neue Tabelle `xsyna_accounts` (1:1 zu `employees` via `slid`): `slid`, `first_name`, `last_name`, `email`, `birthdate`, `avatar_url`, `company`, `contact_json`, `passkey_migrated bool`, `passkey_required bool default true`, timestamps.
- Neue Tabelle `webauthn_credentials`: `id uuid`, `slid`, `credential_id text unique`, `public_key bytea`, `counter bigint`, `device_label`, `transports text[]`, `created_at`, `last_used_at`.
- Neue Tabelle `webauthn_challenges`: `challenge text`, `slid`, `kind` (`registration`|`authentication`|`cross_device`), `expires_at`. 5-Min-TTL, Server bereinigt beim Abruf.
- RLS: alle drei Tabellen — kein direkter Client-Zugriff (`USING (false)`), Reads/Writes ausschließlich über Server-Functions.
- Alle bestehenden PIK-basierten Server-Functions bleiben; sie werden schrittweise auf `resolveActor(request)` umgestellt, der wahlweise PIK ODER Passkey-Session akzeptiert.

Server-Functions (`src/lib/xsyna-account.functions.ts` + `.server.ts` für WebAuthn-Crypto):
- `xaBeginRegistration({ slid })` → liefert PublicKeyCredentialCreationOptions, speichert Challenge.
- `xaFinishRegistration({ slid, response, device_label })` → verifiziert Attestation (Bibliothek: `@simplewebauthn/server`, Worker-kompatibel), speichert Credential, setzt `passkey_migrated=true`, invalidiert PIK (setzt auf zufälligen 64-Byte-Wert, damit PIK-Login unbrauchbar wird).
- `xaBeginAuth({ slid? })` → Options (mit `allowCredentials` wenn `slid` bekannt, sonst Discoverable-Credential-Flow).
- `xaFinishAuth({ response })` → verifiziert Assertion, mintet **xSyna-Session-Token** (JWT-artig, HS256 mit `XSYNA_SESSION_SECRET` — generiert via `secrets--generate_secret`, TTL 30 Tage, `slid` + `type` claims).
- `xaMe()` → liefert Account-Profil zur aktuellen Session.
- `xaUpdateProfile(...)` → Profilbearbeitung (name, email, birthdate, contact, avatar_url).
- `xaListCredentials()` / `xaDeleteCredential(id)` → Passkey-Verwaltung.
- Cross-Device: `xaBeginCrossDevice({ slid })` → erzeugt kurzlebigen QR-Payload (SLID + Challenge + Rendezvous-URL); `xaCompleteCrossDevice({ challenge, response })` — Gerät A pollt Status, Gerät B öffnet URL und macht die Passkey-Zeremonie. Fallback ohne QR: numerischer 8-stelliger Kopplungscode (nutzt bestehende `quick_login_codes`-Infrastruktur).

Session-Handling (Client):
- Neue Datei `src/lib/xsyna-session.ts` ersetzt schrittweise `syn-session.ts`. Neben bestehendem `syn.session.v1` (SLID+PIK) neuer Slot `xsyna.session.v1` = `{ slid, token, expires_at, profile }`. `getCredentials()` liefert entweder `{ slid, pik }` oder `{ slid, token }`.
- `attachSupabaseAuth`-Middleware bleibt für Cloud-Auth (unverändert). Für SynID-Server-Functions führt ein neuer Helper `resolveActor(input)` beide Wege zusammen (PIK ODER Token).
- Login-Screen (`/auth`): drei Zustände — (1) SLID eingeben, (2) Passkey-Prompt (falls migriert) mit „Ein anderes Gerät nutzen" → QR + Code, (3) Fallback PIK-Eingabe mit Warnung „Nach diesem Login wird ein Passkey verlangt". Direkt nach erfolgreichem PIK-Login: Modal `„Passkey erstellen (Pflicht)"`, dessen Abbruch den User ausloggt.

### 3. xSyna Account — Profilverwaltung
Neue Route `/_authenticated/account.tsx` (ersetzt Teile von `settings.index.tsx`):
- Tabs: **Profil** (Name/Vorname/Geburtsdatum/Firma/Abteilung/Position/Kontaktdaten), **Sicherheit** (Passkeys verwalten, weiteren Passkey hinzufügen, Cross-Device-Passkey), **Einstellungen** (bestehende Design/Berechtigungen-Sub-Routen als Unterlinks), **Meine Daten** (Übersicht eigener Dokumente/Chats/Bilder als Verlinkungen — kein Umbau der Datenlogik).
- Avatar-Upload nutzt neuen Storage-Bucket `avatars` (public, per-slid Ordner, RLS via Server-Function).

### 4. WorkTime — Admin-CRUD + „ohne-Grund-Ungültig"-Fix
- **Bug**: Attention-Check invalidiert manchmal ohne Interaktion. Ursache im aktuellen Code: `WorkTimeAttentionCheck` startet den Timer auch bei Tab-Wechsel/App-Wiederherstellung neu, ohne Sichtbarkeits-Check → Timer läuft ab, während Nutzer die App gar nicht sieht. Fix: `visibilitychange`-Handler pausiert den 10s-Timer bei `document.hidden` und startet ihn erst nach `focus + click/keydown` neu. Zusätzlich Grace-Period 3s bei PWA-Resume.
- **Admin-CRUD**: `wtShiftCreate`, `wtShiftUpdate`, `wtShiftDelete` (letztes existiert bereits, HL≥7). Alle drei ab HL≥5 (Admin) verfügbar. Neuer Admin-Screen im `/worktime`-Tab „Alle Schichten (Admin)" mit Editor-Dialog.

### 5. Admin-DB-Export (einmalig, kein Live-Sync)
Neue Route `/_authenticated/db-transfer.tsx` (HL≥7 / Superuser). UI:
- Zielangabe: `Target Supabase URL` + `Target Service-Role Key` (nur im RAM, wird nie serverseitig gespeichert; Warnhinweis, dass Service-Role-Key niemals verlassen sollte, außer bei bewusster Migration).
- „Transfer starten" → Server-Function `dbExportAll({ target_url, target_service_key })` (Superuser-only) macht: für jede whitelisted-Tabelle (`employees`, `xsyna_accounts`, `teams`, `team_members`, `tasks`, `crm_data`, `fin_accounts`, `fin_transactions`, `cal_events`, `apply_positions`, `apply_applications`, `public_docs`, `basics_docs`, `pdf_templates`, `app_versions`, `roadmap_items`, `mail_accounts`, `mail_messages`, `chat_*`, `notifications`, `user_prefs`, `user_tab_prefs`, `syn_external_configs`) → `SELECT *` aus Quelle, `UPSERT` in Ziel (in Batches à 500 Zeilen, `on_conflict` auf Primary Key).
- Storage-Buckets und `auth.users`/`webauthn_credentials` sind ausgeschlossen (rechtliche/technische Gründe — steht klar in der UI).
- Fortschrittsanzeige via Server-Sent-Events aus einer Server-Route unter `src/routes/api/db-transfer.ts` (kein Public-Prefix — hinter Superuser-Bearer-Check).

### 6. Sicherheitsfixes
Nach diesem Umbau laufe ich `security--run_security_scan` und behebe alle Findings, die diese Migration betreffen oder neu auftreten. Bestehende offene Findings (`pik_in_localstorage`, `pik_in_url_param`) werden durch den Passkey-Umbau strukturell obsolet, sobald ein User migriert ist — die Findings markiere ich mit Kommentar „behoben mit Update 2026.07.08 für migrierte Accounts; Legacy-PIK-Slot bleibt bis Migration abgeschlossen".

### 7. Versionierung + Release Notes
- `src/lib/app-version.ts` → `2026.07.08` „Neuromorphic Refresh Final"
- Release-Notes-Seed via `versionsUpsert` in einer Migration mit ausführlichem Changelog (Deutsch, in Sektionen: Design, xSyna Account, Passkeys, WorkTime, Admin, Sicherheit, bekannte Einschränkungen).

---

## Was ich absichtlich verschiebe (mit Begründung)

Diese Punkte sind **jeder für sich ein eigenes größeres Update**. In dieses Update zu packen würde bedeuten, Preview für Tage instabil zu machen und Halbfertiges auszuliefern.

- **SSO-Server für Drittseiten mit `?target=`** (Phase 2). Braucht: eigenes Consent-UI, Redirect-Allow-List pro Zielsite, PKCE, Rendezvous-Cookies über Cross-Site, verifizierte Rückgabe des Tokens an die Zielsite (nicht via URL-Fragment, sondern per Backchannel oder signed-JWT-Redirect). Ohne feste Domain `pass.xSyna.de` produktiv nicht sinnvoll.
- **xSyna Account als OAuth-Provider für GitHub/Fremdanbieter** (Phase 3). GitHub erlaubt keine beliebigen externen OAuth-Provider für sein eigenes Login — was du meinst, ist entweder (a) „Sign in with xSyna" als OAuth 2.1 / OIDC-Provider den Fremdseiten selbst einbinden, oder (b) SAML/OIDC-Anbindung an Fremd-IdPs für den umgekehrten Weg. Beides braucht echten OIDC-Discovery-Endpoint (JWKS, ID-Tokens, Refresh-Rotation), Client-Registry und eine feste öffentliche Domain. Lovable Cloud bietet dafür `supabase--configure_oauth_server` — den setze ich in Phase 2 auf, sobald `pass.xSyna.de` live ist.
- **SynAI Context Auth** (Phase 3). Erfordert ein sauberes Feature-Store (Login-Historie, Geräte-Fingerprints, Geolocation, Verhaltens-Metriken) plus ML-Modell/Scoring — nicht als Nebeneffekt in einem Design-Update baubar. Ich lege in dieser Migration bereits `login_events`-Erweiterungen (Device-Hash, IP-Bucket, User-Agent-Class) an, damit Phase 3 auf Daten aufsetzen kann.
- **Kontinuierliche DB-Replikation**: dieses Update liefert nur den einmaligen Export. Live-Sync bräuchte logische Replikation, was Lovable-Cloud-Nutzer nicht selbst konfigurieren können.

---

## Technische Details

### Neue/geänderte Dateien
Erstellt:
- `src/lib/xsyna-account.functions.ts`, `src/lib/xsyna-account.server.ts`
- `src/lib/webauthn.server.ts` (SimpleWebAuthn-Wrapper, RP-ID = `pass.xSyna.de` in Prod, aktuelle Preview-Domain in Dev via ENV `XSYNA_RPID`)
- `src/lib/xsyna-session.ts`, `src/lib/resolve-actor.server.ts`
- `src/lib/db-transfer.functions.ts`, `src/routes/api/db-transfer.ts`
- `src/routes/_authenticated/account.tsx`, `src/routes/_authenticated/db-transfer.tsx`
- `src/components/PasskeyPrompt.tsx`, `src/components/CrossDeviceQr.tsx`, `src/components/neuromorphic/*` (Card, Button, Elevate — als Layer über shadcn)
- `supabase/migrations/20260708_*.sql` (xsyna_accounts, webauthn_*, storage bucket `avatars`, Release-Notes-Insert, login_events-Erweiterung)

Ersetzt/überarbeitet:
- `src/styles.css` — komplett auf Neuromorphic-Tokens
- `src/components/ui/{button,card,input,dialog,tabs,badge,sheet}.tsx` — Variants
- `src/routes/auth.tsx` — 3-Stage-Flow
- `src/routes/__root.tsx`, `PublicHeader.tsx`, `SyncSpinner.tsx` — Look
- `src/components/WorkTimeAttentionCheck.tsx` — Visibility-Guard
- `src/lib/worktime.functions.ts` — `wtShiftCreate`, `wtShiftUpdate`; HL-Absenkung Delete auf 5
- `src/lib/tabs-registry.ts` — Tabs `account`, `db-transfer`
- `src/lib/app-version.ts`

### Secrets (via `secrets--generate_secret`)
- `XSYNA_SESSION_SECRET` (64 Zeichen, HS256)
- `XSYNA_RPID` = `pass.xSyna.de` (kein Secret, aber ENV — für Prod ; in Dev leer lassen → `window.location.hostname`)

### Package
- `bun add @simplewebauthn/server @simplewebauthn/browser jose qrcode`
- (SimpleWebAuthn v13+ ist Worker-kompatibel; `qrcode` ist pure JS.)

### Kompatibilität
- Kein Bruch bestehender Funktionen: `verifyActor(slid, pik)` bleibt, wird intern durch `resolveActor` gewrappt. Alte Sessions funktionieren, bis der User zu `/auth` navigiert und dort in die Passkey-Migration gezogen wird.
- PWA-`start_url` bleibt `/home` für installierte Instanzen; `/auth` erkennt fehlende Session und leitet auf `/auth`.

---

## Bitte bestätigen

Ist das der Umfang, den du für dieses Update willst? Insbesondere:
1. **OK, SSO-für-Drittseiten und OAuth-Provider für GitHub in Phase 2 zu verschieben?** (Ohne feste Domain macht Phase 1 davon technisch keinen Sinn.)
2. **OK, dass „PIK ungültig" erst greift wenn der User selbst migriert hat**, nicht als globaler DB-Wipe? (Andernfalls fliegt jeder nicht-migrierte User sofort raus.)
3. **RP-ID Passkeys**: OK dass in Dev die Preview-Domain als RP-ID genutzt wird und Passkeys ab Prod-Rollout unter `pass.xSyna.de` neu registriert werden müssen? (Passkeys sind domain-gebunden — kein Umzug möglich.)

Sag ja / passe an — dann baue ich.
