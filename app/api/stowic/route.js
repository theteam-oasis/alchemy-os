import { db } from '@vercel/postgres'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const client = await db.connect()
    await client.query(`
      CREATE TABLE IF NOT EXISTS stowic_brief (
        id INTEGER PRIMARY KEY,
        data TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)
    const { rows } = await client.query('SELECT data FROM stowic_brief WHERE id = 1')
    client.release()
    if (!rows.length) return Response.json({ data: null })
    return Response.json({ data: JSON.parse(rows[0].data) })
  } catch (e) {
    console.error('GET error:', e.message)
    return Response.json({ data: null })
  }
}

export async function POST(request) {
  try {
    const client = await db.connect()
    await client.query(`
      CREATE TABLE IF NOT EXISTS stowic_brief (
        id INTEGER PRIMARY KEY,
        data TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)
    const data = await request.json()
    const json = JSON.stringify(data)
    await client.query(
      `INSERT INTO stowic_brief (id, data, updated_at)
       VALUES (1, $1, NOW())
       ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW()`,
      [json]
    )
    client.release()
    return Response.json({ ok: true })
  } catch (e) {
    console.error('POST error:', e.message)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
