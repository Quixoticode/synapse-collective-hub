# Juli-Update #2 · v2026.07.02

## Bugfixes

- **A020726001 · SynID-Karte Placeholder-KWN**  
  `SynIDCard.tsx` zeigt Werte aus einer falschen Quelle. Wir binden die Karte konsistent an die aktuelle Session (Name, SLID, HL, Abteilung, Position, Kind) und entfernen jeden Fallback-Text „KWN"/Placeholder.

- **F020726002 · Finances – Konten löschen geht nicht**  
  Neue Serverfunktion `finAccountDelete` (nur eigene bzw. HL≥4) + Papierkorb-Button in `/finances`. Bestätigt per Confirm-Dialog. Cascade auf `fin_transactions.account_id` per SQL prüfen; falls nötig `ON DELETE SET NULL`.

- **F020726003 · Security – Geräte werden nicht korrekt angezeigt**  
  `securityOverview` liefert nur globale Sessions; die Liste zeigt aber pro-Mitarbeiter-Devices nicht gruppiert. Wir gruppieren nach SLID, zeigen Modell/OS/IP/letzter Login/Trusted-Status und Mitarbeitername mit ein.

- **F020726004 · Security – UI passt nicht**  
  Redesign der Security-Seite mit klaren Sektionen (Ban-Alerts, Mitarbeiterliste mit ausklappbaren Geräten, Login-Historie als Timeline), Sticky Header, mobile-first Karten statt breiter Reihen.

- **A020726005 · Animationen unsichtbar durch Hintergrund**  
  Der `NeuromorphicBackground` wird via `z-index: -1` hinter allen Inhalt gelegt und `pointer-events:none` gesetzt; alle Route-Container bekommen `relative z-0`. Startup/Update-Animationen bekommen `z-[100]`.

## Neue Funktionen

### 1. Tab „Applyance" (`/apply`)
Bewerbungs-/Einstellungsmodul mit drei Rollen:

- **Leitung (HL≥5 oder `kind=service`)**: legt freie Stellen an (Abteilung, Team, Position, HL-Grenze, Beschreibung, offen/geschlossen).
- **Mitarbeiter (eingeloggt)**: sehen freigegebene Stellen unterhalb ihres HL und können Personen dort direkt einstellen (Formular → legt Employee-Datensatz an).
- **Anonym**: `/apply` ist öffentlich; Bewerbung mit Name, Kontakt, Wunschstelle, Notiz → landet in Bewerbungs-Queue (wie Support-Tickets).

Eingeloggte Mitarbeiter sehen zusätzlich einen „Bearbeiten"-Modus auf `/apply`.

Neue Tabellen: `apply_positions`, `apply_applications`. Neue Serverfunktionen in `src/lib/apply.functions.ts`.

### 2. SynMail deaktivieren
- Aus Tabs-Registry entfernen (oder `enabled:false`).
- Route bleibt bestehen, zeigt Info-Screen „Modul deaktiviert".

### 3. Einstellungsmenü `/settings`
Zentrale Übersicht mit vier Bereichen:
1. **Design** (verlinkt auf bestehende `/settings/design`)
2. **Session & Gerät** – zeigt aktuelle Session, Fingerprint, Geräte-Modell, lokal gespeicherte Daten (Preview lokaler Storage-Keys)
3. **Reset** – Button „Alle lokalen Daten löschen & abmelden" (localStorage/sessionStorage clear + Reload)
4. **Dark/Light-Mode** – Toggle, Speicherung in `localStorage` + `documentElement.classList`

### 4. Security-Erweiterungen
- **Auto-Logout beim Entfernen eines Geräts**: `revokeSession` markiert Session; Client pollt beim Reload `user_sessions`; fehlt der eigene Fingerprint → forcierter Logout + Redirect `/auth` mit Hinweis.
- **Quick Login (Login-Support, HL≥5)**: In `/security` neuer Button pro Mitarbeiter „Quick-Login-Code erzeugen". Serverfunktion `quickLoginIssue` erzeugt 6-stelligen Code (crypto-random), speichert in neuer Tabelle `quick_login_codes` (slid, code_hash, expires_at 15min, used bool, issued_by). Auf `/auth` neuer Tab „Quick Login": SLID + 6-stelliger Code → `quickLoginConsume` → Session wie normal.

### 5. Support-Kontakt
Footer/Info-Block in `/support` und `/settings`: **Telefonzentrale +49 177 3374439**, WhatsApp-Link `https://wa.me/491773374439`.

## Technische Umsetzung

**Migration** (`supabase/migrations/`):
```sql
-- apply_positions, apply_applications, quick_login_codes
-- + ggf. ALTER auf fin_transactions falls FK-Cascade fehlt
-- alle Tabellen: GRANT SELECT,INSERT,UPDATE,DELETE TO authenticated;
--                GRANT ALL TO service_role; GRANT SELECT TO anon (nur apply_positions offen);
-- RLS enable + Policies
```

**Neue Dateien**:
- `src/lib/apply.functions.ts`
- `src/lib/quick-login.functions.ts`
- `src/lib/finances.functions.ts` (delete-Funktion erweitern)
- `src/routes/apply.tsx` (öffentlich)
- `src/routes/_authenticated/settings.index.tsx` (`/settings`)

**Edits**:
- `src/components/SynIDCard.tsx` – Session-Bindung, KWN weg
- `src/routes/_authenticated/security.tsx` – Redesign, Grouping, Quick-Login-Button
- `src/routes/_authenticated/finances.tsx` – Delete-Button
- `src/routes/auth.tsx` – Quick-Login-Tab
- `src/routes/_authenticated/route.tsx` – Session-Poller (Force-Logout)
- `src/components/NeuromorphicBackground.tsx` – z-Index-Fix
- `src/lib/tabs-registry.ts` – SynMail aus, Applyance/Settings rein
- `src/lib/app-version.ts` – `2026.07.02` + Release Notes

**Verifikation**: Build/Typecheck automatisch; manueller Rundgang Mobile (Security, Finances, /apply, /settings).

Ich implementiere alles in einem Rutsch nach deiner Freigabe.