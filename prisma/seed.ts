import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'
import path from 'node:path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ---------------------------------------------------------------------------
// 역할 정의
// ---------------------------------------------------------------------------
const roles = [
  { name: 'ADMIN', description: '관리자 - 모든 기능에 접근 가능' },
  { name: 'USER', description: '일반 사용자 - 기본 기능에 접근 가능' },
  { name: 'GUEST', description: '게스트 - 읽기 전용 접근' },
] as const

// ---------------------------------------------------------------------------
// 권한 정의
// PAGE  - 사이드바 메뉴 및 페이지 접근 제어
// API   - 서버 API 호출 권한 (미들웨어 / 라우트 핸들러에서 검사)
// ---------------------------------------------------------------------------
const permissions = [
  // 대시보드 (모든 인증 사용자)
  { code: 'dashboard:view',  name: '대시보드',         type: 'PAGE' as const, description: '메인 대시보드 페이지' },

  // 회원 관리 (ADMIN 전용)
  { code: 'admin:users',     name: '회원 관리',         type: 'PAGE' as const, description: '사용자 계정 목록/수정/삭제' },
  { code: 'admin:roles',     name: '권한 관리',         type: 'PAGE' as const, description: '역할별 권한 체크박스 관리' },
  { code: 'admin:logs',      name: '접속 이력 조회',    type: 'PAGE' as const, description: '전체 접속 로그 조회' },

  // 내정보 페이지 (모든 로그인 사용자)
  { code: 'my:info',        name: '내 정보',           type: 'PAGE' as const, description: '내 정보 조회 및 수정 페이지' },

  // 디자인 페이지 (ADMIN, USER)
  { code: 'design:icons',    name: '아이콘',            type: 'PAGE' as const, description: '아이콘 디자인 페이지' },
  { code: 'design:sample',   name: '샘플 페이지',       type: 'PAGE' as const, description: '샘플 페이지' },
  { code: 'design:typo',     name: '타이포그래피',      type: 'PAGE' as const, description: '타이포그래피 페이지' },
  { code: 'design:shadow',   name: '그림자',            type: 'PAGE' as const, description: '그림자 디자인 페이지' },

  // API 권한 (ADMIN)
  { code: 'users:read',      name: '사용자 조회 API',   type: 'API' as const,  description: 'GET /api/admin/users' },
  { code: 'users:write',     name: '사용자 수정 API',   type: 'API' as const,  description: 'PATCH/DELETE /api/admin/users' },
  { code: 'users:unlock',    name: '계정 잠금해제 API', type: 'API' as const,  description: 'POST /api/admin/users/[id]/unlock' },
  { code: 'users:resetpw',   name: '비밀번호 초기화 API', type: 'API' as const, description: 'POST /api/admin/users/[id]/reset-password' },
  { code: 'logs:read',       name: '접속 로그 조회 API', type: 'API' as const, description: 'GET /api/admin/access-logs' },
  { code: 'roles:manage',    name: '역할 권한 관리 API', type: 'API' as const, description: 'PUT /api/admin/roles/[id]/permissions' },
] as const

// ---------------------------------------------------------------------------
// 역할별 권한 매핑
// ---------------------------------------------------------------------------
const rolePermissionMap: Record<string, string[]> = {
  ADMIN: [
    'dashboard:view',
    'admin:users', 'admin:roles', 'admin:logs',
    'my:info',
    'design:icons', 'design:sample', 'design:typo', 'design:shadow',
    'users:read', 'users:write', 'users:unlock', 'users:resetpw',
    'logs:read', 'roles:manage',
  ],
  USER: [
    'dashboard:view',
    'my:info',
    'design:icons', 'design:sample', 'design:typo', 'design:shadow',
  ],
  GUEST: [
    'dashboard:view',
    'design:sample',
  ],
}

