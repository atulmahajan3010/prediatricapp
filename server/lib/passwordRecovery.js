import bcrypt from 'bcryptjs'

export function validateRecoveryRequest(email, password) {
  const normalizedEmail = String(email ?? '').trim().toLowerCase()

  if (!normalizedEmail) throw new Error('Email is required.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('Please enter a valid email address.')
  if (!password || String(password).trim().length < 8) throw new Error('Password must be at least 8 characters long.')

  return { email: normalizedEmail, password: String(password) }
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12)
}
