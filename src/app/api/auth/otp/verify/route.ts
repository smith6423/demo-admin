import { NextRequest, NextResponse } from 'next/server'
import speakeasy from 'speakeasy'
import { getServerSession, prisma } from '@/shared/lib'
import { encryptSecret } from '@/shared/lib/crypto'
import { incrementFailure, isBlocked, resetFailures } from '@/shared/lib/bruteforce'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { token, secret } = await req.json()
    if (!token || !secret) return NextResponse.json({ message: '잘못된 요청' }, { status: 400 })

    const failKey = `otp_fail_user:${session.id}`
    if (await isBlocked(failKey)) return NextResponse.json({ message: 'Too many attempts, try later.' }, { status: 429 })

    const verified = speakeasy.totp.verify({ secret, encoding: 'base32', token: String(token), window: 1 })
    if (!verified) {
      const cnt = await incrementFailure(failKey)
      const msg = cnt >= 5 ? 'Too many attempts, try later.' : '유효하지 않은 OTP 코드입니다.'
      return NextResponse.json({ message: msg }, { status: 401 })
    }

    // save encrypted secret and enable 2FA
    const encrypted = encryptSecret(secret)
    await prisma.user.update({ where: { id: session.id }, data: { totpSecret: encrypted, isTwoFactorEnabled: true } })
    await resetFailures(failKey)

    return NextResponse.json({ message: 'OTP 등록이 완료되었습니다.' }, { status: 200 })
  } catch (error) {
    console.error('[otp/verify] error:', error)
    return NextResponse.json({ message: '서버 오류' }, { status: 500 })
  }
}