// ---------------------------------------------------------------------------
// 시드 사용자 (비밀번호: Seed@1234! — 정책 충족)
// ---------------------------------------------------------------------------
const seedUsers = [
  {
    email: 'admin@admin.com',
    name: '관리자',
    role: 'ADMIN',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@1234!',
    mustChangePassword: false,
  },
  // USER 계정 3명
  {
    email: 'user1@example.com',
    name: '김철수',
    role: 'USER',
    password: 'User@1234!',
    mustChangePassword: true,
  },
  {
    email: 'user2@example.com',
    name: '이영희',
    role: 'USER',
    password: 'User@1234!',
    mustChangePassword: false,
  },
  {
    email: 'user3@example.com',
    name: '박민준',
    role: 'USER',
    password: 'User@1234!',
    mustChangePassword: false,
  },
  // GUEST 계정 2명
  {
    email: 'guest1@example.com',
    name: '홍길동',
    role: 'GUEST',
    password: 'Guest@1234!',
    mustChangePassword: true,
  },
  {
    email: 'guest2@example.com',
    name: '최연아',
    role: 'GUEST',
    password: 'Guest@1234!',
    mustChangePassword: false,
  },
] as const

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  // 1. 역할
  console.log('🌱 Seeding roles...')
  const createdRoles: Record<string, string> = {}
  for (const role of roles) {
    const result = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    })
    createdRoles[result.name] = result.id
    console.log(`  ✅ Role: ${result.name}`)
  }

  // 2. 권한
  console.log('\n🌱 Seeding permissions...')
  const createdPerms: Record<string, string> = {}
  for (const perm of permissions) {
    const result = await prisma.permission.upsert({
      where: { code: perm.code },
      update: { name: perm.name, type: perm.type, description: perm.description },
      create: perm,
    })
    createdPerms[result.code] = result.id
    console.log(`  ✅ Permission: ${result.code} (${result.type})`)
  }

  // 3. 역할-권한 매핑
  console.log('\n🌱 Seeding role permissions...')
  for (const [roleName, permCodes] of Object.entries(rolePermissionMap)) {
    const roleId = createdRoles[roleName]
    if (!roleId) continue

    // 기존 전체 삭제 후 재삽입 (idempotent)
    await prisma.rolePermission.deleteMany({ where: { roleId } })
    const data = permCodes
      .map((code) => ({ roleId, permissionId: createdPerms[code] }))
      .filter((d) => d.permissionId)
    await prisma.rolePermission.createMany({ data, skipDuplicates: true })
    console.log(`  ✅ ${roleName}: ${permCodes.join(', ')}`)
  }

  // 4. 사용자
  console.log('\n🌱 Seeding users...')
  for (const u of seedUsers) {
    const hashed = await bcrypt.hash(u.password, 12)
    const roleId = createdRoles[u.role]
    if (!roleId) continue

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        password: hashed,
        roleId,
        isActive: true,
        mustChangePassword: u.mustChangePassword,
        passwordChangedAt: new Date(),
      },
    })

    // 비밀번호 이력 (재사용 방지용 초기값)
    const existingHistory = await prisma.passwordHistory.count({ where: { userId: user.id } })
    if (existingHistory === 0) {
      await prisma.passwordHistory.create({ data: { userId: user.id, password: hashed } })
    }

    console.log(`  ✅ [${u.role}] ${user.name} <${user.email}> (mustChangePassword: ${u.mustChangePassword})`)
  }

  console.log('\n✨ Seeding complete.')
  console.log('\n📋 테스트 계정 정보:')
  console.log('  ADMIN  admin@admin.com       / Admin@1234!')
  console.log('  USER   user1@example.com     / User@1234!  (첫 로그인 비밀번호 변경 필요)')
  console.log('  USER   user2@example.com     / User@1234!')
  console.log('  USER   user3@example.com     / User@1234!')
  console.log('  GUEST  guest1@example.com    / Guest@1234! (첫 로그인 비밀번호 변경 필요)')
  console.log('  GUEST  guest2@example.com    / Guest@1234!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
