import { formatDateReadable, formatDateWithOrdinal, rupees } from './utils.js'

// Loaded on demand (not at module import time) since these libraries are only
// needed when actually sharing an image/PDF, and are heavy to keep resident
// in memory on low-RAM machines otherwise.
let html2canvasPromise
function loadHtml2Canvas() {
  if (!html2canvasPromise) html2canvasPromise = import('html2canvas').then((mod) => mod.default)
  return html2canvasPromise
}

let jsPDFPromise
function loadJsPDF() {
  if (!jsPDFPromise) jsPDFPromise = import('jspdf').then((mod) => mod.jsPDF)
  return jsPDFPromise
}

export function whatsappNumber(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `91${digits}`
  return digits
}

export function buildWhatsAppUrl(number, message = '') {
  const normalized = whatsappNumber(number)
  if (!normalized) return ''
  const encodedText = encodeURIComponent(message || '')
  return {
    direct: `https://api.whatsapp.com/send?phone=${normalized}${encodedText ? `&text=${encodedText}` : ''}`,
    web: `https://wa.me/${normalized}${encodedText ? `?text=${encodedText}` : ''}`
  }
}

function openExternalUrl(url) {
  const popup = window.open(url, '_blank', 'noopener,noreferrer')

  if (popup) {
    popup.opener = null
    try {
      popup.focus()
    } catch {
      // Browsers may block focus on a newly opened external tab.
    }
    return true
  }

  if (typeof document !== 'undefined' && document.body) {
    const fallbackLink = document.createElement('a')
    fallbackLink.href = url
    fallbackLink.target = '_blank'
    fallbackLink.rel = 'noopener noreferrer'
    fallbackLink.style.display = 'none'
    document.body.appendChild(fallbackLink)
    fallbackLink.click()
    fallbackLink.remove()
  }

  return false
}

export function openWhatsApp(number, message) {
  const urls = buildWhatsAppUrl(number, message)
  if (!urls) return false

  return openExternalUrl(urls.direct)
}

export function openDirectWhatsAppChat(number, message = '') {
  const normalized = whatsappNumber(number)
  if (!normalized) return false

  const directUrl = `https://api.whatsapp.com/send?phone=${normalized}${message ? `&text=${encodeURIComponent(message)}` : ''}`
  return openExternalUrl(directUrl)
}

export function buildShareMessage(title = 'Digital document', format = 'image', fileName = 'document.png') {
  const label = format === 'pdf' ? 'PDF' : 'image'
  return `Please find the attached ${title}.\n${label} file: ${fileName}`
}

export function buildShareFallbackMessage(title = 'Digital document', format = 'image', fileName = 'document.png') {
  const label = format === 'pdf' ? 'PDF' : 'image'
  return `The ${title} ${label} has been downloaded. Please attach the ${label} manually in WhatsApp to send it.`
}

export function prepareCaptureSurface(element) {
  if (!element || typeof document === 'undefined') return { element, wrapper: null }

  const wrapper = document.createElement('div')
  const clone = element.cloneNode(true)
  const width = Math.max(794, Math.ceil(element.scrollWidth || element.clientWidth || element.getBoundingClientRect?.().width || 794))
  const height = Math.max(1100, Math.ceil(element.scrollHeight || element.clientHeight || element.getBoundingClientRect?.().height || 1100))

  wrapper.style.position = 'fixed'
  wrapper.style.left = '-9999px'
  wrapper.style.top = '0'
  wrapper.style.width = `${width}px`
  wrapper.style.height = `${height}px`
  wrapper.style.background = '#fff'
  wrapper.style.color = '#111'
  wrapper.style.overflow = 'hidden'
  wrapper.style.pointerEvents = 'none'
  wrapper.style.opacity = '1'
  wrapper.style.zIndex = '-1'

  clone.style.background = '#fff'
  clone.style.color = '#111'
  clone.style.display = 'block'
  clone.style.width = `${width}px`
  clone.style.height = `${height}px`
  clone.style.boxSizing = 'border-box'
  clone.style.opacity = '1'

  wrapper.appendChild(clone)
  document.body.appendChild(wrapper)

  return { element: clone, wrapper }
}

