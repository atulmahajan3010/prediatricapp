import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { printPage } from '../lib/print.js'
import { useAuth, useCollection, useClinicProfile } from '../context/AppContext.jsx'
import { Card, Field, Input, Select, Button, EmptyState } from '../components/ui.jsx'
import { todayISO, formatDateReadable, rupees } from '../lib/utils.js'
import { shareDocumentFile } from '../lib/whatsapp.js'
import { showAlert } from '../lib/dialog.jsx'

const emptyItem = { description: 'Consultation Fee', amount: '' }

const numberWords = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const tensWords = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function underThousand(value) {
  if (value < 20) return numberWords[value]
  if (value < 100) return `${tensWords[Math.floor(value / 10)]}${value % 10 ? ` ${numberWords[value % 10]}` : ''}`
  return `${numberWords[Math.floor(value / 100)]} Hundred${value % 100 ? ` ${underThousand(value % 100)}` : ''}`
}

function amountInWords(value) {
  const amount = Math.max(0, Math.round(Number(value) || 0))
  if (amount === 0) return 'Zero Rupees Only'
  const parts = []
  let remaining = amount
  const units = [[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand'], [1, '']]
  units.forEach(([unit, label]) => {
    const count = Math.floor(remaining / unit)
    if (count) {
      parts.push(`${underThousand(count)}${label ? ` ${label}` : ''}`)
      remaining %= unit
    }
  })
  return `${parts.join(' ')} Rupees Only`
}

export default function Bills() {
  const { doctor } = useAuth()
  const { items: patients } = useCollection('patients')
  const { items: visits } = useCollection('visits')
  const { items: bills, add } = useCollection('bills')
  const { profile } = useClinicProfile()

  const [patientId, setPatientId] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [visitId, setVisitId] = useState('')
  const [items, setItems] = useState([{ ...emptyItem }])
  const [discount, setDiscount] = useState(0)
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [paid, setPaid] = useState('No')
  const [printingBill, setPrintingBill] = useState(null)

  const patientVisits = visits.filter((v) => v.patientId === patientId)
  const patientSearchResults = useMemo(() => {
    const query = patientSearch.trim().toLowerCase()
    if (!query) return []
    return patients
      .filter((p) => p.name.toLowerCase().includes(query) || p.phone.includes(query))
      .slice(0, 10)
  }, [patients, patientSearch])
  const total = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0) - (Number(discount) || 0)

  function updateItem(idx, key, value) {
    setItems((its) => its.map((it, i) => (i === idx ? { ...it, [key]: value } : it)))
  }

  function addItem() {
    setItems((its) => [...its, { ...emptyItem, description: '' }])
  }

  async function createBill(e) {
    e.preventDefault()
    if (!patientId) return
    const bill = await add({
      patientId,
      visitId: visitId || null,
      items,
      discount: Number(discount) || 0,
      total: Math.max(total, 0),
      paymentMode,
      paid: paid === 'Yes',
      date: todayISO()
    })
    setItems([{ ...emptyItem }])
    setDiscount(0)
    setPaid('No')
    setPrintingBill(bill)
  }

  function printBill(bill) {
    setPrintingBill(bill)
    requestAnimationFrame(() => {
      window.setTimeout(() => printPage(), 120)
    })
  }

  const patientOf = (id) => patients.find((p) => p.id === id)

  async function sendBillWhatsApp(bill, format = 'image') {
    const patient = patientOf(bill.patientId)
    if (!patient?.whatsappAllowed) { await showAlert('WhatsApp sharing is disabled because patient permission has not been recorded.'); return }
    if (!patient?.whatsappNumber && !patient?.phone) { await showAlert('A WhatsApp number is not available for this patient.'); return }
    setPrintingBill(bill)
    window.setTimeout(async () => {
      try {
        const printableArea = document.querySelector('#print-area') || document.querySelector('#print-area > div')
        const result = await shareDocumentFile(patient.whatsappNumber || patient.phone, printableArea, `bill-${String(bill.id).slice(-6)}.${format === 'pdf' ? 'pdf' : 'png'}`, 'Digital bill', format)
        if (!result.success) await showAlert(result.error || `Could not share the bill ${format === 'pdf' ? 'PDF' : 'image'}.`)
        else if (result.copied) await showAlert(`Bill ${format === 'pdf' ? 'PDF' : 'image'} copied. Paste it into the opened WhatsApp chat.`)
      } catch (error) {
        if (error.name !== 'AbortError') await showAlert(`Could not share the bill ${format === 'pdf' ? 'PDF' : 'image'}: ${error.message}`)
      }
    }, 80)
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink mb-5">Bill / Receipt Generation</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Create Bill">
          <form onSubmit={createBill} className="space-y-4">
            <Field label="Patient">
              <div className="relative">
                <Input
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value)
                    setPatientId('')
                    setVisitId('')
                  }}
                  placeholder="Type patient name or mobile number..."
                  required
                  autoComplete="off"
                />
                {patientSearch.trim() && !patientId && (
                  <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {patientSearchResults.length > 0 ? patientSearchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPatientId(p.id)
                          setPatientSearch(`${p.name} · ${p.phone}`)
                          setVisitId('')
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
            <Field label="Visit (optional)">
              <Select value={visitId} onChange={(e) => setVisitId(e.target.value)}>
                <option value="">Select visit</option>
                {patientVisits.map((v) => (
                  <option key={v.id} value={v.id}>
                    {formatDateReadable(v.date)} — {v.complaint || 'Visit'}
                  </option>
                ))}
              </Select>
            </Field>

            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Description">
                  <Input
                    value={it.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                  />
                </Field>
                <Field label="Amount (₹)">
                  <Input
                    type="number"
                    value={it.amount}
                    onChange={(e) => updateItem(idx, 'amount', e.target.value)}
                  />
                </Field>
              </div>
            ))}
            <Button type="button" variant="ghost" onClick={addItem} className="w-full justify-center">
              + Add Item
            </Button>

            <Field label="Discount (₹)">
              <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </Field>
            <Field label="Payment Mode">
              <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                <option>Cash</option>
                <option>Card</option>
                <option>UPI</option>
                <option>Insurance</option>
              </Select>
            </Field>
            <Field label="Paid">
              <Select value={paid} onChange={(e) => setPaid(e.target.value)}>
                <option>No</option>
                <option>Yes</option>
              </Select>
            </Field>

            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-slate-500">
                Total: <span className="font-semibold text-ink">{rupees(total)}</span>
              </div>
              <Button type="submit">Create Bill</Button>
            </div>
          </form>
        </Card>

        <Card title="Bills">
          {bills.length === 0 ? (
            <EmptyState title="No bills yet" />
          ) : (
            <div className="space-y-3 max-h-[560px] overflow-y-auto">
              {bills.map((b) => (
                <div key={b.id} className="border-b border-slate-100 pb-3 last:border-0">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-ink">{rupees(b.total)}</div>
                    <span className={`text-xs font-medium ${b.paid ? 'text-teal' : 'text-amber'}`}>
                      {b.paid ? '✓ Paid' : 'Pending'} · {b.paymentMode}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {patientOf(b.patientId)?.name || 'Unknown'} · {formatDateReadable(b.date)}
                  </div>
                  <button
                    onClick={() => printBill(b)}
                    className="text-xs text-teal font-medium mt-1"
                  >
                    Print
                  </button>
                  <button onClick={() => sendBillWhatsApp(b, 'image')} className="text-xs text-teal font-medium mt-1 ml-3">💬 Send Image</button>
                  <button onClick={() => sendBillWhatsApp(b, 'pdf')} className="text-xs text-teal font-medium mt-1 ml-3">📄 Send PDF</button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {printingBill && createPortal(
        <div id="print-area" className="hidden print:block shareable-document receipt-print bg-white font-sans text-black">
          <div className="receipt-header">
            <div className="receipt-hospital-logo receipt-header-logo" aria-label="Clinic logo">
              {profile?.logoData && <img src={profile.logoData} alt={`${profile.clinicName} logo`} style={{ height: '50px', objectFit: 'contain' }} />}
            </div>
            <div className="receipt-clinic-block">
              <div className="receipt-clinic-name">{profile?.clinicName || 'Doctor Clinic'}</div>
              {profile?.address && <div>{profile.address}</div>}
            </div>
            <div className="receipt-doctor-block">
              <div className="receipt-doctor-name">Dr. {doctor?.name || ''}</div>
              <div>{profile?.qualifications}</div>
              <div className="receipt-consultant-title">{profile?.specialization}</div>
              <div>Reg.No.: {profile?.registrationNumber}</div>
              <div>Mob.: {profile?.doctorPhone || profile?.phone}{profile?.email ? `  |  ${profile.email}` : ''}</div>
            </div>
          </div>
          <div className="receipt-title">RECEIPT / BILL</div>
          <div className="receipt-meta">
            <span>Receipt No.: {String(printingBill.id || '').slice(-6).toUpperCase() || '-'}</span>
            <span>Date: {formatDateReadable(printingBill.date)}</span>
          </div>
          <div className="receipt-line"><strong>Received from Mr. / Mrs.</strong><span>{patientOf(printingBill.patientId)?.name || 'Patient'}</span></div>
          <div className="receipt-line"><strong>The sum of Rupees</strong><span>{amountInWords(printingBill.total)}</span></div>
          <div className="receipt-line"><strong>Particulars</strong><span>{printingBill.items.map((it) => it.description).filter(Boolean).join(', ') || 'Consultation'}</span></div>
          <table className="receipt-items">
            <thead><tr><th>Description</th><th>Amount</th></tr></thead>
            <tbody>
              {printingBill.items.map((it, i) => (
                <tr key={i}>
                  <td>{it.description || 'Service'}</td>
                  <td>{rupees(it.amount)}</td>
                </tr>
              ))}
              {printingBill.discount > 0 && (
                <tr>
                  <td>Discount</td>
                  <td>-{rupees(printingBill.discount)}</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="receipt-total"><span>Total</span><strong>{rupees(printingBill.total)}</strong></div>
          <div className="receipt-payment">{printingBill.paid ? 'Paid' : 'Payment Pending'} | Payment mode: {printingBill.paymentMode}</div>
          <div className="receipt-footer">
            <div className="receipt-signature">
              <div className="receipt-signature-name">Dr. {doctor?.name || 'सागर जगन्नाथ महाजन'}</div>
              <div>Doctor's Signature</div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
