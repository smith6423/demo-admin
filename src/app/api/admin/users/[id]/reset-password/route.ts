import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma, getServerSession } from '@/shared/lib'
import { validatePasswordPolicy } from '@/shared/lib/auth/password-policy'

// POST /api/admin/users/[id]/reset-password
// .env의 RESET_PASSWORD 값으로 초기화 후 mustChangePassword = true 설정
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, deletedAt: true },
    })

    if (!user || user.deletedAt) {
      return NextResponse.json({ message: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    // .env의 RESET_PASSWORD 값 사용 (없으면 서버 오류)
    const resetPassword = process.env.RESET_PASSWORD
    if (!resetPassword) {
      console.error('[reset-password] RESET_PASSWORD env 변수가 설정되지 않았습니다.')
      return NextResponse.json({ message: '서버 설정 오류: 초기 비밀번호가 구성되지 않았습니다.' }, { status: 500 })
    }

    // env 값도 비밀번호 정책 충족 여부 검증
    const policyCheck = validatePasswordPolicy(resetPassword)
    if (!policyCheck.valid) {
      console.error(`[reset-password] RESET_PASSWORD가 비밀번호 정책 미충족: ${policyCheck.message}`)
      return NextResponse.json({ message: '서버 설정 오류: 초기 비밀번호가 정책을 충족하지 않습니다.' }, { status: 500 })
    }

    const hashed = await bcrypt.hash(resetPassword, 12)

    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          password: hashed,
          mustChangePassword: true,
          passwordChangedAt: new Date(),
          loginFailCount: 0,
          lockedAt: null,
          isActive: true,
        },
      }),
      prisma.passwordHistory.create({ data: { userId: id, password: hashed } }),
      prisma.accessLog.create({
        data: {
          userId: id,
          email: user.email,
          action: 'PASSWORD_CHANGED',
          success: true,
          ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown',
        },
      }),
    ])

    return NextResponse.json({ message: '비밀번호가 초기화되었습니다. 사용자는 다음 로그인 시 비밀번호를 변경해야 합니다.' })
  } catch (error) {
    console.error('[admin/users/[id]/reset-password] error:', error)
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
