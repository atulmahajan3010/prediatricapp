import { Router } from 'express'

const router = Router()

function normalizeWhatsAppNumber(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `91${digits}`
  return digits
}

function getWhatsAppConfig() {
  return {
    token: process.env.WHATSAPP_TOKEN?.trim(),
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
    apiVersion: process.env.WHATSAPP_API_VERSION?.trim() || 'v20.0'
  }
}

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null
  const match = dataUrl.match(/^data:.*?;base64,(.*)$/)
  if (!match) return null
  return Buffer.from(match[1], 'base64')
}

router.post('/send-document', async (req, res) => {
  const {
    number,
    dataUrl,
    fileName = 'document.png',
    mimeType = 'image/png',
    message = 'Please find the attached document.'
  } = req.body || {}

  const { token, phoneNumberId, apiVersion } = getWhatsAppConfig()
  if (!token || !phoneNumberId) {
    return res.status(400).json({
      success: false,
      error: 'WhatsApp Business Cloud API is not configured. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID in your .env file.'
    })
  }

  const normalizedPhone = normalizeWhatsAppNumber(number)
  if (!normalizedPhone) {
    return res.status(400).json({ success: false, error: 'A valid WhatsApp number is required.' })
  }

  const fileBuffer = parseDataUrl(dataUrl)
  if (!fileBuffer || fileBuffer.length === 0) {
    return res.status(400).json({ success: false, error: 'Document data is required to send via WhatsApp.' })
  }

  try {
    const formData = new FormData()
    formData.append('messaging_product', 'whatsapp')
    formData.append('file', new Blob([fileBuffer], { type: mimeType }), fileName)
    formData.append('type', mimeType)

    const uploadResponse = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    })

    const uploadResult = await uploadResponse.json().catch(() => ({}))
    if (!uploadResponse.ok) {
      return res.status(502).json({
        success: false,
        error: uploadResult?.error?.message || 'Unable to upload the document to WhatsApp.'
      })
    }

    const mediaId = uploadResult.id
    if (!mediaId) {
      return res.status(502).json({ success: false, error: 'WhatsApp media upload did not return an ID.' })
    }

    const messageType = mimeType.startsWith('image/') ? 'image' : 'document'
    const payload = {
      messaging_product: 'whatsapp',
      to: normalizedPhone,
      type: messageType,
      [messageType]: {
        id: mediaId,
        caption: message,
        filename: fileName
      }
    }

    const sendResponse = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const sendResult = await sendResponse.json().catch(() => ({}))
    if (!sendResponse.ok) {
      return res.status(502).json({
        success: false,
        error: sendResult?.error?.message || 'Unable to send the document via WhatsApp.'
      })
    }

    return res.json({ success: true, messageId: sendResult.messages?.[0]?.id || null })
  } catch (error) {
    console.error('WhatsApp cloud API send failed:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send document through WhatsApp.'
    })
  }
})

export default router
