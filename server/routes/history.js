import { Router } from 'express'
import pool from '../db.js'

const router = Router()

function dateOnly(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

router.get('/', async (req, res) => {
  const from = String(req.query.from || '').trim()
  const to = String(req.query.to || '').trim()
  const patientId = String(req.query.patientId || '').trim()
  const allHistory = String(req.query.all || '').toLowerCase() === 'true' && patientId
  if (!allHistory && (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to))) {
    return res.status(400).json({ error: 'Valid from and to dates are required.' })
  }

  try {
    const values = [req.doctorId]
    const dateFilter = allHistory ? '' : ` AND v.date BETWEEN $${values.push(from)}::date AND $${values.push(to)}::date`
    const patientFilter = patientId ? ` AND v.patient_id = $${values.push(patientId)}` : ''
    const visits = await pool.query(`
      SELECT v.*, p.id AS joined_patient_id, p.name AS joined_patient_name, p.phone AS joined_patient_phone,
             p.dob AS joined_patient_dob, p.gender AS joined_patient_gender, p.address AS joined_patient_address
      FROM visits v
      LEFT JOIN patients p ON p.id = v.patient_id
      WHERE v.doctor_id = $1${dateFilter}${patientFilter}
      ORDER BY v.date DESC, v.created_at DESC
    `, values)
    const prescriptionValues = allHistory ? [req.doctorId, patientId] : patientId ? values : values.slice(0, 3)
    const prescriptionDateFilter = allHistory ? '' : ` AND r.date BETWEEN $2::date AND $3::date`
    const prescriptions = await pool.query(`
      SELECT r.*, p.id AS joined_patient_id, p.name AS joined_patient_name, p.phone AS joined_patient_phone,
             p.dob AS joined_patient_dob, p.gender AS joined_patient_gender, p.address AS joined_patient_address
      FROM prescriptions r
      LEFT JOIN patients p ON p.id = r.patient_id
      WHERE r.doctor_id = $1${prescriptionDateFilter}${patientId ? ` AND r.patient_id = $${allHistory ? 2 : 4}` : ''}
      ORDER BY r.date DESC, r.created_at DESC
    `, prescriptionValues)

    const patients = new Map()
    for (const row of visits.rows) {
      if (row.joined_patient_id) patients.set(row.joined_patient_id, {
        id: row.joined_patient_id, name: row.joined_patient_name, phone: row.joined_patient_phone,
        dob: dateOnly(row.joined_patient_dob), gender: row.joined_patient_gender, address: row.joined_patient_address
      })
    }
    for (const row of prescriptions.rows) {
      if (row.joined_patient_id) patients.set(row.joined_patient_id, {
        id: row.joined_patient_id, name: row.joined_patient_name, phone: row.joined_patient_phone,
        dob: dateOnly(row.joined_patient_dob), gender: row.joined_patient_gender, address: row.joined_patient_address
      })
    }
    res.json({
      patients: [...patients.values()],
      visits: visits.rows.map((row) => ({
        id: row.id, patientId: row.patient_id, date: dateOnly(row.date), complaint: row.complaint,
        diagnosis: row.diagnosis, notes: row.notes, weight: row.weight, temperature: row.temperature,
        paymentDone: row.payment_done ? 'Yes' : 'No', fees: row.fees, createdAt: row.created_at
      })),
      prescriptions: prescriptions.rows.map((row) => ({
        id: row.id, patientId: row.patient_id, patientName: row.patient_name, date: dateOnly(row.date),
        patientPhone: row.patient_phone || row.joined_patient_phone || '', gender: row.gender || row.joined_patient_gender || '',
        complaint: row.complaint, diagnosis: row.diagnosis, medicines: row.medicines || [], notes: row.notes,
        advice: row.advice, followUpDate: dateOnly(row.follow_up_date), createdAt: row.created_at
      }))
    })
  } catch (err) {
    console.error('History query error:', err)
    res.status(500).json({ error: 'Failed to load patient history.' })
  }
})

export default router