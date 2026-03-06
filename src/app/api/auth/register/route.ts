import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/shared/lib'
import { registerSchema } from '@/shared/lib/schemas'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Zod 입력 검증 (confirmPassword는 서버에서 무시해도 되지만 일관성을 위해 포함)
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.'
      return NextResponse.json({ message }, { status: 400 })
    }

    const { name, email, password } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ message: '이미 사용 중인 이메일입니다.' }, { status: 409 })
    }

    const role = await prisma.role.findUnique({ where: { name: 'GUEST' } })
    if (!role) {
      return NextResponse.json({ message: '서버 설정 오류: 기본 역할이 없습니다.' }, { status: 500 })
    }

    const hashed = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashed,
        roleId: role.id,
        isActive: true,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    })

    await prisma.passwordHistory.create({
      data: { userId: user.id, password: hashed },
    })

    return NextResponse.json({ message: '회원가입이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.' }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors[0]?.message }, { status: 400 })
    }
    console.error('[register] error:', error)
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
