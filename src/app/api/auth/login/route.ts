import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import speakeasy from 'speakeasy'
import { prisma, createSession, setSessionCookie } from '@/shared/lib'
import { decryptSecret } from '@/shared/lib/crypto'
import { incrementFailure, isBlocked, resetFailures } from '@/shared/lib/bruteforce'

export async function POST(req: NextRequest) {
  try {
    const { email, password, otp } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ message: '이메일과 비밀번호를 입력하세요.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    })

    if (!user || !user.isActive || user.deletedAt) {
      return NextResponse.json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 })
    }

    // Handle 2FA flows:
    if ((user as any).isTwoFactorEnabled) {
      // user has TOTP enabled — require OTP to create session
      const failKey = `otp_fail_user:${user.id}`
      if (await isBlocked(failKey)) return NextResponse.json({ message: 'Too many attempts, try later.' }, { status: 429 })

      if (!otp) {
        return NextResponse.json({ requiresOtp: true })
      }

      try {
        const encrypted = (user as any).totpSecret
        const secret = encrypted ? decryptSecret(encrypted) : ''
        const verified = speakeasy.totp.verify({ secret: secret || '', encoding: 'base32', token: String(otp), window: 1 })
        if (!verified) {
          const cnt = await incrementFailure(failKey)
          const msg = cnt >= 5 ? 'Too many attempts, try later.' : '유효하지 않은 OTP 코드입니다.'
          return NextResponse.json({ message: msg }, { status: 401 })
        }
        await resetFailures(failKey)
      } catch (e) {
        console.error('OTP verify error', e)
        return NextResponse.json({ message: '유효하지 않은 OTP 코드입니다.' }, { status: 401 })
      }
    } else {
      // user does not have TOTP configured — tell client to show registration option
      return NextResponse.json({ needsOtpRegistration: true })
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name,
    }

    const sessionId = await createSession(user.id, sessionUser)
    await setSessionCookie(sessionId)

    return NextResponse.json({ user: sessionUser }, { status: 200 })
  } catch (error) {
    console.error('[login] error:', error)
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