async function createDocumentFile(canvas, filename, format = 'image') {
  const cleanFilename = filename.includes('.') ? filename : `${filename}.${format === 'pdf' ? 'pdf' : 'png'}`

  if (format === 'pdf') {
    const jsPDF = await loadJsPDF()
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const dataUrl = canvas.toDataURL('image/png')
    const imgWidth = pageWidth - 40
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    const finalHeight = Math.min(imgHeight, pageHeight - 40)

    pdf.addImage(dataUrl, 'PNG', 20, 20, imgWidth, finalHeight)
    const blob = pdf.output('blob')
    const file = new File([blob], cleanFilename, { type: 'application/pdf' })
    return {
      blob,
      file,
      type: 'application/pdf',
      dataUrl: pdf.output('datauristring')
    }
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not create the document image.')
  const file = new File([blob], cleanFilename, { type: 'image/png' })
  return {
    blob,
    file,
    type: 'image/png',
    dataUrl: canvas.toDataURL('image/png')
  }
}

export async function shareDocumentFile(number, element, filename = 'document.png', title = 'Digital document', format = 'image') {
  const normalized = whatsappNumber(number)
  if (!normalized || !element) return { success: false, error: 'A WhatsApp number and document are required.' }

  const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : { width: element.scrollWidth || 794, height: element.scrollHeight || 1123 }
  const captureWidth = Math.max(794, Math.ceil(rect.width || element.scrollWidth || 794))
  const captureHeight = Math.max(1100, Math.ceil(rect.height || element.scrollHeight || 1123))
  const capture = prepareCaptureSurface(element)

  let prepared

  try {
    const html2canvas = await loadHtml2Canvas()
    const canvas = await html2canvas(capture.element || element, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      width: captureWidth,
      height: captureHeight,
      scrollX: 0,
      scrollY: 0,
      windowWidth: captureWidth,
      windowHeight: captureHeight,
      logging: false
    })

    prepared = await createDocumentFile(canvas, filename, format)
  } finally {
    if (capture.wrapper && capture.wrapper.parentNode) {
      capture.wrapper.remove()
    }
  }

  const shareMessage = buildShareMessage(title, format, prepared.file.name)

  if (window.electronAPI?.shareDocumentFile) {
    const result = await window.electronAPI.shareDocumentFile({
      number: normalized,
      dataUrl: prepared.dataUrl,
      fileName: prepared.file.name,
      mimeType: prepared.type,
      message: shareMessage
    })
    if (!result.success) return result
    return { success: true, copied: true, format }
  }

  try {
    const sendResponse = await fetch('/api/whatsapp/send-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: normalized,
        dataUrl: prepared.dataUrl,
        fileName: prepared.file.name,
        mimeType: prepared.type,
        message: shareMessage
      })
    })

    const sendResult = await sendResponse.json().catch(() => ({}))
    if (sendResponse.ok && sendResult.success) {
      return { success: true, shared: true, format, messageId: sendResult.messageId }
    }

    if (!sendResponse.ok && sendResult?.error) {
      console.warn('WhatsApp cloud transfer unavailable, using browser fallback:', sendResult.error)
    }
  } catch (error) {
    console.warn('Server-side WhatsApp send failed, using browser fallback:', error)
  }

  const directUrl = `https://api.whatsapp.com/send?phone=${normalized}&text=${encodeURIComponent(shareMessage)}`
  openExternalUrl(directUrl)

  const fallbackMessage = buildShareFallbackMessage(title, format, prepared.file.name)
  const url = URL.createObjectURL(prepared.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = prepared.file.name
  link.click()

  setTimeout(() => URL.revokeObjectURL(url), 1200)
  return { success: true, downloaded: true, format, fallbackMessage, directUrl }
}

export async function shareDocumentImage(number, element, filename = 'document.png', title = 'Digital document') {
  return shareDocumentFile(number, element, filename, title, 'image')
}

