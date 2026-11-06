import { useCallback, useEffect, useRef, useState } from 'react'
import RCCard from './RCCard.jsx'
import { resolve, validateReg } from '../lib/resolve.js'

/* ------------------------------------------------------------------ icons */
const Ic = {
  search: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
  ),
  car: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17h14M6.5 17a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Zm8 0a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z" />
      <path d="M3 17v-4l2-5h14l2 5v4" /><path d="M5 13h14" />
    </svg>
  ),
  dl: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  ),
  hub: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.9 2.9M16.2 16.2l2.9 2.9M19.1 4.9l-2.9 2.9M7.8 16.2l-2.9 2.9" />
    </svg>
  ),
  warn: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  info: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
}

/* ------------------------------------------------------- field labelling */
const LABEL = {
  regNo: 'Registration No', owner: 'Owner Name', fatherName: 'Father / Guardian',
  maker: 'Maker', model: 'Model', variant: 'Variant', chassis: 'Chassis Number',
  engine: 'Engine Number', fuel: 'Fuel', vehicleClass: 'Vehicle Class',
  vehicleType: 'Vehicle Type', bodyType: 'Body Type', seats: 'Seating Capacity',
  cc: 'Cubic Capacity', cylinders: 'Cylinders', colour: 'Colour', regDate: 'Date of Regn',
  regValidUpto: 'Regn. Validity', insuranceUpto: 'Insurance Upto', insurer: 'Insurer',
  policyNo: 'Policy No', financer: 'Financier', norms: 'Emission Norms', address: 'Address',
  pincode: 'PIN Code', state: 'State', rto: 'Regn. Authority', mfgDate: 'Mfg. Month/Year',
  puccUpto: 'PUC Upto', puccNo: 'PUC No', pendingChallans: 'Pending Challans', taxUpto: 'Tax Upto',
  recordAgeDays: 'Record Age (days)',
}
const HIDE = new Set(['recordAgeDays'])
const ORDER = ['regNo', 'owner', 'fatherName', 'maker', 'model', 'variant', 'chassis', 'engine', 'fuel',
  'vehicleClass', 'vehicleType', 'bodyType', 'seats', 'cc', 'cylinders', 'colour', 'regDate',
  'regValidUpto', 'mfgDate', 'insuranceUpto', 'insurer', 'policyNo', 'puccUpto', 'taxUpto',
  'financer', 'pendingChallans', 'address', 'pincode', 'state', 'rto']

const CONF_LABEL = {
  verified: 'both sources',
  'verified-pattern': 'mask-verified',
  'single-source': 'single source',
  conflict: 'conflict',
  absent: 'not returned',
}

