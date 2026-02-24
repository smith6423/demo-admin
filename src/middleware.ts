import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const sessionId = req.cookies.get('session_id')?.value
  const isAuthPage = req.nextUrl.pathname.startsWith('/authentication')

  if (!sessionId && !isAuthPage) {
    return NextResponse.redirect(new URL('/authentication/login', req.url))
  }
  if (sessionId && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
