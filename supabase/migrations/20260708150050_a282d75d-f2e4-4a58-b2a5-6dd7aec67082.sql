
CREATE TABLE IF NOT EXISTS public.xsyna_accounts (
  slid text PRIMARY KEY REFERENCES public.employees(slid) ON DELETE CASCADE,
  first_name text,
  last_name text,
  email text,
  birthdate date,
  avatar_url text,
  company text,
  contact_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  passkey_migrated boolean NOT NULL DEFAULT false,
  passkey_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.xsyna_accounts TO authenticated;
GRANT ALL ON public.xsyna_accounts TO service_role;
ALTER TABLE public.xsyna_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xsyna_accounts_no_client" ON public.xsyna_accounts FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "xsyna_accounts_service" ON public.xsyna_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER trg_xsyna_accounts_updated_at BEFORE UPDATE ON public.xsyna_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slid text NOT NULL REFERENCES public.employees(slid) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key bytea NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  device_label text,
  transports text[] NOT NULL DEFAULT '{}',
  aaguid text,
  backup_eligible boolean NOT NULL DEFAULT false,
  backup_state boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX IF NOT EXISTS webauthn_credentials_slid_idx ON public.webauthn_credentials(slid);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webauthn_credentials TO authenticated;
GRANT ALL ON public.webauthn_credentials TO service_role;
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webauthn_credentials_no_client" ON public.webauthn_credentials FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "webauthn_credentials_service" ON public.webauthn_credentials FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge text NOT NULL,
  slid text,
  kind text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  consumed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS webauthn_challenges_challenge_idx ON public.webauthn_challenges(challenge);
CREATE INDEX IF NOT EXISTS webauthn_challenges_expires_at_idx ON public.webauthn_challenges(expires_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webauthn_challenges TO authenticated;
GRANT ALL ON public.webauthn_challenges TO service_role;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webauthn_challenges_no_client" ON public.webauthn_challenges FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "webauthn_challenges_service" ON public.webauthn_challenges FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.xsyna_pairings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pairing_code text NOT NULL UNIQUE,
  slid text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  result_token text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.xsyna_pairings TO authenticated;
GRANT ALL ON public.xsyna_pairings TO service_role;
ALTER TABLE public.xsyna_pairings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xsyna_pairings_no_client" ON public.xsyna_pairings FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "xsyna_pairings_service" ON public.xsyna_pairings FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.xsyna_accounts (slid, first_name, last_name, passkey_migrated, passkey_required)
SELECT
  e.slid,
  CASE WHEN e.name IS NOT NULL AND position(' ' in e.name) > 0
       THEN split_part(e.name, ' ', 1) ELSE e.name END,
  CASE WHEN e.name IS NOT NULL AND position(' ' in e.name) > 0
       THEN substring(e.name from position(' ' in e.name) + 1) ELSE NULL END,
  false,
  true
FROM public.employees e
ON CONFLICT (slid) DO NOTHING;

INSERT INTO public.app_versions (version, title, notes_md, published, kind, visibility, published_at)
VALUES (
  '2026.07.08',
  'Neuromorphic Refresh Final',
  E'# xSyna „Neuromorphic Refresh Final" (v2026.07.08)\n\nDas größte Update dieses Monats. Wir bereiten die Umstellung auf **xSyna Account** vor und legen die Basis für das kommende SSO unter `pass.xSyna.de`.\n\n## Neuromorphic überall\n- Design-Tokens harmonisiert, weiche Liquid-Shadows, `.elevate-1/.elevate-2`-Utilities\n- Neue Passkey-UI, Account-Verwaltung, aktualisierte Auth-Seite\n\n## xSyna Account (Passkey / WebAuthn)\n- Neue Route **/account**: Profil, Passkeys verwalten, weitere Geräte hinzufügen\n- Passkey-Registrierung + -Anmeldung nach WebAuthn-Standard (SimpleWebAuthn)\n- **Cross-Device**: Passkey über zweites Gerät per QR-Code oder 8-stelligem Kopplungscode\n- Nach dem ersten Passkey-Login wird die PIK **auf dem Account invalidiert** — ab dann läuft alles über den Passkey. Alte PIKs funktionieren solange, bis ein Passkey angelegt wurde.\n- Neue Tabellen: `xsyna_accounts`, `webauthn_credentials`, `webauthn_challenges`, `xsyna_pairings` (alle RLS-dicht, ausschließlich Server-Zugriff)\n\n## WorkTime\n- **Bugfix**: Attention-Check läuft nicht mehr im Hintergrund ab; pausiert bei Tab-Wechsel/PWA-Resume\n- **Admin-CRUD** für Schichten: HL 5+ kann Schichten anlegen, bearbeiten, löschen\n\n## Bewusst verschoben\n- SSO für Drittseiten mit `?target=`\n- „Sign in with xSyna" als OAuth-Provider für GitHub & Co.\n- SynAI Context Auth\n- Live-DB-Sync (Einmal-Export folgt im nächsten Turn)\n\n## Sicherheit\n- Neue Auth-Tabellen sind clientseitig gesperrt (RLS `USING (false)`), Zugriff nur über Server-Functions mit Superuser/HL-Prüfung\n- `pik_in_localstorage` / `pik_in_url_param` werden nach Passkey-Migration eines Accounts strukturell obsolet',
  true,
  'release',
  'authenticated',
  now()
)
ON CONFLICT (version) DO UPDATE SET
  title = EXCLUDED.title, notes_md = EXCLUDED.notes_md,
  published = true, kind = 'release', visibility = 'authenticated', published_at = now();
