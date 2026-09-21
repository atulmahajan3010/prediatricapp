import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, useClinicProfile } from '../context/AppContext.jsx'
import { api } from '../lib/api.js'
import { todayISO, rupees, formatDateReadable } from '../lib/utils.js'

const actions = [
  { to: '/prescriptions', label: 'Quick prescription', detail: 'Write, print, and share a new Rx.', icon: '✦', tone: 'sapphire' },
  { to: '/patients', label: 'Patient plan', detail: 'Find a patient and review their story.', icon: '◉', tone: 'coral' },
  { to: '/templates', label: 'Saved templates', detail: 'Start with your most-used treatment.', icon: '▤', tone: 'amethyst' },
  { to: '/bills', label: 'Create a bill', detail: 'Generate a clear, professional receipt.', icon: '◌', tone: 'chartreuse' }
]

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 7 7 6 7-6" />
    </svg>
  )
}

function ArrowUpRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h9v9" />
    </svg>
  )
}

function MetricCard({ label, value, subtitle, icon, trend, accent }) {
  const accentClasses = {
    teal: 'bg-teal-50 text-teal-700',
    blue: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700'
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accentClasses[accent]}`} aria-hidden="true">
          <span className="text-lg">{icon}</span>
        </div>
      </div>

      <div className="mt-8 flex items-end justify-between gap-3">
        <div>
          <div className="text-3xl font-bold tracking-tight text-slate-900">{value}</div>
          <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      {trend && (
        <div className="mt-5 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">{trend}</div>
      )}
    </article>
  )
}

export default function Home() {
  const { doctor } = useAuth()
  const { profile } = useClinicProfile()
  const [dashboard, setDashboard] = useState(null)
  const [actionIndex, setActionIndex] = useState(0)
  const [completedFollowUps, setCompletedFollowUps] = useState([])

  useEffect(() => {
    api.get('/dashboard').then(setDashboard).catch((err) => {
      console.error('Dashboard load error:', err.message)
    })
  }, [])

  const today = todayISO()
  const waitingToday = dashboard?.waitingToday || 0
  const pendingVisits = dashboard?.pendingVisits || 0
  const revenue = dashboard?.revenue || 0
  const todayVisits = dashboard?.todayVisits || 0
  const followUpItems = dashboard?.followUps || []
  const recentPatients = dashboard?.recentPatients || []
  const visibleActions = [0, 1, 2].map((offset) => actions[(actionIndex + offset) % actions.length])
  const doctorName = profile?.doctorName || doctor?.name || 'Atul Mahajan'
  const clinicName = profile?.clinicName || 'SACHI Hospital'

  const shiftAction = (amount) => setActionIndex((current) => (current + amount + actions.length) % actions.length)
  const toggleFollowUp = (id) => setCompletedFollowUps((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  const paidVisits = dashboard?.paidVisits || 0
  const totalVisits = paidVisits + pendingVisits
  const collectedShare = totalVisits ? Math.round((paidVisits / totalVisits) * 100) : null
  const metrics = [
    { label: 'Visits', value: todayVisits, subtitle: 'Patients checked in today', icon: '◌', accent: 'teal' },
    { label: 'Prescriptions', value: dashboard?.prescriptions || 0, subtitle: 'Across your practice', icon: '▣', accent: 'blue' },
    { label: 'Patients', value: dashboard?.patients || 0, subtitle: `${waitingToday} waiting today`, icon: '◍', accent: 'amber' },
    { label: 'Fees Collected', value: rupees(revenue), subtitle: `${pendingVisits} visit payments pending`, trend: collectedShare != null ? `${collectedShare}% collected` : null, icon: '◔', accent: 'emerald' }
  ]

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{clinicName} / Workspace</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Good morning, Dr. {doctorName}</h1>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Link
            to="/followups"
            aria-label="View follow-up notifications"
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900"
          >
            <BellIcon />
            <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
          </Link>

          <a
            href={`mailto:${doctor?.email || ''}`}
            aria-label="Open messages"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900"
          >
            <MailIcon />
          </a>

          <Link
            to="/clinic-profile"
            aria-label="Open doctor profile"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-cyan-500 text-sm font-bold text-white shadow-lg shadow-teal-500/20 ring-4 ring-teal-100 transition hover:-translate-y-0.5"
          >
            {doctorName.charAt(0)}
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Clinic metrics">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            subtitle={metric.subtitle}
            trend={metric.trend}
            icon={metric.icon}
            accent={metric.accent}
          />
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_minmax(280px,0.9fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Keep momentum</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Quick actions</h2>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => shiftAction(-1)} aria-label="Previous quick action" className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-slate-300 hover:bg-slate-100">←</button>
                <button type="button" onClick={() => shiftAction(1)} aria-label="Next quick action" className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-slate-300 hover:bg-slate-100">→</button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {visibleActions.map((action, index) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className={`group relative overflow-hidden rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${index === 0 ? 'border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50' : 'border-slate-200 bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl shadow-sm">{action.icon}</div>
                    <ArrowUpRightIcon />
                  </div>
                  <div className="mt-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{index === 0 ? 'Start here' : 'Explore'}</p>
                    <h3 className="mt-2 text-base font-semibold text-slate-900">{action.label}</h3>
                    <p className="mt-2 text-sm leading-5 text-slate-600">{action.detail}</p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
              {actions.map((action, index) => (
                <button
                  type="button"
                  key={action.to}
                  onClick={() => setActionIndex(index)}
                  aria-label={`Show action ${index + 1}`}
                  className={`h-2 rounded-full transition ${index === actionIndex ? 'w-8 bg-teal-600' : 'w-2 bg-slate-300'}`}
                />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">This week</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Recent reports</h2>
              </div>
              <Link to="/reports" className="text-sm font-semibold text-teal-700 transition hover:text-teal-800">See all reports</Link>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Link to="/reports" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-cyan-600 to-sky-700 p-4 text-white shadow-lg shadow-teal-600/20">
                <div className="absolute right-3 top-3 flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg">↗</div>
                <div className="relative z-10">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-50/80">Practice pulse</p>
                  <h3 className="mt-3 text-xl font-bold">{dashboard?.patients || 0} patient profiles</h3>
                  <p className="mt-2 max-w-xs text-sm text-teal-50/80">Keep your clinic moving with a clear daily overview.</p>
                </div>
              </Link>

              <Link to="/history" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-4 text-white shadow-lg shadow-slate-900/15">
                <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-rose-400 text-sm font-bold text-white">{doctorName.charAt(0)}</div>
                <div className="relative z-10">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">Latest activity</p>
                  <h3 className="mt-3 text-xl font-bold">Patient history</h3>
                  <p className="mt-2 text-sm text-slate-300">Review your most recent care records.</p>
                </div>
              </Link>
            </div>
          </section>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Care radar</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Follow-ups & recent</h2>
            </div>
            <Link to="/followups" className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-slate-300 hover:bg-slate-100" aria-label="Open follow-up reminders">
              <ArrowUpRightIcon />
            </Link>
          </div>

          <div className="mb-4 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            <span>Follow-up patients</span>
            <Link to="/followups" className="text-teal-700">View all</Link>
          </div>

          <div className="space-y-3">
            {followUpItems.length ? (
              followUpItems.map((item, index) => {
                const complete = completedFollowUps.includes(item.id)
                const overdue = item.followUpDate < today
                const toneClass = overdue ? 'bg-rose-50 text-rose-700' : index % 2 ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'

                return (
                  <div key={item.id} className={`flex items-center gap-3 rounded-xl p-3 ${toneClass} ${complete ? 'opacity-60' : ''}`}>
                    <button
                      type="button"
                      onClick={() => toggleFollowUp(item.id)}
                      className={`flex h-5 w-5 items-center justify-center rounded-md border text-[10px] font-bold ${complete ? 'border-current bg-current text-white' : 'border-current bg-transparent text-current'}`}
                      aria-label={`Mark ${item.patientName || 'follow-up'} complete`}
                    >
                      {complete ? '✓' : ''}
                    </button>

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/80 text-base">♥</div>

                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-sm font-semibold ${complete ? 'line-through' : ''}`}>
                        {item.patientName || 'Patient follow-up'}
                      </div>
                      <div className="mt-1 text-[11px] text-current/70">
                        {overdue ? 'Overdue · ' : item.followUpDate === today ? 'Due today · ' : ''}{formatDateReadable(item.followUpDate)}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">No follow-up patients. Your care plan is clear.</div>
            )}
          </div>

          <div className="mt-6 mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            <span>Recent patients</span>
            <Link to="/patients" className="text-teal-700">View all</Link>
          </div>

          <div className="space-y-2">
            {recentPatients.length ? (
              recentPatients.map((patient) => (
                <Link key={patient.id} to="/patients" className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-rose-400 text-sm font-bold text-white">{patient.name?.charAt(0) || '?'}</span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm font-semibold text-slate-700">{patient.name}</strong>
                    <small className="mt-0.5 block truncate text-[11px] text-slate-500">{patient.phone || 'Patient profile'}</small>
                  </span>
                  <span className="text-slate-400">↗</span>
                </Link>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">No patient profiles yet.</div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}