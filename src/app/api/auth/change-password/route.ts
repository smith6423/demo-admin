import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma, getServerSession } from '@/shared/lib'
import { isPasswordReused } from '@/shared/lib/password-policy'
import { changePasswordSchema } from '@/shared/lib/schemas'

const PASSWORD_HISTORY_LIMIT = 5

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 })
    }

    const body = await req.json()

    // Zod 입력 검증 (정책 + 일치 여부 + 현재 비밀번호와 동일 여부 모두 포함)
    const parsed = changePasswordSchema.safeParse(body)
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.'
      return NextResponse.json({ message }, { status: 400 })
    }

    const { currentPassword, newPassword } = parsed.data

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        passwordHistory: {
          orderBy: { createdAt: 'desc' },
          take: PASSWORD_HISTORY_LIMIT,
        },
      },
    })

    if (!user) {
      return NextResponse.json({ message: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password)
    if (!isCurrentValid) {
      return NextResponse.json({ message: '현재 비밀번호가 올바르지 않습니다.' }, { status: 400 })
    }

    // ISMS: 이전 비밀번호 재사용 금지
    const historyHashes = user.passwordHistory.map((h) => h.password)
    if (await isPasswordReused(newPassword, [user.password, ...historyHashes])) {
      return NextResponse.json({ message: '이전에 사용한 비밀번호는 재사용할 수 없습니다.' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(newPassword, 12)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashed, passwordChangedAt: new Date(), mustChangePassword: false },
      }),
      prisma.passwordHistory.create({ data: { userId: user.id, password: hashed } }),
      prisma.passwordHistory.deleteMany({
        where: {
          userId: user.id,
          id: { notIn: user.passwordHistory.map((h) => h.id).slice(0, PASSWORD_HISTORY_LIMIT - 1) },
        },
      }),
    ])

    await prisma.accessLog.create({
      data: {
        userId: user.id,
        email: user.email,
        action: 'PASSWORD_CHANGED',
        success: true,
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown',
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    })

    return NextResponse.json({ message: '비밀번호가 변경되었습니다.' }, { status: 200 })
  } catch (error) {
    console.error('[change-password] error:', error)
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
