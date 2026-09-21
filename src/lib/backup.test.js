import test from 'node:test'
import assert from 'node:assert/strict'

import { getLastBackup, isBackupDue, markBackupComplete } from './backup.js'

const store = new Map()

globalThis.localStorage = {
  getItem(key) {
    return store.has(key) ? store.get(key) : null
  },
  setItem(key, value) {
    store.set(key, String(value))
  },
  removeItem(key) {
    store.delete(key)
  }
}

globalThis.window = {
  dispatchEvent(event) {
    globalThis.__lastEvent = event.type
  }
}

test('markBackupComplete records the backup and hides the reminder immediately', () => {
  store.clear()
  const timestamp = markBackupComplete('doctor-1')

  assert.equal(getLastBackup('doctor-1'), timestamp)
  assert.equal(isBackupDue('doctor-1'), false)
  assert.equal(globalThis.__lastEvent, 'backup-status-changed')
})
