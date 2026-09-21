import { useEffect, useState } from 'react'
import { Card, Field, Input, Select, Button } from '../components/ui.jsx'
import { api } from '../lib/api.js'
import { todayISO, startOfWeek, rupees, parseDateValue } from '../lib/utils.js'
import { downloadCSV } from '../lib/csv.js'

function rangeFor(period, dateStr) {
  const date = parseDateValue(dateStr)
  if (!date) {
    const fallback = new Date()
    return { from: fallback, to: fallback }
  }
  if (period === 'Day') {
    const from = new Date(date)
    from.setHours(0, 0, 0, 0)
    const to = new Date(date)
    to.setHours(23, 59, 59, 999)
    return { from, to }
  }
  if (period === 'Week') {
    const from = startOfWeek(date)
    const to = new Date(from)
    to.setDate(to.getDate() + 6)
    to.setHours(23, 59, 59, 999)
    return { from, to }
  }
  if (period === 'Month') {
    const from = new Date(date.getFullYear(), date.getMonth(), 1)
    const to = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
    return { from, to }
  }
  const from = new Date(date.getFullYear(), 0, 1)
  const to = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999)
  return { from, to }
}

function rangeISO(dateStr, period) {
  const { from, to } = rangeFor(period, dateStr)
  return { from: dateToISO(from), to: dateToISO(to) }
}

