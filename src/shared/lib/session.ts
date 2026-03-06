import { redis } from '@/shared/lib/redis'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: string
  // 역할에 할당된 Permission code 목록 — 사이드바/미들웨어 권한 체크에 사용
  permissions: string[]
}

// ISMS 세션 관리:
// - 10분 무활동 시 자동 만료 (sliding session)
// - 사용자별 활성 세션 ID 추적 → 동시 접속 차단(단일 세션 강제)
const SESSION_TTL = 10 * 60 // 10분 무활동 타임아웃

// 사용자별 현재 세션 ID 추적 키
function userSessionKey(userId: string) {
  return `user_session:${userId}`
}

export async function createSession(userId: string, user: SessionUser): Promise<string> {
  // 기존 세션 무효화 (동시 접속 차단 — 단일 세션 강제)
  const prevSessionId = await redis.get(userSessionKey(userId))
  if (prevSessionId) {
    await redis.del(`session:${prevSessionId}`)
  }

  const sessionId = crypto.randomUUID()
  await redis.setex(`session:${sessionId}`, SESSION_TTL, JSON.stringify(user))

  // 사용자 → 세션 ID 매핑 (TTL은 세션보다 약간 길게)
  await redis.setex(userSessionKey(userId), SESSION_TTL + 60, sessionId)

  return sessionId
}

export async function getSession(sessionId: string): Promise<SessionUser | null> {
  const data = await redis.get(`session:${sessionId}`)
  if (!data) return null

  const user = JSON.parse(data) as SessionUser

  // Sliding session: 접근마다 TTL 갱신 (10분 무활동 기준 리셋)
  await redis.expire(`session:${sessionId}`, SESSION_TTL)
  await redis.expire(userSessionKey(user.id), SESSION_TTL + 60)

  return user
}

export async function deleteSession(sessionId: string): Promise<void> {
  const data = await redis.get(`session:${sessionId}`)
  if (data) {
    const user = JSON.parse(data) as SessionUser
    await redis.del(userSessionKey(user.id))
  }
  await redis.del(`session:${sessionId}`)
}