export const sharePrescriptionImage = shareDocumentImage

function medicineLines(medicines = []) {
  return medicines.filter((medicine) => medicine?.name?.trim()).map((medicine, index) => {
    const dose = [medicine.dosage, medicine.unit].filter(Boolean).join(' ')
    const frequency = (medicine.freq || []).join('-')
    const details = [dose, frequency, medicine.duration, medicine.instructions].filter(Boolean).join(', ')
    return `${index + 1}. ${medicine.name}${details ? ` - ${details}` : ''}`
  })
}

export function prescriptionMessage(rx, clinicName = 'the clinic') {
  const lines = [
    `Hello ${rx.patientName || 'Patient'},`,
    '',
    `Your prescription from ${clinicName} dated ${formatDateReadable(rx.date)}:`,
    rx.diagnosis ? `Diagnosis: ${rx.diagnosis}` : '',
    ...medicineLines(rx.medicines),
    rx.advice ? `Advice: ${rx.advice}` : '',
    rx.notes ? `Notes: ${rx.notes}` : '',
    rx.followUpDate ? `Follow-up: ${formatDateReadable(rx.followUpDate)}` : '',
    '',
    'Please take medicines only as advised by your doctor. Contact the clinic if you have questions.'
  ]
  return lines.filter((line, index) => line || (index > 0 && lines[index - 1])).join('\n')
}

export function billMessage(bill, patientName, clinicName = 'the clinic') {
  const itemLines = (bill.items || []).filter((item) => item.description).map((item) => `- ${item.description}: ${rupees(item.amount)}`)
  return [
    `Hello ${patientName || 'Patient'},`,
    '',
    `Your bill from ${clinicName} dated ${formatDateReadable(bill.date)}:`,
    ...itemLines,
    bill.discount ? `Discount: ${rupees(bill.discount)}` : '',
    `Total: ${rupees(bill.total)}`,
    `Status: ${bill.paid ? 'Paid' : 'Payment pending'}`,
    '',
    'Thank you.'
  ].filter(Boolean).join('\n')
}

function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function normalizeHospitalAddress(hospitalName, hospitalAddress) {
  const name = String(hospitalName || '').trim()
  const rawAddress = String(hospitalAddress || '').trim()
  if (!rawAddress) return ''

  let cleaned = rawAddress
    .replace(new RegExp(`^\\s*${escapeRegExp(name)}\\s*[-,:;]*\\s*`, 'i'), '')
    .replace(new RegExp(`\\s*[-,:;]*\\s*${escapeRegExp(name)}\\s*[-,:;]*\\s*`, 'gi'), ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.join('\n') || rawAddress
}

export function followUpMessage(prescription, patientName, doctorName, profile = {}) {
  const patient = patientName || prescription.patientName || 'Patient'
  const followDate = prescription.followUpDate ? formatDateWithOrdinal(prescription.followUpDate) : 'Please contact the clinic'
  const doctor = doctorName || profile.doctorName || 'Doctor'
  const doctorLabel = doctor.toLowerCase().startsWith('dr.') ? doctor : `Dr. ${doctor}`
  const hospitalName = profile.clinicName || 'Clinic'
  const hospitalAddress = normalizeHospitalAddress(hospitalName, profile.address) || 'Please contact the clinic for the address'

  return [
    `🏥 *${hospitalName}*`,
    hospitalAddress ? `${hospitalAddress}` : '',
    '',
    `Dear ${patient},`,
    '',
    `This is a gentle reminder for your follow-up consultation with *${doctorLabel}*, scheduled on *${followDate}* .`,
    '',
    `We're pleased to continue your care and look forward to seeing you again. If you need to reschedule or have any questions, please feel free to contact the clinic.`,
    '',
    'Thank you for trusting us with your care. Take care! 🙏',
    '',
    `— Team ${hospitalName}`
  ].filter((line, index, array) => line || (index > 0 && array[index - 1])).join('\n')
}
