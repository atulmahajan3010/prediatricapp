import { useState, useMemo } from 'react'
import { useCollection } from '../context/AppContext.jsx'
import { Card, Field, Input, Textarea, Select, Button, EmptyState, FormSection } from '../components/ui.jsx'
import { calcAge } from '../lib/utils.js'

const emptyForm = { name: '', phone: '', whatsappNumber: '', whatsappAllowed: false, dob: '', gender: 'Male', address: '' }

export default function Patients() {
  const [search, setSearch] = useState('')
  const patientQuery = `limit=50${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''}`
  const { items: patients, add, edit, del, loadMore, loading } = useCollection('patients', patientQuery)
  const [tab, setTab] = useState('new')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const filtered = useMemo(() => patients, [patients])
  const recentPatients = useMemo(
    () => [...patients]
      .sort((a, b) => {
        const aTime = new Date(a.createdAt || a.created_at || 0).getTime()
        const bTime = new Date(b.createdAt || b.created_at || 0).getTime()
        return bTime - aTime
      })
      .slice(0, 15),
    [patients]
  )

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.phone.trim()) return
    const age = form.dob ? calcAge(form.dob) : form.age || ''
    if (editingId) {
      await edit(editingId, { ...form, age })
      setEditingId(null)
    } else {
      await add({ ...form, age })
    }
    setForm(emptyForm)
  }

  function startEdit(p) {
    setForm({
      name: p.name,
      phone: p.phone,
      whatsappNumber: p.whatsappNumber || '',
      whatsappAllowed: Boolean(p.whatsappAllowed),
      dob: p.dob || '',
      gender: p.gender || 'Male',
      address: p.address || ''
    })
    setEditingId(p.id)
    setTab('new')
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-4xl text-ink mb-1">👥 Patient Management</h1>
        <p className="text-slate-500 text-sm">Register new patients and manage existing patient records</p>
      </div>

      {/* Tab Navigation */}
      <div className="inline-flex gap-1 bg-slate-100 rounded-xl p-1 mb-8">
        <button
          onClick={() => setTab('new')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'new' 
              ? 'bg-teal text-white shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          ➕ New Patient
        </button>
        <button
          onClick={() => setTab('existing')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'existing' 
              ? 'bg-teal text-white shadow-sm' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          🔍 Search Patients
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT PANEL - FORM */}
        <div className="lg:col-span-2">
          {tab === 'new' ? (
            <FormSection title={editingId ? 'Edit Patient Details' : 'Register New Patient'} icon={editingId ? '✏️' : '🆕'}>
              <form onSubmit={submit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Full Name" hint="Required">
                    <Input
                      value={form.name}
                      onChange={set('name')}
                      placeholder="Enter patient full name"
                      required
                    />
                  </Field>
                  <Field label="Phone Number" hint="Required">
                    <Input
                      value={form.phone}
                      onChange={set('phone')}
                      placeholder="10-digit mobile number"
                      type="tel"
                      required
                    />
                  </Field>
                  <Field label="WhatsApp Number" hint="Leave blank to use the phone number">
                    <Input value={form.whatsappNumber} onChange={set('whatsappNumber')} placeholder="WhatsApp number" type="tel" />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Date of Birth">
                    <Input 
                      type="date" 
                      value={form.dob} 
                      onChange={set('dob')} 
                    />
                  </Field>
                  <Field label="Age (Auto-filled from DOB)">
                    <Input 
                      value={form.dob ? calcAge(form.dob) : ''} 
                      readOnly 
                      placeholder="Auto-filled"
                      className="bg-slate-50"
                    />
                  </Field>
                </div>

                <Field label="Gender">
                  <Select value={form.gender} onChange={set('gender')}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </Select>
                </Field>

                <Field label="Address">
                  <Textarea
                    rows={3}
                    value={form.address}
                    onChange={set('address')}
                    placeholder="Patient address (optional)"
                  />
                </Field>
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.whatsappAllowed} onChange={(e) => setForm((current) => ({ ...current, whatsappAllowed: e.target.checked }))} className="mt-1" />
                  Patient has given permission to receive prescriptions, bills, and follow-up reminders on WhatsApp.
                </label>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="submit"
                    className="bg-teal text-white"
                  >
                    {editingId ? '💾 Save Changes' : '➕ Register Patient'}
                  </Button>
                  {editingId && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(null)
                        setForm(emptyForm)
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </FormSection>
          ) : (
            <FormSection title="Search & Manage Patients" icon="🔍">
              <Field label="Search Patients">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or phone number"
                  autoFocus
                />
              </Field>

              {filtered.length === 0 ? (
                <EmptyState 
                  title={patients.length === 0 ? 'No patients yet' : 'No matching patients found'}
                  hint={patients.length === 0 ? 'Register a patient to get started' : 'Try searching with a different name or phone'} 
                />
              ) : (
                <>
                  <div className="space-y-3 mt-6">
                    {filtered.map((p) => (
                    <div
                      key={p.id}
                      className="bg-slate-50 hover:bg-white border border-slate-200 hover:border-teal/50 rounded-lg px-5 py-4 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-900 text-lg">{p.name}</div>
                          <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-600">
                            <div>📞 {p.phone}</div>
                            <div>👤 {p.gender}</div>
                            {p.age && <div>📅 {p.age} yrs</div>}
                          </div>
                          {p.address && (
                            <div className="text-xs text-slate-500 mt-2">📍 {p.address}</div>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button 
                            variant="ghost" 
                            onClick={() => startEdit(p)}
                            className="text-sm"
                          >
                            ✏️ Edit
                          </Button>
                          <Button 
                            variant="danger" 
                            onClick={() => {
                              if (confirm(`Delete ${p.name}?`)) del(p.id)
                            }}
                            className="text-sm"
                          >
                            🗑️ Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                    ))}
                  </div>
                  {filtered.length >= 50 && <Button type="button" variant="secondary" onClick={loadMore} disabled={loading} className="mt-5">
                    {loading ? 'Loading...' : 'Load more patients'}
                  </Button>}
                </>
              )}
            </FormSection>
          )}
        </div>

        {/* RIGHT PANEL - RECENT PATIENTS */}
        <div className="space-y-4">
          <FormSection title="Recent Patients" icon="📋">
            {patients.length === 0 ? (
              <EmptyState 
                title="No patients yet" 
                hint="Register a patient to see them here"
              />
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {recentPatients.map((p) => (
                  <div 
                    key={p.id} 
                    className="bg-slate-50 rounded-lg p-3 border border-slate-200 hover:border-teal/50 hover:bg-white transition-all cursor-pointer"
                    onClick={() => startEdit(p)}
                  >
                    <div className="font-semibold text-sm text-slate-900">{p.name}</div>
                    <div className="text-xs text-slate-500 mt-1">📞 {p.phone}</div>
                    <div className="text-xs text-slate-500">👤 {p.gender} {p.age ? `• ${p.age} yrs` : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </FormSection>

          {/* Patient Stats */}
          <div className="bg-white rounded-xl border border-slate-100 p-5 text-center">
            <div className="text-3xl font-bold text-teal">{patients.length}</div>
            <div className="text-sm text-slate-600 mt-1">Total Patients</div>
          </div>
        </div>
      </div>
    </div>
  )
}
