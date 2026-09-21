import { useMemo, useState } from 'react'
import { useCollection } from '../context/AppContext.jsx'
import { Card, EmptyState, Badge, Input } from '../components/ui.jsx'
import { todayISO, formatDateReadable } from '../lib/utils.js'
import { useAuth, useClinicProfile } from '../context/AppContext.jsx'
import { openWhatsApp, followUpMessage } from '../lib/whatsapp.js'
import { showAlert } from '../lib/dialog.jsx'

export default function FollowUps() {
  const { items: prescriptions } = useCollection('prescriptions')
  const { items: patients } = useCollection('patients')
  const { doctor } = useAuth()
  const { profile } = useClinicProfile()
  const [overdueSearch, setOverdueSearch] = useState('')

  const today = todayISO()

  const followUps = useMemo(
    () => prescriptions.filter((r) => r.followUpDate),
    [prescriptions]
  )

  const todays = followUps.filter((r) => r.followUpDate === today)
  const upcoming = followUps
    .filter((r) => r.followUpDate > today)
    .sort((a, b) => (a.followUpDate > b.followUpDate ? 1 : -1))
  const overdue = followUps
    .filter((r) => r.followUpDate < today)
    .sort((a, b) => (a.followUpDate < b.followUpDate ? 1 : -1))

  const visibleOverdue = overdue
    .filter((r) => {
      const patient = patients.find((p) => p.id === r.patientId)
      const query = overdueSearch.trim().toLowerCase()
      if (!query) return true
      return [patient?.name, patient?.phone, r.followUpDate].some((value) => String(value || '').toLowerCase().includes(query))
    })
    .slice(0, 5)

  function patientName(id) {
    return patients.find((p) => p.id === id)?.name || 'Unknown patient'
  }

  async function sendReminder(r) {
    const patient = patients.find((p) => p.id === r.patientId)
    if (!patient?.whatsappAllowed) { await showAlert('WhatsApp sharing is disabled because patient permission has not been recorded.'); return }
    if (!openWhatsApp(patient.whatsappNumber || patient.phone, followUpMessage(r, patient.name, doctor?.name, profile))) await showAlert('A WhatsApp number is not available for this patient.')
  }

  function Row({ r, tone }) {
    return (
      <div className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
        <div>
          <div className="font-medium text-ink text-sm">{patientName(r.patientId)}</div>
          <div className="text-xs text-slate-400">
            Prescribed on {formatDateReadable(r.date)}
          </div>
        </div>
        <div className="flex items-center gap-2"><Badge tone={tone}>{formatDateReadable(r.followUpDate)}</Badge><button type="button" onClick={() => sendReminder(r)} className="text-xs font-medium text-teal">💬 Remind</button></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink mb-5">Follow-up Reminders</h1>

      <Card title="Today's Follow-ups" className="mb-6">
        {todays.length === 0 ? (
          <EmptyState title="No follow-ups due today." />
        ) : (
          todays.map((r) => <Row key={r.id} r={r} tone="teal" />)
        )}
      </Card>

      <Card title="Overdue" className="mb-6">
        <div className="mb-4">
          <Input value={overdueSearch} onChange={(event) => setOverdueSearch(event.target.value)} placeholder="Search overdue patients, phone, or date" />
        </div>
        {visibleOverdue.length === 0 ? (
          <EmptyState title="No overdue follow-ups." />
        ) : (
          visibleOverdue.map((r) => <Row key={r.id} r={r} tone="rose" />)
        )}
      </Card>

      <Card title="Upcoming">
        {upcoming.length === 0 ? (
          <EmptyState title="No upcoming follow-ups." />
        ) : (
          upcoming.map((r) => <Row key={r.id} r={r} tone="amber" />)
        )}
      </Card>
    </div>
  )
}
