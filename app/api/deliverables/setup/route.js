import { supabase } from '@/lib/supabase'

// Run this endpoint once to create the deliverables table
// GET /api/deliverables/setup
export async function GET() {
  if (!supabase) {
    return Response.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    // Try creating the table via RPC or raw SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS deliverables (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          slug text UNIQUE NOT NULL,
          client_name text NOT NULL,
          project_description text DEFAULT '',
          total_deliverables integer DEFAULT 0,
          static_urls jsonb DEFAULT '[]'::jsonb,
          video_links jsonb DEFAULT '[]'::jsonb,
          package_name text DEFAULT '',
          delivery_date date,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_deliverables_slug ON deliverables(slug);
      `
    })

    if (error) {
      // If RPC doesn't exist, return the SQL for manual execution
      return Response.json({
        message: 'Run this SQL in Supabase SQL Editor to create the table:',
        sql: `
CREATE TABLE IF NOT EXISTS deliverables (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  client_name text NOT NULL,
  project_description text DEFAULT '',
  total_deliverables integer DEFAULT 0,
  static_urls jsonb DEFAULT '[]'::jsonb,
  video_links jsonb DEFAULT '[]'::jsonb,
  package_name text DEFAULT '',
  delivery_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliverables_slug ON deliverables(slug);

-- Enable RLS
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Allow public read" ON deliverables FOR SELECT USING (true);

-- Allow authenticated insert/update
CREATE POLICY "Allow insert" ON deliverables FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON deliverables FOR UPDATE USING (true);
        `.trim(),
        rpc_error: error.message,
      })
    }

    return Response.json({ success: true, message: 'Table created' })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
