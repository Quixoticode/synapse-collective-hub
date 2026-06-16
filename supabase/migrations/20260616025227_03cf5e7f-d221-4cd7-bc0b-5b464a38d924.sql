
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'mitarbeiter'
  CHECK (kind IN ('mitarbeiter','partner','kunde'));
CREATE INDEX IF NOT EXISTS employees_kind_idx ON public.employees(kind);
