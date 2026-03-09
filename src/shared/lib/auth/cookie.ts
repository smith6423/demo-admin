import { cookies } from 'next/headers'
import { signPayload, PAYLOAD_COOKIE_NAME, type SessionPayload } from './session-payload'

const COOKIE_NAME = 'session_id'

export async function setSessionCookie(sessionId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(process.env.COOKIE_NAME as string, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: process.env.COOKIE_MAX_AGE as number | undefined || 60*10,
  })
}

/** 미들웨어 권한 체크용 서명된 페이로드 쿠키 세팅 */
export async function setPayloadCookie(payload: SessionPayload): Promise<void> {
  const cookieStore = await cookies()
  const signed = await signPayload(payload)
  cookieStore.set(PAYLOAD_COOKIE_NAME, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: process.env.COOKIE_MAX_AGE as number | undefined || 60*10,
  })
}

export async function getSessionId(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  cookieStore.delete(PAYLOAD_COOKIE_NAME)
}
