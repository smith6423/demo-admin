import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/shared/lib'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    if (!email || !password || !name) {
      return NextResponse.json({ message: '이름, 이메일, 비밀번호를 모두 입력하세요.' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ message: '이미 사용 중인 이메일입니다.' }, { status: 409 })
    }

    const role = await prisma.role.findUnique({ where: { name: 'USER' } })
    if (!role) {
      return NextResponse.json({ message: '서버 설정 오류: 기본 역할이 없습니다.' }, { status: 500 })
    }

    const hashed = await bcrypt.hash(password, 12)

    await prisma.user.create({
      data: {
        email,
        name,
        password: hashed,
        roleId: role.id,
        isActive: true,
      },
    })

    return NextResponse.json({ message: '회원가입이 완료되었습니다.' }, { status: 201 })
  } catch (error) {
    console.error('[register] error:', error)
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
