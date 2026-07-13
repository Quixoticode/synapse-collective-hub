# xSyna Central

Zentrales Management-System des xSyna-Kollektivs — deployed auf Cloudflare Workers unter `central.xsyna.de`.

## Module (17)

| # | Modul | Beschreibung |
|---|-------|-------------|
| 2.1 | **Dashboard** | Dynamische Startseite mit Uebersicht ueber Termine, Tasks und Nachrichten |
| 2.2 | **WorkTime** | Arbeitszeiterfassung (Start/Ende), Bearbeitung und Invalidierung durch Berechtigte |
| 2.3 | **Contacts** | CRM-Tool mit vollstaendigem Kunden-Protokoll und Interaktions-Logging |
| 2.4 | **Chat** | Interne Mitarbeiter-Kommunikation, Support-Ticket-Routing |
| 2.5 | **Vault** | Sichere Credential-Speicherung fuer externe Plattformen (AES-GCM) |
| 2.6 | **Workspace** | Dokumentenerstellung und -speicherung (Markdown, HTML, PDF, DOCX) |
| 2.7 | **Basics** | Compliance-Assets: AGBs, Lizenzen, Modul-Handbuecher |
| 2.8 | **Calendar** | Terminplanung mit Multi-User-Zuweisung und Event-Mapping |
| 2.9 | **Tasks** | Projektmanagement mit Workflows, Abhaengigkeiten und Zuweisungen |
| 2.10 | **Applyance** | HR-Applicant-Tracking: Stellenanzeigen, Bewerbungen, Accept/Reject |
| 2.11 | **Teams** | HR-Administration: Rollen, Abteilungen, Berechtigungen, Sperren |
| 2.12 | **Security** | Auth-Dashboard: Login-Historie, Passkeys, Geraete + Quickcode-OTP |
| 2.13 | **My Account** | Profil-Verwaltung (E-Mail, Telefon etc.) mit Permission-Gates |
| 2.14 | **Settings** | Globale Config: UI-Theme, Feature-Permissions, Maintenance Mode |
| 2.15 | **Payments** | Budget-Monitoring und Multi-Account-Transaktionen (CRUD) |
| 2.16 | **News** | Content-Management: Roadmaps, Release Notes, Announcements |
| 2.17 | **Docs** | Oeffentliche Tech-Doc-Wiki mit Produkthandbuechern und FAQs |

## Architektur

