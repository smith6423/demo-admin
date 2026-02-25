import { NextRequest, NextResponse } from 'next/server'
import speakeasy from 'speakeasy'
import { getServerSession, prisma } from '@/shared/lib'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.id } })
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 })

    const secret = speakeasy.generateSecret({ name: `Modernize (${user.email})` })

    return NextResponse.json({ base32: secret.base32, otpauth_url: secret.otpauth_url })
  } catch (error) {
    console.error('[otp/generate] error:', error)
    return NextResponse.json({ message: '서버 오류' }, { status: 500 })
  }
}
