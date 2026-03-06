import { NextRequest, NextResponse } from 'next/server'
import { prisma, getServerSession } from '@/shared/lib'

// GET /api/admin/users/[id] — 회원 상세
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 })
    }

    const { id } = await params
    const user = await prisma.user.findUnique({
      where: { id },
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
        isTwoFactorEnabled: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        role: { select: { id: true, name: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ message: '사용자를 찾을 수 없습니다.' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('[admin/users/[id]] GET error:', error)
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// PATCH /api/admin/users/[id] — 회원 정보 수정 (이름, 역할, 활성화 상태)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { name, roleId, isActive } = body

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (roleId !== undefined) data.roleId = roleId
    if (isActive !== undefined) data.isActive = isActive

    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, isActive: true, role: { select: { id: true, name: true } } },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('[admin/users/[id]] PATCH error:', error)
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

// DELETE /api/admin/users/[id] — 소프트 딜리트 (퇴사자 계정 즉시 삭제)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 })
    }

    const { id } = await params
    if (id === session.id) {
      return NextResponse.json({ message: '자기 자신은 삭제할 수 없습니다.' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    })

    await prisma.accessLog.create({
      data: {
        userId: id,
        email: '',
        action: 'ACCOUNT_LOCKED',
        success: true,
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown',
      },
    })

    return NextResponse.json({ message: '계정이 삭제(비활성화)되었습니다.' })
  } catch (error) {
    console.error('[admin/users/[id]] DELETE error:', error)
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
