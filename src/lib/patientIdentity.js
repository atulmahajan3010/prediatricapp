export function isPrescriptionUpdateMode(savedRx) {
  return Boolean(savedRx && savedRx.id)
}

export function resolvePatientIdForSave({ savedRx, matchedPatient, patients, phone, name }) {
  const currentPhone = String(phone || '').trim()
  const patientName = String(name || '').trim()

  if (!currentPhone || !patientName) {
    return null
  }

  const exactMatch = patients.find((patient) => {
    return patient.phone === currentPhone && patient.name === patientName
  })

  if (exactMatch) {
    return exactMatch.id
  }

  if (isPrescriptionUpdateMode(savedRx)) {
    if (matchedPatient && matchedPatient.phone === currentPhone) {
      return matchedPatient.id
    }

    const byPhone = patients.find((p) => p.phone === currentPhone)
    if (byPhone) return byPhone.id

    return null
  }

  return null
}
