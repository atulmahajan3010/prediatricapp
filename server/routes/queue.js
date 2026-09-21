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
    patientName: r.patient_name,
    patientPhone: r.patient_phone,
    date: formatDateOnly(r.date),
    status: r.status,
    addedAt: r.added_at
  }
}

// GET /api/queue
router.get('/', async (req, res) => {
  try {
    const pagination = parsePagination(req.query)
    const values = [req.doctorId]
    const filters = ['doctor_id=$1']
    if (req.query.date) {
      values.push(req.query.date)
      filters.push(`date=$${values.length}`)
    }
    const where = filters.join(' AND ')
    const pageSql = pagination ? ` LIMIT $${values.push(pagination.limit)} OFFSET $${values.push(pagination.offset)}` : ''
    const countResult = pagination ? await pool.query(`SELECT COUNT(*)::int AS total FROM queue WHERE ${where}`, values.slice(0, req.query.date ? 2 : 1)) : null
    const { rows } = await pool.query(
      `SELECT * FROM queue WHERE ${where} ORDER BY added_at ASC${pageSql}`,
      values
    )
    if (pagination) setPaginationHeaders(res, countResult.rows[0].total, pagination)
    res.json(rows.map(shape))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch queue.' })
  }
})

// POST /api/queue
router.post('/', async (req, res) => {
  const { patientId, patientName, patientPhone, date, status } = req.body
  try {
    const { rows } = await pool.query(
      `INSERT INTO queue (doctor_id, patient_id, patient_name, patient_phone, date, status)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.doctorId, patientId || null, patientName || '', patientPhone || '', date, status || 'waiting']
    )
    res.status(201).json(shape(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to add to queue.' })
  }
})

// PUT /api/queue/:id
router.put('/:id', async (req, res) => {
  const { status } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE queue SET status=$1 WHERE id=$2 AND doctor_id=$3 RETURNING *`,
      [status, req.params.id, req.doctorId]
    )
    if (!rows.length) return res.status(404).json({ error: 'Queue entry not found.' })
    res.json(shape(rows[0]))
  } catch (err) {
    res.status(500).json({ error: 'Failed to update queue.' })
  }
})

// DELETE /api/queue/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM queue WHERE id=$1 AND doctor_id=$2', [req.params.id, req.doctorId])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove from queue.' })
  }
})

export default router
