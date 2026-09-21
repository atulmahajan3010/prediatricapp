import { Router } from 'express'
import pool from '../db.js'

const router = Router()
let dashboardIndexesReady

function ensureDashboardIndexes() {
  if (!dashboardIndexesReady) {
    dashboardIndexesReady = Promise.all([
      pool.query('CREATE INDEX IF NOT EXISTS idx_patients_dashboard_recent ON patients (doctor_id, created_at DESC) INCLUDE (name, phone)'),
      pool.query('CREATE INDEX IF NOT EXISTS idx_queue_dashboard_today ON queue (doctor_id, date, status)'),
      pool.query('CREATE INDEX IF NOT EXISTS idx_bills_dashboard_paid ON bills (doctor_id, paid) INCLUDE (total)'),
      pool.query('CREATE INDEX IF NOT EXISTS idx_rx_dashboard_followup ON prescriptions (doctor_id, follow_up_date) INCLUDE (id, patient_id, patient_name)')
    ]).catch((err) => {
      dashboardIndexesReady = null
      throw err
    })
  }
  return dashboardIndexesReady
}

router.get('/', async (req, res) => {
  try {
    await ensureDashboardIndexes()
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM patients WHERE doctor_id=$1) AS patients,
        (SELECT COUNT(*)::int FROM queue WHERE doctor_id=$1 AND date=CURRENT_DATE AND status <> 'done') AS "waitingToday",
        (SELECT COUNT(*)::int FROM visits WHERE doctor_id=$1 AND payment_done) AS "paidVisits",
        (SELECT COUNT(*)::int FROM visits WHERE doctor_id=$1 AND NOT payment_done) AS "pendingVisits",
        (SELECT COALESCE(SUM(fees), 0)::numeric FROM visits WHERE doctor_id=$1 AND payment_done) AS revenue,
        (SELECT COUNT(*)::int FROM visits WHERE doctor_id=$1 AND date=CURRENT_DATE) AS "todayVisits",
        (SELECT COUNT(*)::int FROM prescriptions WHERE doctor_id=$1) AS prescriptions,
        COALESCE((SELECT json_agg(follow_up ORDER BY (follow_up->>'followUpDate')) FROM (
          SELECT json_build_object(
            'id', id,
            'patientId', patient_id,
            'patientName', patient_name,
            'followUpDate', TO_CHAR(follow_up_date, 'YYYY-MM-DD')
          ) AS follow_up
          FROM prescriptions
          WHERE doctor_id=$1 AND follow_up_date IS NOT NULL
          ORDER BY follow_up_date ASC
          LIMIT 3
        ) followups), '[]'::json) AS "followUps",
        COALESCE((SELECT json_agg(recent_patient ORDER BY (recent_patient->>'createdAt') DESC) FROM (
          SELECT json_build_object(
            'id', id,
            'name', name,
            'phone', phone,
            'createdAt', created_at
          ) AS recent_patient
          FROM patients
          WHERE doctor_id=$1
          ORDER BY created_at DESC
          LIMIT 3
        ) recent), '[]'::json) AS "recentPatients"
    `, [req.doctorId])

    res.json(rows[0])
  } catch (err) {
    console.error('Dashboard GET error:', err)
    res.status(500).json({ error: 'Failed to load dashboard.' })
  }
})

export default router