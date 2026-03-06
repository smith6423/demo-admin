import { NextRequest, NextResponse } from 'next/server'
import { prisma, getServerSession } from '@/shared/lib'

// ISMS: 장기 미사용 계정 자동 잠금 (90일)
// 이 엔드포인트는 cron job 또는 관리자 수동 실행으로 호출
const INACTIVE_DAYS = 90

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 })
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - INACTIVE_DAYS)

    // lastLoginAt이 90일 이전이거나 한 번도 로그인하지 않은 계정 잠금
    const result = await prisma.user.updateMany({
      where: {
        isActive: true,
        deletedAt: null,
        lockedAt: null,
        OR: [
          { lastLoginAt: { lt: cutoffDate } },
          { lastLoginAt: null, createdAt: { lt: cutoffDate } },
        ],
      },
      data: {
        isActive: false,
        lockedAt: new Date(),
      },
    })

    return NextResponse.json({
      message: `${result.count}개의 장기 미사용 계정이 잠금 처리되었습니다.`,
      lockedCount: result.count,
    })
  } catch (error) {
    console.error('[lock-inactive-accounts] error:', error)
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
