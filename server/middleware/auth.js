import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import path from 'node:path'
import crypto from 'node:crypto'
const defaultEnvPath = process.cwd().endsWith(`${path.sep}server`)
  ? path.resolve(process.cwd(), '..', '.env')
  : path.resolve(process.cwd(), '.env')
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || defaultEnvPath })

const SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString('base64url')

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated. Please log in.' })
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, SECRET)
    req.doctorId = payload.id
    next()
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' })
  }
}

export function signToken(doctorId) {
  return jwt.sign({ id: doctorId }, SECRET, { expiresIn: '30d' })
}

export function signRefreshToken(doctorId) {
  return jwt.sign({ id: doctorId, type: 'refresh' }, SECRET, { expiresIn: '30d' })
}

export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, SECRET)
  if (payload.type !== 'refresh') throw new Error('Invalid refresh token.')
  return payload
}
