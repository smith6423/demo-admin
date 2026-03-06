import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import speakeasy from 'speakeasy'
import { prisma, createSession, setSessionCookie, setPayloadCookie } from '@/shared/lib'
import { decryptSecret } from '@/shared/lib/crypto'
import { incrementFailure, isBlocked, resetFailures } from '@/shared/lib/bruteforce'
import { loginSchema } from '@/shared/lib/schemas'

// ISMS: 비밀번호 실패 잠금 임계값
const PW_FAIL_LIMIT = 5
const PW_FAIL_WINDOW = 15 * 60 // 15분

// IP 기반 차단: 동일 IP에서 과도한 시도 → 크리덴셜 스터핑 방어
const IP_FAIL_LIMIT = 20       // IP당 허용 실패 횟수 (여러 계정 시도 고려)
const IP_FAIL_WINDOW = 15 * 60 // 15분

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

async function writeAccessLog(params: {
  userId?: string
  email: string
  action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'ACCOUNT_LOCKED' | 'PASSWORD_CHANGED' | 'SESSION_EXPIRED'
  success: boolean
  ipAddress?: string
  userAgent?: string
}) {
  try {
    await prisma.accessLog.create({ data: params })
  } catch (e) {
    console.error('[accessLog] write error:', e)
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const userAgent = req.headers.get('user-agent') ?? undefined

  try {
    const body = await req.json()
    const { otp } = body

    // Zod로 email/password 형식 검증 (OTP는 별도 처리)
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.'
      return NextResponse.json({ message }, { status: 400 })
    }
    const { email, password } = parsed.data

    // IP 기반 차단 확인 (크리덴셜 스터핑 방어 — 계정 조회 전 선제 차단)
    const ipFailKey = `pw_fail_ip:${ip}`
    if (await isBlocked(ipFailKey, IP_FAIL_LIMIT)) {
      return NextResponse.json({ message: '로그인 실패' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    })

    // ISMS: 계정 미존재 / 비활성 / 삭제 — 동일 메시지로 통합 (계정 열거 방지)
    if (!user || !user.isActive || user.deletedAt) {
      // 존재하지 않는 계정 시도도 IP 카운터에 반영
      await incrementFailure(ipFailKey, IP_FAIL_WINDOW)
      await writeAccessLog({ email, action: 'LOGIN_FAILED', success: false, ipAddress: ip, userAgent })
      return NextResponse.json({ message: '로그인 실패' }, { status: 401 })
    }

    // ISMS: DB 계정 잠금 확인 (5회 실패 누적 또는 장기 미사용 90일)
    if (user.lockedAt) {
      await writeAccessLog({ userId: user.id, email, action: 'ACCOUNT_LOCKED', success: false, ipAddress: ip, userAgent })
      return NextResponse.json({ message: '로그인 실패' }, { status: 401 })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      // IP 카운터 증가 (크리덴셜 스터핑 방어)
      await incrementFailure(ipFailKey, IP_FAIL_WINDOW)

      // 계정별 실패 횟수 DB에 누적 (ISMS: 5회 실패 시 계정 잠금)
      const newFailCount = user.loginFailCount + 1
      const shouldLock = newFailCount >= PW_FAIL_LIMIT
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginFailCount: newFailCount,
          lockedAt: shouldLock ? new Date() : undefined,
        },
      })

      const action = shouldLock ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED'
      await writeAccessLog({ userId: user.id, email, action, success: false, ipAddress: ip, userAgent })
      return NextResponse.json({ message: '로그인 실패' }, { status: 401 })
    }

    // 비밀번호 성공 시 실패 카운터 초기화
    await prisma.user.update({
      where: { id: user.id },
      data: { loginFailCount: 0, lockedAt: null },
    })

    // 2FA 플로우
    if (user.isTwoFactorEnabled) {
      const otpFailKey = `otp_fail_user:${user.id}`
      if (await isBlocked(otpFailKey)) {
        await writeAccessLog({ userId: user.id, email, action: 'ACCOUNT_LOCKED', success: false, ipAddress: ip, userAgent })
        return NextResponse.json({ message: '로그인 실패' }, { status: 401 })
      }

      if (!otp) {
        return NextResponse.json({ requiresOtp: true })
      }

      try {
        const secret = user.totpSecret ? decryptSecret(user.totpSecret) : ''
        const verified = speakeasy.totp.verify({
          secret: secret || '',
          encoding: 'base32',
          token: String(otp),
          window: 1,
        })

        if (!verified) {
          await incrementFailure(ipFailKey, IP_FAIL_WINDOW)
          const cnt = await incrementFailure(otpFailKey)
          if (cnt >= PW_FAIL_LIMIT) {
            await prisma.user.update({
              where: { id: user.id },
              data: { loginFailCount: cnt, lockedAt: new Date() },
            })
            await writeAccessLog({ userId: user.id, email, action: 'ACCOUNT_LOCKED', success: false, ipAddress: ip, userAgent })
          } else {
            await writeAccessLog({ userId: user.id, email, action: 'LOGIN_FAILED', success: false, ipAddress: ip, userAgent })
          }
          return NextResponse.json({ message: '로그인 실패' }, { status: 401 })
        }
        await resetFailures(otpFailKey)
      } catch (e) {
        console.error('[login] OTP verify error:', e)
        return NextResponse.json({ message: '로그인 실패' }, { status: 401 })
      }
    } else {
      return NextResponse.json({ needsOtpRegistration: true })
    }

    // GUEST 역할은 관리자 승인(역할 변경) 전까지 로그인 차단
    if (user.role.name === 'GUEST') {
      await writeAccessLog({ userId: user.id, email, action: 'LOGIN_FAILED', success: false, ipAddress: ip, userAgent })
      return NextResponse.json({ guestBlocked: true }, { status: 403 })
    }

    // ISMS: lastLoginAt 업데이트
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // 역할에 할당된 Permission code 목록 로드 → 세션에 포함
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { roleId: user.roleId },
      include: { permission: { select: { code: true } } },
    })
    const permissions = rolePermissions.map((rp) => rp.permission.code)

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
      permissions,
    }

    const sessionId = await createSession(user.id, sessionUser)
    await setSessionCookie(sessionId)
    // 미들웨어 권한 체크용 페이로드 쿠키 (HMAC 서명)
    await setPayloadCookie({ role: sessionUser.role, permissions })

    // ISMS: 로그인 성공 로그 기록
    await writeAccessLog({ userId: user.id, email, action: 'LOGIN', success: true, ipAddress: ip, userAgent })

    // ISMS: 초기 비밀번호 또는 90일 만료 강제 변경
    const pwChangedAt = user.passwordChangedAt ?? user.createdAt
    const daysSinceChange = (Date.now() - pwChangedAt.getTime()) / (1000 * 60 * 60 * 24)
    const passwordExpired = daysSinceChange >= 90

    return NextResponse.json({
      user: sessionUser,
      mustChangePassword: user.mustChangePassword || passwordExpired,
    }, { status: 200 })

  } catch (error) {
    console.error('[login] error:', error)
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
