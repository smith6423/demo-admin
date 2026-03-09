import { getSessionId } from '@/shared/lib/auth/cookie'
import { getSession, SessionUser } from '@/shared/lib/auth/session'

export async function getServerSession(): Promise<SessionUser | null> {
  const sessionId = await getSessionId()
  if (!sessionId) return null
  return getSession(sessionId)
}