function dateToISO(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Anchor date shifted back by one period, used to fetch the previous-period comparison.
function previousPeriodAnchorISO(dateStr, period) {
  const date = parseDateValue(dateStr) || new Date()
  const prev = new Date(date)
  if (period === 'Day') prev.setDate(prev.getDate() - 1)
  else if (period === 'Week') prev.setDate(prev.getDate() - 7)
  else if (period === 'Month') prev.setMonth(prev.getMonth() - 1)
  else prev.setFullYear(prev.getFullYear() - 1)
  return dateToISO(prev)
}

// Percentage change label vs previous period, or null when there is nothing meaningful to compare.
function trendLabel(current, previous) {
  const curr = Number(current) || 0
  const prev = Number(previous) || 0
  if (!prev) return curr ? '+100%' : null
  const pct = Math.round(((curr - prev) / prev) * 100)
  if (pct === 0) return '0%'
  return `${pct > 0 ? '+' : ''}${pct}%`
}

export default function Reports() {
  const [date, setDate] = useState(todayISO())
  const [period, setPeriod] = useState('Day')
  const [stats, setStats] = useState({ patients: 0, newPatients: 0, repeatPatients: 0, visits: 0, prescriptions: 0, paidVisits: 0, pending: 0, totalFees: 0, avgFee: 0 })
  const [previousStats, setPreviousStats] = useState(null)
  const [snapshots, setSnapshots] = useState({ Day: {}, Week: {}, Month: {}, Year: {} })
  const [earnings, setEarnings] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    let active = true
    const periods = ['Day', 'Week', 'Month', 'Year']
    const selectedRange = rangeISO(date, period)
    const previousRange = rangeISO(previousPeriodAnchorISO(date, period), period)
    setLoading(true)
    setLoadError(null)
    Promise.all([
      ...periods.map(async (name) => {
        const range = rangeISO(date, name)
        return [name, await api.get(`/reports/summary?from=${range.from}&to=${range.to}`)]
      }),
      api.get(`/reports/earnings?from=${selectedRange.from}&to=${selectedRange.to}`),
      api.get(`/reports/summary?from=${previousRange.from}&to=${previousRange.to}`)
    ]).then((results) => {
      if (!active) return
      const next = Object.fromEntries(results.slice(0, periods.length))
      setSnapshots(next)
      setStats(next[period])
      setEarnings(results[periods.length])
      setPreviousStats(results[periods.length + 1])
    }).catch((error) => {
      console.error('Report loading failed:', error)
      if (active) setLoadError('Could not load report data. Please try refreshing.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [date, period, refreshTick])

  const snapshotRows = Object.entries(snapshots)
  const snapshotMaximum = Math.max(
    ...snapshotRows.flatMap(([, snapshot]) => [snapshot.patients || 0, snapshot.visits || 0, snapshot.prescriptions || 0]),
    1
  )
  const paidShare = stats.visits ? Math.round((stats.paidVisits / stats.visits) * 100) : 0
  const pendingShare = stats.visits ? 100 - paidShare : 0

  function exportCSV() {
    const rows = Object.entries(snapshots).map(([label, snapshot]) => ({
      date,
      period: label,
      selected: label === period ? 'yes' : 'no',
      patients: snapshot.patients || 0,
      newPatients: snapshot.newPatients || 0,
      repeatPatients: snapshot.repeatPatients || 0,
      visits: snapshot.visits || 0,
      prescriptions: snapshot.prescriptions || 0,
      paidVisits: snapshot.paidVisits || 0,
      pendingPayments: snapshot.pending || 0,
      totalFees: snapshot.totalFees || 0,
      averageFee: snapshot.avgFee || 0
    }))
    downloadCSV(
      `report-${date}-${period}.csv`,
      rows,
      [
        'date',
        'period',
        'selected',
        'patients',
        'newPatients',
        'repeatPatients',
        'visits',
        'prescriptions',
        'paidVisits',
        'pendingPayments',
        'totalFees',
        'averageFee'
      ]
    )
  }

  const summaryMetrics = [
    { label: 'Patients', value: stats.patients, detail: `${stats.newPatients} new / ${stats.repeatPatients} repeat`, trend: trendLabel(stats.patients, previousStats?.patients) },
    { label: 'Visits', value: stats.visits, detail: `${stats.prescriptions} prescriptions`, trend: trendLabel(stats.visits, previousStats?.visits) },
    { label: 'Collected', value: rupees(stats.totalFees), detail: `${stats.paidVisits} paid / ${stats.pending} pending`, trend: trendLabel(stats.totalFees, previousStats?.totalFees) },
    { label: 'Average Fee', value: rupees(stats.avgFee), detail: stats.visits ? 'per visit' : 'no visits yet', trend: trendLabel(stats.avgFee, previousStats?.avgFee) }
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Analytics</p>
          <h1 className="font-display text-3xl text-ink">Date-wise Reports Export</h1>
        </div>
      </div>

      <Card title="Report Filters" className="mb-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-end">
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Period">
              <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
                <option>Day</option>
                <option>Week</option>
                <option>Month</option>
                <option>Year</option>
              </Select>
            </Field>
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" onClick={() => setRefreshTick((tick) => tick + 1)} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
            <Button type="button" variant="success" onClick={exportCSV}>
              Download CSV
            </Button>
          </div>
        </div>
        {loadError && <p className="mt-3 text-sm font-medium text-rose-600">{loadError}</p>}
      </Card>

      <Card title="Selected Period Summary" className="mb-6">
        <div className="report-summary-grid">
          {summaryMetrics.map((metric) => (
            <div className="report-summary-metric" key={metric.label}>
              <div className="report-summary-label">
                <span>{metric.label}</span>
                {metric.trend && <span className="report-summary-trend">{metric.trend}</span>}
              </div>
              <strong>{metric.value}</strong>
              <span>{metric.detail}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="report-visual-grid mb-6">
        <Card title="Activity at a glance">
          <div className="report-chart" aria-label="Patients, visits, and prescriptions by period">
            <div className="report-chart-legend">
              <span><i className="report-dot report-dot-patients" />Patients</span>
              <span><i className="report-dot report-dot-visits" />Visits</span>
              <span><i className="report-dot report-dot-prescriptions" />Prescriptions</span>
            </div>
            <div className="report-chart-rows">
              {snapshotRows.map(([label, snapshot]) => (
                <div className="report-chart-row" key={label}>
                  <span className="report-chart-label">{label}</span>
                  <div className="report-chart-bars">
                    <span className="report-bar report-bar-patients" style={{ width: `${(snapshot.patients || 0) / snapshotMaximum * 100}%` }} title={`${snapshot.patients || 0} patients`} />
                    <span className="report-bar report-bar-visits" style={{ width: `${(snapshot.visits || 0) / snapshotMaximum * 100}%` }} title={`${snapshot.visits || 0} visits`} />
                    <span className="report-bar report-bar-prescriptions" style={{ width: `${(snapshot.prescriptions || 0) / snapshotMaximum * 100}%` }} title={`${snapshot.prescriptions || 0} prescriptions`} />
                  </div>
                  <span className="report-chart-value">{snapshot.visits || 0}</span>
                </div>
              ))}
            </div>
            <p className="report-chart-note">Bars are scaled to the busiest value in this report.</p>
          </div>
        </Card>

        <Card title="Visit payment mix">
          <div className="report-payment-visual">
            <div
              className="report-donut"
              style={{ '--paid-share': `${paidShare}%` }}
              role="img"
              aria-label={`${paidShare}% paid visits and ${pendingShare}% pending visits`}
            >
              <strong>{stats.visits}</strong>
              <span>visits</span>
            </div>
            <div className="report-payment-legend">
              <div><i className="report-dot report-dot-paid" /><span>Paid</span><strong>{stats.paidVisits}</strong></div>
              <div><i className="report-dot report-dot-pending" /><span>Pending</span><strong>{stats.pending}</strong></div>
              <p>{stats.visits ? `${paidShare}% collected` : 'No visits in this period'}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Daily Doctor Earnings" className="mt-6">
        {earnings.length === 0 ? (
          <p className="text-sm text-slate-500">No paid visits recorded for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-end gap-3 min-w-max h-64 px-2 pt-6">
              {earnings.map((item) => {
                const maximum = Math.max(...earnings.map((entry) => entry.earnings), 1)
                const height = Math.max(8, (item.earnings / maximum) * 190)
                return (
                  <div key={item.date} className="flex flex-col items-center justify-end h-full w-12 gap-2">
                    <span className="text-[10px] text-slate-600 whitespace-nowrap">{rupees(item.earnings)}</span>
                    <div className="w-8 rounded-t bg-teal" style={{ height }} title={`${item.date}: ${rupees(item.earnings)}`} />
                    <span className="text-[10px] text-slate-500 -rotate-45 origin-top-left whitespace-nowrap">{item.date.slice(5)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
