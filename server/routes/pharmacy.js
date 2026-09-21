import { Router } from 'express'
import pool from '../db.js'

const router = Router()

function shape(row) {
  return {
    pharmacyName: row?.pharmacy_name || '',
    ownerName: row?.owner_name || '',
    phone: row?.phone || '',
    whatsappNumber: row?.whatsapp_number || '',
    address: row?.address || '',
    licenseNumber: row?.license_number || '',
    notes: row?.notes || '',
    enabled: row?.enabled ?? true
  }
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM pharmacy_configs WHERE doctor_id=$1', [req.doctorId])
    res.json(shape(rows[0]))
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pharmacy configuration.' })
  }
})

router.put('/', async (req, res) => {
  const { pharmacyName, ownerName, phone, whatsappNumber, address, licenseNumber, notes, enabled } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO pharmacy_configs (doctor_id, pharmacy_name, owner_name, phone, whatsapp_number, address, license_number, notes, enabled, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
       ON CONFLICT (doctor_id) DO UPDATE SET pharmacy_name=$2, owner_name=$3, phone=$4, whatsapp_number=$5,
       address=$6, license_number=$7, notes=$8, enabled=$9, updated_at=NOW() RETURNING *`,
      [req.doctorId, pharmacyName || '', ownerName || '', phone || '', whatsappNumber || '', address || '', licenseNumber || '', notes || '', enabled !== false]
    )
    res.json(shape(rows[0]))
  } catch (error) {
    console.error('Pharmacy configuration save failed:', error)
    res.status(500).json({ error: 'Failed to save pharmacy configuration.' })
  }
})

export default router