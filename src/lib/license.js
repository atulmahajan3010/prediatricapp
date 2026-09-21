const LICENSE_SEED = 'sachi-saavi'
const ACTIVATION_STORAGE_KEY = 'doctor-prescription.activation'
const MACHINE_ID_STORAGE_KEY = 'doctor-prescription.machine-id'

export function encodeLicenseValue(value = LICENSE_SEED) {
  return btoa(unescape(encodeURIComponent(value)))
}

export function isValidLicense(value) {
  return String(value || '').trim() === encodeLicenseValue()
}

function createMachineId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()
  return `${Date.now()}${Math.random().toString(36).slice(2)}`.replace(/[^A-Z0-9]/gi, '').slice(0, 16).toUpperCase()
}

export function getMachineId() {
  if (typeof window === 'undefined') return 'UNAVAILABLE'
  const existing = window.localStorage.getItem(MACHINE_ID_STORAGE_KEY)
  if (existing) return existing
  const machineId = createMachineId()
  window.localStorage.setItem(MACHINE_ID_STORAGE_KEY, machineId)
  return machineId
}

export function getActivation() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(ACTIVATION_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function activateLicense(key) {
  const normalizedKey = String(key || '').trim()
  if (!isValidLicense(normalizedKey)) {
    return { success: false, error: 'That activation key is not valid.' }
  }

  const activation = {
    status: 'active',
    machineId: getMachineId(),
    activatedAt: new Date().toISOString(),
    licenseType: 'Lifetime clinic license'
  }
  window.localStorage.setItem(ACTIVATION_STORAGE_KEY, JSON.stringify(activation))
  return { success: true, activation }
}

export function clearActivation() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(ACTIVATION_STORAGE_KEY)
}