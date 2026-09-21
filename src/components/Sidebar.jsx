import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth, useClinicProfile } from '../context/AppContext.jsx'

const navGroups = [
  {
    title: 'PRIMARY WORKFLOWS',
    items: [
      { to: '/prescriptions', label: 'Quick Rx', icon: '📋', highlight: true, desc: 'New prescription' },
      { to: '/patients', label: 'Patient Search', icon: '🔍', desc: 'Find patient' },
      { to: '/', label: 'Dashboard', icon: '📊', desc: 'Today\'s overview', end: true }
    ]
  },
  {
    title: 'PATIENT MANAGEMENT',
    items: [
      { to: '/patients', label: 'Patients', icon: '👥', desc: 'Register/Edit' },
      { to: '/visits', label: 'Visits', icon: '📝', desc: 'Visit history' },
      { to: '/history', label: 'History', icon: '📋', desc: 'Patient data' },
      { to: '/followups', label: 'Follow-ups', icon: '⏰', desc: 'Reminders' }
    ]
  },
  {
    title: 'CLINICAL',
    items: [
      { to: '/prescriptions', label: 'Prescriptions', icon: '💉', desc: 'All prescriptions' },
      { to: '/medicines', label: 'Medicines', icon: '💊', desc: 'Manage library' },
      { to: '/templates', label: 'Templates', icon: '📄', desc: 'Save templates' }
    ]
  },
  {
    title: 'OPERATIONS',
    items: [
      { to: '/bills', label: 'Bills', icon: '💰', desc: 'Receipts' },
      { to: '/reports', label: 'Reports', icon: '📈', desc: 'Analytics' },
      { to: '/clinic-profile', label: 'Clinic Profile', icon: '⚙️', desc: 'Settings' },
      { to: '/activation', label: 'Activation', icon: '🔑', desc: 'License status' },
      { to: '/backups', label: 'Backups', icon: '☁️', desc: 'Protect clinic data' }
    ]
  }
]

