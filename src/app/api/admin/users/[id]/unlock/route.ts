import { NextRequest, NextResponse } from 'next/server'
import { prisma, getServerSession } from '@/shared/lib'

// POST /api/admin/users/[id]/unlock — 계정 잠금 해제
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 })
    }

    const { id } = await params

    await prisma.user.update({
      where: { id },
      data: {
        lockedAt: null,
        loginFailCount: 0,
        isActive: true,
        deletedAt: null,
      },
    })

    return NextResponse.json({ message: '계정 잠금이 해제되었습니다.' })
  } catch (error) {
    console.error('[admin/users/[id]/unlock] error:', error)
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
