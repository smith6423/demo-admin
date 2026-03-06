/**
 * session_payload 쿠키
 *
 * 미들웨어(Edge Runtime)는 Redis에 접근할 수 없으므로,
 * 로그인 시 { role, permissions } 를 HMAC-SHA256으로 서명하여
 * 별도 쿠키로 저장한다. 미들웨어는 이 쿠키만 읽어 권한을 검사한다.
 *
 * 구조: base64url(JSON) + "." + base64url(HMAC signature)
 */

export const PAYLOAD_COOKIE_NAME = 'session_payload'

export interface SessionPayload {
  role: string
  permissions: string[]
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET 환경 변수가 설정되지 않았습니다.')
  return secret
}

function b64url(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString('base64url')
}

async function hmac(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return b64url(sig)
}

async function verifyHmac(secret: string, data: string, signature: string): Promise<boolean> {
  const expected = await hmac(secret, data)
  // 타이밍 공격 방지: 길이가 다르면 즉시 false
  if (expected.length !== signature.length) return false
  // 상수 시간 비교
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

/** 서명된 페이로드 쿠키 값 생성 */
export async function signPayload(payload: SessionPayload): Promise<string> {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = await hmac(getSecret(), data)
  return `${data}.${sig}`
}

/** 쿠키 값 검증 후 페이로드 반환. 변조된 경우 null 반환 */
export async function verifyPayload(cookie: string): Promise<SessionPayload | null> {
  try {
    const dotIdx = cookie.lastIndexOf('.')
    if (dotIdx === -1) return null

    const data = cookie.slice(0, dotIdx)
    const sig = cookie.slice(dotIdx + 1)

    const valid = await verifyHmac(getSecret(), data, sig)
    if (!valid) return null

    return JSON.parse(Buffer.from(data, 'base64url').toString('utf-8')) as SessionPayload
  } catch {
    return null
  }
}
