// A rough estimate of how hard a password is to guess, from 0 (too short) to 4 (strong).
// It looks at length and at how many kinds of characters are used. It is a hint, not a guarantee:
// the backend only requires 8 to 72 characters.
export interface PasswordStrength {
  level: 0 | 1 | 2 | 3 | 4
  label: string
  hint: string
}

const COMMON = ['password', '12345678', '123456789', 'qwertyui', 'qwerty123', 'iloveyou', 'letmein1', 'abcdefgh']

export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 72

export function passwordStrength(password: string, email = ''): PasswordStrength {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { level: 0, label: 'Too short', hint: `Use at least ${MIN_PASSWORD_LENGTH} characters.` }
  }
  const lower = password.toLowerCase()
  const name = email.split('@')[0].toLowerCase()
  if (COMMON.includes(lower) || (name.length >= 3 && lower.includes(name)) || /^(.)\1+$/.test(password)) {
    return { level: 1, label: 'Weak', hint: 'Easy to guess. Avoid common words and your email name.' }
  }
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((kind) => kind.test(password)).length
  let points = 0
  if (password.length >= 10) points++
  if (password.length >= 14) points++
  if (kinds >= 2) points++
  if (kinds >= 3) points++
  if (points <= 1) return { level: 1, label: 'Weak', hint: 'Make it longer, or mix letters, numbers and symbols.' }
  if (points === 2) return { level: 2, label: 'Fair', hint: 'A few more characters would help.' }
  if (points === 3) return { level: 3, label: 'Good', hint: 'A good password.' }
  return { level: 4, label: 'Strong', hint: 'A strong password.' }
}

export function emailProblem(email: string): string | null {
  const value = email.trim()
  if (!value) return 'Enter your email address.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'This does not look like an email address. Example: you@example.com'
  return null
}
