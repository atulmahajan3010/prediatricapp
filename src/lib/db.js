// Offline data layer. Everything is stored in the browser's localStorage on
// this machine only - no server, no internet needed. Each doctor's data is
// namespaced by their doctor id so multiple doctors can use the same
// installation without mixing records.

const DOCTORS_KEY = 'dpa:doctors'
const SESSION_KEY = 'dpa:session'

export function uid(prefix = '') {
  const r = Math.random().toString(36).slice(2, 9)
  const t = Date.now().toString(36)
  return `${prefix}${t}${r}`
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

// ---------------- Doctors / Auth ----------------

export function listDoctors() {
  return read(DOCTORS_KEY, [])
}

export function findDoctorByEmail(email) {
  return listDoctors().find(
    (d) => d.email.toLowerCase() === String(email).toLowerCase()
  )
}

export function registerDoctor({ name, email, password, qualifications }) {
  const doctors = listDoctors()
  if (findDoctorByEmail(email)) {
    throw new Error('An account with this email already exists.')
  }
  const doctor = {
    id: uid('doc_'),
    name,
    email,
    password, // stored locally only, this app never leaves the machine
    qualifications: qualifications || '',
    createdAt: new Date().toISOString()
  }
  doctors.push(doctor)
  write(DOCTORS_KEY, doctors)
  return doctor
}

export function loginDoctor(email, password) {
  const doctor = findDoctorByEmail(email)
  if (!doctor || doctor.password !== password) {
    throw new Error('Incorrect email or password.')
  }
  write(SESSION_KEY, doctor.id)
  return doctor
}

export function getSessionDoctor() {
  const id = read(SESSION_KEY, null)
  if (!id) return null
  return listDoctors().find((d) => d.id === id) || null
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}

// ---------------- Generic per-doctor collections ----------------

function collKey(doctorId, collection) {
  return `dpa:${doctorId}:${collection}`
}

export function listAll(doctorId, collection) {
  return read(collKey(doctorId, collection), [])
}

export function getById(doctorId, collection, id) {
  return listAll(doctorId, collection).find((r) => r.id === id) || null
}

export function create(doctorId, collection, data) {
  const items = listAll(doctorId, collection)
  const record = {
    id: uid(),
    createdAt: new Date().toISOString(),
    ...data
  }
  items.unshift(record)
  write(collKey(doctorId, collection), items)
  return record
}

export function update(doctorId, collection, id, patch) {
  const items = listAll(doctorId, collection)
  const idx = items.findIndex((r) => r.id === id)
  if (idx === -1) return null
  items[idx] = { ...items[idx], ...patch, updatedAt: new Date().toISOString() }
  write(collKey(doctorId, collection), items)
  return items[idx]
}

export function remove(doctorId, collection, id) {
  const items = listAll(doctorId, collection).filter((r) => r.id !== id)
  write(collKey(doctorId, collection), items)
}

export function replaceAll(doctorId, collection, items) {
  write(collKey(doctorId, collection), items)
}

// ---------------- Clinic profile (singleton per doctor) ----------------

export function getClinicProfile(doctorId) {
  return read(collKey(doctorId, 'clinicProfile'), {
    clinicName: '',
    qualifications: '',
    registrationNumber: '',
    phone: '',
    email: '',
    address: ''
  })
}

export function saveClinicProfile(doctorId, profile) {
  write(collKey(doctorId, 'clinicProfile'), profile)
  return profile
}

// ---------------- Export helpers ----------------

export function exportAllData(doctorId) {
  const collections = [
    'patients',
    'visits',
    'prescriptions',
    'medicines',
    'templates',
    'followups',
    'bills',
    'queue'
  ]
  const dump = { clinicProfile: getClinicProfile(doctorId) }
  for (const c of collections) dump[c] = listAll(doctorId, c)
  return dump
}
