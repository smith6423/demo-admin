import { NextRequest, NextResponse } from 'next/server'
import { prisma, getServerSession } from '@/shared/lib'

// GET /api/admin/access-logs — 접속 이력 조회 (사용자별 또는 전체)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20'))
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const where = {
      ...(userId ? { userId } : {}),
      ...(action ? { action: action as never } : {}),
      ...((dateFrom || dateTo) ? {
        createdAt: {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo ? { lte: new Date(dateTo) } : {}),
        },
      } : {}),
    }

    const [total, logs] = await prisma.$transaction([
      prisma.accessLog.count({ where }),
      prisma.accessLog.findMany({
        where,
        select: {
          id: true,
          email: true,
          action: true,
          success: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return NextResponse.json({ logs, total, page, limit })
  } catch (error) {
    console.error('[admin/access-logs] GET error:', error)
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
