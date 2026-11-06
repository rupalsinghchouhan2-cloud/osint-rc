import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

/* ------------------------------------------------------------------
   The Ashoka Chakra is drawn as a stylised 24-spoke wheel.
   The State Emblem (Lion Capital) is deliberately NOT reproduced —
   its use is restricted, and a replica has no business bearing it.
------------------------------------------------------------------- */
function Chakra({ size = 62 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label="chakra">
      <defs>
        <linearGradient id="chg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#0c1d33" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="45" fill="none" stroke="url(#chg)" strokeWidth="3.4" />
      <circle cx="50" cy="50" r="8.5" fill="url(#chg)" />
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i * 360) / 24
        return (
          <line
            key={i}
            x1="50" y1="50" x2="50" y2="9.5"
            stroke="url(#chg)" strokeWidth="2.1" strokeLinecap="round"
            transform={`rotate(${a} 50 50)`}
            opacity={i % 2 ? 0.55 : 0.92}
          />
        )
      })}
      <circle cx="50" cy="50" r="45" fill="none" stroke="#1e3a8a" strokeWidth="1.1" opacity="0.5" />
    </svg>
  )
}

const EM = '—'

function F({ label, value, full, big }) {
  const missing = value === null || value === undefined || value === ''
  return (
    <div className={`rc-f${full ? ' full' : ''}`}>
      <label>{label}</label>
      <div className={`v${big ? ' lg' : ''}${missing ? ' na' : ''}`}>{missing ? EM : String(value)}</div>
    </div>
  )
}

export default function RCCard({ data, cardRef }) {
  const [qr, setQr] = useState(null)
  const localRef = useRef(null)
  const ref = cardRef || localRef
  const f = (k) => (data.fields[k] ? data.fields[k].value : null)

  useEffect(() => {
    let alive = true
    // The QR is generated FROM THIS RECORD and branded OSINT-RC.
    // (Upstream's fatal bug was shipping a hard-coded QR for a different vehicle.)
    const payload = [
      'OSINT-RC REPLICA — NOT A GOVERNMENT DOCUMENT',
      `REG=${data.regNo}`,
      `CHASSIS=${f('chassis') || 'unknown'}`,
      `MAKER=${f('maker') || 'unknown'}`,
      `MODEL=${f('model') || 'unknown'}`,
      `SOURCES=${(data.sources || []).map((s) => s.id).join('+') || 'none'}`,
    ].join('\n')
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 420,
      color: { dark: '#0c1d33', light: '#ffffff' },
    })
      .then((url) => alive && setQr(url))
      .catch(() => alive && setQr(null))
    return () => { alive = false }
  }, [data.regNo, data.sources])

  const verified = Object.values(data.fields).filter((x) => x.confidence === 'verified' || x.confidence === 'verified-pattern').length
  const total = Object.values(data.fields).filter((x) => x.confidence !== 'absent').length
  const conflicts = Object.values(data.fields).filter((x) => x.confidence === 'conflict').length
  const stamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="rc" ref={ref} id="rc-capture">

      {/* ---------- head ---------- */}
      <div className="rc-head">
        <Chakra size={62} />
        <div className="rc-title">
          <h1>Indian Registration Certificate — Replica</h1>
          <p>Reconstructed from open-source records · Not issued by any Government authority</p>
        </div>
        <div className="rc-badges">
          <div className="pill nt">NT</div>
          <div className="pill rj">RJ</div>
          <div className="rc-replica-flag">REPLICA<br />not a legal doc</div>
        </div>
      </div>

      {/* ---------- body ---------- */}
      <div className="rc-body">
        {/* left panel */}
        <div className="rc-panel">
          <div className="rc-panel-head">Registration &amp; Owner</div>
          <div className="rc-fields">
            <F label="Regn. No" value={data.regNo} big />
            <F label="Owner Serial" value={null} />
            <F label="Date of Regn." value={f('regDate')} />
            <F label="Regn. Validity" value={f('regValidUpto')} />
            <F label="Chassis Number" value={f('chassis')} full />
            <F label="Engine / Motor Number" value={f('engine')} full />
            <F label="Owner Name" value={f('owner')} full />
            <F label="Son / Daughter / Wife of" value={f('fatherName')} full />
            <F label="Fuel" value={f('fuel')} />
            <F label="Emission Norms" value={f('norms')} />
            <F label="Address" value={f('address')} full />
            <F label="PIN Code" value={f('pincode')} />
            <F label="State" value={f('state')} />
          </div>
        </div>

        {/* right panel */}
        <div className="rc-panel">
          <div className="rc-panel-head">VEHICLE CLASS : {f('vehicleClass') || f('vehicleType') || EM}</div>
          <div className="rc-twocol">
            <div className="rc-qr">
              {qr ? <img src={qr} alt="record QR" /> : <div style={{ width: 132, height: 132 }} />}
            </div>
            <div className="rc-fields" style={{ gridTemplateColumns: 'minmax(0,1fr)', padding: '10px 4px 12px 0' }}>
              <F label="Registration Number" value={data.regNo} />
              <F label="Maker" value={f('maker')} />
              <F label="Model" value={f('model')} />
              <F label="Body Type" value={f('bodyType')} />
              <F label="Colour" value={f('colour')} />
              <F label="Seating Capacity" value={f('seats')} />
              <F label="Cubic Capacity" value={f('cc')} />
              <F label="No of Cylinders" value={f('cylinders')} />
              <F label="Month / Year of Mfg." value={f('mfgDate')} />
            </div>
            <div className="rc-side-vert">OSINT RC</div>
          </div>
        </div>
      </div>

      {/* ---------- second strip ---------- */}
      <div className="rc-strip">
        <div className="rc-panel">
          <div className="rc-panel-head">Insurance · Tax · Compliance</div>
          <div className="rc-fields" style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
            <F label="Insurer" value={f('insurer')} full />
            <F label="Policy No" value={f('policyNo')} />
            <F label="Insurance Valid Upto" value={f('insuranceUpto')} />
            <F label="PUC Valid Upto" value={f('puccUpto')} />
            <F label="Tax Upto" value={f('taxUpto')} />
            <F label="Financier" value={f('financer')} full />
            <F label="Pending Challans" value={f('pendingChallans')} />
            <F label="Registration Authority" value={f('rto')} />
          </div>
        </div>
        <div className="rc-sign">
          <div className="seal" />
          <div className="rc-stamp">REPLICA</div>
          <div>
            <div className="sig">OSINT&nbsp;RC</div>
            <small>Machine generated · unsigned</small>
            <small style={{ marginTop: 6, color: '#b91c1c', fontWeight: 800 }}>NOT AN ORIGINAL RC</small>
          </div>
        </div>
      </div>

      {/* ---------- disclaimer footer ---------- */}
      <div className="rc-foot">
        <div className="disc">
          <b>REPLICA — NOT AN ORIGINAL RC.</b> This sheet is a visual reconstruction assembled entirely from
          publicly scraped open-source data. It is <b>not issued, endorsed or verified</b> by the Ministry of
          Road Transport &amp; Highways, Parivahan, Vahan or any RTO, and it carries no legal validity.
          Fields shown as “{EM}” were not returned by any source and were deliberately <i>not</i> invented.
          The State Emblem has been intentionally omitted. Do not present this document as proof of registration.
        </div>
        <div className="rc-meta">
          GENERATED {stamp}<br />
          VERIFIED {verified}/{total} · CONFLICTS {conflicts}<br />
          SOURCES {(data.sources || []).map((s) => s.id).join(' + ') || 'none'}<br />
          OSINT RC v1.0
        </div>
      </div>
    </div>
  )
}
