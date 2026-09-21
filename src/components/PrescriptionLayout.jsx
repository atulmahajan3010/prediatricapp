import { useClinicProfile } from '../context/AppContext.jsx'
import { formatMedicineDose, normalizeDuration, printDate } from '../lib/prescriptionFormat.js'

// ──────────────────────────────────────────────
// Aarambh Health Care Prescription Layout
// ──────────────────────────────────────────────
export function AarambhRxLayout({ rx, padMode = false, compact = false, printMode = false }) {
  const { profile } = useClinicProfile()
  const circled = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩']
  const sans = '"Segoe UI", Arial, sans-serif'
  const deva = '"Nirmala UI", "Mangal", Arial, sans-serif'
  const printFont = (screenSize, printSize = screenSize) => printMode ? printSize : screenSize

  return (
    <div style={{
      fontFamily: sans,
      fontSize: printFont('7.8pt', '11pt'),
      color: '#111',
      background: '#fff',
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
      overflow: 'hidden',
      wordBreak: 'break-word',
      overflowWrap: 'anywhere',
      lineHeight: 1.08,
      borderRadius: '0px',
      margin: '0 auto'
    }}>

      {/* ═══ HEADER ═══ */}
      {!padMode && (
      <div className="rx-header" style={{
        display: 'flex', alignItems: 'stretch',
        background: 'var(--banner-bg)',
        borderBottom: '2px solid var(--primary-strong)',
        minHeight: '88px',
        padding: '0 0 0 0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 8px 8px 10px', flex: 1, minWidth: 0 }}>
          {profile?.logoData ? <img src={profile.logoData} alt={`${profile.clinicName} logo`} style={{
            width: '40px', height: '40px', flexShrink: 0, objectFit: 'contain', borderRadius: '8px', background: '#fff'
          }} /> : <div style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: '8px', background: 'rgba(255,255,255,0.25)' }} />}

          <div style={{ minWidth: 0, maxWidth: '58%' }}>
            <div style={{
            fontFamily: deva, fontSize: printFont('12pt', '16pt'), fontWeight: '900', color: '#fff',
            lineHeight: 1.04, textShadow: '1px 2px 3px rgba(0,0,0,0.35)',
            letterSpacing: '0.2px', whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word'
          }}>
              {profile?.clinicName || 'Doctor Clinic'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.90)', fontSize: printFont('5.8pt', '9pt'), fontStyle: 'italic', marginTop: '2px' }}>
              {profile?.businessHours || ''}
            </div>
          </div>
        </div>

        <div style={{
          textAlign: 'right', padding: '7px 10px 6px 8px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1px',
          minWidth: 0, maxWidth: '48%', flexShrink: 1, overflow: 'hidden'
        }}>
          <div style={{
            fontFamily: deva, fontSize: printFont('9.1pt', '12.5pt'), fontWeight: 'bold', color: '#ffe0b2',
            textShadow: '1px 1px 3px rgba(0,0,0,0.4)', lineHeight: 1.08,
            whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word'
          }}>
            Dr. {profile?.doctorName || ''}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.92)', fontSize: printFont('5.8pt', '9pt'), whiteSpace: 'normal' }}>{profile?.qualifications}</div>
          <div style={{ color: '#fff', fontSize: printFont('6.1pt', '9pt'), fontWeight: 'bold', whiteSpace: 'normal' }}>{profile?.specialization}</div>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: printFont('5.7pt', '9pt'), whiteSpace: 'normal' }}>{profile?.address}</div>
          <div style={{ color: 'rgba(255,255,255,0.90)', fontSize: printFont('5.7pt', '9pt'), marginTop: '1px', whiteSpace: 'normal' }}>
            Reg.No.&nbsp;{profile?.registrationNumber} &nbsp;&nbsp; Mob.: <strong>{profile?.doctorPhone || profile?.phone}</strong>
          </div>
        </div>
      </div>
      )}

      {/* ═══ PATIENT INFO ═══ */}
      <div style={{ padding: '5px 10px 4px', borderBottom: '1px solid #bbb' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline', flexWrap: 'wrap', fontSize: printFont('8.5pt', '11.5pt'), lineHeight: 1.15 }}>
          <span style={{ whiteSpace: 'nowrap' }}><strong>Name :</strong></span>
          <span style={{ flex: 1, borderBottom: '1px solid #aaa', minWidth: '120px', paddingBottom: '1px' }}>
            {rx.patientName || '_____________________________'}
          </span>
          <span style={{ whiteSpace: 'nowrap', marginLeft: '8px' }}><strong>Age :</strong> {rx.age ? `${rx.age} yrs` : '____'}</span>
          <span style={{ whiteSpace: 'nowrap' }}><strong>Sex :</strong> {rx.gender || '____'}</span>
          <span style={{ whiteSpace: 'nowrap', marginLeft: 'auto' }}><strong>Date :</strong> {printDate(rx.date)}</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '3px', alignItems: 'baseline', flexWrap: 'wrap', fontSize: printFont('8.1pt', '11pt'), lineHeight: 1.1 }}>
          <span style={{ whiteSpace: 'nowrap' }}><strong>Weight :</strong> {rx.weight ? `${rx.weight} kg` : '____'}</span>
          <span style={{ whiteSpace: 'nowrap' }}><strong>Height :</strong> {rx.height ? `${rx.height} cm` : '____'}</span>
          <span style={{ whiteSpace: 'nowrap' }}><strong>BSA :</strong> {rx.bsa ? `${rx.bsa} m²` : '____'}</span>
          <span style={{ whiteSpace: 'nowrap' }}><strong>Temp :</strong> {rx.temperature ? `${rx.temperature} °F` : '____'}</span>
          <span style={{ whiteSpace: 'nowrap' }}><strong>Pulse :</strong> {rx.pr ? `${rx.pr}/min` : '____'}</span>
          <span style={{ whiteSpace: 'nowrap' }}><strong>RR :</strong> {rx.respiratoryRate ? `${rx.respiratoryRate}/min` : '____'}</span>
          <span style={{ whiteSpace: 'nowrap' }}><strong>SpO₂ :</strong> {rx.spo2 ? `${rx.spo2}%` : '____'}</span>
        </div>
      </div>

      {/* ═══ BODY – two columns ═══ */}
      <div style={{ display: 'flex', minHeight: compact ? '220px' : '270px' }}>

        <div style={{ width: '38%', borderRight: '1.5px solid #999', padding: '8px 10px', fontSize: printFont('9.3pt', '11pt') }}>
          <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>Complaints :</div>
          <div style={{
            whiteSpace: 'pre-wrap', minHeight: '58px', lineHeight: '18px',
            borderBottom: '1px dashed #bbb', paddingBottom: '6px', marginBottom: '7px'
          }}>
            {rx.complaint || ''}
          </div>

          {rx.diagnosis && (
            <>
              <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>Provisional Diagnosis :</div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '22px' }}>{rx.diagnosis}</div>
            </>
          )}
        </div>

        {/* RIGHT – Rx */}
        <div style={{ flex: 1, padding: '8px 12px', fontSize: printFont('7.8pt', '11pt') }}>
          <div style={{ fontSize: '20pt', fontStyle: 'italic', color: '#222', lineHeight: 1, marginBottom: '4px', fontFamily: 'Georgia, serif' }}>
            ℞
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '2px' : '3px' }}>
            {(rx.medicines || []).filter(m => m.name?.trim()).map((m, i) => (
              <div key={i}>
                <div style={{ fontWeight: 'bold', fontSize: printFont('8.3pt', '11.5pt'), lineHeight: 1.1 }}>
                  {circled[i] || `(${i + 1})`}&nbsp; {m.name.toUpperCase()}{formatMedicineDose(m) ? ` ${formatMedicineDose(m)}` : ''}
                </div>
                <div style={{
                  paddingLeft: '18px', display: 'flex', alignItems: 'center',
                  gap: '2px', marginTop: '1px', fontSize: printFont('7.4pt', '10.5pt'), lineHeight: 1.05
                }}>
                  {(m.freq?.length ? m.freq : ['1', '0', '1']).map((dose, doseIndex) => (
                    <span key={doseIndex} style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {doseIndex > 0 && <span style={{ margin: '0 2px' }}> — </span>}
                      <span style={{ fontWeight: 'bold', minWidth: '12px', textAlign: 'center' }}>{dose}</span>
                    </span>
                  ))}
                  {m.duration && <span style={{ marginLeft: '8px', color: '#555', fontSize: printFont('8.2pt', '10.5pt') }}>{normalizeDuration(m.duration)}</span>}
                  {m.instructions && (
                    <span style={{ marginLeft: '12px', fontFamily: deva, color: '#222', fontSize: printFont('8.8pt', '11pt') }}>
                      {m.instructions}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Advice / Lab */}
          {rx.advice && (
            <div style={{ marginTop: '10px', paddingTop: '6px', borderTop: '1px dashed #bbb', fontSize: printFont('8.6pt', '11pt') }}>
              <strong>Advice / Lab Tests :</strong>
              <div style={{ whiteSpace: 'pre-wrap', marginTop: '2px' }}>{rx.advice}</div>
            </div>
          )}

          {/* Notes */}
          {rx.notes && (
            <div style={{ marginTop: '6px', fontSize: printFont('8.6pt', '11pt') }}>
              <strong>Notes :</strong> <span style={{ whiteSpace: 'pre-wrap' }}>{rx.notes}</span>
            </div>
          )}

          {/* × N days — bottom right */}
          {rx.prescriptionDays && (
            <div style={{ textAlign: 'right', marginTop: '12px', fontWeight: 'bold', fontSize: printFont('9.8pt', '12.5pt') }}>
              × {rx.prescriptionDays} days
            </div>
          )}
        </div>
      </div>

      {/* ═══ FOLLOW-UP + SIGNATURE ROW ═══ */}
      <div className="rx-signature-row" style={{ borderTop: '1px solid #bbb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '5px 10px', minHeight: '34px' }}>
        <div style={{ fontFamily: deva, fontSize: printFont('8.6pt', '11pt') }}>
          <strong>फेर तपासणी दिनांक :</strong>&nbsp;
          {rx.followUpDate ? printDate(rx.followUpDate) : '____/____/______'}
        </div>
        <div style={{ borderTop: '1px solid #555', width: '80px', textAlign: 'center', paddingTop: '2px', fontSize: printFont('7.5pt', '10pt'), color: '#555' }}>
          Signature
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      {!padMode && (
      <div className="rx-footer" style={{
        borderTop: '2.5px solid var(--primary-strong)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        padding: '5px 10px', fontSize: printFont('8pt', '11pt'), background: '#f9fdf9'
      }}>
        <div>
          {(profile?.address || profile?.city || profile?.state || profile?.postalCode) && (
            <div style={{ fontFamily: deva }}>
              <strong>पत्ता :</strong> {[profile?.address, profile?.city, profile?.state, profile?.postalCode].filter(Boolean).join(', ')}
            </div>
          )}
        </div>
        {(profile?.businessHours || profile?.closingDay) && (
          <div style={{ textAlign: 'right', fontFamily: deva }}>
            {profile?.businessHours && <div style={{ fontWeight: 'bold' }}>{profile.businessHours}</div>}
            {profile?.closingDay && <div>Closed: {profile.closingDay}</div>}
          </div>
        )}
      </div>
      )}

    </div>
  )
}
