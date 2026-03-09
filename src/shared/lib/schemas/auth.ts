import { z } from 'zod'

// ---------------------------------------------------------------------------
// 비밀번호 정책 공통 refinement
// 서버(password-policy.ts)와 동일한 규칙을 Zod 체인으로 표현
// ---------------------------------------------------------------------------
const KEYBOARD_SEQUENCES = [
  '1234567890', '0987654321',
  'qwertyuiop', 'poiuytrewq',
  'asdfghjkl',  'lkjhgfdsa',
  'zxcvbnm',    'mnbvcxz',
  'abcdefghijklmnopqrstuvwxyz',
  'zyxwvutsrqponmlkjihgfedcba',
]

function hasKeyboardSequence(pw: string, minLen = 4): boolean {
  const lower = pw.toLowerCase()
  for (const seq of KEYBOARD_SEQUENCES) {
    for (let i = 0; i <= seq.length - minLen; i++) {
      if (lower.includes(seq.slice(i, i + minLen))) return true
    }
  }
  return false
}

function hasRepeatedChars(pw: string, max = 3): boolean {
  const regex = new RegExp(`(.)\\1{${max - 1},}`)
  return regex.test(pw);
}

export const passwordSchema = z
  .string()
  .min(8, '비밀번호는 8자리 이상이어야 합니다.')
  .refine((pw) => {
    const hasLetter  = /[A-Za-z]/.test(pw)
    const hasDigit   = /[0-9]/.test(pw)
    const hasSpecial = /[^A-Za-z0-9]/.test(pw)
    return [hasLetter, hasDigit, hasSpecial].filter(Boolean).length >= 3
  }, '영문, 숫자, 특수문자 중 3가지 이상을 조합해야 합니다.')
  .refine((pw) => !hasRepeatedChars(pw), '동일한 문자를 3회 이상 연속 사용할 수 없습니다.')
  .refine((pw) => !hasKeyboardSequence(pw), '키보드 연속 문자열(예: 1234, qwerty)은 사용할 수 없습니다.')

// ---------------------------------------------------------------------------
// 회원가입
// ---------------------------------------------------------------------------
export const registerSchema = z.object({
  name: z
    .string()
    .min(2, '이름은 2자 이상 입력하세요.')
    .max(50, '이름은 50자 이하로 입력하세요.')
    .regex(/^[가-힣a-zA-Z\s]+$/, '이름에는 한글, 영문, 공백만 사용할 수 있습니다.'),
  email: z
    .string()
    .email('올바른 이메일 형식을 입력하세요.'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다.',
  path: ['confirmPassword'],
})

export type RegisterInput = z.infer<typeof registerSchema>

// ---------------------------------------------------------------------------
// 로그인
// ---------------------------------------------------------------------------
export const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력하세요.'),
  password: z.string().min(1, '비밀번호를 입력하세요.'),
})

export type LoginInput = z.infer<typeof loginSchema>

// ---------------------------------------------------------------------------
// 비밀번호 변경
// ---------------------------------------------------------------------------
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력하세요.'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: '새 비밀번호가 일치하지 않습니다.',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: '새 비밀번호는 현재 비밀번호와 달라야 합니다.',
  path: ['newPassword'],
})

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
