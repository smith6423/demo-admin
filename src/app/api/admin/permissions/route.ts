import { NextResponse } from 'next/server'
import { prisma, getServerSession } from '@/shared/lib'

// GET /api/admin/permissions — 전체 권한 목록
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 })
    }

    const permissions = await prisma.permission.findMany({
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
    })

    return NextResponse.json({ permissions })
  } catch (error) {
    console.error('[admin/permissions] GET error:', error)
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
