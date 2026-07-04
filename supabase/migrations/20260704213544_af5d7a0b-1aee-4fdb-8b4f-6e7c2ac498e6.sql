
-- Teams: entkernen (kind/department raus, parent + min_hl rein)
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_kind_check;
ALTER TABLE public.teams DROP COLUMN IF EXISTS kind;
ALTER TABLE public.teams DROP COLUMN IF EXISTS department;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS min_hl int;

-- WorkTime: geplante Schichten
CREATE TABLE public.work_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slid text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  note text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_shifts TO authenticated;
GRANT ALL ON public.work_shifts TO service_role;
ALTER TABLE public.work_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work_shifts read all" ON public.work_shifts FOR SELECT USING (true);
CREATE POLICY "work_shifts write service_role" ON public.work_shifts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER work_shifts_set_updated BEFORE UPDATE ON public.work_shifts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- WorkTime: tatsächliche Arbeitszeit-Sessions
CREATE TABLE public.work_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slid text NOT NULL,
  shift_id uuid REFERENCES public.work_shifts(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  last_ping_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active',
  invalidated_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_sessions_status_check CHECK (status IN ('active','completed','invalidated'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_sessions TO authenticated;
GRANT ALL ON public.work_sessions TO service_role;
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work_sessions read all" ON public.work_sessions FOR SELECT USING (true);
CREATE POLICY "work_sessions write service_role" ON public.work_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER work_sessions_set_updated BEFORE UPDATE ON public.work_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX work_sessions_slid_started_idx ON public.work_sessions(slid, started_at DESC);
CREATE INDEX work_sessions_active_idx ON public.work_sessions(slid) WHERE status = 'active';
