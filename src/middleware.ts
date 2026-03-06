import { NextRequest, NextResponse } from 'next/server'
import { verifyPayload, PAYLOAD_COOKIE_NAME } from '@/shared/lib/session-payload'

/**
 * URL 패턴 → 필요한 permission code 매핑
 *
 * - 값이 null  : 로그인만 되어 있으면 누구나 접근 가능
 * - 값이 string: 해당 permission이 세션에 있어야 접근 가능
 *
 * 패턴은 위에서부터 첫 번째 매칭만 적용 (순서 중요)
 */
const ROUTE_PERMISSIONS: Array<{ pattern: RegExp; permission: string | null }> = [
  // 관리자 전용 페이지
  { pattern: /^\/admin\/users(\/.*)?$/, permission: 'admin:users' },
  { pattern: /^\/admin\/roles(\/.*)?$/, permission: 'admin:roles' },
  { pattern: /^\/admin\/logs(\/.*)?$/,  permission: 'admin:logs'  },

  // 디자인 페이지
  { pattern: /^\/design\/icons$/,       permission: 'design:icons'  },
  { pattern: /^\/design\/sample-page$/, permission: 'design:sample' },
  { pattern: /^\/design\/typography$/,  permission: 'design:typo'   },
  { pattern: /^\/design\/shadow$/,      permission: 'design:shadow' },

  // 대시보드 (로그인 사용자 전체)
  { pattern: /^\/$/, permission: 'dashboard:view' },
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isAuthPage = pathname.startsWith('/authentication')

  const sessionId  = req.cookies.get('session_id')?.value
  const rawPayload = req.cookies.get(PAYLOAD_COOKIE_NAME)?.value

  // ── 1. 비로그인 상태에서 보호 페이지 접근 → 로그인으로 리다이렉트
  if (!sessionId && !isAuthPage) {
    const loginUrl = new URL('/authentication/login', req.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── 2. 로그인 상태에서 인증 페이지 접근 → 대시보드로 리다이렉트
  if (sessionId && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // ── 3. 로그인 상태: 권한 검사
  if (sessionId) {
    // 매칭되는 라우트 규칙 찾기
    const rule = ROUTE_PERMISSIONS.find(({ pattern }) => pattern.test(pathname))

    if (rule && rule.permission !== null) {
      // 페이로드 쿠키가 없거나 검증 실패 → 세션 이상(탈취/만료) → 로그인으로
      const payload = rawPayload ? await verifyPayload(rawPayload) : null
      if (!payload) {
        const loginUrl = new URL('/authentication/login', req.url)
        return NextResponse.redirect(loginUrl)
      }

      // 필요한 permission이 없으면 403 페이지로
      if (!payload.permissions.includes(rule.permission)) {
        return NextResponse.redirect(new URL('/403', req.url))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images).*)'],
}
