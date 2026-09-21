import test from 'node:test'
import assert from 'node:assert/strict'
import { validateRecoveryRequest } from './passwordRecovery.js'

test('validates and normalizes reset requests', () => {
  const result = validateRecoveryRequest('  Dr.Smith@Example.com  ', 'NewPassword123')
  assert.deepEqual(result, { email: 'dr.smith@example.com', password: 'NewPassword123' })
})

test('rejects invalid email and weak passwords', () => {
  assert.throws(() => validateRecoveryRequest('', 'NewPassword123'), /Email is required/i)
  assert.throws(() => validateRecoveryRequest('doctor@example.com', 'short'), /at least 8 characters/i)
  assert.throws(() => validateRecoveryRequest('invalid-email', 'NewPassword123'), /valid email/i)
})
