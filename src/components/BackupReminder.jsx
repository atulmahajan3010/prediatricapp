import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AppContext.jsx'
import { formatBackupDate, getLastBackup, isBackupDue, snoozeBackupReminder } from '../lib/backup.js'

export default function BackupReminder() {
  const { doctor } = useAuth()
  const [visible, setVisible] = useState(Boolean(doctor && isBackupDue(doctor.id)))

  useEffect(() => {
    if (!doctor) return undefined

    const refresh = () => setVisible(isBackupDue(doctor.id))
    refresh()
    window.addEventListener('backup-status-changed', refresh)
    return () => window.removeEventListener('backup-status-changed', refresh)
  }, [doctor])

  if (!doctor || !visible) return null

  return (
    <div className="mb-6 w-full rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-100 px-4 py-3 shadow-sm ring-1 ring-amber-200/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 text-sm text-amber-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-200/70 text-base">⚠️</div>
          <div>
            <p className="font-semibold">It is time to protect your clinic data.</p>
            <p className="mt-0.5 text-amber-800/80">{formatBackupDate(getLastBackup(doctor.id))}. Create a backup now.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:justify-end">
          <Link to="/backups" className="inline-flex items-center justify-center rounded-full bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700">Open backups</Link>
          <button type="button" onClick={() => { snoozeBackupReminder(doctor.id) }} className="text-xs font-medium text-amber-700 underline decoration-amber-500/60 underline-offset-2">Remind me in 7 days</button>
        </div>
      </div>
    </div>
  )
}