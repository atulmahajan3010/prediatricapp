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

// GET /api/patients
router.get('/', async (req, res) => {
  try {
    const pagination = parsePagination(req.query)
    const search = String(req.query.search || '').trim()
    const values = [req.doctorId]
    const filters = ['doctor_id = $1']
    if (search) {
      values.push(`${search}%`)
      filters.push(`(LOWER(name) LIKE LOWER($${values.length}) OR phone LIKE $${values.length})`)
    }
    const where = filters.join(' AND ')
    const countResult = pagination
      ? await pool.query(`SELECT COUNT(*)::int AS total FROM patients WHERE ${where}`, values)
      : null
    const queryValues = [...values]
    const pageSql = pagination ? ` LIMIT $${queryValues.push(pagination.limit)} OFFSET $${queryValues.push(pagination.offset)}` : ''
    const { rows } = await pool.query(
      `SELECT id, name, phone, whatsapp_number, whatsapp_allowed, dob, age, gender, address, created_at
       FROM patients WHERE ${where} ORDER BY created_at DESC${pageSql}`,
      queryValues
    )
    if (pagination) setPaginationHeaders(res, countResult.rows[0].total, pagination)
    // Convert dob to ISO string for frontend compatibility
    res.json(rows.map(r => ({
      ...r,
      whatsappNumber: r.whatsapp_number || '',
      whatsappAllowed: Boolean(r.whatsapp_allowed),
      dob: formatDateOnly(r.dob),
      createdAt: r.created_at
    })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch patients.' })
  }
})

// POST /api/patients
router.post('/', async (req, res) => {
  const { name, phone, whatsappNumber, whatsappAllowed, dob, age, gender, address } = req.body
  if (!name) return res.status(400).json({ error: 'Name is required.' })
  try {
    const { rows } = await pool.query(
      `INSERT INTO patients (doctor_id, name, phone, whatsapp_number, whatsapp_allowed, dob, age, gender, address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, name, phone, whatsapp_number, whatsapp_allowed, dob, age, gender, address, created_at`,
      [req.doctorId, name.trim(), String(phone || '').trim(), String(whatsappNumber || phone || '').trim(), !!whatsappAllowed, dob || null, age || '', gender || 'Male', address || '']
    )
    const r = rows[0]
    res.status(201).json({ ...r, whatsappNumber: r.whatsapp_number || '', whatsappAllowed: Boolean(r.whatsapp_allowed), dob: formatDateOnly(r.dob), createdAt: r.created_at })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create patient.' })
  }
})

// PUT /api/patients/:id
router.put('/:id', async (req, res) => {
  const { name, phone, whatsappNumber, whatsappAllowed, dob, age, gender, address } = req.body
  try {
    const { rows } = await pool.query(
      `UPDATE patients SET name=$1, phone=$2, whatsapp_number=$3, whatsapp_allowed=$4, dob=$5, age=$6, gender=$7, address=$8, updated_at=NOW()
      WHERE id=$9 AND doctor_id=$10
       RETURNING id, name, phone, whatsapp_number, whatsapp_allowed, dob, age, gender, address, created_at`,
      [name, phone, String(whatsappNumber || phone || '').trim(), !!whatsappAllowed, dob || null, age || '', gender || 'Male', address || '', req.params.id, req.doctorId]
    )
    if (!rows.length) return res.status(404).json({ error: 'Patient not found.' })
    const r = rows[0]
    res.json({ ...r, whatsappNumber: r.whatsapp_number || '', whatsappAllowed: Boolean(r.whatsapp_allowed), dob: formatDateOnly(r.dob), createdAt: r.created_at })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update patient.' })
  }
})

// DELETE /api/patients/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM patients WHERE id=$1 AND doctor_id=$2', [req.params.id, req.doctorId])
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete patient.' })
  }
})

export default router
