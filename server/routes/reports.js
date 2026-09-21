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

router.get('/summary', async (req, res) => {
  const from = String(req.query.from || '').trim()
  const to = String(req.query.to || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: 'Valid from and to dates are required.' })
  }

  try {
    const { rows } = await pool.query(`
      WITH range_visits AS (
        SELECT patient_id, payment_done, fees
        FROM visits
        WHERE doctor_id = $1 AND date BETWEEN $2::date AND $3::date
      ),
      range_patients AS (
        SELECT DISTINCT patient_id FROM range_visits WHERE patient_id IS NOT NULL
      ),
      new_patients AS (
        SELECT id FROM patients
        WHERE doctor_id = $1 AND created_at >= $2::date AND created_at < ($3::date + INTERVAL '1 day')
      )
      SELECT
        (SELECT COUNT(*)::int FROM range_patients) AS patients,
        (SELECT COUNT(*)::int FROM new_patients) AS "newPatients",
        (SELECT COUNT(*)::int FROM range_patients rp WHERE NOT EXISTS (SELECT 1 FROM new_patients np WHERE np.id = rp.patient_id)) AS "repeatPatients",
        (SELECT COUNT(*)::int FROM range_visits) AS visits,
        (SELECT COUNT(*)::int FROM prescriptions WHERE doctor_id = $1 AND date BETWEEN $2::date AND $3::date) AS prescriptions,
        (SELECT COUNT(*)::int FROM range_visits WHERE payment_done) AS "paidVisits",
        (SELECT COUNT(*)::int FROM range_visits WHERE NOT payment_done) AS pending,
        COALESCE((SELECT SUM(fees) FROM range_visits WHERE payment_done), 0)::numeric AS "totalFees",
        COALESCE((SELECT AVG(fees) FROM range_visits WHERE payment_done), 0)::numeric AS "avgFee"
    `, [req.doctorId, from, to])
    res.json(rows[0])
  } catch (err) {
    console.error('Reports summary error:', err)
    res.status(500).json({ error: 'Failed to load report summary.' })
  }
})

router.get('/earnings', async (req, res) => {
  const from = String(req.query.from || '').trim()
  const to = String(req.query.to || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: 'Valid from and to dates are required.' })
  }

  try {
    const { rows } = await pool.query(`
      SELECT v.date, COALESCE(SUM(v.fees), 0)::numeric AS earnings
      FROM visits v
      WHERE v.doctor_id = $1 AND v.date BETWEEN $2::date AND $3::date AND v.payment_done = TRUE
      GROUP BY v.date
      ORDER BY v.date ASC
    `, [req.doctorId, from, to])
    res.json(rows.map((row) => ({
      date: dateOnly(row.date),
      earnings: Number(row.earnings) || 0
    })))
  } catch (err) {
    console.error('Reports earnings error:', err)
    res.status(500).json({ error: 'Failed to load daily earnings.' })
  }
})

export default router