import { Router } from 'express'
import pool from '../db.js'
import { parsePagination, setPaginationHeaders } from '../pagination.js'

const router = Router()

function formatDateOnly(value) {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function shape(r) {
  return {
    id: r.id,
    patientId: r.patient_id,
    date: formatDateOnly(r.date),
    complaint: r.complaint,
    diagnosis: r.diagnosis,
    notes: r.notes,
    weight: r.weight,
    temperature: r.temperature,
    paymentDone: r.payment_done ? 'Yes' : 'No',
    fees: r.fees,
    createdAt: r.created_at
  }
}

// GET /api/visits
router.get('/', async (req, res) => {
  try {
    const pagination = parsePagination(req.query)
    const values = [req.doctorId]
    const pageSql = pagination ? ` LIMIT $${values.push(pagination.limit)} OFFSET $${values.push(pagination.offset)}` : ''
    const countResult = pagination
      ? await pool.query('SELECT COUNT(*)::int AS total FROM visits WHERE doctor_id=$1', [req.doctorId])
      : null
    const { rows } = await pool.query(
      `SELECT * FROM visits WHERE doctor_id=$1 ORDER BY date DESC, created_at DESC${pageSql}`,
      values
    )
    if (pagination) setPaginationHeaders(res, countResult.rows[0].total, pagination)
    res.json(rows.map(shape))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch visits.' })
  }
})

// POST /api/visits
router.post('/', async (req, res) => {
  const { patientId, date, complaint, diagnosis, notes, weight, temperature, paymentDone, fees } = req.body
  if (!patientId || !date) return res.status(400).json({ error: 'Patient and date are required.' })
  try {
    const { rows } = await pool.query(
      `INSERT INTO visits (doctor_id, patient_id, date, complaint, diagnosis, notes, weight, temperature, payment_done, fees)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.doctorId, patientId, date, complaint || '', diagnosis || '', notes || '',
       weight || '', temperature || '', paymentDone === 'Yes', Number(fees) || 0]
    )
    res.status(201).json(shape(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create visit.' })
  }
})

// PUT /api/visits/:id
router.put('/:id', async (req, res) => {
  const { date, complaint, diagnosis, notes, weight, temperature, paymentDone, fees } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE visits SET date=$1, complaint=$2, diagnosis=$3, notes=$4, weight=$5,
       temperature=$6, payment_done=$7, fees=$8, updated_at=NOW()
       WHERE id=$9 AND doctor_id=$10 RETURNING *`,
      [date, complaint || '', diagnosis || '', notes || '', weight || '',
       temperature || '', paymentDone === 'Yes', Number(fees) || 0, req.params.id, req.doctorId]
    )
    if (!rows.length) return res.status(404).json({ error: 'Visit not found.' })
    res.json(shape(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update visit.' })
  }
})

export default router
