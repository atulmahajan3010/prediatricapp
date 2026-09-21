import { Router } from 'express'
import pool from '../db.js'
import { parsePagination, setPaginationHeaders } from '../pagination.js'

const router = Router()

// GET /api/templates
router.get('/', async (req, res) => {
  try {
    const pagination = parsePagination(req.query)
    const values = [req.doctorId]
    const pageSql = pagination ? ` LIMIT $${values.push(pagination.limit)} OFFSET $${values.push(pagination.offset)}` : ''
    const countResult = pagination ? await pool.query('SELECT COUNT(*)::int AS total FROM templates WHERE doctor_id=$1', [req.doctorId]) : null
    const { rows } = await pool.query(
      `SELECT * FROM templates WHERE doctor_id=$1 ORDER BY name ASC${pageSql}`,
      values
    )
    if (pagination) setPaginationHeaders(res, countResult.rows[0].total, pagination)
    res.json(rows.map(r => ({
      id: r.id, name: r.name, diagnosis: r.diagnosis,
      medicines: r.medicines || [], notes: r.notes, advice: r.advice, createdAt: r.created_at
    })))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch templates.' })
  }
})

// POST /api/templates
router.post('/', async (req, res) => {
  const { name, diagnosis, medicines, notes, advice } = req.body
  if (!name) return res.status(400).json({ error: 'Template name is required.' })
  try {
    const { rows } = await pool.query(
      `INSERT INTO templates (doctor_id, name, diagnosis, medicines, notes, advice)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.doctorId, name.trim(), diagnosis || '', JSON.stringify(medicines || []), notes || '', advice || '']
    )
    const r = rows[0]
    res.status(201).json({
      id: r.id, name: r.name, diagnosis: r.diagnosis,
      medicines: r.medicines || [], notes: r.notes, advice: r.advice, createdAt: r.created_at
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to save template.' })
  }
})

// DELETE /api/templates/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM templates WHERE id=$1 AND doctor_id=$2', [req.params.id, req.doctorId])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete template.' })
  }
})

export default router
