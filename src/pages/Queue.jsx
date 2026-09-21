import { useState, useMemo } from 'react'
import { useCollection } from '../context/AppContext.jsx'
import { Card, Input, Button, EmptyState, Select } from '../components/ui.jsx'
import { todayISO } from '../lib/utils.js'

const STATUSES = [
  { key: 'arrived', label: 'Arrived' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'in_consultation', label: 'In Consultation' },
  { key: 'done', label: 'Done' }
]

export default function Queue() {
  const [date, setDate] = useState(todayISO())
  const [search, setSearch] = useState('')
  const patientQuery = `limit=50${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''}`
  const { items: patients } = useCollection('patients', patientQuery)
  const { items: queue, add, edit, del } = useCollection('queue', `limit=100&date=${encodeURIComponent(date)}`)

  const dayQueue = useMemo(() => queue, [queue])

  const counts = useMemo(() => {
    const c = { arrived: 0, waiting: 0, in_consultation: 0, done: 0 }
    dayQueue.forEach((q) => { if (c[q.status] != null) c[q.status]++ })
    return c
  }, [dayQueue])

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return patients.filter((p) => p.name.toLowerCase().includes(q) || p.phone.includes(q)).slice(0, 6)
  }, [patients, search])

  async function addToQueue(patient) {
    await add({ date, patientId: patient.id, patientName: patient.name, patientPhone: patient.phone, status: 'waiting' })
    setSearch('')
  }

  async function callNext() {
    const next = dayQueue.find((q) => q.status === 'waiting')
    if (next) await edit(next.id, { status: 'in_consultation' })
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink mb-5">Patient Queue</h1>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-medium text-ink">Queue — {date}</div>
          <div className="flex items-center gap-3">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Button variant="ghost" onClick={() => setDate(date)}>Refresh</Button>
            <Button onClick={callNext}>Call Next</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {STATUSES.map((s) => (
            <div key={s.key} className="rounded-xl bg-gradient-to-br from-teal-dark to-teal text-white px-5 py-4">
              <div className="text-xs uppercase tracking-wide opacity-80">{s.label}</div>
              <div className="text-2xl font-semibold mt-1">{counts[s.key]}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Add Patient to Queue">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type patient name or phone..." />
          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {searchResults.map((p) => (
                <button key={p.id} onClick={() => addToQueue(p)}
                  className="w-full text-left rounded-lg border border-slate-100 px-3 py-2 hover:bg-teal-light text-sm">
                  <span className="font-medium text-ink">{p.name}</span>{' '}
                  <span className="text-slate-400">{p.phone}</span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card title="Today's Queue">
          {dayQueue.length === 0 ? (
            <EmptyState title={`No patients in queue for ${date}.`} />
          ) : (
            <div className="space-y-2">
              {dayQueue.map((q) => (
                <div key={q.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <div>
                    <div className="font-medium text-ink text-sm">{q.patientName}</div>
                    <div className="text-xs text-slate-400">{q.patientPhone}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={q.status} onChange={(e) => edit(q.id, { status: e.target.value })} className="text-xs py-1">
                      {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </Select>
                    <button onClick={() => del(q.id)} className="text-xs text-rose font-medium">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
