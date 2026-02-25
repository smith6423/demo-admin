import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma, createSession, setSessionCookie } from '@/shared/lib'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

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
