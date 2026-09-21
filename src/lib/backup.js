import { api } from './api.js'

const LAST_BACKUP_PREFIX = 'dpa:last-backup:'
const SNOOZE_PREFIX = 'dpa:backup-reminder-snooze:'
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
const BACKUP_STATUS_EVENT = 'backup-status-changed'

function key(prefix, doctorId) {
  return `${prefix}${doctorId}`
}

function notifyBackupStatusChange() {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new Event(BACKUP_STATUS_EVENT))
  }
}

function validTimestamp(value) {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

export function getLastBackup(doctorId) {
  const value = localStorage.getItem(key(LAST_BACKUP_PREFIX, doctorId))
  if (!value) return null
  const timestamp = validTimestamp(value)
  if (!timestamp) {
    localStorage.removeItem(key(LAST_BACKUP_PREFIX, doctorId))
    return null
  }
  return new Date(timestamp).toISOString()
}

export function markBackupComplete(doctorId) {
  const timestamp = new Date().toISOString()
  localStorage.setItem(key(LAST_BACKUP_PREFIX, doctorId), timestamp)
  localStorage.removeItem(key(SNOOZE_PREFIX, doctorId))
  notifyBackupStatusChange()
  return timestamp
}

export function snoozeBackupReminder(doctorId) {
  localStorage.setItem(key(SNOOZE_PREFIX, doctorId), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
  notifyBackupStatusChange()
}

export function isBackupDue(doctorId) {
  const snoozedUntil = localStorage.getItem(key(SNOOZE_PREFIX, doctorId))
  if (snoozedUntil) {
    const snoozeAt = validTimestamp(snoozedUntil)
    if (snoozeAt && snoozeAt > Date.now()) return false
    localStorage.removeItem(key(SNOOZE_PREFIX, doctorId))
  }

  const lastBackup = getLastBackup(doctorId)
  if (!lastBackup) return true

  const lastBackupAt = validTimestamp(lastBackup)
  if (!lastBackupAt) return true

  return Date.now() - lastBackupAt >= THIRTY_DAYS
}

export function formatBackupDate(value) {
  if (!value) return 'No backup recorded on this computer'
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export async function createBackup() {
  return api.get('/backups/export')
}

export function downloadBackup(data) {
  const date = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `doctor-prescription-backup-${date}.json`
  link.click()
  URL.revokeObjectURL(url)
}