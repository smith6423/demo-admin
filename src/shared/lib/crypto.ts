import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_ENV = process.env.SECRET_ENCRYPTION_KEY || ''

if (!KEY_ENV) {
  console.warn('SECRET_ENCRYPTION_KEY is not set — TOTP secrets will fail if used in production')
}

function getKey(): Buffer {
  // Expect base64 encoded 32 bytes or raw string shorter/longer — pad/trim to 32 bytes
  try {
    const buf = Buffer.from(KEY_ENV, 'base64')
    if (buf.length === 32) return buf
  } catch (e) {
    // fallthrough
  }
  // fallback: derive key from env UTF-8 string via sha256
  return crypto.createHash('sha256').update(KEY_ENV).digest()
}

export function encryptSecret(plain: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: 16 })
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // store as iv:cipher:tag in base64
  return `${iv.toString('base64')}.${encrypted.toString('base64')}.${tag.toString('base64')}`
}

export function decryptSecret(encrypted: string): string {
  const key = getKey()
  const parts = encrypted.split('.')
  if (parts.length !== 3) throw new Error('Invalid encrypted payload')
  const iv = Buffer.from(parts[0], 'base64')
  const data = Buffer.from(parts[1], 'base64')
  const tag = Buffer.from(parts[2], 'base64')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: 16 })
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  return decrypted.toString('utf8')
}
