import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import speakeasy from 'speakeasy'
import { prisma } from '@/shared/lib'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) return NextResponse.json({ message: '이메일과 비밀번호 필요' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ message: '사용자 없음' }, { status: 404 })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return NextResponse.json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 })

    // generate secret for registration (do not save yet)
    const secret = speakeasy.generateSecret({ name: `Modernize (${user.email})` })

    return NextResponse.json({ base32: secret.base32, otpauth_url: secret.otpauth_url })
  } catch (error) {
    console.error('[otp/generate-public] error:', error)
    return NextResponse.json({ message: '서버 오류' }, { status: 500 })
  }
}
