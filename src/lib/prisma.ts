/**
 * Prisma Client Singleton (Prisma 7 / adapter pattern)
 *
 * Next.js hot-reload 시 PrismaClient가 중복 생성되어 커넥션 풀이 고갈되는 것을
 * 방지하기 위해 globalThis에 인스턴스를 캐싱합니다.
 *
 * RULE: 프로젝트 어디서든 `new PrismaClient()` 직접 호출 금지.
 *       반드시 `import { prisma } from '@/lib/prisma'` 사용.
 */

import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error', 'warn'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
