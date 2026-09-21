import { useState } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './context/AppContext.jsx'
import Sidebar from './components/Sidebar.jsx'

import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Patients from './pages/Patients.jsx'
import Visits from './pages/Visits.jsx'
// Queue route temporarily disabled; enable later when implementing feature
// import Queue from './pages/Queue.jsx'
import History from './pages/History.jsx'
import Medicines from './pages/Medicines.jsx'
import Templates from './pages/Templates.jsx'
import FollowUps from './pages/FollowUps.jsx'
import Bills from './pages/Bills.jsx'
import Reports from './pages/Reports.jsx'
import ClinicProfile from './pages/ClinicProfile.jsx'
import Prescriptions from './pages/Prescriptions.jsx'
import Activation from './pages/Activation.jsx'
import Backups from './pages/Backups.jsx'
import BackupReminder from './components/BackupReminder.jsx'
import { DialogHost } from './lib/dialog.jsx'

function ProtectedLayout() {
  const { doctor } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  if (!doctor) return <Navigate to="/login" replace />
  
  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar - hidden on mobile, visible on desktop with smooth width transition */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 h-screen transition-transform duration-300 lg:transition-all lg:duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>
      
      {/* Main content */}
      <main className="flex-1 min-w-0 w-full h-full flex flex-col overflow-hidden">
        {/* Mobile menu button */}
        <div className="lg:hidden sticky top-0 z-20 shrink-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-slate-700">Menu</span>
        </div>

        <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-y-auto px-4 pt-6 sm:px-6 lg:px-8">
          <BackupReminder />
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default function App() {
  const { doctor, authLoading } = useAuth()

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--sidebar-bg)' }}>
        <div className="text-sm" style={{ color: 'var(--sidebar-text)', opacity: 0.8 }}>Loading…</div>
      </div>
    )
  }

  return (
    <>
      <DialogHost />
      <Routes>
        <Route
          path="/login"
          element={doctor ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/clinic/:clinicSlug/login"
          element={doctor ? <Navigate to={`/clinic/${doctor.clinicSlug || 'login'}`} replace /> : <Login />}
        />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={doctor?.clinicSlug ? <Navigate to={`/clinic/${doctor.clinicSlug}`} replace /> : <Home />} />
          <Route path="/clinic/:clinicSlug" element={<Home />} />
          <Route path="/prescriptions" element={<Prescriptions />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/visits" element={<Visits />} />
          {/* Queue route hidden until feature is implemented */}
          <Route path="/history" element={<History />} />
          <Route path="/medicines" element={<Medicines />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/followups" element={<FollowUps />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/clinic-profile" element={<ClinicProfile />} />
          <Route path="/activation" element={<Activation />} />
          <Route path="/backups" element={<Backups />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
