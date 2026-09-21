import { Router } from 'express'
import pool from '../db.js'
import { parsePagination, setPaginationHeaders } from '../pagination.js'

const router = Router()

function shape(r) {
  return {
    id: r.id,
    name: r.name,
    genericName: r.generic_name,
    strength: r.strength,
    form: r.form,
    createdAt: r.created_at
  }
}

// GET /api/medicines
router.get('/', async (req, res) => {
  try {
    const pagination = parsePagination(req.query)
    const values = [req.doctorId]
    const filters = ['doctor_id=$1']
    if (req.query.search) {
      values.push(`${String(req.query.search).trim()}%`)
      filters.push(`LOWER(name) LIKE LOWER($${values.length})`)
    }
    const where = filters.join(' AND ')
    const countResult = pagination ? await pool.query(`SELECT COUNT(*)::int AS total FROM medicines WHERE ${where}`, values) : null
    const pageSql = pagination ? ` LIMIT $${values.push(pagination.limit)} OFFSET $${values.push(pagination.offset)}` : ''
    const { rows } = await pool.query(
      `SELECT * FROM medicines WHERE ${where} ORDER BY name ASC${pageSql}`,
      values
    )
    if (pagination) setPaginationHeaders(res, countResult.rows[0].total, pagination)
    res.json(rows.map(shape))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch medicines.' })
  }
})

// POST /api/medicines — single entry
router.post('/', async (req, res) => {
  const { name, genericName, strength, form } = req.body
  if (!name) return res.status(400).json({ error: 'Medicine name is required.' })
  try {
    const { rows } = await pool.query(
      `INSERT INTO medicines (doctor_id, name, generic_name, strength, form)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.doctorId, name.trim(), genericName || '', strength || '', form || '']
    )
    res.status(201).json(shape(rows[0]))
  } catch (err) {
    res.status(500).json({ error: 'Failed to add medicine.' })
  }
})

// POST /api/medicines/bulk-import — CSV rows array
router.post('/bulk-import', async (req, res) => {
  const { medicines: list } = req.body
  if (!Array.isArray(list) || list.length === 0) {
    return res.status(400).json({ error: 'No medicines provided.' })
  }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const inserted = []
    for (const m of list) {
      if (!m.name) continue
      const { rows } = await client.query(
        `INSERT INTO medicines (doctor_id, name, generic_name, strength, form)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [req.doctorId, m.name.trim(), m.genericName || '', m.strength || '', m.form || '']
      )
      inserted.push(shape(rows[0]))
    }
    await client.query('COMMIT')
    res.status(201).json({ imported: inserted.length, medicines: inserted })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ error: 'Bulk import failed.' })
  } finally {
    client.release()
  }
})

// PUT /api/medicines/:id
router.put('/:id', async (req, res) => {
  const { name, genericName, strength, form } = req.body
  if (!name || !name.trim()) return res.status(400).json({ error: 'Medicine name is required.' })
  try {
    const { rows } = await pool.query(
      `UPDATE medicines SET name=$1, generic_name=$2, strength=$3, form=$4, updated_at=NOW()
       WHERE id=$5 AND doctor_id=$6 RETURNING *`,
      [name.trim(), genericName || '', strength || '', form || '', req.params.id, req.doctorId]
    )
    if (!rows.length) return res.status(404).json({ error: 'Medicine not found.' })
    res.json(shape(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update medicine.' })
  }
})

// DELETE /api/medicines/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM medicines WHERE id=$1 AND doctor_id=$2', [req.params.id, req.doctorId])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete medicine.' })
  }
})

export default router
