# Juli-Update xSyna Central

Sehr großer Umfang — deshalb hier der Plan zur Freigabe, bevor ich in einem Rutsch alles baue.

## A) Bugfixes

- **A-21062601 (Kollektiv, Handy)**: Modal für Mitarbeiter-Anlage bekommt `max-h-[85dvh]` + `overflow-y-auto` und einen sticky Footer mit Speichern-Button, damit der Button auf iOS immer sichtbar bleibt. Gleiche Anpassung für Kontakte-Modal.
- **A-21062602 (Workspace/Chat auf iOS)**: Umstellung auf **Subpage-Mechanik** — Liste und Detail werden auf `< md` als zwei getrennte Routen behandelt. Klick auf ein Item pusht in die URL (`?doc=ID` / `?thread=ID`), Back-Button des Browsers/iOS-Swipe funktioniert. Sidebar wird auf Mobile nie gleichzeitig mit dem Inhalt angezeigt. Betrifft: `workspace.tsx`, `chat.tsx`, `mail.tsx`, `basics.tsx`, `support.tsx`, `news.tsx`.
- **A-01072601 (CIP/PIK bei Mitarbeiter-Edit)**: In `/collective` Edit-Modus — CIP und PIK werden nur beim **Neuanlegen** verlangt. Beim Editieren sind sie optional; leer = unverändert. Server-Fn `employeeUpsert` akzeptiert leere Felder und lässt sie serverseitig weg.

## B) Neue Module

1. **Security-Tab** (`/security`, HL≥4)
   - Anzeige: letzter Login je Mitarbeiter, aktive Sessions/Geräte, Login-Historie.
   - Aktion: **temporärer Bann** mit selbst definierter Nachricht + Dauer. Gebannter User sieht Ban-Screen statt App.
   - Tabellen: `login_events`, `user_sessions`, `user_bans`.

2. **Support-Accounts (Public Tickets)** (`/support` erweitert)
   - Neuer Login-Modus auf `/auth`: "Support-Login" mit **Name + 6-stelliger Code**. Landet direkt im eigenen Ticket, kein SynID.
   - Erstellung: entweder self-service auf `/auth` (Ticket öffnen) oder durch Mitarbeiter.
   - Mitarbeiter können abgeschlossene Support-Accounts einsehen/löschen.
   - Tabelle: `support_accounts` (name, code_hash, ticket_id, closed_at).

3. **Tasks-Tab** (`/tasks`)
   - Jeder kann Aufgaben erstellen und einer Person (SLID) zuweisen.
   - Felder: Titel, Beschreibung, Deadline, Priorität, Status (offen/in Arbeit/erledigt), Zuweiser, Zugewiesener.
   - Filter: "Mir zugewiesen" / "Von mir erstellt" / "Alle".
   - Tabelle: `tasks`.

4. **Workspace → Vertrags-PDF-Export**
   - Neuer Button "Als Vertrag exportieren (PDF)" pro Doc.
   - Design-Templates (HTML/CSS) — Auswahl: "Vertrag", "Angebot", "Bestätigung".
   - Rendering im Browser (jsPDF + html2canvas oder `window.print` mit dediziertem Print-Stylesheet). Wir nehmen `window.print` mit versteckter Render-Layer → keine neue Dependency, iOS-kompatibel.
   - Text bleibt Markdown im Doc, wird beim Export ins Template geklebt.

5. **Device-Registrierung / "Trusted Devices"**
   - Nach erstem Login: Prompt "Dieses Gerät als vertrauenswürdig registrieren?". Bei Ja: Device-Fingerprint + Gerätemodell + OS-Version + IP → `trusted_devices` gespeichert; Session-Cookie 90 Tage. Nächster Aufruf → Auto-Login ohne PIK.
   - Sichtbar & widerrufbar unter `/security` und in eigenen Einstellungen.

6. **Neuromorphic-Liquid-Background**
   - SVG/Canvas-Animation mit driftenden neuronalen Pfaden + Blur-Blobs, respektiert `prefers-reduced-motion`.
   - Als fester Layer hinter `__root.tsx`.
   - **Design-Tab (BETA)** unter `/settings/design`: Toggle Animation an/aus, Farbschema (Synapse/Mint/Amber), Intensität.
   - Speicherung in `user_prefs.design_json`.

7. **Notify-Tab + Service-Worker Push**
   - Service-Worker `public/sw.js` (nur PROD, mit Preview-Guards laut PWA-Skill) registriert Web-Push.
   - Neue Tabelle `push_subscriptions` (slid, endpoint, p256dh, auth, ua).
   - Neue Tabelle `notifications` (recipient_slid, title, body, url, source: chat|calendar|task|custom, sent_at, read_at).
   - Backend-Trigger: bei neuer Chat-Message / neuem Kalender-Event / neuer Task → Server-Fn erzeugt Notification-Rows für alle betroffenen SLIDs; Push-Delivery per Web-Push (VAPID).
   - **In-App-Erzeugung ab HL≥5**: `/notify` Tab → Empfänger wählen, Titel/Body eingeben, senden.
   - Zeitfenster-Check: Client-Poller alle 5 Min als Fallback (nicht jeder iOS-Browser unterstützt echte Push).
   - Neue Berechtigungen im `tabs-registry` + `permissions`-Matrix.

## Technisches

- **Migration** (eine große): Tabellen `login_events`, `user_sessions`, `user_bans`, `support_accounts`, `tasks`, `trusted_devices`, `user_prefs`, `push_subscriptions`, `notifications`. Jede mit `GRANT ... TO authenticated` + `service_role` + RLS (SLID-basiert über eigene RLS-Funktionen, analog `has_role`).
- **Server-Fns** (neu): `security.functions.ts`, `tasks.functions.ts`, `notify.functions.ts`, `devices.functions.ts`, `support-accounts.functions.ts`, `design.functions.ts`. Erweitert: `syn.functions.ts` (Trusted-Device-Login), `workspace.functions.ts` (Contract-Templates).
- **Routes** (neu): `_authenticated/security.tsx`, `tasks.tsx`, `notify.tsx`, `settings.design.tsx`. Erweitert: `auth.tsx` (Support-Login-Modus + Trusted-Device-Auto-Login), `collective.tsx` (PIK/CIP optional bei Edit + Modal-Fix), `contacts.tsx` (Modal-Fix), `workspace.tsx`/`chat.tsx`/`mail.tsx`/`basics.tsx`/`support.tsx` (Subpage-Mechanik).
- **Components** (neu): `NeuromorphicBackground.tsx`, `BanScreen.tsx`, `ContractPrintLayer.tsx`, `DeviceTrustPrompt.tsx`, `MobileListDetail.tsx` (shared Subpage-Wrapper).
- **PWA**: Manifest bleibt; SW nur PROD mit Kill-Switch-fähigem Path; VAPID-Keys als Secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`.
- **App-Version**: bump auf `v2026.07.01` mit Release-Notes-Eintrag in `app_versions` (via Migration).
- **Security-Scan** nach Migration.

## Öffnen vor Start

- **VAPID-Keys**: Ich generiere sie und lege sie als Secrets `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` an. OK?
- **PDF-Export**: `window.print` (0 Dependencies, iOS-safe) oder echte PDF-Lib (`pdf-lib`, größer)? Ich schlage `window.print` vor.
- **Trusted-Device-TTL**: 90 Tage default, widerrufbar. OK?

Sag "los" und ich baue alles in einem Rutsch inkl. Prüfungen.
