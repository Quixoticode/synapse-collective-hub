# Juli-Update #3 · v2026.07.03

## Bugfixes

- **F030726001 – Applyance: Bewerbungen ablehnen**  
  Neue Serverfunktion `applyApplicationSetStatus` (accepted/rejected/pending) + Ablehnen-/Zurücksetzen-Buttons in `/apply` (HL≥5 oder service). Status wird sichtbar farbig markiert.

- **A030726001 – Markdown-Darstellung (WICHTIG)**  
  Einheitliche Markdown-Komponente `src/components/Markdown.tsx` (basierend auf `react-markdown` + `remark-gfm` + Tailwind-Typografie). Ersetzt alle rohen `whitespace-pre-wrap`-Darstellungen von Beschreibungen in Chat, News/Roadmap, Basics, Tasks, Support, Apply, Update-Screen.

- **F030726002 – Kalender-Uhrzeit falsch**  
  Aktuell wird `new Date(input).toISOString()` gespeichert (UTC-Shift). Wir speichern lokale Zeit als ISO-Offset (`toIsoLocal(date)`), lesen mit `formatLocal()`. Betrifft `calendar.functions.ts` (create/update) und `/calendar` (Anzeige + Formular-Defaults).

## Neue Funktionen

### 1. Teams / Gruppen
Zentrales Zuordnungssystem: Service, Support, Labs oder Abteilungs-Teams.

- Neue Tabellen: `teams` (id, name, kind[service|support|labs|department], department, description, leader_slid), `team_members` (team_id, slid, role, hl_at_join).
- HL-Semantik (dokumentiert & in UI erklärt): HL 7–5 = Leitung, HL 4 = Abteilungsleiter, HL 3 = Abteilungsposition, HL 2 = Teamleiter, HL 1 = Mitarbeiter.
- Neuer Tab `/teams` – Übersicht aller Gruppen, Leiter, Mitgliederliste mit Posten. HL≥4 kann Teams anlegen/editieren; HL≥2 kann Mitglieder im eigenen Team pflegen.
- Applyance-Integration: aus einer Team-/Abteilungs-Ansicht direkt „Stelle ausschreiben" → öffnet Positions-Editor mit vorbelegten Feldern.

### 2. Quick Login für sich selbst
`/security` und `/settings`: Button „Quick-Login-Code für mich erzeugen" (unabhängig vom HL). Erlaubt Login auf Zweitgerät ohne PIK.

### 3. Applyance-Erweiterung
- Kontextbutton in `/teams`: „Stelle in diesem Team ausschreiben".
- In `/apply` Filter nach Team/Abteilung.
- Bewerbungs-Actions: annehmen (öffnet Hire-Dialog mit vorbelegtem Team) / ablehnen / offen zurücksetzen.

### 4. PDF-Vorlagen-Editor
- Neue Tabelle `pdf_templates` (id, name, kind[contract|invoice|generic], html, css, created_by, is_default).
- Admin-Route `/settings/pdf` (HL≥5): Vorlagen anlegen/bearbeiten (Monaco-freies Textarea mit Live-Preview per `iframe srcdoc`), Platzhalter `{{employee.name}}`, `{{today}}`, `{{position}}` etc.
- `ContractPrint.tsx` nutzt aktive Vorlage per Kind; Fallback auf eingebautes Default.

### 5. UI-Überarbeitung „Neuromorphic Liquid – Ruhig"
- **Apps-Grid**: klare Kategorien-Sektionen, größere Icons, Suchleiste, „Favoriten" oben. Weniger Glow, weniger Grid-Rauschen.
- **Taskbar**: statt Drag-and-Drop ein **Reorder-Modus** (Long-Press oder „Bearbeiten"-Button) mit Hoch/Runter-Pfeilen und Sichtbarkeit-Toggle. Reihenfolge speichert in `user_tab_prefs`.
- **Animationen**: Übergänge auf 200 ms cubic-bezier, Startup-Ring-Anzahl reduziert, Neuromorphic-Background bekommt Modus `calm` (weniger Blobs, langsamer, reduzierte Opazität).
- **Design-Einstellungen erweitert**:
  - Skalierung: kompakt / standard / groß (setzt `--syn-scale` auf 0.9 / 1 / 1.1, wird in `styles.css` als `font-size`- und `spacing`-Basis genutzt).
  - Dichte: airy / normal / dense.
  - Animationslevel: aus / dezent / voll.
  - Modus: dark / light (übernommen aus Settings).
  - Alle Werte in `user_prefs.design_json` + lokal gespiegelt.

### 6. Startanimation „Neuronales Netz erwacht"
- Neue `StartupAnimation.tsx`: Canvas-Animation eines Punktenetzes (30–50 Knoten). Verbindungen entstehen sanft, Areale (Cluster) pulsieren nacheinander synchron in wachsender Anzahl, bis das ganze Netz gleichzeitig pulsiert → Logo erscheint. ~2,5 s, `prefers-reduced-motion` respektiert.

## Technische Umsetzung

**Migration**: `teams`, `team_members`, `pdf_templates`, `apply_applications.status` Default + Check (`pending|accepted|rejected|hired`). Alle mit GRANT + RLS.

**Neue Dateien**:  
- `src/components/Markdown.tsx`  
- `src/lib/teams.functions.ts`, `src/lib/pdf-templates.functions.ts`  
- `src/routes/_authenticated/teams.tsx`, `src/routes/_authenticated/settings.pdf.tsx`  

**Wesentliche Edits**:  
- `src/lib/apply.functions.ts` (+ `applyApplicationSetStatus`, Team-Kontext)  
- `src/routes/apply.tsx` (Ablehnen-Button, Team-Filter)  
- `src/lib/calendar.functions.ts` + `src/routes/_authenticated/calendar.tsx` (lokale Zeit)  
- `src/components/StartupAnimation.tsx` (neu)  
- `src/components/NeuromorphicBackground.tsx` (calm-Modus)  
- `src/routes/_authenticated/settings.design.tsx` (Skalierung/Dichte/Animation)  
- `src/routes/_authenticated/apps.tsx` (Ruhige Kategorien + Suche)  
- Taskbar-Komponente (Reorder-Modus) im `_authenticated/route.tsx`  
- `src/components/ContractPrint.tsx` (Template-Loading)  
- `src/lib/tabs-registry.ts` (+ Teams-Tab), `src/lib/app-version.ts` → `2026.07.03` + Release Notes  

**Dependencies**: `react-markdown`, `remark-gfm`.

**Verifikation**: Build/Typecheck automatisch; Mobile-Rundgang: Apps-Scroll, Taskbar-Reorder, Startup, Kalender-Zeit, Markdown-Views, Applyance Ablehnen, Teams-CRUD, PDF-Editor-Preview.

Freigabe? Dann ziehe ich alles in einem Rutsch durch.
