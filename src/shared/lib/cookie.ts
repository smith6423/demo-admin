import { cookies } from 'next/headers'
import { signPayload, PAYLOAD_COOKIE_NAME, type SessionPayload } from './session-payload'

const COOKIE_NAME = 'session_id'
const COOKIE_MAX_AGE = 10 * 60 // ISMS: 10분 무활동 세션 타임아웃

export async function setSessionCookie(sessionId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
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
    maxAge: COOKIE_MAX_AGE,
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
