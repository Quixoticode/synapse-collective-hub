
-- Normalize any existing status not in the allowed set
UPDATE public.apply_applications SET status = 'pending'
 WHERE status IS NULL OR status NOT IN ('pending','accepted','rejected','hired');

-- Teams
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'department' CHECK (kind IN ('service','support','labs','department')),
  department TEXT,
  description TEXT,
  leader_slid TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
GRANT SELECT ON public.teams TO anon;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teams read all" ON public.teams FOR SELECT USING (true);
CREATE POLICY "teams write service_role" ON public.teams FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  slid TEXT NOT NULL,
  role TEXT,
  hl_at_join INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, slid)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_members read all" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "team_members write service_role" ON public.team_members FOR ALL TO service_role USING (true) WITH CHECK (true);

-- PDF templates
CREATE TABLE IF NOT EXISTS public.pdf_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'generic' CHECK (kind IN ('contract','invoice','offer','confirmation','generic')),
  html TEXT NOT NULL,
  css TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pdf_templates TO authenticated;
GRANT ALL ON public.pdf_templates TO service_role;
ALTER TABLE public.pdf_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdf_templates read all" ON public.pdf_templates FOR SELECT USING (true);
CREATE POLICY "pdf_templates write service_role" ON public.pdf_templates FOR ALL TO service_role USING (true) WITH CHECK (true);

-- apply_applications: expand status check
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'apply_applications_status_check' AND table_name = 'apply_applications') THEN
    ALTER TABLE public.apply_applications DROP CONSTRAINT apply_applications_status_check;
  END IF;
END $$;
ALTER TABLE public.apply_applications
  ADD CONSTRAINT apply_applications_status_check
  CHECK (status IN ('pending','accepted','rejected','hired'));

-- updated_at triggers
CREATE TRIGGER teams_set_updated BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER pdf_templates_set_updated BEFORE UPDATE ON public.pdf_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
