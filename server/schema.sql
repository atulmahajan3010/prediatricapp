-- Pediatric Prescription App — PostgreSQL Schema
-- This schema targets a NEW, dedicated database for the single-pediatric-doctor
-- workflow. Do NOT run this against the existing "doctor_app" database — create
-- a fresh database (e.g. "pediatric_clinic") and point PGDATABASE/DATABASE_URL
-- at it before running this file:
--   createdb pediatric_clinic
--   psql -U postgres -d pediatric_clinic -f schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Doctors
CREATE TABLE IF NOT EXISTS doctors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  qualifications TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Clinic letterhead settings (one per doctor)
CREATE TABLE IF NOT EXISTS clinic_profiles (
  doctor_id        UUID PRIMARY KEY REFERENCES doctors(id) ON DELETE CASCADE,
  clinic_name      VARCHAR(255) DEFAULT '',
  qualifications   VARCHAR(255) DEFAULT '',
  registration_number VARCHAR(100) DEFAULT '',
  phone            VARCHAR(50) DEFAULT '',
  email            VARCHAR(255) DEFAULT '',
  address          TEXT DEFAULT '',
  logo_data        TEXT DEFAULT '',
  slug             VARCHAR(160) UNIQUE,
  specialization   VARCHAR(255) DEFAULT '',
  doctor_phone     VARCHAR(50) DEFAULT '',
  city             VARCHAR(120) DEFAULT '',
  state            VARCHAR(120) DEFAULT '',
  postal_code      VARCHAR(20) DEFAULT '',
  business_hours   VARCHAR(255) DEFAULT '',
  closing_day      VARCHAR(30) DEFAULT '',
  license_key      VARCHAR(255) DEFAULT '',
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clinic_profiles ADD COLUMN IF NOT EXISTS logo_data TEXT DEFAULT '';
ALTER TABLE clinic_profiles ADD COLUMN IF NOT EXISTS slug VARCHAR(160);
ALTER TABLE clinic_profiles ADD COLUMN IF NOT EXISTS specialization VARCHAR(255) DEFAULT '';
ALTER TABLE clinic_profiles ADD COLUMN IF NOT EXISTS doctor_phone VARCHAR(50) DEFAULT '';
ALTER TABLE clinic_profiles ADD COLUMN IF NOT EXISTS city VARCHAR(120) DEFAULT '';
ALTER TABLE clinic_profiles ADD COLUMN IF NOT EXISTS state VARCHAR(120) DEFAULT '';
ALTER TABLE clinic_profiles ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20) DEFAULT '';
ALTER TABLE clinic_profiles ADD COLUMN IF NOT EXISTS business_hours VARCHAR(255) DEFAULT '';
ALTER TABLE clinic_profiles ADD COLUMN IF NOT EXISTS closing_day VARCHAR(30) DEFAULT '';
ALTER TABLE clinic_profiles ADD COLUMN IF NOT EXISTS license_key VARCHAR(255) DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_clinic_profiles_slug ON clinic_profiles(slug) WHERE slug IS NOT NULL;

