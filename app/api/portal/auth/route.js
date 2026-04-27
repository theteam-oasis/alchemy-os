import { NextResponse } from 'next/server'

const TEAM_PASSWORD = process.env.TEAM_PASSWORD || 'alchemy2024'
const COOKIE_NAME = 'alchemy_portal_auth'

export async function POST(req) {
  const { password } = await req.json()

  if (password === TEAM_PASSWORD) {
    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE_NAME, password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    return res
  }

  return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
}
