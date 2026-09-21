import test from 'node:test'
import assert from 'node:assert/strict'

import { whatsappNumber, buildWhatsAppUrl, openWhatsApp, buildShareFallbackMessage, buildShareMessage, followUpMessage, prepareCaptureSurface } from './whatsapp.js'
import { resolveWhatsAppNumber } from './utils.js'

test('openWhatsApp opens a new tab instead of replacing the current app route', () => {
  const originalWindow = globalThis.window
  const openCalls = []

  globalThis.window = {
    open: (...args) => {
      openCalls.push(args)
      return { closed: false }
    },
    location: { href: '' },
    focus: () => {}
  }

  try {
    const opened = openWhatsApp('9876543210', 'Prescription for John')

    assert.equal(opened, true)
    assert.equal(openCalls.length, 1)
    assert.equal(openCalls[0][0], 'https://api.whatsapp.com/send?phone=919876543210&text=Prescription%20for%20John')
    assert.equal(openCalls[0][1], '_blank')
    assert.equal(globalThis.window.location.href, '')
  } finally {
    globalThis.window = originalWindow
  }
})

test('openWhatsApp does not redirect the app when the popup is blocked', () => {
  const originalWindow = globalThis.window
  const openCalls = []

  globalThis.window = {
    open: (...args) => {
      openCalls.push(args)
      return null
    },
    location: { href: 'http://localhost:5173/#/prescriptions' },
    focus: () => {}
  }

  try {
    const opened = openWhatsApp('9876543210', 'Prescription for John')

    assert.equal(opened, false)
    assert.equal(openCalls.length, 1)
    assert.equal(globalThis.window.location.href, 'http://localhost:5173/#/prescriptions')
  } finally {
    globalThis.window = originalWindow
  }
})

test('resolveWhatsAppNumber keeps WhatsApp tied to the phone number without a separate field', () => {
  assert.equal(resolveWhatsAppNumber('9876543210', ''), '9876543210')
  assert.equal(resolveWhatsAppNumber('9876543210', '9876543210'), '9876543210')
  assert.equal(resolveWhatsAppNumber('', '9876543210'), '9876543210')
})

test('whatsappNumber converts a 10-digit number to the WhatsApp country format', () => {
  assert.equal(whatsappNumber('9876543210'), '919876543210')
})

test('buildWhatsAppUrl includes the direct WhatsApp chat URL and a web fallback without a contact picker', () => {
  assert.deepEqual(
    buildWhatsAppUrl('9876543210', 'Prescription for John'),
    {
      direct: 'https://api.whatsapp.com/send?phone=919876543210&text=Prescription%20for%20John',
      web: 'https://wa.me/919876543210?text=Prescription%20for%20John'
    }
  )
})

test('buildShareMessage uses a clear attached-file format for WhatsApp sharing', () => {
  assert.equal(
    buildShareMessage('Digital prescription', 'image', 'prescription-Sadhana Mahajan.png'),
    'Please find the attached Digital prescription.\nimage file: prescription-Sadhana Mahajan.png'
  )
})

test('buildShareFallbackMessage instructs the user to attach the downloaded file manually instead of misleadingly claiming it was sent', () => {
  assert.equal(
    buildShareFallbackMessage('Digital prescription', 'image', 'prescription-Sadhana Mahajan.png'),
    'The Digital prescription image has been downloaded. Please attach the image manually in WhatsApp to send it.'
  )
})

test('prepareCaptureSurface forces a white, opaque capture surface so sent prescription images do not render black', () => {
  const originalDocument = globalThis.document
  const body = { appendChild: () => {}, removeChild: () => {} }
  const originalElement = {
    style: {},
    scrollWidth: 794,
    scrollHeight: 1123,
    cloneNode: () => ({ style: {} })
  }

  globalThis.document = {
    body,
    createElement: (tag) => ({
      tagName: tag,
      style: {},
      appendChild: () => {},
      setAttribute: () => {},
      remove: () => {}
    })
  }

  try {
    const surface = prepareCaptureSurface(originalElement)

    assert.equal(surface.wrapper.style.background, '#fff')
    assert.equal(surface.wrapper.style.color, '#111')
    assert.equal(surface.wrapper.style.position, 'fixed')
    assert.equal(surface.wrapper.style.left, '-9999px')
  } finally {
    globalThis.document = originalDocument
  }
})

test('followUpMessage does not repeat the clinic name when the stored address already includes it', () => {
  const message = followUpMessage(
    { patientName: 'Sadhana Mahajan', followUpDate: '2026-09-11' },
    'Sadhana Mahajan',
    'Atul Mahajan',
    { clinicName: 'SACHI Hospital', address: 'SACHI Hospital\nAt mohadi tal pachora' }
  )

  assert.ok(!message.includes('SACHI Hospital\nAt mohadi tal pachora'))
  assert.ok(message.includes('At mohadi tal pachora'))
  assert.ok(message.includes('scheduled on *11th September 2026*'))
})
