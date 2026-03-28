// app/api/stowic/route.js
import { sql } from '@vercel/postgres'

export const runtime = 'nodejs'

// Create table on first run
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS stowic_brief (
      id INTEGER PRIMARY KEY,
      data TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `
}

export async function GET() {
  try {
    await ensureTable()
    const { rows } = await sql`SELECT data FROM stowic_brief WHERE id = 1`
    if (!rows.length) return Response.json({ data: null })
    return Response.json({ data: JSON.parse(rows[0].data) })
  } catch (e) {
    console.error('GET error:', e.message)
    return Response.json({ data: null })
  }
}

export async function POST(request) {
  try {
    await ensureTable()
    const data = await request.json()
    const json = JSON.stringify(data)
    await sql`
      INSERT INTO stowic_brief (id, data, updated_at)
      VALUES (1, ${json}, NOW())
      ON CONFLICT (id) DO UPDATE SET data = ${json}, updated_at = NOW()
    `
    return Response.json({ ok: true })
  } catch (e) {
    console.error('POST error:', e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
