import { redis } from './redis'

const DEFAULT_LIMIT = 5
const DEFAULT_WINDOW = 15 * 60 // 15 minutes

export async function incrementFailure(key: string, windowSeconds = DEFAULT_WINDOW): Promise<number> {
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.expire(key, windowSeconds)
  }
  return count
}

export async function isBlocked(key: string, limit = DEFAULT_LIMIT): Promise<boolean> {
  const val = await redis.get(key)
  if (!val) return false
  const count = parseInt(val, 10)
  return count >= limit
}

export async function resetFailures(key: string): Promise<void> {
  await redis.del(key)
}
