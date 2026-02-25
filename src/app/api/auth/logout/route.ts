import { NextResponse } from 'next/server'
import { getSessionId, clearSessionCookie, deleteSession } from '@/shared/lib'

export async function POST() {
  try {
    const sessionId = await getSessionId()
    if (sessionId) {
      await deleteSession(sessionId)
    }
    await clearSessionCookie()
    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error('[logout] error:', error)
    return NextResponse.json({ message: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
