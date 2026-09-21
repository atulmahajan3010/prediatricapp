import { useEffect, useState } from 'react'
import { useAuth, useClinicProfile } from '../context/AppContext.jsx'
import { api } from '../lib/api.js'
import { Card, Field, Input, Textarea, Button } from '../components/ui.jsx'

const empty = { clinicName: '', qualifications: '', registrationNumber: '', phone: '', email: '', address: '', logoData: '', slug: '', specialization: '', doctorPhone: '', city: '', state: '', postalCode: '', businessHours: '', closingDay: '', licenseKey: '' }
const emptyPharmacy = { pharmacyName: '', ownerName: '', phone: '', whatsappNumber: '', address: '', licenseNumber: '', notes: '', enabled: true }

export default function ClinicProfile() {
  const { doctor } = useAuth()
  const { profile, save, loading } = useClinicProfile()
  const [form, setForm] = useState(empty)
  const [pharmacy, setPharmacy] = useState(emptyPharmacy)
  const [savedFlash, setSavedFlash] = useState('')
  useEffect(() => { if (profile) setForm({ ...empty, ...profile }) }, [profile])
  useEffect(() => { api.get('/pharmacy-config').then((data) => setPharmacy({ ...emptyPharmacy, ...data })).catch(() => {}) }, [])
  const set = (key) => (e) => setForm((current) => ({ ...current, [key]: e.target.value }))
  const setLogo = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) { setSavedFlash('Logo must be PNG, JPG or WebP under 3 MB.'); return }
    const reader = new FileReader(); reader.onload = () => setForm((current) => ({ ...current, logoData: reader.result })); reader.readAsDataURL(file)
  }
  async function submit(e) {
    e.preventDefault(); setSavedFlash('')
    try { await save({ ...form, slug: form.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }); await api.put('/pharmacy-config', pharmacy); setSavedFlash('Saved to database.') } catch (error) { setSavedFlash(error.message) }
    setTimeout(() => setSavedFlash(''), 3000)
  }
  return <div><h1 className="font-display text-3xl text-ink mb-5">Clinic Profile &amp; Letterhead</h1><Card title="Clinic and doctor branding">
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Clinic / hospital name"><Input value={form.clinicName} onChange={set('clinicName')} required /></Field><Field label="Clinic URL slug" hint="Used in /clinic/your-slug/login"><Input value={form.slug} onChange={set('slug')} /></Field>
      <Field label="Doctor name"><Input value={form.doctorName || doctor?.name || ''} onChange={set('doctorName')} /></Field><Field label="Doctor qualifications"><Input value={form.qualifications} onChange={set('qualifications')} /></Field><Field label="Specialization / designation"><Input value={form.specialization} onChange={set('specialization')} /></Field><Field label="Medical registration number"><Input value={form.registrationNumber} onChange={set('registrationNumber')} /></Field><Field label="Doctor phone"><Input value={form.doctorPhone} onChange={set('doctorPhone')} /></Field>
      <Field label="Clinic logo"><Input type="file" accept="image/png,image/jpeg,image/webp" onChange={setLogo} />{form.logoData && <img src={form.logoData} alt="Clinic logo preview" className="mt-2 h-14 w-14 object-contain" />}</Field><Field label="Clinic phone"><Input value={form.phone} onChange={set('phone')} /></Field><Field label="Clinic email"><Input type="email" value={form.email} onChange={set('email')} /></Field>
      <div className="md:col-span-2"><Field label="Address"><Textarea rows={3} value={form.address} onChange={set('address')} /></Field></div><Field label="City"><Input value={form.city} onChange={set('city')} /></Field><Field label="State"><Input value={form.state} onChange={set('state')} /></Field><Field label="PIN / ZIP code"><Input value={form.postalCode} onChange={set('postalCode')} /></Field><Field label="Business hours"><Input value={form.businessHours} onChange={set('businessHours')} /></Field><Field label="Weekly closing day"><Input value={form.closingDay} onChange={set('closingDay')} /></Field>
      <div className="md:col-span-2 flex items-center gap-3"><Button type="submit" disabled={loading}>Save Clinic Profile</Button>{savedFlash && <span className="text-sm text-teal font-medium">{savedFlash}</span>}</div>
    </form>
    {form.slug && <div className="mt-5 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Login URL preview: {window.location.origin}/#/clinic/{form.slug}/login</div>}
  </Card><Card title="Pharmacy digital prescription destination" className="mt-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Field label="Pharmacy name"><Input value={pharmacy.pharmacyName} onChange={(e) => setPharmacy((current) => ({ ...current, pharmacyName: e.target.value }))} /></Field>
      <Field label="Owner / contact name"><Input value={pharmacy.ownerName} onChange={(e) => setPharmacy((current) => ({ ...current, ownerName: e.target.value }))} /></Field>
      <Field label="Phone"><Input value={pharmacy.phone} onChange={(e) => setPharmacy((current) => ({ ...current, phone: e.target.value }))} /></Field>
      <Field label="WhatsApp number"><Input value={pharmacy.whatsappNumber} onChange={(e) => setPharmacy((current) => ({ ...current, whatsappNumber: e.target.value }))} /></Field>
      <Field label="License number"><Input value={pharmacy.licenseNumber} onChange={(e) => setPharmacy((current) => ({ ...current, licenseNumber: e.target.value }))} /></Field>
      <Field label="Address"><Input value={pharmacy.address} onChange={(e) => setPharmacy((current) => ({ ...current, address: e.target.value }))} /></Field>
      <div className="md:col-span-2"><Field label="Notes"><Textarea rows={2} value={pharmacy.notes} onChange={(e) => setPharmacy((current) => ({ ...current, notes: e.target.value }))} /></Field></div>
      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={pharmacy.enabled} onChange={(e) => setPharmacy((current) => ({ ...current, enabled: e.target.checked }))} /> Allow sending prescriptions to this pharmacy</label>
    </div>
    <p className="mt-3 text-xs text-slate-500">Save this page before using the pharmacy sharing action. WhatsApp opens with a prefilled message and remains user initiated.</p>
  </Card></div>
}
