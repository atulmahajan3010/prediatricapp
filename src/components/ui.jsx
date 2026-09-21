export function Card({ title, action, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-100 shadow-card ${className}`} style={{ boxShadow: 'var(--shadow-card)' }}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          {title && <h3 className="font-display text-lg text-ink">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

export function StatTile({ icon, label, value, tone = 'blue' }) {
  const toneClass = `stat-tile-${tone}`;
  return (
    <div
      className={`${toneClass} rounded-xl px-6 py-5`}
      style={{}}
    >
      <div className="flex items-center gap-3 mb-1">
        <span className="stat-icon text-2xl">{icon}</span>
        <div className="text-xs uppercase tracking-wide opacity-75">{label}</div>
      </div>
      <div className="text-3xl font-semibold">{value}</div>
    </div>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
    </label>
  )
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500'

export function Input(props) {
  return <input {...props} className={`${inputClass} ${props.className || ''}`} />
}

export function Textarea(props) {
  return <textarea {...props} className={`${inputClass} ${props.className || ''}`} />
}

export function Select(props) {
  return (
    <select {...props} className={`${inputClass} bg-white ${props.className || ''}`}>
      {props.children}
    </select>
  )
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  const variants = {
    primary: 'bg-teal-600 text-white shadow-sm hover:bg-teal-700',
    ghost: 'bg-white text-slate-700 border border-slate-300 shadow-sm hover:bg-slate-50',
    danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
    subtle: 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm hover:bg-emerald-200',
    success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
  }
  const sizes = {
    md: 'px-4 py-2 text-sm gap-2',
    sm: 'px-2.5 py-1.5 text-xs gap-1'
  }
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${className}`}
    />
  )
}

export function EmptyState({ title, hint }) {
  return (
    <div className="text-center py-10 text-slate-400">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {hint && <p className="text-xs mt-1">{hint}</p>}
    </div>
  )
}

export function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    teal: 'bg-teal-light text-teal-dark',
    amber: 'bg-amber-light text-amber',
    rose: 'bg-rose-light text-rose'
  }
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

/* ─── NEW COMPONENTS FOR PRESCRIPTION REDESIGN ─── */

export function FormSection({ title, icon, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
      <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50">
        <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          {title}
        </h3>
      </div>
      <div className="p-4 space-y-3">
        {children}
      </div>
    </div>
  )
}

export function ProgressIndicator({ current, steps }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2 flex-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
            i < current 
              ? 'bg-teal text-white'
              : i === current 
              ? 'bg-teal text-white ring-2 ring-teal ring-offset-2' 
              : 'bg-slate-200 text-slate-500'
          }`}>
            {i < current ? '✓' : i + 1}
          </div>
          <div className="text-xs font-medium text-slate-600 hidden sm:block">{step}</div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 ${i < current ? 'bg-teal' : 'bg-slate-200'}`}></div>
          )}
        </div>
      ))}
    </div>
  )
}

export function PatientQuickCard({ patient, isLoading, onSelect }) {
  if (isLoading) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
      </div>
    )
  }

  if (!patient) return null

  return (
    <div className="bg-white border border-teal/30 rounded-lg p-3 hover:bg-teal-50 cursor-pointer transition-colors" onClick={onSelect}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-slate-900 truncate">{patient.name}</div>
          <div className="text-xs text-slate-500 mt-0.5">📞 {patient.phone}</div>
          <div className="text-xs text-slate-500 mt-0.5">👤 {patient.gender} • 📅 {patient.age} yrs</div>
        </div>
        <div className="text-lg">→</div>
      </div>
    </div>
  )
}

export function MedicineRow({ medicine, medicineList, onUpdate, onRemove, index }) {
  const marathiInstructions = [
    'जेवणानंतर',
    'जेवणापूर्वी',
    'नाश्त्यानंतर',
    'नाश्त्यापूर्वी',
    'झोपतांना',
    'रिकाम्या पोटी',
    'वरती लावावे',
    'डोळ्यात टाकावे',
    'कानात टाकावे',
    'त्वचेवर लावावे',
    'दिवसातून लावावे',
    'दिवसातून २ वेळा लावावे',
    'दिवसातून ३ वेळा लावावे',
    'सकाळ-संध्याकाळ लावावे',
    'सकाळी घ्यावे',
    'रात्री घ्यावे',
    'गरजेनुसार',
    'गरजेनुसार लावावे'
  ]

  return (
    <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition-colors hover:border-slate-300">
      <button
        type="button"
        aria-label="Remove medicine"
        onClick={() => onRemove(index)}
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
          <path d="M5 7.5h10M8.125 4.375h3.75m-7.5 2.5h10l-.833 8.75A1.667 1.667 0 0 1 13.75 17.5h-7.5a1.667 1.667 0 0 1-1.667-1.875L3.75 6.875h.625Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="space-y-3 pr-10">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(110px,1fr)_minmax(110px,1fr)]">
          {/* Medicine Name */}
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-medium text-slate-600">Medicine</label>
            <div className="relative">
              <input
                role="combobox"
                aria-autocomplete="list"
                value={medicine.name || ''}
                onChange={(e) => {
                  const value = e.target.value
                  onUpdate(index, 'name', value)
                  const med = medicineList?.find(m => m.name === value)
                  if (med) {
                    const formText = String(med.form || '').toLowerCase()
                    const inferredUnit = formText.includes('liquid') || formText.includes('syrup') || formText.includes('drop') ? 'ml' : ''
                    onUpdate(index, 'unit', inferredUnit || med.unit || '')
                  }
                }}
                placeholder="Type or select medicine"
                list={`medicine-list-${index}`}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              <datalist id={`medicine-list-${index}`}>
                {medicineList?.map(m => (
                  <option key={m.id} value={m.name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Dosage */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Dosage</label>
            <input
              value={medicine.dosage || ''}
              onChange={(e) => onUpdate(index, 'dosage', e.target.value)}
              placeholder="e.g. 5 or 500"
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* Unit */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Unit</label>
            <select
              value={medicine.unit || ''}
              onChange={(e) => onUpdate(index, 'unit', e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Select</option>
              <option value="ml">ml</option>
              <option value="mg">mg</option>
              <option value="g">g</option>
              <option value="drops">drops</option>
              <option value="tablet">tablet</option>
              <option value="capsule">capsule</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Frequency */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Frequency</label>
            <input
              value={medicine.freq?.join('-') || '1-0-1'}
              onChange={(e) => {
                const parts = e.target.value.split('-')
                onUpdate(index, 'freq', parts.length >= 3 && parts.length <= 5 ? parts : ['1', '0', '1'])
              }}
              placeholder="1-0-1-0-1"
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* Medicine Timing */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">When to Take</label>
            <select
              value={medicine.instructions || ''}
              onChange={(e) => onUpdate(index, 'instructions', e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Select timing</option>
              {marathiInstructions.map((instruction) => (
                <option key={instruction} value={instruction}>{instruction}</option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Duration</label>
            <input
              value={medicine.duration || ''}
              onChange={(e) => onUpdate(index, 'duration', e.target.value)}
              placeholder="e.g. 7 days"
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export function StickyActions({ children }) {
  return (
    <div className="sticky bottom-0 left-0 right-0 z-30 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_-20px_rgba(15,23,42,0.4)] backdrop-blur-sm sm:-mx-6 lg:-mx-8">
      <div className="flex w-full flex-wrap items-center gap-2">
        {children}
      </div>
    </div>
  )
}
