import { redis } from '@/lib/redis'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: string
}

const SESSION_TTL = 86400 // 24 hours

export async function createSession(userId: string, user: SessionUser): Promise<string> {
  const sessionId = crypto.randomUUID()
  await redis.setex(`session:${sessionId}`, SESSION_TTL, JSON.stringify(user))
  return sessionId
}

export async function getSession(sessionId: string): Promise<SessionUser | null> {
  const data = await redis.get(`session:${sessionId}`)
  if (!data) return null
  return JSON.parse(data) as SessionUser
}

export async function deleteSession(sessionId: string): Promise<void> {
  await redis.del(`session:${sessionId}`)
}
