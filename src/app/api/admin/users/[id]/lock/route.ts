import { NextRequest, NextResponse } from 'next/server'
import { prisma, getServerSession } from '@/shared/lib'

// POST /api/admin/users/[id]/lock — 관리자 수동 계정 잠금
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 })
    }

    const { id } = await params

    if (id === session.id) {
      return NextResponse.json({ message: '자기 자신의 계정은 잠금할 수 없습니다.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, deletedAt: true, lockedAt: true },
    })

    if (!user || user.deletedAt) {
      return NextResponse.json({ message: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    if (user.lockedAt) {
      return NextResponse.json({ message: '이미 잠금 상태인 계정입니다.' }, { status: 400 })
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { lockedAt: new Date(), isActive: false },
      }),
      prisma.accessLog.create({
        data: {
          userId: id,
          email: user.email,
          action: 'ACCOUNT_LOCKED',
          success: true,
          ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown',
        },
      }),
    ])

    return NextResponse.json({ message: '계정이 잠금 처리되었습니다.' })
  } catch (error) {
    console.error('[admin/users/[id]/lock] error:', error)
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
