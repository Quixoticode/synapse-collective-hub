
-- Employees (Kollektiv): mitgliederverwaltung mit Hierarchie-Level
CREATE TABLE public.employees (
  slid TEXT PRIMARY KEY,
  hl INTEGER NOT NULL CHECK (hl >= 1 AND hl <= 7),
  regid TEXT NOT NULL,
  name TEXT NOT NULL,
  pik TEXT NOT NULL,
  cip TEXT NOT NULL,
  kwn TEXT,
  kwn_active BOOLEAN NOT NULL DEFAULT false,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
-- Direct client access denied; all CRUD goes through server functions with SLID-based auth
CREATE POLICY "deny_all_employees" ON public.employees FOR ALL USING (false) WITH CHECK (false);

-- CRM Kontakte
CREATE TABLE public.crm_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_slid TEXT NOT NULL REFERENCES public.employees(slid) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'lead',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_data TO authenticated;
GRANT ALL ON public.crm_data TO service_role;
ALTER TABLE public.crm_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_crm" ON public.crm_data FOR ALL USING (false) WITH CHECK (false);

CREATE INDEX idx_crm_owner ON public.crm_data(owner_slid);
CREATE INDEX idx_crm_status ON public.crm_data(status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_employees_updated BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_crm_updated BEFORE UPDATE ON public.crm_data
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
