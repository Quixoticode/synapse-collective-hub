
-- =========================================================================
-- ROLES
-- =========================================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('superuser','admin','mitarbeiter','partner','kunde');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.employee_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slid text NOT NULL REFERENCES public.employees(slid) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(slid, role)
);
GRANT SELECT ON public.employee_roles TO authenticated;
GRANT ALL ON public.employee_roles TO service_role;
ALTER TABLE public.employee_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_all_employee_roles ON public.employee_roles FOR ALL USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.has_role(_slid text, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.employee_roles WHERE slid = _slid AND role = _role);
$$;

-- Seed Jake as superuser
INSERT INTO public.employee_roles (slid, role) VALUES ('20090626','superuser')
ON CONFLICT (slid, role) DO NOTHING;

-- =========================================================================
-- CHAT
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  is_group boolean NOT NULL DEFAULT false,
  created_by text NOT NULL REFERENCES public.employees(slid) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated;
GRANT ALL ON public.chat_threads TO service_role;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_all_chat_threads ON public.chat_threads FOR ALL USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.chat_members (
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  slid text NOT NULL REFERENCES public.employees(slid) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, slid)
);
GRANT SELECT, INSERT, DELETE ON public.chat_members TO authenticated;
GRANT ALL ON public.chat_members TO service_role;
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_all_chat_members ON public.chat_members FOR ALL USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_slid text NOT NULL REFERENCES public.employees(slid) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_all_chat_messages ON public.chat_messages FOR ALL USING (false) WITH CHECK (false);
CREATE INDEX IF NOT EXISTS chat_messages_thread_idx ON public.chat_messages(thread_id, created_at DESC);

-- =========================================================================
-- VAULT (verschlüsselte Passwörter)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.vault_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_slid text NOT NULL REFERENCES public.employees(slid) ON DELETE CASCADE,
  label text NOT NULL,
  url text,
  username text,
  secret_enc text NOT NULL,
  secret_iv text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vault_entries TO authenticated;
GRANT ALL ON public.vault_entries TO service_role;
ALTER TABLE public.vault_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_all_vault_entries ON public.vault_entries FOR ALL USING (false) WITH CHECK (false);
CREATE TRIGGER vault_entries_set_updated_at BEFORE UPDATE ON public.vault_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- SYNMAIL
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.mail_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slid text NOT NULL REFERENCES public.employees(slid) ON DELETE CASCADE,
  address text NOT NULL UNIQUE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mail_accounts TO authenticated;
GRANT ALL ON public.mail_accounts TO service_role;
ALTER TABLE public.mail_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_all_mail_accounts ON public.mail_accounts FOR ALL USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.mail_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.mail_accounts(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  from_addr text NOT NULL,
  to_addrs text[] NOT NULL DEFAULT '{}',
  cc_addrs text[] NOT NULL DEFAULT '{}',
  subject text,
  body_text text,
  body_html text,
  received_at timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  provider_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mail_messages TO authenticated;
GRANT ALL ON public.mail_messages TO service_role;
ALTER TABLE public.mail_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_all_mail_messages ON public.mail_messages FOR ALL USING (false) WITH CHECK (false);
CREATE INDEX IF NOT EXISTS mail_messages_account_idx ON public.mail_messages(account_id, created_at DESC);

-- =========================================================================
-- WORKSPACE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.workspace_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content_md text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  visibility text NOT NULL DEFAULT 'team' CHECK (visibility IN ('private','team','all')),
  owner_slid text NOT NULL REFERENCES public.employees(slid) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_docs TO authenticated;
GRANT ALL ON public.workspace_docs TO service_role;
ALTER TABLE public.workspace_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_all_workspace_docs ON public.workspace_docs FOR ALL USING (false) WITH CHECK (false);
CREATE TRIGGER workspace_docs_set_updated_at BEFORE UPDATE ON public.workspace_docs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- xSYNA BASICS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.basics_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'info' CHECK (kind IN ('rule','agb','contract','info')),
  body_md text NOT NULL DEFAULT '',
  file_url text,
  pinned boolean NOT NULL DEFAULT false,
  updated_by text REFERENCES public.employees(slid) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.basics_docs TO authenticated;
GRANT ALL ON public.basics_docs TO service_role;
ALTER TABLE public.basics_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY deny_all_basics_docs ON public.basics_docs FOR ALL USING (false) WITH CHECK (false);
CREATE TRIGGER basics_docs_set_updated_at BEFORE UPDATE ON public.basics_docs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.basics_docs (slug,title,kind,body_md,pinned) VALUES
  ('willkommen','Willkommen im xSyna-Kollektiv','info','# Willkommen\n\nDieses Modul enthält alle wichtigen Unterlagen, Regeln und Verträge des Kollektivs.',true),
  ('agb','Allgemeine Geschäftsbedingungen','agb','# AGB\n\n*Platzhalter — durch HL≥5/Superuser zu pflegen.*',true),
  ('kollektiv-regeln','Kollektiv-Regeln','rule','# Regeln\n\n1. Vertraulichkeit wahren.\n2. SynID nie weitergeben.\n3. PIK bleibt geheim.',true)
ON CONFLICT (slug) DO NOTHING;