-- Patients
CREATE TABLE IF NOT EXISTS patients (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id  UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  phone      VARCHAR(30) DEFAULT '',
  whatsapp_number VARCHAR(30) DEFAULT '',
  whatsapp_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  dob        DATE,
  age        VARCHAR(10),
  gender     VARCHAR(20) DEFAULT 'Male',
  address    TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_doctor ON patients(doctor_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone  ON patients(doctor_id, phone);
CREATE INDEX IF NOT EXISTS idx_patients_name_prefix ON patients (doctor_id, LOWER(name));
CREATE INDEX IF NOT EXISTS idx_patients_dashboard_recent ON patients (doctor_id, created_at DESC) INCLUDE (name, phone);
ALTER TABLE patients ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE patients ALTER COLUMN phone SET DEFAULT '';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(30) DEFAULT '';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS whatsapp_allowed BOOLEAN NOT NULL DEFAULT FALSE;

-- Visits
CREATE TABLE IF NOT EXISTS visits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id    UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id   UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  complaint    TEXT DEFAULT '',
  diagnosis    TEXT DEFAULT '',
  notes        TEXT DEFAULT '',
  weight       VARCHAR(20) DEFAULT '',
  temperature  VARCHAR(20) DEFAULT '',
  payment_done BOOLEAN DEFAULT FALSE,
  fees         NUMERIC(10,2) DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visits_doctor  ON visits(doctor_id);
CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_date    ON visits(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_visits_recent ON visits (doctor_id, date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_dashboard_paid ON visits (doctor_id) INCLUDE (fees) WHERE payment_done;

-- Prescriptions (pediatric single-doctor workflow — matches the clinic's prescription pad)
CREATE TABLE IF NOT EXISTS prescriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id       UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id      UUID REFERENCES patients(id) ON DELETE SET NULL,
  patient_name    VARCHAR(255),
  patient_phone   VARCHAR(30),
  age             VARCHAR(10),
  gender          VARCHAR(20),
  date            DATE NOT NULL,
  complaint       TEXT DEFAULT '',
  diagnosis       TEXT DEFAULT '',
  weight          VARCHAR(20) DEFAULT '',
  height          VARCHAR(20) DEFAULT '',
  bsa             VARCHAR(20) DEFAULT '',
  temperature     VARCHAR(20) DEFAULT '',
  pr              VARCHAR(20) DEFAULT '',
  respiratory_rate VARCHAR(20) DEFAULT '',
  spo2            VARCHAR(20) DEFAULT '',
  payment_done    BOOLEAN DEFAULT FALSE,
  fees            NUMERIC(10,2) DEFAULT 0,
  medicines       JSONB DEFAULT '[]',
  notes           TEXT DEFAULT '',
  advice          TEXT DEFAULT '',
  follow_up_date  DATE,
  prescription_days VARCHAR(20) DEFAULT '',
  template_size   VARCHAR(10) DEFAULT 'A4',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Safe additive migrations for pediatric vitals (no-op if the table already has these columns)
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS height VARCHAR(20) DEFAULT '';
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS bsa VARCHAR(20) DEFAULT '';
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS respiratory_rate VARCHAR(20) DEFAULT '';
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS pr VARCHAR(20) DEFAULT '';
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS spo2 VARCHAR(20) DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_rx_doctor    ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_rx_patient   ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_rx_date      ON prescriptions(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_rx_recent ON prescriptions (doctor_id, date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rx_followup  ON prescriptions(doctor_id, follow_up_date) WHERE follow_up_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rx_dashboard_followup ON prescriptions (doctor_id, follow_up_date) INCLUDE (id, patient_id, patient_name);

-- Medicines
CREATE TABLE IF NOT EXISTS medicines (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id    UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  generic_name VARCHAR(255) DEFAULT '',
  strength     VARCHAR(100) DEFAULT '',
  form         VARCHAR(100) DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medicines_doctor ON medicines(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medicines_name_prefix ON medicines (doctor_id, LOWER(name));

-- Templates
CREATE TABLE IF NOT EXISTS templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id   UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  diagnosis   TEXT DEFAULT '',
  medicines   JSONB DEFAULT '[]',
  notes       TEXT DEFAULT '',
  advice      TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_doctor ON templates(doctor_id);
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(doctor_id, name);

-- Bills
CREATE TABLE IF NOT EXISTS bills (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id    UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id   UUID REFERENCES patients(id) ON DELETE SET NULL,
  visit_id     UUID REFERENCES visits(id) ON DELETE SET NULL,
  items        JSONB DEFAULT '[]',
  discount     NUMERIC(10,2) DEFAULT 0,
  total        NUMERIC(10,2) DEFAULT 0,
  payment_mode VARCHAR(50) DEFAULT 'Cash',
  paid         BOOLEAN DEFAULT FALSE,
  date         DATE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bills_doctor  ON bills(doctor_id);
CREATE INDEX IF NOT EXISTS idx_bills_date    ON bills(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_bills_dashboard_paid ON bills (doctor_id, paid) INCLUDE (total);
CREATE INDEX IF NOT EXISTS idx_bills_recent ON bills (doctor_id, created_at DESC);

-- Pharmacy destination (one configuration per doctor)
CREATE TABLE IF NOT EXISTS pharmacy_configs (
  doctor_id       UUID PRIMARY KEY REFERENCES doctors(id) ON DELETE CASCADE,
  pharmacy_name   VARCHAR(255) DEFAULT '',
  owner_name      VARCHAR(255) DEFAULT '',
  phone           VARCHAR(30) DEFAULT '',
  whatsapp_number VARCHAR(30) DEFAULT '',
  address         TEXT DEFAULT '',
  license_number  VARCHAR(100) DEFAULT '',
  notes           TEXT DEFAULT '',
  enabled         BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pharmacy_configs ADD COLUMN IF NOT EXISTS pharmacy_name VARCHAR(255) DEFAULT '';
ALTER TABLE pharmacy_configs ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255) DEFAULT '';
ALTER TABLE pharmacy_configs ADD COLUMN IF NOT EXISTS phone VARCHAR(30) DEFAULT '';
ALTER TABLE pharmacy_configs ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(30) DEFAULT '';
ALTER TABLE pharmacy_configs ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE pharmacy_configs ADD COLUMN IF NOT EXISTS license_number VARCHAR(100) DEFAULT '';
ALTER TABLE pharmacy_configs ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE pharmacy_configs ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- Queue
CREATE TABLE IF NOT EXISTS queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id     UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id    UUID REFERENCES patients(id) ON DELETE SET NULL,
  patient_name  VARCHAR(255),
  patient_phone VARCHAR(30),
  date          DATE NOT NULL,
  status        VARCHAR(50) DEFAULT 'waiting',
  added_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queue_doctor ON queue(doctor_id);
CREATE INDEX IF NOT EXISTS idx_queue_date   ON queue(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_queue_dashboard_today ON queue (doctor_id, date, status);
CREATE INDEX IF NOT EXISTS idx_queue_added ON queue (doctor_id, date, added_at);
