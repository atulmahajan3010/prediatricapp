import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { authMiddleware } from './middleware/auth.js'
import pool from './db.js'

import authRoutes from './routes/auth.js'
import patientRoutes from './routes/patients.js'
import visitRoutes from './routes/visits.js'
import prescriptionRoutes from './routes/prescriptions.js'
import medicineRoutes from './routes/medicines.js'
import templateRoutes from './routes/templates.js'
import billRoutes from './routes/bills.js'
import queueRoutes from './routes/queue.js'
import clinicRoutes from './routes/clinic.js'
import publicRoutes from './routes/public.js'
import dashboardRoutes from './routes/dashboard.js'
import reportsRoutes from './routes/reports.js'
import historyRoutes from './routes/history.js'
import backupRoutes from './routes/backups.js'
import pharmacyRoutes from './routes/pharmacy.js'
import whatsappRoutes from './routes/whatsapp.js'

const defaultEnvPath = process.cwd().endsWith(`${path.sep}server`)
  ? path.resolve(process.cwd(), '..', '.env')
  : path.resolve(process.cwd(), '.env')
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || defaultEnvPath })

const app = express()
const PORT = Number(process.env.PORT || 3001)
const HOST = process.env.HOST || '127.0.0.1'

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173'],
  credentials: true
}))
app.use(express.json({ limit: '5mb' }))

// Public routes (no auth)
app.use('/api/auth', authRoutes)
app.use('/api/public', publicRoutes)
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

// Protected routes — all require a valid JWT
app.use('/api', authMiddleware)
app.use('/api/patients', patientRoutes)
app.use('/api/visits', visitRoutes)
app.use('/api/prescriptions', prescriptionRoutes)
app.use('/api/medicines', medicineRoutes)
app.use('/api/templates', templateRoutes)
app.use('/api/bills', billRoutes)
app.use('/api/queue', queueRoutes)
app.use('/api/clinic-profile', clinicRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/history', historyRoutes)
app.use('/api/backups', backupRoutes)
app.use('/api/pharmacy-config', pharmacyRoutes)
app.use('/api/whatsapp', whatsappRoutes)

// In the desktop build, Express also serves the compiled React app.
if (process.env.STATIC_DIR) {
  app.use(express.static(process.env.STATIC_DIR))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(path.join(process.env.STATIC_DIR, 'index.html'))
  })
}

// Generic error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Server error.' })
})

export { app }

async function startServer() {
  try {
    await pool.query(`
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS pr VARCHAR(20) DEFAULT '';
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS spo2 VARCHAR(20) DEFAULT '';
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS height VARCHAR(20) DEFAULT '';
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS bsa VARCHAR(20) DEFAULT '';
      ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS respiratory_rate VARCHAR(20) DEFAULT '';
      ALTER TABLE patients ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(30) DEFAULT '';
      ALTER TABLE patients ADD COLUMN IF NOT EXISTS whatsapp_allowed BOOLEAN NOT NULL DEFAULT FALSE;
      CREATE TABLE IF NOT EXISTS pharmacy_configs (
        doctor_id UUID PRIMARY KEY REFERENCES doctors(id) ON DELETE CASCADE,
        pharmacy_name VARCHAR(255) DEFAULT '', owner_name VARCHAR(255) DEFAULT '',
        phone VARCHAR(30) DEFAULT '', whatsapp_number VARCHAR(30) DEFAULT '',
        address TEXT DEFAULT '', license_number VARCHAR(100) DEFAULT '',
        notes TEXT DEFAULT '', enabled BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE pharmacy_configs ADD COLUMN IF NOT EXISTS pharmacy_name VARCHAR(255) DEFAULT '';
      ALTER TABLE pharmacy_configs ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255) DEFAULT '';
      ALTER TABLE pharmacy_configs ADD COLUMN IF NOT EXISTS phone VARCHAR(30) DEFAULT '';
      ALTER TABLE pharmacy_configs ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(30) DEFAULT '';
      ALTER TABLE pharmacy_configs ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
      ALTER TABLE pharmacy_configs ADD COLUMN IF NOT EXISTS license_number VARCHAR(100) DEFAULT '';
      ALTER TABLE pharmacy_configs ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
      ALTER TABLE pharmacy_configs ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE;
    `)
    console.log('Prescription clinical fields verified.')
  } catch (error) {
    console.error('Prescription field migration failed:', error.message)
    process.env.API_STARTUP_ERROR = error.message
    process.exitCode = 1
    return
  }

  app.listen(PORT, HOST, () => {
    console.log(`\n🏥 Doctor Prescription API running on http://${HOST}:${PORT}`)
    console.log(`   POST /api/auth/register — create doctor account`)
    console.log(`   POST /api/auth/login    — authenticate\n`)
  })
}

startServer()
