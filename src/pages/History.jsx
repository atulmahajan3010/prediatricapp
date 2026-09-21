import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { printPage } from '../lib/print.js'
import { api } from '../lib/api.js'
import { Card, EmptyState, Button, Input, Select } from '../components/ui.jsx'
import { formatDateReadable, calcAge, todayISO, parseDateValue, startOfWeek, isInRange } from '../lib/utils.js'

function getHistoryRange(period, selectedDate, startDate, endDate) {
  if (period === 'Custom') {
    const from = parseDateValue(startDate)
    const to = parseDateValue(endDate)
    if (!from || !to || from > to) return null
    from.setHours(0, 0, 0, 0)
    to.setHours(23, 59, 59, 999)
    return { from, to }
  }

  const anchor = parseDateValue(selectedDate) || new Date()
  if (period === 'Week') {
    const from = startOfWeek(anchor)
    const to = new Date(from)
    to.setDate(to.getDate() + 6)
    to.setHours(23, 59, 59, 999)
    return { from, to }
  }
  if (period === 'Month') {
    return {
      from: new Date(anchor.getFullYear(), anchor.getMonth(), 1),
      to: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999)
    }
  }
  if (period === 'Year') {
    return {
      from: new Date(anchor.getFullYear(), 0, 1),
      to: new Date(anchor.getFullYear(), 11, 31, 23, 59, 59, 999)
    }
  }

  const from = new Date(anchor)
  from.setHours(0, 0, 0, 0)
  const to = new Date(anchor)
  to.setHours(23, 59, 59, 999)
  return { from, to }
}

