# Project Memory: demo-admin

## Project Stack
- Next.js 14+ App Router
- MUI (Material UI v6)
- Prisma 7 + PostgreSQL (via adapter-pg)
- Redis for session management (ioredis)
- Yarn Berry
- TypeScript

## Current Architecture State
- The project does NOT follow FSD. It uses a flat, monolithic `src/app/` structure.
- All layers (views, widgets, features, entities, shared) are ABSENT.
- All code lives inside `src/app/`, `src/lib/`, and `src/utils/`.

## Key Violations Found (FSD Audit)
1. No FSD layers exist (views/, widgets/, features/, entities/, shared/)
2. `app/page.tsx` and `app/**/page.tsx` contain full UI — not thin wrappers
3. Business logic (auth redirect) inside `app/(DashboardLayout)/layout.tsx`
4. Folder names are technical: `components/`, `layout/`, `utils/`, `lib/`
5. No `index.ts` barrel files anywhere
6. Internal path imports everywhere (e.g., `@/app/(DashboardLayout)/components/...`)
7. `src/lib/` and `src/utils/` belong in `shared/lib/`
8. Auth forms (`AuthLogin`, `AuthRegister`) should be `features/auth-by-email/`
9. Dashboard charts should be `widgets/dashboard-overview/`
10. Layout components (Header, Sidebar) should be `widgets/`
11. `utils/theme.ts` is an unused legacy file (separate from `utils/theme/DefaultColors.tsx`)
12. `utils/createEmotionCache.ts` is present but unused by App Router (Pages Router artifact)
13. `layout/header/data.tsx` contains placeholder data with broken image imports (src/assets doesn't exist)
14. auth redirect is done BOTH in middleware.ts (correct) AND layout.tsx (redundant duplicate)

## tsconfig Paths
- Only `@/` → `./src/` is configured. No FSD-specific paths set yet.
- Migration plan adds: @/views/*, @/widgets/*, @/features/*, @/entities/*, @/shared/*

## FSD Migration Target
See migration-plan.md for the full file-by-file migration map.

## Team Preferences / Notes
- Korean comments/error messages in some files (prisma.ts, API routes, AuthLogin)
- Session auth via Redis + httpOnly cookie (custom, not NextAuth)
- Auth redirect handled by middleware.ts — layout.tsx version is redundant and should be removed
- chart library: react-apexcharts (used with dynamic import + ssr:false)
- sidebar library: react-mui-sidebar
