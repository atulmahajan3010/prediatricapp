import { useState, useRef } from 'react'
import { useCollection } from '../context/AppContext.jsx'
import { Card, Field, Input, Button, EmptyState } from '../components/ui.jsx'
import { parseCSV } from '../lib/csv.js'

const emptyForm = { name: '', genericName: '', strength: '', form: '' }

export default function Medicines() {
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [csvText, setCsvText] = useState('')
  const [fileName, setFileName] = useState('')
  const [search, setSearch] = useState('')
  const [importing, setImporting] = useState(false)
  const fileRef = useRef(null)
  const medicineQuery = `limit=100${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''}`
  const { items: medicines, add, edit, del, bulkImport } = useCollection('medicines', medicineQuery)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function saveCustom(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    if (editingId) await edit(editingId, form)
    else await add(form)
    setForm(emptyForm)
    setEditingId(null)
  }

  function startEdit(medicine) {
    setEditingId(medicine.id)
    setForm({
      name: medicine.name || '',
      genericName: medicine.genericName || '',
      strength: medicine.strength || '',
      form: medicine.form || ''
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
  }

  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => setCsvText(String(reader.result || ''))
    reader.readAsText(file)
  }

  async function importCSV() {
    if (!csvText.trim()) return
    const { rows } = parseCSV(csvText)
    const list = rows.filter((r) => r.name).map((r) => ({
      name: r.name, genericName: r.generic_name || r.genericName || '',
      strength: r.strength || '', form: r.form || ''
    }))
    if (!list.length) return
    setImporting(true)
    try {
      await bulkImport(list)
      setCsvText('')
      setFileName('')
      if (fileRef.current) fileRef.current.value = ''
    } finally {
      setImporting(false)
    }
  }

  const filtered = medicines

  return (
    <div>
      <h1 className="font-display text-3xl text-ink mb-5">Medicine CSV Import + Custom Edit</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Manual Medicine Entry">
          <form onSubmit={saveCustom} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Medicine Name"><Input value={form.name} onChange={set('name')} required /></Field>
            <Field label="Generic Name"><Input value={form.genericName} onChange={set('genericName')} /></Field>
            <Field label="Strength"><Input value={form.strength} onChange={set('strength')} placeholder="500mg" /></Field>
            <Field label="Form"><Input value={form.form} onChange={set('form')} placeholder="Tablet" /></Field>
            <div className="col-span-2 flex gap-2">
              <Button type="submit">{editingId ? 'Update Medicine' : 'Save Custom Medicine'}</Button>
              {editingId && <Button type="button" variant="ghost" onClick={cancelEdit}>Cancel</Button>}
            </div>
          </form>
        </Card>

        <Card title="CSV Import">
          <Field label="Upload CSV File" hint="Headers: name, generic_name, strength, form">
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFileChange}
              className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-light file:px-3 file:py-2 file:text-teal-dark file:font-medium" />
          </Field>
          <div className="mt-4">
            <span className="block text-sm font-medium text-slate-700 mb-1">CSV Preview</span>
            <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={4}
              placeholder={'name,generic_name,strength,form\nParacetamol,Acetaminophen,500mg,Tablet'}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal/40" />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Button type="button" onClick={importCSV} disabled={importing}>
              {importing ? 'Importing...' : 'Import CSV Medicines'}
            </Button>
            {fileName && <span className="text-xs text-slate-400">{fileName}</span>}
          </div>
        </Card>
      </div>

      <Card title={`Medicine List (${medicines.length})`}>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search medicines..." className="mb-4 max-w-sm" />
        {filtered.length === 0 ? (
          <EmptyState title="No medicines yet" hint="Add one manually or import a CSV" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filtered.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <div>
                  <div className="font-medium text-ink text-sm">{m.name}</div>
                  <div className="text-xs text-slate-400">
                    {[m.genericName, m.strength, m.form].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => startEdit(m)} className="text-xs text-teal font-medium">Edit</button>
                  <button onClick={() => del(m.id)} className="text-xs text-rose font-medium">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
