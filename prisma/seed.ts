import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'
import path from 'node:path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const roles = [
  { name: 'ADMIN', description: '관리자 - 모든 기능에 접근 가능' },
  { name: 'USER', description: '일반 사용자 - 기본 기능에 접근 가능' },
  { name: 'GUEST', description: '게스트 - 읽기 전용 접근' },
]

async function main() {
  console.log('🌱 Seeding roles...')

  const createdRoles: Record<string, string> = {}

  for (const role of roles) {
    const result = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    })
    createdRoles[result.name] = result.id
    console.log(`  ✅ ${result.name}: ${result.description}`)
  }

  console.log('\n🌱 Seeding admin user...')

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@admin.com'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin123!'
  const hashedPassword = await bcrypt.hash(adminPassword, 12)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: '관리자',
      password: hashedPassword,
      roleId: createdRoles['ADMIN'],
      isActive: true,
    },
  })

  console.log(`  ✅ 관리자 계정 생성: ${admin.email}`)
  console.log('\n✨ Seeding complete.')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
