
# Juli-Update #4 · v2026.07.04

## Bugfixes

**F040726001 — Teams frei definierbar**
- `teams.kind` (service/support/labs/department) fällt weg. Ersetzt durch `parent_id` (self-reference) für frei bau­bare Hierarchie.
- Neues Feld `min_hl` (optional) – wer diesem Team beitreten darf.
- `leader_slid` bleibt. Ein Team ist einfach *ein Team* – kein Systembegriff "Service" oder "Administration".
- Migration: `kind` und `department` Spalten löschen (Check-Constraint zuerst), `parent_id uuid REFERENCES teams(id) ON DELETE SET NULL`, `min_hl int` hinzufügen. In `apply_positions` bleibt `department/team` als Freitext.
- UI `/teams`: Baum-Ansicht (parent → children, eingerückt). Editor: Name, Beschreibung (Markdown), Leiter (SLID), Parent-Team, min. HL. Mitglieder unverändert.
- `apply_positions.team` wird zum Team-Name-Freitext (Dropdown der bestehenden Teams beim Ausschreiben).

## Neue Funktionen

### 1. Startseite (`/home`)
- Neue Route `/home` (statt Redirect nach `/apps`). Index-Route leitet auf `/home` weiter.
- Widgets:
  - **Meine Aufgaben** – offene Tasks, sortiert nach Fälligkeit (max. 5, Link "Alle").
  - **Nächste Termine** – kommende Kalender-Einträge (mich betreffend/team/all), nächste 7 Tage.
  - **Roadmap** – als „important" markierte Roadmap-Items, Kurzform.
  - **WorkTime heute** – geplante Schicht, Live-Timer wenn aktiv, Buttons Start/Stop.
- Kompaktes Kartendesign, ruhige Neuromorphic-Optik, Mobile-first.
- Apps-Grid bleibt unter `/apps` als sekundärer Launcher.

### 2. WorkTime (`/worktime`)
Neuer Tab „WorkTime" mit Zeitkalender.

**Tabellen (Migration):**
- `work_shifts` (id, slid, starts_at, ends_at, note, created_by, created_at, updated_at) – geplant von Leitung (HL≥4).
- `work_sessions` (id, slid, shift_id nullable, started_at, ended_at nullable, last_ping_at, status[active|completed|invalidated], invalidated_reason, created_at, updated_at) – tatsächliche Arbeitszeit.
- RLS: eigene sichtbar; HL≥4 sieht alle; Leiter darf schreiben.

**Server-Funktionen** (`worktime.functions.ts`):
- `wtShiftsList` – für Datumsbereich, mit slid-Filter.
- `wtShiftUpsert` / `wtShiftDelete` (HL≥4).
- `wtSessionStart` / `wtSessionPing` / `wtSessionStop` / `wtSessionInvalidate`.
- `wtSessionsList` – für Zeitkalender.

**Client-Verhalten:**
- Start-Button startet Session → `last_ping_at = now()`.
- Alle 60s Client-Ping (`wtSessionPing`) mit Sichtbarkeitsprüfung (`document.visibilityState === "visible"`).
- Zufällig alle 5–10 min *Aufmerksamkeits-Check*: Overlay „Arbeitsnachweis – 10 s" mit Blitz-Animation und Button. Ohne Klick in 10 s → `wtSessionInvalidate("timeout")`.
- Verlässt der User die App (`visibilitychange` hidden / `beforeunload`) → `wtSessionInvalidate("app_left")`.
- Server-seitig: Sessions mit `last_ping_at` älter als 3 min gelten beim Aufruf von `wtSessionsList` als invalidiert (Aufräum-Logik im Read).

**UI:**
- Tab-Übersicht:
  - Heute + Woche (Zeitraster) mit farbigen Blöcken: geplant (blau), erledigt (grün), nicht gemeldet (rot), invalidiert (amber).
  - Buttons: Start, Stop, „ich bin da" (manueller Ping).
  - Leiter-Bereich (HL≥4): Schicht anlegen/bearbeiten, Person auswählen.

### 3. Taskbar-Reorder ohne Drag-and-Drop
- `/settings/tabs`: aktuell Toggle-Only. Erweitern:
  - Reihenfolge-Modus: „Bearbeiten"-Toggle → jede Zeile bekommt ▲/▼-Buttons, tauscht `sort_order` mit Nachbarn.
  - `tabPrefSet` unterstützt `sort_order` bereits – ergänzen nur UI-Logik + persistente sort_order Werte (basierend auf aktueller Reihenfolge beim ersten Bearbeiten).
- Bottom-Nav und Sidebar respektieren `sort_order` (bereits über `visibleTabs`).

### 4. App-Icon xSyna Central
- Hochgeladenes Bild (Neuronales-Netz-Kugel) wird zum App-Icon:
  - Upload via `lovable-assets` → `src/assets/xsyna-icon.png.asset.json`.
  - `public/manifest.webmanifest` `icons` aktualisieren (PNG-URL vom CDN, `any maskable`).
  - Favicon-Link in `__root.tsx` → PNG-URL.
  - Optional: Startanimations-Logo (`StartupAnimation.tsx`) verwendet dasselbe Bild als Abschluss-Emblem.
  - Alte `public/favicon.ico` entfernen.

## Technische Umsetzung

**Migrationen:**
```sql
-- Teams entkernen
ALTER TABLE public.teams DROP CONSTRAINT teams_kind_check;
ALTER TABLE public.teams DROP COLUMN kind, DROP COLUMN department;
ALTER TABLE public.teams ADD COLUMN parent_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.teams ADD COLUMN min_hl int;

-- WorkTime
CREATE TABLE public.work_shifts (...);
CREATE TABLE public.work_sessions (...);
-- + GRANT + RLS + Trigger
```

**Neue Dateien:**
- `src/lib/worktime.functions.ts`
- `src/routes/_authenticated/worktime.tsx`
- `src/routes/_authenticated/home.tsx`
- `src/components/WorkTimeAttentionCheck.tsx` (Overlay + Timer, global in `_authenticated/route.tsx` gemountet, wenn Session aktiv)
- `src/assets/xsyna-icon.png.asset.json`

**Edits:**
- `src/routes/index.tsx` → redirect `/home` (statt `/apps`).
- `src/lib/tabs-registry.ts` → Tab `home` (Icon Home) + Tab `worktime` (Icon Clock).
- `src/lib/teams.functions.ts` → `kind`/`department` raus, `parent_id`/`min_hl` rein, Baum-Sortierung.
- `src/routes/_authenticated/teams.tsx` → Baum-UI + neuer Editor.
- `src/lib/apply.functions.ts` + `/apply` → Team-Referenz vereinfachen.
- `src/routes/_authenticated/settings.tabs.tsx` → Reorder-Modus.
- `src/routes/_authenticated/route.tsx` → globaler Attention-Check-Mount, WorkTime im Menü.
- `public/manifest.webmanifest`, `src/routes/__root.tsx` → neues Icon.
- `src/lib/app-version.ts` → `2026.07.04` + Release Notes-Insert.

**Keine neuen Abhängigkeiten.**

**Verifikation:** Build/Typecheck automatisch. Manuell (mobile Preview): Startseite lädt, WorkTime-Timer läuft, Aufmerksamkeits-Overlay erscheint, Icon im Manifest sichtbar, Teams-Baum funktioniert.

Freigabe? Dann ziehe ich alles in einem Rutsch durch.
