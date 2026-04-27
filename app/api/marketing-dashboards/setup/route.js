import { supabase } from '@/lib/supabase'

export async function GET() {
  if (!supabase) {
    return Response.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const sql = `
CREATE TABLE IF NOT EXISTS marketing_dashboards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  title text DEFAULT '',
  description text DEFAULT '',
  file_name text DEFAULT '',
  headers jsonb DEFAULT '[]'::jsonb,
  rows jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_dashboards_slug ON marketing_dashboards(slug);
CREATE INDEX IF NOT EXISTS idx_marketing_dashboards_client_id ON marketing_dashboards(client_id);

ALTER TABLE marketing_dashboards ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='marketing_dashboards' AND policyname='md_public_read') THEN
    CREATE POLICY "md_public_read" ON marketing_dashboards FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='marketing_dashboards' AND policyname='md_insert') THEN
    CREATE POLICY "md_insert" ON marketing_dashboards FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='marketing_dashboards' AND policyname='md_update') THEN
    CREATE POLICY "md_update" ON marketing_dashboards FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='marketing_dashboards' AND policyname='md_delete') THEN
    CREATE POLICY "md_delete" ON marketing_dashboards FOR DELETE USING (true);
  END IF;
END $$;
  `.trim()

  try {
    const { error } = await supabase.rpc('exec_sql', { sql })
    if (error) {
      return Response.json({
        message: 'Run this SQL in the Supabase SQL Editor:',
        sql,
        rpc_error: error.message,
      })
    }
    return Response.json({ success: true, message: 'Table created' })
  } catch (err) {
    return Response.json({
      message: 'Run this SQL in the Supabase SQL Editor:',
      sql,
      rpc_error: err.message,
    })
  }
}
