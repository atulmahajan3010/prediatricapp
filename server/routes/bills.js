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
    visitId: r.visit_id,
    items: r.items || [],
    discount: r.discount,
    total: r.total,
    paymentMode: r.payment_mode,
    paid: r.paid,
    date: formatDateOnly(r.date),
    createdAt: r.created_at
  }
}

// GET /api/bills
router.get('/', async (req, res) => {
  try {
    const pagination = parsePagination(req.query)
    const values = [req.doctorId]
    const pageSql = pagination ? ` LIMIT $${values.push(pagination.limit)} OFFSET $${values.push(pagination.offset)}` : ''
    const countResult = pagination ? await pool.query('SELECT COUNT(*)::int AS total FROM bills WHERE doctor_id=$1', [req.doctorId]) : null
    const { rows } = await pool.query(
      `SELECT * FROM bills WHERE doctor_id=$1 ORDER BY created_at DESC${pageSql}`,
      values
    )
    if (pagination) setPaginationHeaders(res, countResult.rows[0].total, pagination)
    res.json(rows.map(shape))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bills.' })
  }
})

// POST /api/bills
router.post('/', async (req, res) => {
  const { patientId, visitId, items, discount, total, paymentMode, paid, date } = req.body
  if (!date) return res.status(400).json({ error: 'Date is required.' })
  try {
    const { rows } = await pool.query(
      `INSERT INTO bills (doctor_id, patient_id, visit_id, items, discount, total, payment_mode, paid, date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.doctorId, patientId || null, visitId || null,
       JSON.stringify(items || []), Number(discount) || 0, Number(total) || 0,
       paymentMode || 'Cash', !!paid, date]
    )
    res.status(201).json(shape(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create bill.' })
  }
})

export default router
