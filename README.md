# Modernize Next.js Admin Dashboard

Next.js 기반의 관리자 대시보드입니다.

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | Next.js 16 |
| Language | TypeScript |
| UI | MUI (Material UI) v7 |
| ORM | Prisma 7 |
| Database | PostgreSQL (Supabase) |
| Session Store | Redis (ioredis) |
| Package Manager | Yarn Berry 4 |

## 시작하기

### 1. 패키지 설치

```bash
yarn install
```

### 2. Redis 실행

Docker로 로컬 Redis를 실행합니다.

```bash
docker run -d --name redis -p 6379:6379 redis
```

### 3. 환경변수 설정

`.env.local` 파일을 생성하고 아래 값을 설정합니다.

```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://[user]:[password]@[host]:[port]/[database]"

# Redis
REDIS_URL="redis://localhost:6379"

# 시드 관리자 계정 (선택사항 - 기본값 사용 시 생략 가능)
SEED_ADMIN_EMAIL=admin@admin.com
SEED_ADMIN_PASSWORD=변경할비밀번호
```

### 4. DB 마이그레이션

```bash
# Prisma 클라이언트 타입 생성
yarn db:generate

# 테이블 생성
yarn db:migrate --name init

# 초기 데이터 입력 (roles + 관리자 계정)
yarn db:seed
```

### 5. 개발 서버 실행

```bash
yarn dev
```

`http://localhost:3000` 에서 확인할 수 있습니다.

> `/` 접근 시 세션이 없으면 `/authentication/login` 으로 자동 리다이렉트됩니다.
> 기본 관리자 계정: `admin@admin.com` / `admin123!`

## 인증 구조

next-auth 없이 Redis 세션 방식으로 구현합니다 (Spring Boot JSession 유사).

```
POST /api/auth/login
  → Prisma로 사용자 조회 + bcrypt 검증
  → Redis에 세션 저장: session:{uuid} (TTL 24h)
  → 쿠키에 session_id 발급 (httpOnly)

미들웨어 (Edge)
  → 쿠키 존재 여부만 확인 → 없으면 /authentication/login 리다이렉트

Server Component
  → getServerSession() → Redis에서 세션 조회 → 사용자 정보 반환

POST /api/auth/logout
  → Redis에서 세션 즉시 삭제
  → 쿠키 삭제
```

## 데이터베이스

### 스키마

**roles** — 사용자 권한

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | String (cuid) | PK |
| name | String (unique) | 역할명 (ADMIN / USER / GUEST) |
| description | String? | 역할 설명 |
| createdAt | DateTime | 생성일 |
| updatedAt | DateTime | 수정일 |

**users** — 사용자

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | String (cuid) | PK |
| email | String (unique) | 이메일 |
| name | String | 이름 |
| password | String | bcrypt 해시 비밀번호 |
| isActive | Boolean | 활성 여부 (기본값: true) |
| roleId | String | FK → roles.id |
| deletedAt | DateTime? | 소프트 삭제 일시 |
| createdAt | DateTime | 생성일 |
| updatedAt | DateTime | 수정일 |

### 초기 데이터 (Seed)

| 역할 | 이메일 | 설명 |
|------|--------|------|
| ADMIN | admin@admin.com | 관리자 계정 |
| USER | — | 일반 사용자 권한 |
| GUEST | — | 게스트 권한 |

## 스크립트

```bash
yarn dev              # 개발 서버 실행
yarn build            # 프로덕션 빌드
yarn start            # 프로덕션 서버 실행
yarn lint             # ESLint 검사

yarn db:migrate       # DB 마이그레이션 실행
yarn db:generate      # Prisma 클라이언트 타입 생성
yarn db:seed          # 초기 데이터 입력
yarn db:push          # 마이그레이션 없이 스키마 동기화 (개발용)
yarn db:studio        # Prisma Studio (DB GUI)
```

## 프로젝트 구조

```
package/
├── prisma/
│   ├── schema.prisma       # DB 스키마 정의
│   ├── seed.ts             # 초기 데이터 스크립트
│   └── migrations/         # 마이그레이션 이력
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── auth/
│   │   │       ├── login/route.ts   # POST 로그인 API
│   │   │       └── logout/route.ts  # POST 로그아웃 API
│   │   ├── authentication/          # 로그인 페이지
│   │   └── (DashboardLayout)/       # 대시보드 레이아웃
│   ├── generated/
│   │   └── prisma/         # Prisma 자동 생성 클라이언트 (git 제외)
│   ├── lib/
│   │   ├── prisma.ts       # PrismaClient 싱글톤
│   │   ├── redis.ts        # Redis 싱글톤 (ioredis)
│   │   ├── session.ts      # 세션 CRUD (Redis)
│   │   ├── cookie.ts       # httpOnly 쿠키 헬퍼
│   │   └── getServerSession.ts  # Server Component 세션 헬퍼
│   └── middleware.ts       # Edge 라우트 보호
├── prisma.config.ts        # Prisma 7 설정
└── .env.local              # 환경변수 (git 제외)
```

## 주의사항

- `src/generated/` 는 자동 생성 파일이므로 git에 포함되지 않습니다. 클론 후 반드시 `yarn db:generate` 를 실행하세요.
- `password` 필드는 항상 bcrypt로 해시된 값을 저장합니다. 쿼리 시 `select`에 포함하지 마세요.
- 소프트 삭제를 사용하므로 목록 조회 시 반드시 `where: { deletedAt: null }` 조건을 포함하세요.
- Redis가 실행 중이지 않으면 로그인이 동작하지 않습니다. 개발 시 Docker Redis가 먼저 실행되어야 합니다.
