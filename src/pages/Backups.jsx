import { useEffect, useState } from 'react'
import { useAuth } from '../context/AppContext.jsx'
import { Badge, Button, Card } from '../components/ui.jsx'
import { createBackup, downloadBackup, formatBackupDate, getLastBackup, markBackupComplete } from '../lib/backup.js'

export default function Backups() {
  const { doctor } = useAuth()
  const [lastBackup, setLastBackup] = useState(() => getLastBackup(doctor.id))
  const [status, setStatus] = useState({ message: '', error: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!doctor) return undefined

    const refresh = () => setLastBackup(getLastBackup(doctor.id))
    refresh()
    window.addEventListener('backup-status-changed', refresh)
    return () => window.removeEventListener('backup-status-changed', refresh)
  }, [doctor])

  async function makeBackup() {
    setBusy(true)
    setStatus({ message: '', error: '' })
    try {
      const data = await createBackup()
      downloadBackup(data)
      const timestamp = markBackupComplete(doctor.id)
      setLastBackup(timestamp)
      setStatus({ message: 'Backup downloaded successfully. Upload this file to Google Drive for safekeeping.', error: '' })
    } catch (error) {
      setStatus({ message: '', error: error.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="font-display text-3xl text-ink">Backups</h1><p className="mt-1 text-sm text-slate-500">Protect your clinic records with a complete doctor-scoped database export.</p></div>
        <Badge tone={lastBackup ? 'teal' : 'amber'}>{lastBackup ? 'Backup recorded' : 'Backup needed'}</Badge>
      </div>
      <Card title="Create a backup now">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
          <div className="font-medium text-ink">Last successful backup</div>
          <div className="mt-1">{formatBackupDate(lastBackup)}</div>
          <div className="mt-3 text-xs text-slate-500">The export includes your clinic profile, patients, visits, prescriptions, medicines, templates, bills, and queue records. Passwords are not included.</div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" onClick={makeBackup} disabled={busy}>{busy ? 'Creating backup...' : 'Download backup file'}</Button>
          <a href="https://drive.google.com/drive/my-drive" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-slate-50">Open Google Drive</a>
        </div>
        <p className="mt-4 text-xs text-slate-500">After downloading, open Google Drive, choose <strong>New → File upload</strong>, and select the backup file. Keep the file in a private folder because it contains patient data.</p>
        {status.message && <div className="mt-4 rounded-lg bg-teal-light p-3 text-sm text-teal-dark">{status.message}</div>}
        {status.error && <div className="mt-4 rounded-lg bg-rose-light p-3 text-sm text-rose">{status.error}</div>}
      </Card>
      <Card title="Automatic reminder" className="mt-6">
        <p className="text-sm text-slate-600">The app reminds you every 30 days after a successful backup. The reminder is stored on this computer and will not interrupt prescriptions or patient work.</p>
      </Card>
    </div>
  )
}