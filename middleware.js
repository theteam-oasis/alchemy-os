import { NextResponse } from 'next/server'

const TEAM_PASSWORD = process.env.TEAM_PASSWORD || 'alchemy2024'
const COOKIE_NAME = 'alchemy_portal_auth'

// Team-only paths require the universal team password (set via cookie).
// Anything not in this list is publicly reachable - including the client-facing
// hub `/client/[slug]`, the creatives review portal `/portal/[slug]`, marketing
// dashboards, proposals, mood boards, etc.
const TEAM_PREFIXES = [
  '/dashboard',
  '/clients',           // /clients and /clients/[uuid]
  '/team',              // /team/[slug]
  // /brand-intake is intentionally NOT team-only - the client portal embeds it
  // so clients can fill in their own Brand DNA. Access still requires a valid
  // clientId in the query string (the form scopes saves to that row).
  '/marketing/create',
  '/deliverables/create',
  '/proposal/create',
  '/mood-board/create',
  '/sample-brief',
  '/storyboard-builder',
  '/auto-brief',
  '/campaign-builder',
  '/potential-energy',
  '/stowic-video-brief',
  '/samples',
]

// Within /portal/*, only /portal (the manager) and /portal/create (the editor)
// are team-only. /portal/[slug] is the client review surface and is public.
function isTeamPath(pathname) {
  if (pathname === '/portal') return true
  if (pathname.startsWith('/portal/create')) return true
  return TEAM_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export function middleware(request) {
  const { pathname } = request.nextUrl

  if (!isTeamPath(pathname)) return NextResponse.next()
  if (pathname === '/portal/login') return NextResponse.next()

  const authCookie = request.cookies.get(COOKIE_NAME)
  if (authCookie?.value === TEAM_PASSWORD) return NextResponse.next()

  // Redirect to portal login with redirect query so they land back here after
  const loginUrl = new URL('/portal/login', request.url)
  loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  // Match every team path. The function above filters by exact prefix.
  matcher: [
    '/dashboard/:path*',
    '/clients/:path*',
    '/team/:path*',
    '/portal/:path*',
    // '/brand-intake/:path*' removed - now public so clients can fill it
    '/marketing/create/:path*',
    '/deliverables/create/:path*',
    '/proposal/create/:path*',
    '/mood-board/create/:path*',
    '/sample-brief/:path*',
    '/storyboard-builder/:path*',
    '/auto-brief/:path*',
    '/campaign-builder/:path*',
    '/potential-energy/:path*',
    '/stowic-video-brief/:path*',
    '/samples/:path*',
  ],
}
