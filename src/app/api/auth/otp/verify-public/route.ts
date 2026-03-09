import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import speakeasy from 'speakeasy'
import { prisma } from '@/shared/lib'
import { encryptSecret } from '@/shared/lib/auth/crypto'
import { incrementFailure, isBlocked, resetFailures } from '@/shared/lib/auth/bruteforce'

export async function POST(req: NextRequest) {
  try {
    const { email, password, token, secret } = await req.json()
    if (!email || !password || !token || !secret) return NextResponse.json({ message: '잘못된 요청' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ message: '사용자 없음' }, { status: 404 })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return NextResponse.json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 })

    // brute-force protection per email
    const failKey = `otp_fail_email:${email}`
    if (await isBlocked(failKey)) return NextResponse.json({ message: 'Too many attempts, try later.' }, { status: 429 })

    const verified = speakeasy.totp.verify({ secret, encoding: 'base32', token: String(token), window: 1 })
    if (!verified) {
      const cnt = await incrementFailure(failKey)
      const msg = cnt >= 5 ? 'Too many attempts, try later.' : '유효하지 않은 OTP 코드입니다.'
      return NextResponse.json({ message: msg }, { status: 401 })
    }

    // save encrypted secret and enable 2FA
    const encrypted = encryptSecret(secret)
    await prisma.user.update({ where: { id: user.id }, data: { isTwoFactorEnabled: true, totpSecret: encrypted } })
    await resetFailures(failKey)

    return NextResponse.json({ message: 'OTP 등록이 완료되었습니다.' })
  } catch (error) {
    console.error('[otp/verify-public] error:', error)
    return NextResponse.json({ message: '서버 오류' }, { status: 500 })
  }
}
