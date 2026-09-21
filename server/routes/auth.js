import { Router } from 'express'
import bcrypt from 'bcryptjs'
import pool from '../db.js'
import { signToken, signRefreshToken, verifyRefreshToken, authMiddleware } from '../middleware/auth.js'
import { validateRecoveryRequest, hashPassword } from '../lib/passwordRecovery.js'

const router = Router()

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, qualifications, registrationNumber, specialization, doctorPhone,
    clinicName, logoData, clinicPhone, clinicEmail, address, city, state, postalCode,
    businessHours, closingDay } = req.body
  if (!name || !email || !password || !clinicName) {
    return res.status(400).json({ error: 'Doctor name, email, password and clinic name are required.' })
  }
  if (logoData && (!/^data:image\/(png|jpeg|jpg|webp);base64,/.test(logoData) || logoData.length > 4 * 1024 * 1024)) {
    return res.status(400).json({ error: 'Logo must be a PNG, JPG or WebP image smaller than 3 MB.' })
  }
  const slugBase = String(clinicName).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 140) || 'clinic'
  let client
  try {
    client = await pool.connect()
    const exists = await client.query('SELECT id FROM doctors WHERE email = $1', [email.toLowerCase().trim()])
    if (exists.rows.length > 0) {
      await client.release()
      return res.status(409).json({ error: 'An account with this email already exists.' })
    }
    const passwordHash = await bcrypt.hash(password, 12)
    await client.query('BEGIN')
    const result = await client.query(
      `INSERT INTO doctors (name, email, password_hash, qualifications)
       VALUES ($1, $2, $3, $4) RETURNING id, name, email, qualifications, created_at`,
      [name.trim(), email.toLowerCase().trim(), passwordHash, qualifications?.trim() || '']
    )
    const doctor = result.rows[0]
    let slug = slugBase
    for (let suffix = 2; ; suffix += 1) {
      const taken = await client.query('SELECT 1 FROM clinic_profiles WHERE slug = $1', [slug])
      if (!taken.rows.length) break
      slug = `${slugBase}-${suffix}`
    }
    await client.query(
      `INSERT INTO clinic_profiles
       (doctor_id, clinic_name, qualifications, registration_number, phone, email, address, logo_data, slug,
        specialization, doctor_phone, city, state, postal_code, business_hours, closing_day)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [doctor.id, clinicName.trim(), qualifications?.trim() || '', registrationNumber?.trim() || '', clinicPhone?.trim() || '',
        clinicEmail?.trim() || '', address?.trim() || '', logoData || '', slug, specialization?.trim() || '', doctorPhone?.trim() || '',
        city?.trim() || '', state?.trim() || '', postalCode?.trim() || '', businessHours?.trim() || '', closingDay?.trim() || '']
    )
    await client.query('COMMIT')
    const token = signToken(doctor.id)
    const refreshToken = signRefreshToken(doctor.id)
    return res.status(201).json({ doctor, token, refreshToken, clinicSlug: slug, clinicLoginUrl: `/clinic/${slug}/login` })
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {})
    console.error('Register error:', err)
    return res.status(500).json({ error: err.message?.includes('PostgreSQL not configured') ? err.message : 'Registration failed.' })
  } finally {
    if (client) client.release()
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }
  try {
    const result = await pool.query(
      `SELECT d.id, d.name, d.email, d.qualifications, d.password_hash, cp.slug AS clinic_slug
       FROM doctors d LEFT JOIN clinic_profiles cp ON cp.doctor_id = d.id WHERE d.email = $1`,
      [email.toLowerCase().trim()]
    )
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Incorrect email or password.' })
    }
    const doctor = result.rows[0]
    const match = await bcrypt.compare(password, doctor.password_hash)
    if (!match) {
      return res.status(401).json({ error: 'Incorrect email or password.' })
    }
    const { password_hash, clinic_slug, ...safe } = doctor
    safe.clinicSlug = clinic_slug || ''
    const token = signToken(doctor.id)
    const refreshToken = signRefreshToken(doctor.id)
    return res.json({ doctor: safe, token, refreshToken })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ error: 'Login failed.' })
  }
})

// POST /api/auth/password-recovery
router.post('/password-recovery', async (req, res) => {
  try {
    const { email, password } = validateRecoveryRequest(req.body?.email, req.body?.password)
    const passwordHash = await hashPassword(password)
    const result = await pool.query(
      'UPDATE doctors SET password_hash = $1 WHERE email = $2 RETURNING id',
      [passwordHash, email]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No account found for that email.' })
    }

    return res.json({ message: 'Password updated successfully. You can now log in with your new password.' })
  } catch (error) {
    if (error instanceof Error && /Email is required|valid email|at least 8 characters/i.test(error.message)) {
      return res.status(400).json({ error: error.message })
    }
    console.error('Password reset error:', error)
    return res.status(500).json({ error: 'Password recovery failed.' })
  }
})

// GET /api/auth/me — verify token and return current doctor
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.id, d.name, d.email, d.qualifications, cp.slug AS clinic_slug
       FROM doctors d LEFT JOIN clinic_profiles cp ON cp.doctor_id = d.id WHERE d.id = $1`,
      [req.doctorId]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Doctor not found.' })
    const { clinic_slug, ...doctor } = result.rows[0]
    return res.json({ ...doctor, clinicSlug: clinic_slug || '' })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch doctor.' })
  }
})

// POST /api/auth/refresh — issue a new access token without asking the doctor to log in again
router.post('/refresh', (req, res) => {
  try {
    const payload = verifyRefreshToken(req.body?.refreshToken)
    return res.json({
      token: signToken(payload.id),
      refreshToken: signRefreshToken(payload.id)
    })
  } catch {
    return res.status(401).json({ error: 'Refresh session expired. Please log in again.' })
  }
})

export default router
