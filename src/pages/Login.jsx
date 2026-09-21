import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AppContext.jsx'
import { api } from '../lib/api.js'
import { Field, Input } from '../components/ui.jsx'

const emptyForm = {
  name: '', email: '', password: '', confirmPassword: '', qualifications: '', registrationNumber: '', specialization: '', doctorPhone: '',
  clinicName: '', logoData: '', clinicPhone: '', clinicEmail: '', address: '', city: '', state: '', postalCode: '', businessHours: '', closingDay: ''
}

const REMEMBER_LOGIN_KEY = 'dpa:remember-login'

const registrationSteps = [
  { title: 'Account Setup', subtitle: 'Create your secure clinic login' },
  { title: 'Doctor Profile', subtitle: 'Tell us about the doctor' },
  { title: 'Clinic Details', subtitle: 'Set your clinic identity' }
]

const slides = [
  { image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=85', eyebrow: 'Care that feels personal', title: 'A calmer way to care for every patient.', text: 'Bring your clinic, patients, and prescriptions together in one thoughtful workspace.' },
  { image: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1200&q=85', eyebrow: 'Made for modern clinics', title: 'More time for the moments that matter.', text: 'Keep your day moving with a clear, focused dashboard built around your practice.' },
  { image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1200&q=85', eyebrow: 'Your practice, in sync', title: 'Every detail right where you need it.', text: 'Securely manage visits, follow-ups, billing, and prescriptions with confidence.' }
]

function getPasswordStrength(password = '') {
  let score = 0
  if (!password) return { score: 0, label: 'Add a password', tag: 'bg-slate-200 text-slate-600', progress: 'w-0' }

  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (score <= 1) return { score, label: 'Weak', tag: 'bg-rose-100 text-rose-700', progress: 'w-1/3' }
  if (score === 2) return { score, label: 'Fair', tag: 'bg-amber-100 text-amber-700', progress: 'w-2/3' }
  if (score === 3) return { score, label: 'Strong', tag: 'bg-emerald-100 text-emerald-700', progress: 'w-4/5' }
  return { score, label: 'Excellent', tag: 'bg-emerald-100 text-emerald-700', progress: 'w-full' }
}

function Brand({ clinic, loading, missing, slide, onPrevious, onNext, onSelect }) {
  const clinicName = clinic?.clinic_name || 'Doctor Clinic'
  return <section className="login-brand-panel">
    <div className="login-slide-stack" aria-live="polite">
      {slides.map((item, index) => <img key={item.image} src={item.image} alt="" className={`login-slide-image ${index === slide ? 'is-active' : ''}`} aria-hidden={index !== slide} />)}
      <div className="login-slide-shade" />
    </div>
    <div className="login-brand-content">
      <div className="flex items-center gap-3"><div className="login-logo-frame">{clinic?.logo_data ? <img src={clinic.logo_data} alt={`${clinicName} logo`} /> : <img src="/aarambh.png" alt="Doctor Clinic logo" />}</div><div><div className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Welcome to</div><div className="text-xl font-bold text-white">{clinicName}</div></div></div>
      <div className="mt-auto max-w-xl"><div className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-lime-200">{slides[slide].eyebrow}</div><h1 className="login-hero-title">{slides[slide].title}</h1><p className="mt-4 max-w-md text-base leading-7 text-white/80">{slides[slide].text}</p>{clinic && <div className="mt-5 text-sm text-white/70">{clinic.doctor_name && `Dr. ${clinic.doctor_name}`}{clinic.specialization && ` · ${clinic.specialization}`}</div>}</div>
      <div className="mt-8 flex items-center justify-between gap-5"><div className="flex gap-2">{slides.map((item, index) => <button key={item.image} type="button" aria-label={`Show slide ${index + 1}`} onClick={() => onSelect(index)} className={`login-progress-dot ${index === slide ? 'is-active' : ''}`} />)}</div><div className="flex gap-2"><button type="button" aria-label="Previous highlight" onClick={onPrevious} className="login-carousel-button">←</button><button type="button" aria-label="Next highlight" onClick={onNext} className="login-carousel-button">→</button></div></div>
      {(loading || missing) && <div className="mt-4 text-xs text-white/65">{loading ? 'Loading clinic details...' : 'Clinic not found. Check the clinic URL and try again.'}</div>}
    </div>
  </section>
}

export default function Login() {
  const { login, register } = useAuth()
  const { clinicSlug } = useParams()
  const navigate = useNavigate()
  const pathClinicSlug = window.location.pathname.match(/^\/clinic\/([^/]+)\/login\/?$/)?.[1]
  const activeClinicSlug = clinicSlug || pathClinicSlug
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState(emptyForm)
  const [recoveryForm, setRecoveryForm] = useState({ email: '', password: '', confirmPassword: '' })
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [clinic, setClinic] = useState(null)
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const [status, setStatus] = useState({ error: '', success: '', loading: false })
  const [slide, setSlide] = useState(0)
  const [rememberLogin, setRememberLogin] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [registrationStep, setRegistrationStep] = useState(0)
  const [logoDragActive, setLogoDragActive] = useState(false)
  const [logoName, setLogoName] = useState('')

  const passwordStrength = getPasswordStrength(form.password)

  useEffect(() => {
    try {
      const savedLogin = JSON.parse(localStorage.getItem(REMEMBER_LOGIN_KEY) || 'null')
      if (savedLogin?.email && savedLogin?.password) {
        setForm((current) => ({ ...current, email: savedLogin.email, password: savedLogin.password }))
        setRememberLogin(true)
      }
    } catch {
      localStorage.removeItem(REMEMBER_LOGIN_KEY)
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % slides.length), 5500)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (pathClinicSlug && !clinicSlug) {
      navigate(`/clinic/${encodeURIComponent(pathClinicSlug)}/login`, { replace: true })
      return
    }
    if (!activeClinicSlug) return
    api.get(`/public/clinics/${encodeURIComponent(activeClinicSlug)}`).then(setClinic).catch(() => setClinic(false))
  }, [activeClinicSlug, clinicSlug, navigate, pathClinicSlug])

  const set = (key) => (e) => setForm((current) => ({ ...current, [key]: e.target.value }))
  const setRecovery = (key) => (e) => setRecoveryForm((current) => ({ ...current, [key]: e.target.value }))
  const setLogo = (e) => {
    const file = e.target.files?.[0] ?? e.dataTransfer?.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) {
      setStatus({ error: 'Logo must be a PNG, JPG or WebP image smaller than 3 MB.', success: '', loading: false }); return
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, logoData: reader.result }))
      setLogoName(file.name)
    }
    reader.readAsDataURL(file)
  }

  const validateRegistrationStep = (step) => {
    if (step === 0) {
      if (!form.email.trim()) throw new Error('Email is required.')
      if (form.password.length < 8) throw new Error('Password must be at least 8 characters long.')
      if (form.password !== form.confirmPassword) throw new Error('Passwords do not match.')
      return true
    }

    if (step === 1) {
      if (!form.name.trim()) throw new Error('Doctor full name is required.')
      if (!form.qualifications.trim()) throw new Error('Qualifications are required.')
      if (!form.specialization.trim()) throw new Error('Specialization is required.')
      if (!form.registrationNumber.trim()) throw new Error('Medical registration number is required.')
      if (!form.doctorPhone.trim()) throw new Error('Doctor phone number is required.')
      return true
    }

    if (!form.clinicName.trim()) throw new Error('Clinic name is required.')
    if (!form.clinicPhone.trim()) throw new Error('Clinic phone number is required.')
    if (!form.clinicEmail.trim()) throw new Error('Clinic email is required.')
    if (!form.address.trim()) throw new Error('Clinic address is required.')
    return true
  }

  const handleNextRegistrationStep = () => {
    try {
      validateRegistrationStep(registrationStep)
      setStatus({ error: '', success: '', loading: false })
      setRegistrationStep((current) => Math.min(current + 1, registrationSteps.length - 1))
    } catch (error) {
      setStatus({ error: error.message, success: '', loading: false })
    }
  }

  async function submit(e) {
    e.preventDefault(); setStatus({ error: '', success: '', loading: true })
    try {
      if (mode === 'login' && recoveryMode) {
        const email = recoveryForm.email.trim().toLowerCase()
        const password = recoveryForm.password
        const confirmPassword = recoveryForm.confirmPassword
        if (!email) throw new Error('Email is required.')
        if (password.length < 8) throw new Error('Password must be at least 8 characters long.')
        if (password !== confirmPassword) throw new Error('Passwords do not match.')
        await api.post('/auth/password-recovery', { email, password })
        setForm((current) => ({ ...current, email, password: '' }))
        setRecoveryForm({ email, password: '', confirmPassword: '' })
        setRecoveryMode(false)
        setStatus({ error: '', success: 'Password updated successfully. You can now log in with your new password.', loading: false })
        return
      }

      if (mode === 'login') {
        await login(form.email.trim(), form.password)
        if (rememberLogin) {
          localStorage.setItem(REMEMBER_LOGIN_KEY, JSON.stringify({ email: form.email.trim(), password: form.password }))
        } else {
          localStorage.removeItem(REMEMBER_LOGIN_KEY)
        }
      }
      else {
        validateRegistrationStep(registrationStep)
        if (form.password !== form.confirmPassword) throw new Error('Passwords do not match.')
        if (form.password.length < 8) throw new Error('Password must be at least 8 characters.')
        const result = await register({ ...form, name: form.name.trim(), email: form.email.trim(), clinicName: form.clinicName.trim() })
        setClinic({
          clinic_name: form.clinicName,
          logo_data: form.logoData,
          doctor_name: form.name,
          qualifications: form.qualifications,
          registration_number: form.registrationNumber,
          specialization: form.specialization,
          doctor_phone: form.doctorPhone,
          phone: form.clinicPhone,
          email: form.clinicEmail,
          address: form.address,
          city: form.city,
          state: form.state,
          postal_code: form.postalCode,
          business_hours: form.businessHours,
          closing_day: form.closingDay,
          slug: result.clinicSlug
        })
        setRegistrationComplete(true)
        setRegistrationStep(0)
        setMode('login')
        navigate(`/clinic/${result.clinicSlug}/login`, { replace: true })
        setStatus({ error: '', success: `Registration complete. Your clinic login URL is ${window.location.origin}/#${result.clinicLoginUrl}`, loading: false })
      }
    } catch (error) { setStatus({ error: error.message, success: '', loading: false }) }
  }

  const registration = mode === 'register'
  const showRegistrationOption = !activeClinicSlug && !registrationComplete
  return <div className="login-page">
    <Brand clinic={clinic} loading={Boolean(activeClinicSlug && clinic === null)} missing={clinic === false} slide={slide} onPrevious={() => setSlide((slide - 1 + slides.length) % slides.length)} onNext={() => setSlide((slide + 1) % slides.length)} onSelect={setSlide} />
    <main className="login-form-panel"><div className="login-form-inner">
      <div className="mb-7"><div className="login-kicker">{registration ? 'New practice' : 'Secure workspace'}</div><div className="login-heading">{registration ? 'Build your clinic presence.' : registrationComplete ? `Login to ${clinic?.clinic_name || 'your clinic'}` : 'Good to see you again.'}</div><div className="login-subheading">{registration ? 'Set up your clinic branding and secure account.' : registrationComplete ? 'Registration successful. Use your email and password to continue.' : `Sign in to ${clinic?.clinic_name || 'your clinic dashboard'}.`}</div></div>
      {showRegistrationOption ? <div className="login-tabs" role="tablist"><span className={`login-tab-indicator ${registration ? 'is-register' : ''}`} /><button type="button" role="tab" aria-selected={!registration} onClick={() => setMode('login')} className={`login-tab ${!registration ? 'is-active' : ''}`}>Login</button><button type="button" role="tab" aria-selected={registration} onClick={() => setMode('register')} className={`login-tab ${registration ? 'is-active' : ''}`}>Register</button></div> : <div className="mb-6 border-b border-slate-100" />}
      <form onSubmit={submit} className={`login-form-fields ${registration ? 'is-register' : ''}`}>
        {registration && (
          <div className="mb-6 wizard-step-panel">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-amber-600">Registration</div>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{registrationSteps[registrationStep].title}</h2>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                Step {registrationStep + 1} / {registrationSteps.length}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
              {registrationSteps.map((step, index) => (
                <div key={step.title} className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                      index < registrationStep
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : index === registrationStep
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-white text-slate-400 ring-1 ring-slate-200'
                    }`}
                  >
                    {index < registrationStep ? '✓' : index + 1}
                  </div>
                  <span className={`hidden text-[10px] font-bold uppercase tracking-[0.14em] sm:block ${index <= registrationStep ? 'text-slate-700' : 'text-slate-400'}`}>
                    {step.title.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {registration ? (
          <div key={registrationStep} className="wizard-step-panel space-y-5 transition-all duration-300 ease-out">
            {registrationStep === 0 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">Account Setup</h3>
                  <p className="mt-1 text-sm text-slate-500">Create your secure clinic login</p>
                </div>

                <div className="space-y-5">
                  <Field label="Email address">
                    <Input className="login-input" type="email" autoComplete="username" value={form.email} onChange={set('email')} required />
                  </Field>

                  <Field label="Password">
                    <div className="login-password-field">
                      <Input className="login-input login-password-input" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={set('password')} required minLength={8} />
                      <button type="button" className="login-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((current) => !current)}>
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </Field>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Password strength</span>
                      <span className={`rounded-full px-2 py-0.5 ${passwordStrength.tag}`}>{passwordStrength.label}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                      <div className={`h-full rounded-full bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-500 transition-all duration-300 ${passwordStrength.progress}`} />
                    </div>
                  </div>

                  <Field label="Confirm password">
                    <Input className="login-input" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} required />
                  </Field>
                </div>
              </div>
            )}

            {registrationStep === 1 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">Doctor Profile</h3>
                  <p className="mt-1 text-sm text-slate-500">Add your professional details</p>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {[
                    { label: 'Full name', key: 'name', placeholder: 'Dr. Rajesh Kumar', value: form.name },
                    { label: 'Qualifications', key: 'qualifications', placeholder: 'MBBS, MD', value: form.qualifications },
                    { label: 'Specialization', key: 'specialization', placeholder: 'Cardiology', value: form.specialization },
                    { label: 'Medical reg number', key: 'registrationNumber', placeholder: 'MMC-12345', value: form.registrationNumber },
                    { label: 'Doctor phone', key: 'doctorPhone', placeholder: '+91 98765 43210', value: form.doctorPhone }
                  ].map((field, index, arr) => (
                    <div key={field.key} className={index === arr.length - 1 && arr.length % 2 === 1 ? 'sm:col-span-2' : ''}>
                      <Field label={field.label}>
                        <Input
                          value={field.value}
                          onChange={set(field.key)}
                          placeholder={field.placeholder}
                          required={field.key === 'name' || field.key === 'qualifications'}
                        />
                      </Field>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {registrationStep === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">Clinic Details</h3>
                  <p className="mt-1 text-sm text-slate-500">Complete your clinic identity</p>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block">
                      <span className="mb-1 block text-sm font-semibold text-slate-700">Clinic logo</span>
                      <div
                        role="button"
                        tabIndex={0}
                        onDragOver={(event) => { event.preventDefault(); setLogoDragActive(true) }}
                        onDragLeave={() => setLogoDragActive(false)}
                        onDrop={(event) => { event.preventDefault(); setLogoDragActive(false); setLogo(event) }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            document.getElementById('clinic-logo-upload')?.click()
                          }
                        }}
                        className={`group flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-all duration-300 ${logoDragActive ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:border-amber-400 hover:bg-amber-50'}`}
                      >
                        <input id="clinic-logo-upload" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={setLogo} />
                        {form.logoData ? (
                          <>
                            <img src={form.logoData} alt="Clinic logo preview" className="mb-3 h-20 w-20 rounded-2xl object-cover shadow-sm ring-1 ring-slate-200" />
                            <div className="text-sm font-semibold text-slate-700">{logoName || 'Clinic logo ready'}</div>
                          </>
                        ) : (
                          <>
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl shadow-sm ring-1 ring-slate-200">📁</div>
                            <div className="text-base font-bold text-slate-700">Upload clinic logo</div>
                            <div className="mt-1 text-sm text-slate-500">PNG, JPG or WebP up to 3 MB</div>
                          </>
                        )}
                      </div>
                    </label>
                  </div>

                  <Field label="Clinic / hospital name">
                    <Input value={form.clinicName} onChange={set('clinicName')} required />
                  </Field>
                  <Field label="Clinic phone">
                    <Input value={form.clinicPhone} onChange={set('clinicPhone')} required />
                  </Field>
                  <Field label="Clinic email">
                    <Input type="email" value={form.clinicEmail} onChange={set('clinicEmail')} required />
                  </Field>
                  <Field label="Address">
                    <Input value={form.address} onChange={set('address')} required />
                  </Field>
                  <Field label="City">
                    <Input value={form.city} onChange={set('city')} />
                  </Field>
                  <Field label="State">
                    <Input value={form.state} onChange={set('state')} />
                  </Field>
                  <Field label="PIN / ZIP code">
                    <Input value={form.postalCode} onChange={set('postalCode')} />
                  </Field>
                  <Field label="Business hours">
                    <Input value={form.businessHours} onChange={set('businessHours')} placeholder="9:00 AM - 6:00 PM" />
                  </Field>
                  <Field label="Weekly closing day">
                    <Input value={form.closingDay} onChange={set('closingDay')} placeholder="Sunday" />
                  </Field>
                </div>
              </div>
            )}
          </div>
        ) : recoveryMode ? (
          <div className="space-y-4">
            <Field label="Email"><Input className="login-input" type="email" autoComplete="username" value={recoveryForm.email} onChange={setRecovery('email')} required /></Field>
            <Field label="New password">
              <div className="login-password-field">
                <Input className="login-input login-password-input" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={recoveryForm.password} onChange={setRecovery('password')} required minLength={8} />
                <button type="button" className="login-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((current) => !current)}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </Field>
            <Field label="Confirm new password"><Input className="login-input" type="password" autoComplete="new-password" value={recoveryForm.confirmPassword} onChange={setRecovery('confirmPassword')} required /></Field>
            <div className="flex items-center justify-end gap-3">
              <button type="button" className="text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors" onClick={() => { setRecoveryMode(false); setStatus({ error: '', success: '', loading: false }) }}>
                Back to login
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Email"><Input className="login-input" type="email" autoComplete="username" value={form.email} onChange={set('email')} required /></Field>
            <div className="space-y-2.5">
              <Field label="Password">
                <div className="login-password-field">
                  <Input className="login-input login-password-input" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={set('password')} required minLength={8} />
                  <button type="button" className="login-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((current) => !current)}>
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </Field>
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={rememberLogin} onChange={(event) => { const checked = event.target.checked; setRememberLogin(checked); if (!checked) localStorage.removeItem(REMEMBER_LOGIN_KEY) }} />
                  Remember me
                </label>
                <button type="button" className="text-sm font-medium text-amber-700 hover:text-amber-800 transition-colors" onClick={() => { setRecoveryForm((current) => ({ ...current, email: form.email.trim() })); setRecoveryMode(true); setStatus({ error: '', success: '', loading: false }) }}>
                  Forgot Password?
                </button>
              </div>
            </div>
          </div>
        )}

        {status.error && <div className="text-sm bg-rose-light text-rose rounded-lg px-3 py-2">{status.error}</div>}{status.success && <div className="text-sm bg-teal-light text-teal rounded-lg px-3 py-2 break-words">{status.success}</div>}

        {registration ? (
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={registrationStep === 0 || status.loading}
              onClick={() => {
                setStatus({ error: '', success: '', loading: false })
                setRegistrationStep((current) => Math.max(current - 1, 0))
              }}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            {registrationStep < registrationSteps.length - 1 ? (
              <button type="button" onClick={handleNextRegistrationStep} className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800">
                Next step
                <span aria-hidden="true">→</span>
              </button>
            ) : (
              <button type="submit" disabled={status.loading} className="login-submit-button disabled:opacity-50">
                {status.loading ? 'Please wait...' : 'Create clinic account'}
                <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        ) : !registration && recoveryMode ? (
          <button type="submit" disabled={status.loading} className="login-submit-button disabled:opacity-50">{status.loading ? 'Please wait...' : 'Update password'}<span aria-hidden="true">→</span></button>
        ) : (
          <button type="submit" disabled={status.loading} className="login-submit-button disabled:opacity-50">{status.loading ? 'Please wait...' : 'Login to dashboard'}<span aria-hidden="true">→</span></button>
        )}
      </form>
    </div></main>
  </div>
}
