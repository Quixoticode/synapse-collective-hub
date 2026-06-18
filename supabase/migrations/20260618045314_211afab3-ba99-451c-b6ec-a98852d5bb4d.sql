CREATE TABLE public.syn_external_configs (
  key text PRIMARY KEY,
  label text NOT NULL,
  supabase_url text NOT NULL,
  anon_key text NOT NULL,
  service_key text,
  notes text,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.syn_external_configs TO authenticated;
GRANT ALL ON public.syn_external_configs TO service_role;
ALTER TABLE public.syn_external_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny all" ON public.syn_external_configs FOR ALL USING (false) WITH CHECK (false);

CREATE TRIGGER syn_external_configs_set_updated_at
  BEFORE UPDATE ON public.syn_external_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.syn_external_configs (key, label, supabase_url, anon_key, notes, updated_by)
VALUES (
  'synid',
  'SynID Gateway',
  'https://dyhyqgtvmkgsycwvwrfl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5aHlxZ3R2bWtnc3ljd3Z3cmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwOTU5MTYsImV4cCI6MjA5NjY3MTkxNn0.aYXhmhfnyA3MQfYQ41Dbi8C61oV3zI01ysLtZvPBQLY',
  'BETA — service_key kann optional in den Integrations-Settings ergänzt werden.',
  '20090626'
);