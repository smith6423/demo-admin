/**
 * ISMS 비밀번호 정책 검증
 *
 * - 8자리 이상
 * - 영문 / 숫자 / 특수문자 중 3가지 이상 조합
 * - 동일 문자 3회 이상 연속 반복 금지 (예: aaa, 111)
 * - 키보드 연속 문자열 금지 (예: 123456, qwerty, abcdef)
 */

export interface PasswordPolicyResult {
  valid: boolean
  message?: string
}

// 키보드 레이아웃 연속 패턴 (QWERTY 기준, 숫자 포함)
const KEYBOARD_SEQUENCES = [
  '1234567890',
  '0987654321',
  'qwertyuiop',
  'poiuytrewq',
  'asdfghjkl',
  'lkjhgfdsa',
  'zxcvbnm',
  'mnbvcxz',
  'abcdefghijklmnopqrstuvwxyz',
  'zyxwvutsrqponmlkjihgfedcba',
]

function hasKeyboardSequence(password: string, minLen = 4): boolean {
  const lower = password.toLowerCase()
  for (const seq of KEYBOARD_SEQUENCES) {
    for (let i = 0; i <= seq.length - minLen; i++) {
      if (lower.includes(seq.slice(i, i + minLen))) return true
    }
  }
  return false
}


function hasRepeatedChars(password: string, maxRepeat = 3): boolean {
  const regex = new RegExp(`(.)\\1{${maxRepeat - 1},}`)
  return regex.test(password)
}

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  if (!password || password.length < 8) {
    return { valid: false, message: '비밀번호는 8자리 이상이어야 합니다.' }
  }

  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)

  const typesUsed = [hasUpper || hasLower, hasDigit, hasSpecial].filter(Boolean).length
  if (typesUsed < 3) {
    return {
      valid: false,
      message: '비밀번호는 영문, 숫자, 특수문자 중 3가지 이상을 조합해야 합니다.',
    }
  }

  if (hasRepeatedChars(password)) {
    return { valid: false, message: '동일한 문자를 3회 이상 연속으로 사용할 수 없습니다.' }
  }

  if (hasKeyboardSequence(password)) {
    return {
      valid: false,
      message: '키보드 연속 문자열(예: 1234, qwerty)을 비밀번호로 사용할 수 없습니다.',
    }
  }

  return { valid: true }
}

/**
 * bcrypt 해시된 이력 배열에서 비밀번호 재사용 여부 확인
 */
import bcrypt from 'bcryptjs'

export async function isPasswordReused(
  plainPassword: string,
  hashedHistory: string[],
): Promise<boolean> {
  for (const hashed of hashedHistory) {
    if (await bcrypt.compare(plainPassword, hashed)) return true
  }
  return false
}
