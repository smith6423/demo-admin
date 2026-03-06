import { NextRequest, NextResponse } from 'next/server'
import { prisma, getServerSession } from '@/shared/lib'

// GET /api/admin/roles — 역할 목록 (권한 포함)
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 })
    }

    const roles = await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ roles })
  } catch (error) {
    console.error('[admin/roles] GET error:', error)
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
