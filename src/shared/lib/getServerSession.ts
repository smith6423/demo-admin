import { getSessionId } from '@/shared/lib/cookie'
import { getSession, SessionUser } from '@/shared/lib/session'

export async function getServerSession(): Promise<SessionUser | null> {
  const sessionId = await getSessionId()
  if (!sessionId) return null
  return getSession(sessionId)
}
