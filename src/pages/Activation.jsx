import { useState } from 'react'
import { useAuth, useClinicProfile } from '../context/AppContext.jsx'
import { Badge, Button, Card, Field, Input } from '../components/ui.jsx'

function formatDate(value) {
  if (!value) return 'Not activated'
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value))
}

export default function Activation() {
  const { activation, machineId, activate } = useAuth()
  const { profile, save } = useClinicProfile()
  const [key, setKey] = useState('')
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  const isActive = activation?.status === 'active' || Boolean(profile?.licenseKey)

  async function copyMachineId() {
    await navigator.clipboard?.writeText(machineId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function submit(event) {
    event.preventDefault()
    const result = activate(key)
    if (!result.success) {
      setMessage(result.error)
      return
    }

    setSaving(true)
    try {
      await save({ ...(profile || {}), licenseKey: key.trim() })
      setMessage('Activation completed and license key saved to the clinic profile.')
      setKey('')
    } catch (error) {
      setMessage(`Activation is active on this computer, but the clinic profile could not be updated: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl text-ink">Activation</h1>
          <Badge tone={isActive ? 'teal' : 'amber'}>{isActive ? 'Active' : 'Activation required'}</Badge>
        </div>
        <p className="text-slate-500 text-sm mt-1">Manage the license for this clinic computer.</p>
      </div>

      <Card>
        <div className="flex items-start gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="text-2xl">🔑</div>
          <div>
            <h2 className="font-semibold text-blue-900">DigitalClinicRx activation</h2>
            <p className="text-sm text-blue-800 mt-1">
              {isActive ? 'This computer has an active lifetime clinic license.' : 'Activate the ₹7,999 one-time clinic license to remove trial restrictions.'}
            </p>
          </div>
        </div>

        {!isActive && (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Trial status: activation is required before the full product license can be enabled. Your existing clinic data remains on this computer.
          </div>
        )}

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <Field label="Machine ID" hint="Share this ID with support when requesting activation or a hardware reset.">
              <div className="flex gap-2">
                <Input value={machineId} readOnly className="font-mono tracking-wider bg-slate-50" />
                <Button type="button" variant="ghost" onClick={copyMachineId}>{copied ? 'Copied' : 'Copy'}</Button>
              </div>
            </Field>
            <div className="mt-4 text-sm text-slate-500">
              Activated: <span className="font-medium text-slate-700">{formatDate(activation?.activatedAt)}</span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs uppercase tracking-wider text-slate-400">License package</div>
            <div className="mt-1 text-2xl font-semibold text-ink">₹7,999</div>
            <div className="text-sm text-slate-600">One-time payment</div>
            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              <li>• One doctor, one clinic, one computer</li>
              <li>• Remote setup and clinic branding</li>
              <li>• 30 days support</li>
            </ul>
          </div>
        </div>

        {(!isActive || !profile?.licenseKey) && (
          <form onSubmit={submit} className="mt-6 border-t border-slate-100 pt-6">
            <Field label={isActive ? 'License key (sync to clinic profile)' : 'Activation key'} hint="Enter the key supplied after purchase.">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input value={key} onChange={(event) => setKey(event.target.value)} placeholder="Enter activation key" required />
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : isActive ? 'Save License Key' : 'Activate Now'}</Button>
              </div>
            </Field>
          </form>
        )}

        {message && <div className={`mt-4 rounded-lg p-3 text-sm ${message.includes('completed') ? 'bg-teal-light text-teal-dark' : 'bg-rose-light text-rose'}`}>{message}</div>}

        <div className="mt-6 border-t border-slate-100 pt-5 text-sm text-slate-600">
          Need help? Contact <strong>Atul Mahajan</strong> on WhatsApp or phone at <strong>9579102827</strong> with your Machine ID.
        </div>
      </Card>
    </div>
  )
}