function dateToISO(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function History() {
  const [patients, setPatients] = useState([])
  const [visits, setVisits] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [patientSearchResults, setPatientSearchResults] = useState([])
  const [patientId, setPatientId] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [historyPeriod, setHistoryPeriod] = useState('Day')
  const [startDate, setStartDate] = useState(todayISO())
  const [endDate, setEndDate] = useState(todayISO())
  const [viewMode, setViewMode] = useState('daywise') // 'daywise' or 'patient'
  const [printData, setPrintData] = useState(null)

  const patient = patients.find((p) => p.id === patientId)

  const historyRange = useMemo(
    () => getHistoryRange(historyPeriod, selectedDate, startDate, endDate),
    [historyPeriod, selectedDate, startDate, endDate]
  )

  const historyRangeLabel = historyRange
    ? `${formatDateReadable(dateToISO(historyRange.from))} - ${formatDateReadable(dateToISO(historyRange.to))}`
    : 'Select a valid date range'

  useEffect(() => {
    if (!historyRange) return
    const from = dateToISO(historyRange.from)
    const to = dateToISO(historyRange.to)
    const patientParam = patientId ? `&patientId=${encodeURIComponent(patientId)}` : ''
    const allPatientHistory = viewMode === 'patient' && patientId
    const rangeParams = allPatientHistory ? `?patientId=${encodeURIComponent(patientId)}&all=true` : `?from=${from}&to=${to}${patientParam}`
    api.get(`/history${rangeParams}`).then((data) => {
      setVisits(data.visits || [])
      setPrescriptions(data.prescriptions || [])
      setPatients((current) => {
        const merged = new Map(current.map((item) => [item.id, item]))
        for (const item of data.patients || []) merged.set(item.id, item)
        return [...merged.values()]
      })
    }).catch((error) => console.error('History loading failed:', error))
  }, [historyRange, patientId, viewMode])

  useEffect(() => {
    const query = patientSearch.trim()
    if (!query || patientId) { setPatientSearchResults([]); return }
    api.get(`/patients?limit=10&search=${encodeURIComponent(query)}`)
      .then(setPatientSearchResults)
      .catch(() => setPatientSearchResults([]))
  }, [patientSearch, patientId])

  // Get all visits for the selected date or date range.
  const dayVisits = useMemo(
    () =>
      visits
        .filter((v) => historyRange && isInRange(v.date, historyRange.from, historyRange.to))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [visits, historyRange]
  )

  const dayPrescriptions = useMemo(
    () => prescriptions.filter((r) => historyRange && isInRange(r.date, historyRange.from, historyRange.to)),
    [prescriptions, historyRange]
  )

  // Include prescription-only patients so day-wise history does not hide saved prescriptions.
  const patientsForDay = useMemo(() => {
    const patientsMap = new Map()
    dayVisits.forEach((visit) => {
      const p = patients.find((pat) => pat.id === visit.patientId)
      if (p) {
        if (!patientsMap.has(visit.patientId)) {
          patientsMap.set(visit.patientId, { patient: p, visits: [] })
        }
        patientsMap.get(visit.patientId).visits.push(visit)
      }
    })
    dayPrescriptions.forEach((prescription) => {
      const p = patients.find((pat) => pat.id === prescription.patientId) || {
        id: prescription.patientId || `prescription-${prescription.id}`,
        name: prescription.patientName || 'Unnamed patient',
        phone: prescription.patientPhone || '',
        gender: prescription.gender || '',
        dob: ''
      }
      const patientKey = prescription.patientId || p.id
      if (!patientsMap.has(patientKey)) {
        patientsMap.set(patientKey, { patient: p, visits: [], prescriptions: [] })
      }
      const entry = patientsMap.get(patientKey)
      if (!entry.prescriptions) entry.prescriptions = []
      entry.prescriptions.push(prescription)
    })
    return Array.from(patientsMap.values())
  }, [dayVisits, dayPrescriptions, patients])

  const patientVisits = useMemo(
    () =>
      visits
        .filter((v) => v.patientId === patientId)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [visits, patientId]
  )

  const patientRx = useMemo(
    () =>
      prescriptions
        .filter((r) => r.patientId === patientId)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [prescriptions, patientId]
  )

  // Helper to navigate between dates
  const goToPreviousDay = () => {
    const d = parseDateValue(selectedDate) || new Date()
    d.setDate(d.getDate() - 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    setSelectedDate(`${y}-${m}-${day}`)
  }

  const goToNextDay = () => {
    const d = parseDateValue(selectedDate) || new Date()
    d.setDate(d.getDate() + 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    setSelectedDate(`${y}-${m}-${day}`)
  }

  const goToToday = () => {
    setSelectedDate(todayISO())
  }

  const goToYesterday = () => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    setSelectedDate(`${y}-${m}-${day}`)
  }

  const getYesterdayDate = () => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const handleSelectPatient = (pid) => {
    setPatientId(pid)
    const selected = patients.find((p) => p.id === pid) || patientSearchResults.find((p) => p.id === pid)
    if (selected) {
      setPatients((current) => current.some((p) => p.id === selected.id) ? current : [...current, selected])
    }
    setPatientSearch(selected ? `${selected.name} · ${selected.phone}` : '')
    setViewMode('patient')
  }

  function printHistory(data) {
    setPrintData(data)
    printPage()
  }

  useEffect(() => {
    const clearPrintData = () => setPrintData(null)
    window.addEventListener('afterprint', clearPrintData)
    return () => window.removeEventListener('afterprint', clearPrintData)
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-3xl text-ink">Patient History</h1>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => {
            setViewMode('daywise')
            setPatientId('')
            setPatientSearch('')
          }}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            viewMode === 'daywise'
              ? 'bg-teal text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Day-wise Visits
        </button>
        <button
          onClick={() => setViewMode('patient')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            viewMode === 'patient'
              ? 'bg-teal text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Full Patient History
        </button>
      </div>

      {/* DAY-WISE VIEW */}
      {viewMode === 'daywise' && (
        <>
          {/* Date Navigation */}
          <Card className="mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
              {historyPeriod === 'Day' && <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={goToPreviousDay}
                  variant="secondary"
                  className="px-3 py-2"
                >
                  ← Previous
                </Button>
                <Button
                  onClick={goToYesterday}
                  variant={selectedDate === getYesterdayDate() ? 'primary' : 'secondary'}
                  className="px-3 py-2"
                >
                  Yesterday
                </Button>
                <Button
                  onClick={goToToday}
                  variant={selectedDate === todayISO() ? 'primary' : 'secondary'}
                  className="px-3 py-2"
                >
                  Today
                </Button>
                <Button
                  onClick={goToNextDay}
                  variant="secondary"
                  className="px-3 py-2"
                >
                  Next →
                </Button>
              </div>}

              <div className="flex gap-4 items-end flex-wrap w-full md:w-auto">
                <div className="flex-1 md:flex-none">
                  <label className="text-xs text-slate-500 block mb-1">History Period</label>
                  <Select value={historyPeriod} onChange={(e) => setHistoryPeriod(e.target.value)}>
                    <option value="Day">Day</option>
                    <option value="Week">Week</option>
                    <option value="Month">Month</option>
                    <option value="Year">Year</option>
                    <option value="Custom">Custom range</option>
                  </Select>
                </div>

                {historyPeriod === 'Custom' ? (
                  <>
                    <div className="flex-1 md:flex-none">
                      <label className="text-xs text-slate-500 block mb-1">Start Date</label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="flex-1 md:flex-none">
                      <label className="text-xs text-slate-500 block mb-1">End Date</label>
                      <Input
                        type="date"
                        value={endDate}
                        min={startDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                <div className="flex-1 md:flex-none">
                  <label className="text-xs text-slate-500 block mb-1">{historyPeriod === 'Day' ? 'Pick Date' : 'Date in period'}</label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                )}

                <div className="text-sm font-medium text-slate-600 whitespace-nowrap">
                  {historyRangeLabel} • <span className="text-teal font-bold">{patientsForDay.length}</span> patient{patientsForDay.length !== 1 ? 's' : ''}
                </div>

                {patientsForDay.length > 0 && (
                  <button
                    onClick={() => printHistory({ type: 'day', date: selectedDate, rangeLabel: historyRangeLabel, patients: patientsForDay })}
                    className="px-3 py-2 bg-teal text-white rounded-lg hover:bg-teal-dark transition-colors text-xs font-medium whitespace-nowrap"
                  >
                    🖨️ Print
                  </button>
                )}
              </div>
            </div>
          </Card>

          {/* Patients List for Selected Date */}
          {patientsForDay.length === 0 ? (
            <EmptyState title={`No visits recorded from ${historyRangeLabel}`} />
          ) : (
            <div className="grid gap-4">
              {patientsForDay.map(({ patient: p, visits: pvs, prescriptions: prs = [] }) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectPatient(p.id)}
                  className="cursor-pointer"
                >
                  <Card className="hover:shadow-lg transition-all hover:border-teal/40">
                    <div className="space-y-3">
                      {/* Patient Header */}
                      <div className="border-b border-slate-200 pb-3">
                        <div className="font-display text-lg text-ink hover:text-teal transition-colors">
                          {p.name}
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          📞 {p.phone} • {p.gender}
                          {p.dob ? ` • Age: ${calcAge(p.dob)}` : ''}
                        </div>
                      </div>

                      {/* Visit Details */}
                      <div className="space-y-2">
                        {pvs.map((v) => (
                          <div key={v.id} className="bg-slate-50 p-3 rounded text-sm border-l-4 border-teal/50">
                            <div className="font-medium text-ink">{v.complaint || '(No complaint recorded)'}</div>
                            {v.diagnosis && (
                              <div className="text-slate-600 mt-1">
                                <strong>Diagnosis:</strong> {v.diagnosis}
                              </div>
                            )}
                            <div className="text-xs text-slate-500 mt-2 flex gap-4 flex-wrap">
                              <span>{v.paymentDone === 'Yes' ? '✓ Payment received' : '✗ Payment pending'}</span>
                              {v.fees && <span>Fee: ₹{v.fees}</span>}
                            </div>
                          </div>
                        ))}
                        {prs.map((r) => (
                          <div key={r.id} className="bg-teal-light/40 p-3 rounded text-sm border-l-4 border-teal">
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-medium text-ink">Prescription</div>
                              <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <Link
                                  to={`/prescriptions?rx=${r.id}`}
                                  className="text-xs font-medium text-teal hover:underline"
                                >
                                  ✏️ Edit
                                </Link>
                                <Link
                                  to={`/prescriptions?rx=${r.id}&action=print`}
                                  className="text-xs font-medium text-teal hover:underline"
                                >
                                  🖨️ Reprint
                                </Link>
                              </div>
                            </div>
                            {r.diagnosis && <div className="text-slate-600 mt-1"><strong>Diagnosis:</strong> {r.diagnosis}</div>}
                            <div className="text-xs text-slate-500 mt-2">{(r.medicines || []).length} medicine(s)</div>
                          </div>
                        ))}
                      </div>

                      {/* Click Hint */}
                      <div className="text-xs text-slate-400 text-right pt-2 italic">
                        Click to view full history →
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* PATIENT VIEW */}
      {viewMode === 'patient' && (
        <>
          <Card title="Patient History" className="mb-6">
            <div className="flex flex-col gap-2">
              <span className="text-sm text-slate-500">Search Patient</span>
              <div className="relative w-full max-w-md">
                <input
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value)
                    setPatientId('')
                  }}
                  placeholder="Type patient name or mobile number..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal/40 focus:border-teal"
                />
                {patientSearch.trim() && !patientId && (
                  <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {patientSearchResults.length > 0 ? patientSearchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPatient(p.id)}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-teal-light border-b border-slate-100 last:border-0"
                      >
                        <span className="font-medium text-ink">{p.name}</span>
                        <span className="block text-xs text-slate-500">{p.phone} · {p.gender}{p.dob ? ` · Age: ${calcAge(p.dob)}` : ''}</span>
                      </button>
                    )) : (
                      <div className="px-3 py-3 text-sm text-slate-400">No matching patient found.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            {patientId && !patient && (
              <p className="text-sm text-slate-400 mt-3">Patient not found.</p>
            )}
          </Card>

          {!patient ? (
            <EmptyState title="History loaded once you pick a patient above." />
          ) : (
            <>
              <Card className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-display text-xl text-ink">{patient.name}</div>
                    <div className="text-sm text-slate-500 mt-1">
                      {patient.phone} · {patient.gender}
                      {patient.dob ? ` · Age: ${calcAge(patient.dob)}` : ''}
                    </div>
                </div>
                  <Button onClick={() => printHistory({ type: 'patient', patient, visits: patientVisits, prescriptions: patientRx })}>
                    🖨️ Print
                  </Button>
                </div>
              </Card>

              <Card title={`Visits (${patientVisits.length})`} className="mb-6">
                {patientVisits.length === 0 ? (
                  <EmptyState title="No visits recorded." />
                ) : (
                  <div className="space-y-3">
                    {patientVisits.map((v) => (
                      <div key={v.id} className="border-b border-slate-100 pb-3 last:border-0">
                        <div className="font-medium text-ink text-sm">
                          {formatDateReadable(v.date)}
                        </div>
                        <div className="text-xs text-slate-500">{v.complaint}</div>
                        {v.diagnosis && <div className="text-xs text-slate-400">Dx: {v.diagnosis}</div>}
                        <div className="text-xs text-slate-300">
                          {v.paymentDone === 'Yes' ? 'Payment received' : 'Payment pending'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card title={`Prescriptions (${patientRx.length})`}>
                {patientRx.length === 0 ? (
                  <EmptyState title="No prescriptions recorded." />
                ) : (
                  <div className="space-y-3">
                    {patientRx.map((r) => (
                      <div key={r.id} className="border-b border-slate-100 pb-3 last:border-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium text-ink text-sm">
                            {formatDateReadable(r.date)}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Link
                              to={`/prescriptions?rx=${r.id}`}
                              className="text-xs font-medium text-teal hover:underline"
                            >
                              ✏️ Edit
                            </Link>
                            <Link
                              to={`/prescriptions?rx=${r.id}&action=print`}
                              className="text-xs font-medium text-teal hover:underline"
                            >
                              🖨️ Reprint
                            </Link>
                          </div>
                        </div>
                        <div className="text-xs text-slate-500">
                          {(r.medicines || []).length} medicine(s):{' '}
                          {(r.medicines || []).map((m) => m.name).filter(Boolean).join(', ') || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      )}
      {printData && createPortal(
        <div id="print-area" className="hidden print:block history-print bg-white text-black">
          {printData.type === 'day' ? (
            <>
              <h1>Patient History - {printData.rangeLabel || formatDateReadable(printData.date)}</h1>
              {printData.patients.map(({ patient: p, visits: pvs }) => (
                <section key={p.id}>
                  <h2>{p.name}</h2>
                  <p>{p.phone} | {p.gender}{p.dob ? ` | Age: ${calcAge(p.dob)}` : ''}</p>
                  {pvs.map((visit) => (
                    <div key={visit.id} className="history-print-entry">
                      <strong>{visit.complaint || '(No complaint recorded)'}</strong>
                      {visit.diagnosis && <div>Diagnosis: {visit.diagnosis}</div>}
                      <div>{visit.paymentDone === 'Yes' ? 'Payment received' : 'Payment pending'}{visit.fees ? ` | Fee: Rs. ${visit.fees}` : ''}</div>
                    </div>
                  ))}
                </section>
              ))}
            </>
          ) : (
            <>
              <h1>Patient History</h1>
              <h2>{printData.patient.name}</h2>
              <p>{printData.patient.phone} | {printData.patient.gender}{printData.patient.dob ? ` | Age: ${calcAge(printData.patient.dob)}` : ''}</p>
              <h3>Visits ({printData.visits.length})</h3>
              {printData.visits.map((visit) => (
                <div key={visit.id} className="history-print-entry">
                  <strong>{formatDateReadable(visit.date)}</strong>
                  <div>{visit.complaint}</div>
                  {visit.diagnosis && <div>Diagnosis: {visit.diagnosis}</div>}
                </div>
              ))}
              <h3>Prescriptions ({printData.prescriptions.length})</h3>
              {printData.prescriptions.map((rx) => (
                <div key={rx.id} className="history-print-entry">
                  <strong>{formatDateReadable(rx.date)}</strong>
                  <div>{(rx.medicines || []).map((m) => m.name).filter(Boolean).join(', ') || 'No medicines recorded'}</div>
                </div>
              ))}
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
