import { NextRequest, NextResponse } from 'next/server'
import { prisma, getServerSession } from '@/shared/lib'

// PUT /api/admin/roles/[id]/permissions — 역할 권한 전체 교체 (체크박스 일괄 저장)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 })
    }

    const { id: roleId } = await params
    const { permissionIds } = await req.json() as { permissionIds: string[] }

    if (!Array.isArray(permissionIds)) {
      return NextResponse.json({ message: 'permissionIds 배열이 필요합니다.' }, { status: 400 })
    }

    // 기존 전체 삭제 후 재삽입 (idempotent)
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId } }),
      prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      }),
    ])

    return NextResponse.json({ message: '권한이 저장되었습니다.' })
  } catch (error) {
    console.error('[admin/roles/[id]/permissions] PUT error:', error)
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
