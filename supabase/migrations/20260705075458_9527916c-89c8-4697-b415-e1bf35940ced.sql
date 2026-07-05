
-- =========================================================
-- Juli-Update #5 "Neuromorphic Refresh"
-- =========================================================

-- 1) public_docs table
CREATE TABLE IF NOT EXISTS public.public_docs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'feature',
  body_md TEXT NOT NULL DEFAULT '',
  cover_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.public_docs TO anon, authenticated;
GRANT ALL ON public.public_docs TO service_role;

ALTER TABLE public.public_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_docs read published"
  ON public.public_docs FOR SELECT
  TO anon, authenticated
  USING (published = true);

CREATE POLICY "public_docs write service_role"
  ON public.public_docs FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_public_docs_updated
  BEFORE UPDATE ON public.public_docs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) app_versions: add kind + visibility
ALTER TABLE public.app_versions
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'release',
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'authenticated';

-- =========================================================
-- 3) Security hardening: replace over-broad policies.
-- All app reads go through server functions using supabaseAdmin
-- (service_role bypasses RLS), so tightening client access is safe.
-- Grant anon SELECT only for genuinely public data.
-- =========================================================

-- team_members: no direct client read
DROP POLICY IF EXISTS "team_members read all" ON public.team_members;
CREATE POLICY "team_members no direct read"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (false);

-- teams: no direct client read
DROP POLICY IF EXISTS "teams read all" ON public.teams;
CREATE POLICY "teams no direct read"
  ON public.teams FOR SELECT
  TO authenticated
  USING (false);

-- work_sessions: no direct client read
DROP POLICY IF EXISTS "work_sessions read all" ON public.work_sessions;
CREATE POLICY "work_sessions no direct read"
  ON public.work_sessions FOR SELECT
  TO authenticated
  USING (false);

-- work_shifts: no direct client read
DROP POLICY IF EXISTS "work_shifts read all" ON public.work_shifts;
CREATE POLICY "work_shifts no direct read"
  ON public.work_shifts FOR SELECT
  TO authenticated
  USING (false);

-- pdf_templates: no direct client read
DROP POLICY IF EXISTS "pdf_templates read all" ON public.pdf_templates;
CREATE POLICY "pdf_templates no direct read"
  ON public.pdf_templates FOR SELECT
  TO authenticated
  USING (false);

-- app_versions: only published + public visibility for anon;
-- server functions bypass with service_role
DROP POLICY IF EXISTS "app_versions_all_select" ON public.app_versions;
CREATE POLICY "app_versions read public"
  ON public.app_versions FOR SELECT
  TO anon, authenticated
  USING (published = true AND visibility = 'public');

GRANT SELECT ON public.app_versions TO anon;

-- roadmap_items: no direct client read
DROP POLICY IF EXISTS "roadmap_select" ON public.roadmap_items;
CREATE POLICY "roadmap no direct read"
  ON public.roadmap_items FOR SELECT
  TO authenticated
  USING (false);

-- apply_positions: keep anon SELECT for open positions,
-- drop the true-based write policies for authenticated
DROP POLICY IF EXISTS "auth insert positions" ON public.apply_positions;
DROP POLICY IF EXISTS "auth update positions" ON public.apply_positions;
DROP POLICY IF EXISTS "auth delete positions" ON public.apply_positions;
CREATE POLICY "apply_positions write service_role"
  ON public.apply_positions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- apply_applications: drop the true-based ALL for authenticated,
-- keep the anon INSERT policy for public submissions
DROP POLICY IF EXISTS "auth manage applications" ON public.apply_applications;
CREATE POLICY "apply_applications write service_role"
  ON public.apply_applications FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
