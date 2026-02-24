# Prisma + PostgreSQL Optimizer — Project Memory

## Project Basics
- Path: `C:\work\admin\Modernize-Nextjs-Free\package`
- Package manager: yarn berry 4.12.0 (never use npm/npx commands)
- Next.js 16 + TypeScript 5.9.3 + React 19
- DB: PostgreSQL

## Key File Locations
- Prisma singleton: `src/lib/prisma.ts`
- Prisma schema: `prisma/schema.prisma`
- Env config: `.env.local`

## Schema Conventions (confirmed)
- PK: `@id @default(cuid())`
- Soft delete: `deletedAt DateTime?` — all list queries must add `where: { deletedAt: null }`
- Sensitive fields: `/// @omit` annotation on `password` field in User model
- FK referential actions: `onDelete: Restrict, onUpdate: Cascade` as project default
- Table names: `@@map("snake_case_plural")` — e.g., `@@map("users")`, `@@map("roles")`

## Index Decisions (confirmed)
- `users.roleId` — FK index, prevents full-table scan on role joins
- `users.isActive` — admin list filter
- `users.deletedAt` — soft-delete filter on every query
- `users.[roleId, isActive]` — composite for filtered active-user-by-role queries
- `roles.name` — covered by `@unique`, no separate index needed
- `users.email` — covered by `@unique`, no separate index needed

## Singleton Pattern Note
- Uses `??` (nullish coalescing) not `||` — avoids replacing a falsy but valid client
- Development: logs `['query', 'error', 'warn']`; Production: `['error', 'warn']`

## Package Install Commands (yarn berry)
- `yarn add prisma @prisma/client` — production + dev dep for Prisma
- Never run `prisma db push` in production — use `prisma migrate deploy` in CI/CD only

## Details
- See `patterns.md` for query and schema patterns
