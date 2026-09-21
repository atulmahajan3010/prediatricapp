export function parseDateValue(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value !== 'string') return new Date(value)

  const ymd = value.match(/^\d{4}-\d{2}-\d{2}$/)
  if (ymd) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDateDMY(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}-${m}-${y}`
}

export function formatDateReadable(iso) {
  if (!iso) return ''
  const d = parseDateValue(iso)
  if (!d) return iso
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export function formatDateWithOrdinal(iso) {
  if (!iso) return ''
  const d = parseDateValue(iso)
  if (!d) return iso

  const day = d.getDate()
  const ordinal = day % 10 === 1 && day !== 11
    ? 'st'
    : day % 10 === 2 && day !== 12
      ? 'nd'
      : day % 10 === 3 && day !== 13
        ? 'rd'
        : 'th'

  const month = d.toLocaleDateString('en-IN', { month: 'long' })
  const year = d.getFullYear()

  return `${day}${ordinal} ${month} ${year}`
}

export function calcAge(dob) {
  if (!dob) return ''
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return ''
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}

export function resolveWhatsAppNumber(phone = '', whatsappNumber = '') {
  const resolvedPhone = String(phone ?? '').trim()
  const resolvedWhatsApp = String(whatsappNumber ?? '').trim()
  return resolvedWhatsApp || resolvedPhone
}

export function rupees(n) {
  const num = Number(n) || 0
  return `\u20B9${num.toLocaleString('en-IN')}`
}

export function startOfWeek(date) {
  const d = parseDateValue(date) || new Date()
  const day = d.getDay()
  const diff = (day + 6) % 7 // Monday start
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function isSameDay(iso, dateObj) {
  if (!iso) return false
  const a = parseDateValue(iso)
  if (!a) return false
  return (
    a.getFullYear() === dateObj.getFullYear() &&
    a.getMonth() === dateObj.getMonth() &&
    a.getDate() === dateObj.getDate()
  )
}

export function isInRange(iso, from, to) {
  const dateKey = (value) => {
    if (!value) return ''
    if (typeof value === 'string') {
      const match = value.match(/^\d{4}-\d{2}-\d{2}/)
      if (match) return match[0]
    }
    const date = parseDateValue(value)
    if (!date) return ''
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${date.getFullYear()}-${month}-${day}`
  }

  const valueKey = dateKey(iso)
  const fromKey = dateKey(from)
  const toKey = dateKey(to)
  return Boolean(valueKey && fromKey && toKey && valueKey >= fromKey && valueKey <= toKey)
}
