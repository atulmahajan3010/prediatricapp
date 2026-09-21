import { useState, useMemo } from 'react'
import { useCollection } from '../context/AppContext.jsx'
import { Card, Field, Input, Textarea, Select, Button, EmptyState, Badge } from '../components/ui.jsx'
import { todayISO, formatDateReadable, rupees } from '../lib/utils.js'

const emptyForm = {
  patientId: '',
  date: todayISO(),
  complaint: '',
  diagnosis: '',
  notes: '',
  weight: '',
  temperature: '',
  paymentDone: 'No',
  fees: ''
}

export default function Visits() {
  const { items: patients } = useCollection('patients')
  const { items: visits, add, edit } = useCollection('visits')
  const [form, setForm] = useState(emptyForm)
  const [patientSearch, setPatientSearch] = useState('')
  const [editingId, setEditingId] = useState(null)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const patientVisits = useMemo(
    () =>
      visits
        .filter((v) => v.patientId === form.patientId)
        .sort((a, b) => {
          const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime()
          if (dateDiff !== 0) return dateDiff
          const aTime = new Date(a.createdAt || a.created_at || 0).getTime()
          const bTime = new Date(b.createdAt || b.created_at || 0).getTime()
          return bTime - aTime
        }),
    [visits, form.patientId]
  )

  const selectedPatient = patients.find((p) => p.id === form.patientId)
  const patientSearchResults = useMemo(() => {
    const query = patientSearch.trim().toLowerCase()
    if (!query) return []
    return patients
      .filter((p) => p.name.toLowerCase().includes(query) || p.phone.includes(query))
      .slice(0, 10)
  }, [patients, patientSearch])

  async function submit(e) {
    e.preventDefault()
    if (!form.patientId) return
    // Force visit date to today so reports count visits for current day
    const payload = { ...form, date: todayISO() }
    if (editingId) {
      await edit(editingId, payload)
      setEditingId(null)
    } else {
      await add(payload)
    }
    setForm((f) => ({ ...emptyForm, patientId: f.patientId }))
  }

  function startEdit(v) {
    setForm({ ...emptyForm, ...v })
    const selected = patients.find((p) => p.id === v.patientId)
    setPatientSearch(selected ? `${selected.name} · ${selected.phone}` : '')
    setEditingId(v.id)
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink mb-5">Date-wise Visit Timeline</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title={editingId ? 'Edit Visit' : 'Create Visit'}>
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Patient">
                <div className="relative">
                  <Input
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value)
                      setForm((current) => ({ ...current, patientId: '' }))
                    }}
                    placeholder="Type patient name or mobile number..."
                    required
                    autoComplete="off"
                  />
                  {patientSearch.trim() && !form.patientId && (
                    <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                      {patientSearchResults.length > 0 ? patientSearchResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setForm((current) => ({ ...current, patientId: p.id }))
                            setPatientSearch(`${p.name} · ${p.phone}`)
                          }}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-teal-light border-b border-slate-100 last:border-0"
                        >
                          <span className="font-medium text-ink">{p.name}</span>
                          <span className="block text-xs text-slate-500">{p.phone} · {p.gender}</span>
                        </button>
                      )) : (
                        <div className="px-3 py-3 text-sm text-slate-400">No matching patient found.</div>
                      )}
                    </div>
                  )}
                </div>
              </Field>
              <Field label="Visit Date">
                <Input type="date" value={form.date} onChange={set('date')} required />
              </Field>
              <div className="col-span-2">
                <Field label="Chief Complaint">
                  <Input
                    value={form.complaint}
                    onChange={set('complaint')}
                    placeholder="Fever, cough, headache..."
                  />
                </Field>
              </div>
              <Field label="Diagnosis">
                <Input value={form.diagnosis} onChange={set('diagnosis')} />
              </Field>
              <Field label="Notes">
                <Input value={form.notes} onChange={set('notes')} />
              </Field>
              <Field label="Weight (kg)">
                <Input value={form.weight} onChange={set('weight')} />
              </Field>
              <Field label="Temperature (F)">
                <Input value={form.temperature} onChange={set('temperature')} />
              </Field>
              <Field label="Payment Done">
                <Select value={form.paymentDone} onChange={set('paymentDone')}>
                  <option>No</option>
                  <option>Yes</option>
                </Select>
              </Field>
              <Field label="Fees Amount">
                <Input value={form.fees} onChange={set('fees')} placeholder="500" />
              </Field>
              <div className="col-span-2 flex gap-3">
                <Button type="submit">{editingId ? 'Save Changes' : 'Save Visit'}</Button>
                {editingId && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(null)
                      setForm((f) => ({ ...emptyForm, patientId: f.patientId }))
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </div>

        <Card title={selectedPatient ? `Visits for ${selectedPatient.name}` : 'Visits'}>
          {!selectedPatient ? (
            <EmptyState title="Select a patient" hint="Their visit history will appear here" />
          ) : patientVisits.length === 0 ? (
            <EmptyState title="No visits recorded yet" />
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto">
              {patientVisits.map((v) => (
                <div key={v.id} className="border-b border-slate-100 pb-3 last:border-0">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-ink text-sm">
                      {formatDateReadable(v.date)}
                    </div>
                    <Badge tone={v.paymentDone === 'Yes' ? 'teal' : 'amber'}>
                      {v.paymentDone === 'Yes' ? `Paid ${rupees(v.fees)}` : 'Payment pending'}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{v.complaint}</div>
                  {v.diagnosis && (
                    <div className="text-xs text-slate-400">Dx: {v.diagnosis}</div>
                  )}
                  <div className="text-xs text-slate-300">
                    Weight: {v.weight || 'N/A'} kg · Temp: {v.temperature || 'N/A'} F
                  </div>
                  <button
                    onClick={() => startEdit(v)}
                    className="text-xs text-teal font-medium mt-1"
                  >
                    Edit Visit
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
