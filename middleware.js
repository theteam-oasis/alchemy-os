import { NextResponse } from 'next/server'

const TEAM_PASSWORD = process.env.TEAM_PASSWORD || 'alchemy2024'
const COOKIE_NAME = 'alchemy_portal_auth'

// Only these portal paths require auth (team-only)
const PROTECTED = ['/portal', '/portal/create']

export function middleware(request) {
  const { pathname } = request.nextUrl

  // Only apply to portal team pages
  const isProtected = PROTECTED.some(p => pathname === p || pathname.startsWith('/portal/create'))

  if (!isProtected) return NextResponse.next()

  // Don't protect login page
  if (pathname === '/portal/login') return NextResponse.next()

  // Check auth cookie
  const authCookie = request.cookies.get(COOKIE_NAME)
  if (authCookie?.value === TEAM_PASSWORD) return NextResponse.next()

  // Redirect to portal login
  const loginUrl = new URL('/portal/login', request.url)
  loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/portal/:path*'],
}
