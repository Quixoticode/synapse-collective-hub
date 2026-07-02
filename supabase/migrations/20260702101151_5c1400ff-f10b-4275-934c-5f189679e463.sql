
-- apply_positions
CREATE TABLE public.apply_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department text NOT NULL,
  team text,
  position text NOT NULL,
  hl_max int NOT NULL DEFAULT 3,
  description text,
  open boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.apply_positions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apply_positions TO authenticated;
GRANT ALL ON public.apply_positions TO service_role;
ALTER TABLE public.apply_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read open positions" ON public.apply_positions FOR SELECT USING (true);
CREATE POLICY "auth insert positions" ON public.apply_positions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update positions" ON public.apply_positions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete positions" ON public.apply_positions FOR DELETE TO authenticated USING (true);
CREATE TRIGGER apply_positions_updated BEFORE UPDATE ON public.apply_positions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- apply_applications
CREATE TABLE public.apply_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id uuid REFERENCES public.apply_positions(id) ON DELETE SET NULL,
  applicant_name text NOT NULL,
  contact text,
  wish text,
  note text,
  status text NOT NULL DEFAULT 'new',
  source text NOT NULL DEFAULT 'anon', -- 'anon' | 'employee'
  created_by_slid text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.apply_applications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apply_applications TO authenticated;
GRANT ALL ON public.apply_applications TO service_role;
ALTER TABLE public.apply_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon insert application" ON public.apply_applications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "auth manage applications" ON public.apply_applications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER apply_applications_updated BEFORE UPDATE ON public.apply_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- quick_login_codes (server-only)
CREATE TABLE public.quick_login_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slid text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  issued_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.quick_login_codes TO service_role;
ALTER TABLE public.quick_login_codes ENABLE ROW LEVEL SECURITY;
-- no policies: only service_role via server functions
CREATE INDEX quick_login_codes_slid_idx ON public.quick_login_codes(slid, used, expires_at);
