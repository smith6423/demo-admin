import { NextRequest, NextResponse } from 'next/server'
import { prisma, getServerSession } from '@/shared/lib'

// GET /api/admin/users — 회원 목록 조회 (페이지네이션 + 검색)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20'))
    const search = searchParams.get('search') ?? ''
    const status = searchParams.get('status') // 'active' | 'locked' | 'deleted' | null

    const where = {
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
      ...(status === 'active' ? { isActive: true, deletedAt: null, lockedAt: null } : {}),
      ...(status === 'locked' ? { lockedAt: { not: null } } : {}),
      ...(status === 'deleted' ? { deletedAt: { not: null } } : { deletedAt: null }),
    }

    const [total, users] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          loginFailCount: true,
          lockedAt: true,
          lastLoginAt: true,
          mustChangePassword: true,
          passwordChangedAt: true,
          deletedAt: true,
          createdAt: true,
          role: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return NextResponse.json({ users, total, page, limit })
  } catch (error) {
    console.error('[admin/users] GET error:', error)
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
