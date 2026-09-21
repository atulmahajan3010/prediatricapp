// Shared medicine dose/duration/date formatting helpers used by the prescription form and print layout.

export function parseMedicineDose(dosage, unit) {
  const rawDosage = String(dosage ?? '').trim()
  const rawUnit = String(unit ?? '').trim()

  if (!rawDosage && !rawUnit) return { dosage: '', unit: '' }

  const combined = `${rawDosage}${rawUnit ? ` ${rawUnit}` : ''}`.trim()
  const combinedMatch = combined.match(/^([0-9]+(?:\.\d+)?)\s*([A-Za-z%]+)$/i)
  if (combinedMatch) {
    return { dosage: combinedMatch[1], unit: combinedMatch[2] }
  }

  if (rawDosage && !rawUnit) {
    const matched = rawDosage.match(/^([0-9]+(?:\.\d+)?)\s*([A-Za-z%]+)$/i)
    if (matched) {
      return { dosage: matched[1], unit: matched[2] }
    }
  }

  return { dosage: rawDosage, unit: rawUnit }
}

export function formatMedicineDose(m) {
  if (!m) return ''
  const { dosage, unit } = parseMedicineDose(m.dosage, m.unit)
  if (dosage && unit) return `${dosage} ${unit}`
  if (dosage) return dosage
  if (unit) return unit
  return ''
}

export function normalizeDuration(value) {
  if (value == null) return ''
  const text = String(value).trim()
  if (!text) return ''
  if (/^\d+(?:\.\d+)?\s*(day|days)?$/i.test(text)) {
    const num = text.replace(/\s*(day|days)\s*$/i, '')
    return `${num} days`
  }
  return text
}

export function printDate(iso) {
  if (!iso) return '___/___/______'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