- **Frontend:** React 19 + TypeScript + TanStack Router/Start + Tailwind CSS v4
- **UI-System:** Neuromorphic Liquid Design — dunkles Theme mit Synaptic Cyan (#00E5FF) Primary
- **Backend:** Cloudflare Worker (Edge SSR) mit TanStack Start Server Functions
- **Datenbank:** Supabase PostgreSQL mit serverseitigem Service-Role-Key
- **Auth:** Custom SynID (SLID + PIK) + WebAuthn/Passkeys + Quickcode-OTP

## Rollen & Berechtigungen

- **Superuser** (`jake.ruck@team.xsyna.de` / SLID `20090626`) — voller Zugriff auf alle Module und Account-Einstellungen
- **Admin** — verwaltet Teams, Security, Payments, Settings, Applyance
- **Mitarbeiter** — Zugriff auf Core-Module (WorkTime, Tasks, Calendar, Contacts, Chat, Vault, Workspace)
- **Partner/Kunde** — eingeschraenkter Zugriff basierend auf granularen Feature-Permissions

Alle Berechtigungen werden ueber die `features`-Tabelle und `employee_roles` serverseitig geprueft — es gibt kein Client-Side-Authority mehr.

## Voraussetzungen

- Node.js 20+ oder Bun 1.1+
- Cloudflare-Konto mit Wrangler CLI
- Supabase-Projekt (URL + Publishable Key + Service Role Key)

## Installation

```bash
# Dependencies installieren
npm install
# oder
bun install
```

## Environment Variables

Kopiere `.env.example` nach `.env` und fuelle aus:

```bash
SUPABASE_URL=https://deine-projekt.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_PROJECT_ID=deine-projekt-id
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID=$SUPABASE_PROJECT_ID
```

**Wichtig:** Der `SUPABASE_SERVICE_ROLE_KEY` wird **niemals** im Client verwendet. Setze ihn als Wrangler Secret (siehe Deploy-Abschnitt).

## Lokale Entwicklung

```bash
# Dev-Server starten (Vite + TanStack Start)
npm run dev

# Oder mit Wrangler (simuliert Cloudflare Worker Environment)
npm run cf:dev
```

Der Dev-Server laeuft standardmaessig auf `http://localhost:3000`.

## Build

```bash
# Production Build
npm run build

# Output:
#   dist/server/index.mjs    # Worker Entry (SSR)
#   dist/client/             # Static Assets (Client-Bundle)
```

## Deploy (Cloudflare Workers)

### 1. Wrangler authentifizieren (einmalig)

```bash
npx wrangler login
```

### 2. Secrets setzen (einmalig pro Environment)

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Optional:
npx wrangler secret put LOVABLE_API_KEY
npx wrangler secret put BREVO_API_KEY
npx wrangler secret put CF_EMAIL_WEBHOOK_SECRET
```

### 3. Deploy

```bash
# Production deploy (central.xsyna.de)
npm run deploy

# Oder direkt:
npx wrangler deploy
```

### 4. Custom Domain einrichten

Die Domain `central.xsyna.de` ist in `wrangler.toml` konfiguriert:

```toml
[[routes]]
pattern = "central.xsyna.de"
custom_domain = true
```

Nach dem ersten Deploy muss die Domain im Cloudflare Dashboard unter **Workers & Pages > xsyna-central > Settings > Triggers > Custom Domains** aktiviert werden.

## Wrangler CLI Commands

| Befehl | Beschreibung |
|--------|-------------|
| `npx wrangler dev` | Lokale Entwicklung mit Worker-Runtime |
| `npx wrangler deploy` | Production Deploy |
| `npx wrangler tail` | Live-Logs vom Worker |
| `npx wrangler secret list` | Alle gesetzten Secrets anzeigen |
| `npx wrangler secret put <NAME>` | Secret setzen/aktualisieren |

## Projektstruktur

```
xsyna-central/
├── src/
│   ├── components/     # React-Komponenten (Neuromorphic UI)
│   ├── routes/         # TanStack Router Routes
│   │   ├── _authenticated/   # Geschuetzte Internal-Portal-Routes
│   │   ├── api/              # API-Endpunkte
│   │   ├── index.tsx         # Public Landing Page
│   │   ├── auth.tsx          # Login/Register
│   │   └── docs.*.tsx        # Public Docs
│   ├── lib/            # Server Functions, Auth, Utils
│   ├── server.ts       # Cloudflare Worker Entry
│   └── styles.css      # Neuromorphic Liquid Design System
├── supabase/
│   └── migrations/     # Datenbank-Migrationen
├── wrangler.toml       # Cloudflare Worker Config
├── vite.config.ts      # Vite + Nitro Config (cloudflare-module)
└── package.json
```

## Datenbank

Migrationen liegen in `supabase/migrations/`. Sie werden ueber die Supabase CLI oder das Dashboard angewendet:

```bash
# Neue Migration erstellen
npx supabase migration new name_der_migration

# Migrations auf Remote anwenden
npx supabase db push
```

## SSO & External Integrations

Verbindungen zu externen xSyna-Systemen werden in der Tabelle `syn_external_configs` gepflegt. Verwaltung ueber **Settings -> Integrations** (nur Superuser).

## Support

Bei Fragen oder Problemen: **Support-Chat** im xSyna Central oder E-Mail an `jake.ruck@team.xsyna.de`.
