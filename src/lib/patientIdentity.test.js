import test from 'node:test'
import assert from 'node:assert/strict'

import { isPrescriptionUpdateMode, resolvePatientIdForSave } from './patientIdentity.js'

test('save mode reuses an exact matching patient when phone and name match', () => {
  const patients = [
    { id: 'p-old', name: 'Ram Kumar', phone: '9999999999' }
  ]

  const result = resolvePatientIdForSave({
    savedRx: null,
    matchedPatient: patients[0],
    patients,
    phone: '9999999999',
    name: 'Ram Kumar'
  })

  assert.equal(result, 'p-old')
})

test('save mode never reuses an existing patient when phone matches but name differs', () => {
  const patients = [
    { id: 'p-old', name: 'Ram Kumar', phone: '9999999999' }
  ]

  const result = resolvePatientIdForSave({
    savedRx: null,
    matchedPatient: patients[0],
    patients,
    phone: '9999999999',
    name: 'Shyam Kumar'
  })

  assert.equal(result, null)
  assert.equal(isPrescriptionUpdateMode(null), false)
})

test('update mode keeps using the existing patient record', () => {
  const patients = [
    { id: 'p-old', name: 'Ram Kumar', phone: '9999999999' }
  ]

  const result = resolvePatientIdForSave({
    savedRx: { id: 'rx-1', patientId: 'p-old' },
    matchedPatient: patients[0],
    patients,
    phone: '9999999999',
    name: 'Ram Kumar'
  })

  assert.equal(result, 'p-old')
  assert.equal(isPrescriptionUpdateMode({ id: 'rx-1' }), true)
})
