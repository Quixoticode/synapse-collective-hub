-- Auftraege (Orders/Todos) table for workspace feature
CREATE TABLE IF NOT EXISTS auftraege (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  creator_slid TEXT NOT NULL,
  assigned_slid TEXT,
  share_token TEXT NOT NULL UNIQUE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auftraege_status ON auftraege(status);
CREATE INDEX IF NOT EXISTS idx_auftraege_creator ON auftraege(creator_slid);
CREATE INDEX IF NOT EXISTS idx_auftraege_assigned ON auftraege(assigned_slid);
CREATE INDEX IF NOT EXISTS idx_auftraege_token ON auftraege(share_token);
CREATE INDEX IF NOT EXISTS idx_auftraege_updated ON auftraege(updated_at DESC);

ALTER TABLE auftraege ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auftraege_select_all" ON auftraege FOR SELECT USING (true);
CREATE POLICY "auftraege_insert_own" ON auftraege FOR INSERT WITH CHECK (true);
CREATE POLICY "auftraege_update_own" ON auftraege FOR UPDATE USING (true);
CREATE POLICY "auftraege_delete_own" ON auftraege FOR DELETE USING (true);
