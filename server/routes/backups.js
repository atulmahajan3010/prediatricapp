import { Router } from 'express'
import pool from '../db.js'

const router = Router()

const tables = [
  ['patients', 'created_at DESC'],
  ['visits', 'date DESC, created_at DESC'],
  ['prescriptions', 'date DESC, created_at DESC'],
  ['medicines', 'created_at DESC'],
  ['templates', 'created_at DESC'],
  ['bills', 'date DESC, created_at DESC'],
  ['queue', 'date DESC, added_at DESC']
]

router.get('/export', async (req, res) => {
  try {
    const result = await Promise.all(tables.map(([table, order]) => pool.query(
      `SELECT * FROM ${table} WHERE doctor_id=$1 ORDER BY ${order}`,
      [req.doctorId]
    )))
    const { rows: profileRows } = await pool.query(
      'SELECT * FROM clinic_profiles WHERE doctor_id=$1',
      [req.doctorId]
    )
    const { rows: doctorRows } = await pool.query(
      'SELECT id, name, email, qualifications, created_at FROM doctors WHERE id=$1',
      [req.doctorId]
    )
    const { rows: pharmacyRows } = await pool.query(
      'SELECT * FROM pharmacy_configs WHERE doctor_id=$1',
      [req.doctorId]
    )

    res.json({
      format: 'doctor-prescription-app-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      doctor: doctorRows[0] || null,
      clinicProfile: profileRows[0] || null,
      pharmacyConfig: pharmacyRows[0] || null,
      ...Object.fromEntries(tables.map(([table], index) => [table, result[index].rows]))
    })
  } catch (error) {
    console.error('Backup export failed:', error)
    res.status(500).json({ error: 'Could not create the database backup.' })
  }
})

export default router