/* ------------------------------------------------------------------ App */
export default function App() {
  const [reg, setReg] = useState('')
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(null)
  const [fit, setFit] = useState(1)
  const [expanded, setExpanded] = useState(false)
  const [natural, setNatural] = useState({ w: 946, h: 460 })
  const cardRef = useRef(null)     // offscreen, natural size — capture source
  const stageRef = useRef(null)    // visible, scaled to fit
  const previewRef = useRef(null)

  /* fit the 946px replica into whatever column we have, without touching
     the offscreen capture node */
  useEffect(() => {
    if (!data || !stageRef.current) return
    const measure = () => {
      const w = stageRef.current.clientWidth
      const h = previewRef.current ? previewRef.current.offsetHeight : 460
      setNatural({ w: 946, h })
      setFit(Math.min(1, w / 946))
    }
    if (expanded) return
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(stageRef.current)
    return () => ro.disconnect()
  }, [data, expanded])

  const steps = ['Querying snapshot table (primary)', 'Querying live scraper (secondary)', 'Reconciling fields & masks', 'Rendering replica']

  const run = useCallback(async (e) => {
    e?.preventDefault()
    if (busy) return
    setErr(null); setData(null); setBusy(true); setStep(0)

    const t1 = setTimeout(() => setStep(1), 700)
    const t2 = setTimeout(() => setStep(2), 1700)
    const t3 = setTimeout(() => setStep(3), 3400)

    try {
      const v = validateReg(reg)
      if (!v.ok) throw new Error(v.error)
      const json = await resolve(v.reg)
      setData(json)
      setStep(4)
    } catch (e) {
      setErr(e.message || 'Lookup failed')
    } finally {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
      setBusy(false)
    }
  }, [reg, busy])

  /* ---------------------------------------------------- HD capture -> PNG */
  const capture = useCallback(async () => {
    const { default: html2canvas } = await import('html2canvas-pro')
    return html2canvas(cardRef.current, {
      scale: 3.2,                      // ~3027 x ~1740 device pixels ≈ HD print
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: 1200,
    })
  }, [])

  const downloadPng = useCallback(async () => {
    if (!data) return
    setSaving('png')
    try {
      const canvas = await capture()
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `OSINT-RC_${data.regNo}_REPLICA.png`
      a.click()
    } catch (e) { setErr('Export failed: ' + e.message) }
    setSaving(null)
  }, [data, capture])

  const downloadPdf = useCallback(async () => {
    if (!data) return
    setSaving('pdf')
    try {
      const canvas = await capture()
      const { jsPDF } = await import('jspdf')
      const img = canvas.toDataURL('image/jpeg', 0.96)
      const w = 297, h = Math.round((canvas.height / canvas.width) * w)
      const pdf = new jsPDF({ orientation: h > w ? 'portrait' : 'landscape', unit: 'mm', format: [w, h] })
      pdf.addImage(img, 'JPEG', 0, 0, w, h)
      pdf.setFillColor(185, 28, 28)
      pdf.rect(0, h - 6, w, 6, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(7)
      pdf.text('REPLICA — NOT A GOVERNMENT DOCUMENT — OPEN-SOURCE DATA ONLY — OSINT RC v1.0', w / 2, h - 1.9, { align: 'center' })
      pdf.save(`OSINT-RC_${data.regNo}_REPLICA.pdf`)
    } catch (e) { setErr('PDF export failed: ' + e.message) }
    setSaving(null)
  }, [data, capture])

  /* ------------------------------------------------------------ render */
  const fields = data ? (ORDER.filter((k) => !HIDE.has(k) && data.fields[k]).map((k) => [k, data.fields[k]])
    .concat(Object.entries(data.fields).filter(([k]) => !ORDER.includes(k) && !HIDE.has(k)))) : []

  return (
    <>
      <div className="bg">
        <div className="blob b1" /><div className="blob b2" /><div className="blob b3" />
      </div>

      <div className="shell">
        {/* header */}
        <div className="topbar">
          <div className="brand">
            <div className="mark">{Ic.car}</div>
            <div>
              <h1>OSINT <span>RC</span></h1>
              <p>open-source registration certificate replica</p>
            </div>
          </div>
          <div className="tag">v1.0 · replica engine</div>
        </div>

        {/* hero */}
        <div className="hero">
          <h2>One plate. Every field it can prove.</h2>
          <p>
            Enter a registration number. OSINT RC queries two independent open sources, reconciles them
            field by field, and renders an HD PDF replica — with provenance on every value and no invented data.
          </p>
        </div>

        {/* search */}
        <form className="glass search" onSubmit={run}>
          <div className="field">
            <span style={{ color: 'rgba(234,240,255,.4)', display: 'flex' }}>{Ic.search}</span>
            <input
              value={reg}
              onChange={(e) => setReg(e.target.value.toUpperCase())}
              placeholder="MP54AA1199"
              aria-label="Registration number"
              maxLength={13}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Resolving…' : 'Generate replica'}
          </button>
        </form>

        {err && <div className="err">{Ic.warn}<span>{err}</span></div>}

        {/* progress */}
        {busy && (
          <div className="steps">
            {steps.map((s, i) => (
              <div key={s} className={`step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                <span className="dot" />{s}
              </div>
            ))}
          </div>
        )}

        {/* always-visible notice */}
        {!data && !busy && (
          <div className="glass panel" style={{ marginTop: 18 }}>
            <div className="notice">
              {Ic.warn}
              <div>
                <b>This is a replica, not an RC.</b> OSINT RC assembles a document-shaped image from openly
                scraped data. It is not issued by the MoRTH, Parivahan, Vahan or any RTO, has no legal
                standing, and must never be presented as proof of registration or ownership.
              </div>
            </div>
            <div className="notice info" style={{ marginTop: 10 }}>
              {Ic.info}
              <div>
                <b>How V1 gets its data, and what is currently broken.</b> Two third-party endpoints are
                queried on your behalf. At ship time the <b>live scraper is offline</b> (its Vercel deployment
                was deleted), so V1 is effectively running on a single source: a scraped snapshot table whose
                records can be months old. Fields it does not return are shown as “—”, never guessed. When the
                second source comes back, cross-verification resumes automatically.
              </div>
            </div>
          </div>
        )}

        {/* result */}
        {data && (
          <div className="result" style={{ marginTop: 18 }}>
            {/* left: the card */}
            <div className="glass panel">
              <div className="panel-head">
                <h3>Replica preview</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="chip-btn" onClick={() => setExpanded((v) => !v)}>
                    {expanded ? 'Fit to width' : fit < 0.98 ? 'View 100%' : 'Fit'}
                  </button>
                  <span className="chip c-conflict">REPLICA</span>
                </div>
              </div>

              <div className={`cardstage${expanded ? ' pannable' : ''}`} ref={stageRef}>
                <div style={{ height: expanded ? natural.h : natural.h * fit, overflow: expanded ? 'visible' : 'hidden' }}>
                  <div
                    ref={previewRef}
                    style={{
                      width: 946,
                      transform: expanded ? 'none' : `scale(${fit})`,
                      transformOrigin: 'top left',
                    }}
                  >
                    <RCCard data={data} />
                  </div>
                </div>
              </div>

              {/* natural-size render kept off-screen purely as the HD capture source */}
              <div className="offscreen" aria-hidden="true">
                <RCCard data={data} cardRef={cardRef} />
              </div>

              <div className="dlbar">
                <button className="btn-sm primary" onClick={downloadPdf} disabled={saving !== null}>
                  {Ic.dl}&nbsp; {saving === 'pdf' ? 'Rendering…' : 'Download PDF'}
                </button>
                <button className="btn-sm" onClick={downloadPng} disabled={saving !== null}>
                  {saving === 'png' ? 'Rendering…' : 'Download PNG (HD)'}
                </button>
                <button className="btn-sm" onClick={() => { setData(null); setReg('') }} disabled={saving !== null}>
                  New lookup
                </button>
              </div>

              {data.warnings.length > 0 && (
                <div className="stack" style={{ marginTop: 14 }}>
                  {data.warnings.map((w, i) => (
                    <div className="notice warn" key={i}>{Ic.warn}<div>{w}</div></div>
                  ))}
                </div>
              )}

              <div className="notice info" style={{ marginTop: 12 }}>
                {Ic.info}
                <div>
                  <b>Trade-off made for you.</b> Where the two sources disagreed, the value from the
                  <i> fresher </i> source is printed and the other is preserved in Provenance below. A
                  conflict is never silently averaged.
                </div>
              </div>
            </div>

            {/* right: provenance */}
            <div className="glass panel">
              <div className="panel-head">
                <h3>Provenance</h3>
                <span className="chip c-verified">{(data.elapsedMs / 1000).toFixed(1)}s</span>
              </div>

              <div className="stack" style={{ marginBottom: 14 }}>
                {(data.sourceStatus || []).map((s) => (
                  <div key={s.id} className="srcline">
                    <span className={`lamp ${s.online ? 'on' : s.enabled ? 'off' : 'idle'}`} />
                    <span className="srcname">
                      {s.label}
                      <small>{s.host}</small>
                      <small style={{ color: s.online ? 'var(--ink-faint)' : 'var(--ink-faint)' }}>{s.detail}</small>
                    </span>
                    <span className={`chip ${s.online ? 'c-verified' : s.enabled ? 'c-conflict' : 'c-absent'}`}>
                      {s.online ? 'online' : s.enabled ? 'failed' : 'disabled'}
                    </span>
                  </div>
                ))}
                <div className="provcount">
                  {data.onlineCount}/{data.sourceStatus?.length ?? 0} sources responded
                  {data.onlineCount < (data.sourceStatus?.length ?? 0) && ' — cross-verification OFF'}
                </div>
              </div>

              <div className="prov">
                {fields.map(([k, f]) => (
                  <div className="prow" key={k}>
                    <span className="pkey">{LABEL[k] || k}</span>
                    <span className={`pval${f.value == null ? ' null' : ''}`}>
                      {f.value == null ? 'not returned' : String(f.value)}
                      {f.confidence === 'conflict' && f.alternatives && (
                        <span style={{ display: 'block', color: 'var(--bad)', fontSize: 10.5, marginTop: 2 }}>
                          other source: {String(f.alternatives.find((a) => a.value !== f.value)?.value ?? '—')}
                        </span>
                      )}
                    </span>
                    <span className={`chip c-${f.confidence}`}>{CONF_LABEL[f.confidence] || f.confidence}</span>
                  </div>
                ))}
              </div>

              <div className="notice info" style={{ marginTop: 14 }}>
                {Ic.hub}
                <div>
                  <b>Read the chips.</b> <i>both sources</i> = two independent lookups agreed.
                  {' '}<i>mask-verified</i> = a full value fits the other source's masked pattern.
                  {' '}<i>single source</i> = only one endpoint returned it. <i>conflict</i> = they disagreed.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* footer */}
        <div className="foot">
          OSINT RC v1.0 — a research tool for open-source vehicle data.<br />
          Replicas only. No legal validity. The State Emblem is omitted by design.<br />
          Owner names may be masked at source; full addresses are truncated at source and are never reconstructed.
        </div>
      </div>
    </>
  )
}
