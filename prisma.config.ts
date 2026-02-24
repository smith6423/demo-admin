import path from 'node:path'
import * as dotenv from 'dotenv'
import { defineConfig } from 'prisma/config'

// Prisma CLI는 .env.local을 자동으로 읽지 않으므로 수동 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL as string,
  },
})
