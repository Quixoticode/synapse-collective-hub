
-- =========================
-- 1) EMPLOYEES: department + position
-- =========================
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS position text;

-- =========================
-- 2) APP VERSIONS (Update-Screen / News)
-- =========================
CREATE TABLE IF NOT EXISTS public.app_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  title text NOT NULL,
  notes_md text NOT NULL DEFAULT '',
  bugfix_ids text[] NOT NULL DEFAULT '{}',
  feature_ids text[] NOT NULL DEFAULT '{}',
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_versions TO authenticated;
GRANT ALL ON public.app_versions TO service_role;
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_versions_all_select ON public.app_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY app_versions_write ON public.app_versions FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TRIGGER trg_app_versions_updated BEFORE UPDATE ON public.app_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- 3) ROADMAP
-- =========================
CREATE TABLE IF NOT EXISTS public.roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','done','cancelled')),
  target_quarter text,
  sort_order int NOT NULL DEFAULT 0,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmap_items TO authenticated;
GRANT ALL ON public.roadmap_items TO service_role;
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY roadmap_select ON public.roadmap_items FOR SELECT TO authenticated USING (true);
CREATE POLICY roadmap_write ON public.roadmap_items FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER trg_roadmap_updated BEFORE UPDATE ON public.roadmap_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- 4) SUPPORT TICKETS + MESSAGES
-- =========================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opener_slid text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','resolved','closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assigned_slid text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY support_tickets_rw ON public.support_tickets FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER trg_support_tickets_updated BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_slid text NOT NULL,
  author_role text NOT NULL DEFAULT 'user' CHECK (author_role IN ('user','staff','system')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY support_messages_rw ON public.support_messages FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_messages(ticket_id, created_at);

-- =========================
-- 5) FINANCES
-- =========================
CREATE TABLE IF NOT EXISTS public.fin_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  iban text,
  bic text,
  currency text NOT NULL DEFAULT 'EUR',
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  archived boolean NOT NULL DEFAULT false,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_accounts TO authenticated;
GRANT ALL ON public.fin_accounts TO service_role;
ALTER TABLE public.fin_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_accounts_rw ON public.fin_accounts FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER trg_fin_accounts_updated BEFORE UPDATE ON public.fin_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.fin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.fin_accounts(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'EUR',
  booking_date date NOT NULL DEFAULT CURRENT_DATE,
  purpose text NOT NULL DEFAULT '',
  description text,
  counterparty text,
  counterparty_iban text,
  receipt_no text,
  category text,
  status text NOT NULL DEFAULT 'booked' CHECK (status IN ('planned','booked','cancelled')),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_transactions TO authenticated;
GRANT ALL ON public.fin_transactions TO service_role;
ALTER TABLE public.fin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY fin_transactions_rw ON public.fin_transactions FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER trg_fin_transactions_updated BEFORE UPDATE ON public.fin_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_fin_tx_account_date ON public.fin_transactions(account_id, booking_date DESC);

-- =========================
-- 6) TAB PERMISSIONS (admin) + TAB PREFS (self)
-- =========================
CREATE TABLE IF NOT EXISTS public.user_tab_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slid text NOT NULL,
  tab_key text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(slid, tab_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_tab_permissions TO authenticated;
GRANT ALL ON public.user_tab_permissions TO service_role;
ALTER TABLE public.user_tab_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_tab_permissions_rw ON public.user_tab_permissions FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.user_tab_prefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slid text NOT NULL,
  tab_key text NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  pinned boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(slid, tab_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_tab_prefs TO authenticated;
GRANT ALL ON public.user_tab_prefs TO service_role;
ALTER TABLE public.user_tab_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_tab_prefs_rw ON public.user_tab_prefs FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- =========================
-- 7) CALENDAR
-- =========================
CREATE TABLE IF NOT EXISTS public.cal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_slid text NOT NULL,
  title text NOT NULL,
  description text,
  location text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  visibility text NOT NULL DEFAULT 'team' CHECK (visibility IN ('private','team','all')),
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cal_events TO authenticated;
GRANT ALL ON public.cal_events TO service_role;
ALTER TABLE public.cal_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY cal_events_rw ON public.cal_events FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE TRIGGER trg_cal_events_updated BEFORE UPDATE ON public.cal_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS idx_cal_events_starts ON public.cal_events(starts_at);
