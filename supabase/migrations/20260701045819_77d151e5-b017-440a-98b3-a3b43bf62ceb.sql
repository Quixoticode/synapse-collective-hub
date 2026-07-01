
CREATE TABLE public.login_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slid TEXT NOT NULL, ok BOOLEAN NOT NULL DEFAULT true,
  ip TEXT, user_agent TEXT, device_model TEXT, os TEXT, method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.login_events TO authenticated;
GRANT ALL ON public.login_events TO service_role;
ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "login_events_deny_all" ON public.login_events FOR ALL USING (false) WITH CHECK (false);
CREATE INDEX login_events_slid_idx ON public.login_events (slid, created_at DESC);

CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slid TEXT NOT NULL, device_fingerprint TEXT NOT NULL,
  device_model TEXT, os TEXT, ip TEXT, user_agent TEXT,
  trusted BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slid, device_fingerprint)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_sessions TO service_role;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_sessions_deny_all" ON public.user_sessions FOR ALL USING (false) WITH CHECK (false);
CREATE INDEX user_sessions_slid_idx ON public.user_sessions (slid);

CREATE TABLE public.user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slid TEXT NOT NULL, message TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT true,
  banned_by TEXT, expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_bans TO authenticated;
GRANT ALL ON public.user_bans TO service_role;
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_bans_deny_all" ON public.user_bans FOR ALL USING (false) WITH CHECK (false);
CREATE INDEX user_bans_slid_active_idx ON public.user_bans (slid) WHERE active = true;

CREATE TABLE public.support_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, code_hash TEXT NOT NULL,
  ticket_id UUID, closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_accounts TO authenticated;
GRANT ALL ON public.support_accounts TO service_role;
ALTER TABLE public.support_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "support_accounts_deny_all" ON public.support_accounts FOR ALL USING (false) WITH CHECK (false);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, description TEXT,
  assignee_slid TEXT NOT NULL, creator_slid TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_deny_all" ON public.tasks FOR ALL USING (false) WITH CHECK (false);
CREATE INDEX tasks_assignee_idx ON public.tasks (assignee_slid, status);
CREATE TRIGGER tasks_touch BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_prefs (
  slid TEXT PRIMARY KEY,
  design_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  notify_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_prefs TO authenticated;
GRANT ALL ON public.user_prefs TO service_role;
ALTER TABLE public.user_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_prefs_deny_all" ON public.user_prefs FOR ALL USING (false) WITH CHECK (false);
CREATE TRIGGER user_prefs_touch BEFORE UPDATE ON public.user_prefs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slid TEXT NOT NULL, endpoint TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (endpoint)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_subs_deny_all" ON public.push_subscriptions FOR ALL USING (false) WITH CHECK (false);
CREATE INDEX push_subs_slid_idx ON public.push_subscriptions (slid);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_slid TEXT NOT NULL,
  title TEXT NOT NULL, body TEXT, url TEXT,
  source TEXT NOT NULL DEFAULT 'custom',
  sender_slid TEXT, read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_deny_all" ON public.notifications FOR ALL USING (false) WITH CHECK (false);
CREATE INDEX notif_recipient_idx ON public.notifications (recipient_slid, created_at DESC);

INSERT INTO public.app_versions (version, title, notes_md, bugfix_ids, feature_ids, published, published_at)
VALUES (
  'v2026.07.01',
  'Juli-Update: Service-Worker, Security, Tasks & mehr',
  '## Juli-Update

**Bugfixes**
- Speichern-Button auf Handys immer erreichbar (Kollektiv/Kontakte)
- Workspace, Chat & Co. auf iOS mit Subpage-Mechanik
- Mitarbeiter editieren ohne CIP/PIK erneut einzutippen

**Neue Features**
- **Security-Tab**: Login-Historie, Geräte, temporäre Bans mit Nachricht
- **Support-Accounts**: Login mit Name + 6-stelligem Code (kein SynID)
- **Tasks-Tab**: Aufgaben zuweisen
- **Vertrags-PDF-Export** aus Workspace (HTML-Design)
- **Trusted Devices**: einmal einloggen, Gerät registrieren, kein PIK mehr
- **Neuromorphic-Liquid** animierter Hintergrund
- **Design-Tab (BETA)**
- **Notify-Tab** + Service-Worker mit Push-Benachrichtigungen',
  ARRAY['A-21062601','A-21062602','A-01072601'],
  ARRAY['security','support-accounts','tasks','contract-pdf','trusted-devices','neuromorphic-bg','design-beta','notify-sw'],
  true,
  now()
);