export default function Sidebar({ onClose }) {
  const { doctor, logout } = useAuth()
  const { profile } = useClinicProfile()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState(
    navGroups.reduce((acc, group) => ({ ...acc, [group.title]: true }), {})
  )
  const [tooltipActive, setTooltipActive] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const handleLogout = () => {
    const clinicSlug = profile?.slug || doctor?.clinicSlug
    logout()
    const loginPath = clinicSlug ? `/clinic/${encodeURIComponent(clinicSlug)}/login` : '/login'
    window.location.replace(`${window.location.origin}/#${loginPath}`)
  }

  const handleNavClick = () => {
    if (onClose) onClose()
  }

  const toggleGroup = (groupTitle) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }))
  }

  const handleItemHover = (e, label) => {
    if (isCollapsed) {
      const rect = e.currentTarget.getBoundingClientRect()
      setTooltipActive(label)
      setTooltipPos({
        x: rect.right + 8,
        y: rect.top + rect.height / 2 - 12
      })
    }
  }

  return (
    <>
      <aside 
        className="shrink-0 flex flex-col min-h-screen h-screen overflow-hidden dashboard-sidebar transition-all duration-300"
        style={{
          background: 'var(--sidebar-bg)',
          width: isCollapsed ? '80px' : '240px'
        }}>

        {/* Header with Toggle */}
        <div className="px-4 pt-5 pb-3 border-b flex-shrink-0 flex items-start justify-between" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
          {!isCollapsed && (
            <div className="flex-1">
              <div style={{ fontFamily: '"Nirmala UI","Mangal",serif', fontSize: '13pt', fontWeight: '900', color: 'var(--sidebar-text)', lineHeight: 1.1 }}>
                {profile?.clinicName || 'Doctor Clinic'}
              </div>
              <div style={{ color: 'var(--sidebar-text)', fontSize: '8pt', fontStyle: 'italic', marginTop: '2px', opacity: 0.85 }}>
                {profile?.businessHours || 'Clinic dashboard'}
              </div>
              <div className="mt-3">
                <div className="text-xs font-semibold truncate" style={{ color: 'var(--sidebar-text)' }}>
                  {profile?.doctorName || doctor?.name}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--sidebar-text)', opacity: 0.85 }}>
                  {doctor?.email}
                </div>
              </div>
            </div>
          )}
          
          {/* Collapse Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200 ml-2 flex-shrink-0"
            style={{ color: 'var(--sidebar-text)' }}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <svg className="w-5 h-5 transition-transform duration-300" style={{ transform: isCollapsed ? 'scaleX(-1)' : 'scaleX(1)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Quick Rx Floating Button */}
        <div className={`${isCollapsed ? 'px-2 pt-3 pb-2' : 'px-3 pt-4 pb-2'} flex-shrink-0`}>
          <NavLink to="/prescriptions" onClick={handleNavClick}
            className={`block rounded-xl text-white font-semibold text-center transition-all duration-200 ${isCollapsed ? 'p-2' : 'w-full px-4 py-3'}`}
            style={{
              background: 'linear-gradient(135deg, #0f766e 0%, #0ea5a4 100%)',
              boxShadow: '0 10px 22px rgba(15, 118, 110, 0.28)',
              border: '1px solid rgba(255,255,255,0.22)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #0b6d66 0%, #0d8a87 100%)'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 14px 28px rgba(15, 118, 110, 0.34)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #0f766e 0%, #0ea5a4 100%)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 10px 22px rgba(15, 118, 110, 0.28)'
            }}>
            {isCollapsed ? '📋' : '📋 Quick Rx'}
          </NavLink>
        </div>

        {/* Grouped Navigation */}
        <nav className="sidebar-scroll flex-1 min-h-0 py-3 space-y-4 overflow-y-auto overflow-x-hidden pr-1">
          {navGroups.map((group) => (
            <div key={group.title} className={isCollapsed ? 'px-2' : 'px-3'}>
              {/* Group Header - Clickable */}
              <button
                onClick={() => !isCollapsed && toggleGroup(group.title)}
                className="w-full px-2 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200 flex items-center justify-between group/header"
                style={{
                  color: 'var(--sidebar-text)',
                  opacity: 0.7,
                  cursor: isCollapsed ? 'default' : 'pointer',
                  background: isCollapsed ? 'transparent' : 'rgba(255, 255, 255, 0.05)'
                }}
                onMouseEnter={(e) => {
                  if (!isCollapsed) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.opacity = '0.9'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCollapsed) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                    e.currentTarget.style.opacity = '0.7'
                  }
                }}>
                {!isCollapsed && <span>{group.title}</span>}
                {!isCollapsed && (
                  <svg
                    className="w-4 h-4 transition-transform duration-300"
                    style={{ transform: expandedGroups[group.title] ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
              </button>
              
              {/* Group Items */}
              {!isCollapsed && expandedGroups[group.title] && (
                <div className="space-y-1 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  {group.items.map((item) => (
                    <NavLink 
                      key={item.to} 
                      to={item.to} 
                      end={item.end}
                      onClick={handleNavClick}
                      className={({ isActive }) => `
                        block rounded-lg px-3 py-3 transition-all duration-200 relative group
                        ${item.highlight ? 'mb-1' : ''}
                        ${isActive
                          ? 'font-semibold text-white shadow-md'
                          : 'text-white/70 hover:text-white'
                        }
                      `}
                      style={({ isActive }) => ({
                        borderLeft: isActive ? '4px solid #5eead4' : '4px solid transparent',
                        paddingLeft: isActive ? '12px' : '12px',
                        background: isActive 
                          ? 'linear-gradient(135deg, rgba(94, 234, 212, 0.18) 0%, rgba(20, 184, 166, 0.08) 100%)'
                          : 'transparent'
                      })}>
                      <div className="flex items-center gap-3">
                        <span className="text-lg transition-transform duration-200 group-hover:scale-110">
                          {item.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{item.label}</div>
                          <div className="text-xs opacity-60 truncate hidden group-hover:block transition-all duration-200">
                            {item.desc}
                          </div>
                        </div>
                      </div>
                    </NavLink>
                  ))}
                </div>
              )}

              {/* Collapsed View - Icon Only */}
              {isCollapsed && (
                <div className="space-y-1 mt-1 flex flex-col items-center">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={handleNavClick}
                      className={({ isActive }) => `
                        block rounded-lg p-2 transition-all duration-200 relative group
                      `}
                      style={({ isActive }) => ({
                        borderLeft: isActive ? '3px solid #5eead4' : '3px solid transparent',
                        background: isActive 
                          ? 'linear-gradient(135deg, rgba(94, 234, 212, 0.2) 0%, rgba(20, 184, 166, 0.1) 100%)'
                          : 'transparent'
                      })}
                      onMouseEnter={(e) => handleItemHover(e, item.label)}
                      onMouseLeave={() => setTooltipActive(null)}>
                      <div className="flex items-center justify-center">
                        <span className="text-lg transition-transform duration-200 group-hover:scale-110">
                          {item.icon}
                        </span>
                      </div>
                    </NavLink>
                  ))}
                </div>
              )}

              {/* Group Divider */}
              {group !== navGroups[navGroups.length - 1] && (
                <div className="my-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}></div>
              )}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className={`mt-auto border-t p-${isCollapsed ? '2' : '3'}`} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <button onClick={handleLogout}
            className={`w-full rounded-lg transition-all duration-200 font-medium`}
            style={{
              background: 'rgba(255,255,255,0.12)',
              color: 'var(--sidebar-text)',
              padding: isCollapsed ? '8px' : '10px'
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.22)'}
            onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.12)'}>
            {isCollapsed ? '🚪' : 'Logout'}
          </button>
        </div>
      </aside>

      {/* Tooltip for Collapsed State */}
      {isCollapsed && tooltipActive && (
        <div
          className="fixed z-50 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg shadow-lg whitespace-nowrap pointer-events-none"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            animation: 'fadeIn 0.15s ease-out'
          }}>
          {tooltipActive}
          {/* Tooltip Arrow */}
          <div
            className="absolute w-2 h-2 bg-gray-900 transform rotate-45"
            style={{
              left: '-4px',
              top: '50%',
              marginTop: '-4px'
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.28) transparent;
          -ms-overflow-style: auto;
        }

        .sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.28);
          border-radius: 999px;
        }

        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.4);
        }
      `}</style>
    </>
  )
}
