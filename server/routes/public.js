import { Router } from 'express'
import pool from '../db.js'

const router = Router()

router.get('/clinics/:slug', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.name AS doctor_name, cp.clinic_name, cp.logo_data, cp.slug, cp.qualifications,
              cp.registration_number, cp.specialization, cp.doctor_phone, cp.phone, cp.email,
              cp.address, cp.city, cp.state, cp.postal_code, cp.business_hours, cp.closing_day
       FROM clinic_profiles cp JOIN doctors d ON d.id = cp.doctor_id
       WHERE cp.slug = $1
         OR (cp.slug IS NULL AND regexp_replace(lower(cp.clinic_name), '[^a-z0-9]+', '-', 'g') = $1)`,
      [req.params.slug]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Clinic not found.' })
    return res.json(rows[0])
  } catch (err) {
    console.error('Public clinic lookup error:', err)
    return res.status(500).json({ error: 'Failed to load clinic.' })
  }
})

export default router