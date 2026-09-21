import { Router } from 'express'
import pool from '../db.js'

const router = Router()

function shape(r) {
  if (!r) return { clinicName: '', qualifications: '', registrationNumber: '', phone: '', email: '', address: '', logoData: '', slug: '', specialization: '', doctorPhone: '', city: '', state: '', postalCode: '', businessHours: '', closingDay: '', licenseKey: '' }
  return {
    clinicName: r.clinic_name,
    qualifications: r.qualifications,
    registrationNumber: r.registration_number,
    phone: r.phone,
    email: r.email,
    address: r.address,
    doctorName: r.doctor_name || '',
    logoData: r.logo_data,
    slug: r.slug || '',
    specialization: r.specialization || '',
    doctorPhone: r.doctor_phone || '',
    city: r.city || '',
    state: r.state || '',
    postalCode: r.postal_code || '',
    businessHours: r.business_hours || '',
    closingDay: r.closing_day || '',
    licenseKey: r.license_key || ''
  }
}

// GET /api/clinic-profile
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT cp.*, d.name AS doctor_name FROM clinic_profiles cp JOIN doctors d ON d.id = cp.doctor_id WHERE cp.doctor_id=$1`,
      [req.doctorId]
    )
    res.json(shape(rows[0] || null))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch clinic profile.' })
  }
})

// PUT /api/clinic-profile
router.put('/', async (req, res) => {
  const { clinicName, qualifications, registrationNumber, phone, email, address, logoData, slug,
    specialization, doctorPhone, city, state, postalCode, businessHours, closingDay, licenseKey, doctorName } = req.body
  if (logoData && (!/^data:image\/(png|jpeg|jpg|webp);base64,/.test(logoData) || logoData.length > 4 * 1024 * 1024)) {
    return res.status(400).json({ error: 'Logo must be a PNG, JPG or WebP image smaller than 3 MB.' })
  }
  try {
    if (slug) {
      const conflict = await pool.query('SELECT doctor_id FROM clinic_profiles WHERE slug=$1 AND doctor_id<>$2', [slug, req.doctorId])
      if (conflict.rows.length) return res.status(409).json({ error: 'That clinic URL is already in use.' })
    }
    if (doctorName?.trim()) await pool.query('UPDATE doctors SET name=$1, qualifications=$2 WHERE id=$3', [doctorName.trim(), qualifications || '', req.doctorId])
    const { rows } = await pool.query(
      `INSERT INTO clinic_profiles (doctor_id, clinic_name, qualifications, registration_number, phone, email, address, logo_data, slug, specialization, doctor_phone, city, state, postal_code, business_hours, closing_day, license_key, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())
       ON CONFLICT (doctor_id) DO UPDATE SET
         clinic_name=$2, qualifications=$3, registration_number=$4, phone=$5, email=$6, address=$7,
         logo_data=$8, slug=COALESCE(NULLIF($9, ''), clinic_profiles.slug), specialization=$10, doctor_phone=$11,
         city=$12, state=$13, postal_code=$14, business_hours=$15, closing_day=$16, license_key=$17, updated_at=NOW()
       RETURNING *`,
      [req.doctorId, clinicName || '', qualifications || '', registrationNumber || '', phone || '', email || '', address || '', logoData || '', slug || '', specialization || '', doctorPhone || '', city || '', state || '', postalCode || '', businessHours || '', closingDay || '', licenseKey || '']
    )
    res.json(shape(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to save clinic profile.' })
  }
})

export default router
