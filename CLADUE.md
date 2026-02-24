# Project: Admin Dashboard

## Stack
- **Framework**: Next.js 16 App Router
- **Architecture**: Feature-Sliced Design (FSD)
- **UI Library**: MUI v7 + Emotion
- **Icons**: MUI Icons + Tabler Icons
- **Charts**: ApexCharts + react-apexcharts
- **ORM**: Prisma + PostgreSQL
- **Auth**: next-auth (ServerSession)
- **Package Manager**: yarn 4 (berry)
- **Language**: TypeScript 5.9 (strict mode)
- **Compliance**: ISMS 인증 심사 대상 프로젝트

## FSD Layer Structure
```
src/
├── app/          # Next.js App Router (routing only, thin wrappers)
├── views/        # Page compositions (FSD "pages" renamed)
├── widgets/      # Large UI blocks (Header, Sidebar, DataTable...)
├── features/     # User actions (auth, CRUD operations...)
├── entities/     # Business models (user, role, log...)
└── shared/       # UI kit (MUI wrappers), utils, api client, types
```

## Architecture Rules
- `app/` route files must only render from `views/` — no business logic
- Every slice must have `index.ts` public API
- Unidirectional imports only: upper layers import from lower layers
- Cross-slice imports only via public `index.ts`
- Slice names must use business domain language

## Code Conventions
- TypeScript strict mode — no `any`, no `!` non-null assertions
- No enums — use `const` objects with `as const`
- Zod for all input validation (Server Actions, API routes)
- Named exports everywhere except Next.js page/layout files
- MUI `sx` prop for component-level styles, `theme` for global styles
- Emotion `styled` only for complex reusable components

## Security & ISMS Requirements
- All Server Actions must validate session before execution
- Never expose internal error details to client responses
- All user inputs sanitized and validated with Zod before Prisma queries
- No raw SQL — use Prisma query builder only
- Sensitive fields (password, token) never returned in API responses
- Every data access must be logged for ISMS audit trail

## Prisma Conventions
- Schema file: `prisma/schema.prisma`
- Migrations: always use `prisma migrate dev` (never `db push` in production)
- Prisma client singleton in `shared/lib/prisma.ts`
- All queries wrapped in try/catch with error normalization
- Use `select` to explicitly pick fields — never return full model with sensitive fields

## Session & Auth Conventions
- Use `getServerSession()` in Server Components and Server Actions
- Session check at the top of every Server Action
- Role-based access control (RBAC) enforced at the feature layer
- Session data never stored in client-side state

## When generating code, always:
1. Show directory tree first
2. Follow FSD layer placement rules
3. Include Zod validation for any input
4. Include session check for any mutation
5. Add error handling with normalized error responses