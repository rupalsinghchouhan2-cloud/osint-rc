/**
 * OSINT RC — server-side field resolver (V1)
 * ------------------------------------------------------------------
 * Contract: NEVER invent a value. A field is either sourced, or it is null
 * with a reason. Every returned field carries provenance + source freshness.
 *
 * Sources (V1):
 *   primary   vahanapi.vk177384.workers.dev   — scraped snapshot table (unmasked)
 *   secondary vhicle-info-2-by-ansh.vercel.app — live scraper (masked), flaky
 */

const PRIMARY = 'https://vahanapi.vk177384.workers.dev/?vehicle_no='
const SECONDARY = 'https://vhicle-info-2-by-ansh.vercel.app/api/vahan/key=DFHN/num='

/**
 * SOURCE REGISTRY — this is where V2 plugs in better suppliers.
 * Set `enabled: false` to skip a source entirely (no request, no CORS noise).
 * `note` is surfaced to the user verbatim, so keep it factual.
 */
export const SOURCE_REGISTRY = [
  {
    id: 'primary',
    label: 'Scraped snapshot table',
    host: 'vahanapi.vk177384.workers.dev',
    kind: 'snapshot',
    enabled: true,
    note: 'Records carry a last-modified stamp; some are months old.',
  },
  {
    id: 'secondary',
    label: 'Live scraper (masked)',
    host: 'vhicle-info-2-by-ansh.vercel.app',
    kind: 'live',
    enabled: false,
    note: 'DEPLOYMENT_DELETED — the Vercel deployment returned DEPLOYMENT_NOT_FOUND at build time. Disabled until a replacement is supplied; cross-verification is therefore OFF.',
  },
]
const SECONDARY_ATTEMPTS = 4          // it alternates data/empty — retry through the flaps
const TIMEOUT_MS = 14000

const PLACEHOLDERS = new Set(['', 'na', 'n/a', 'null', 'none', '-', 'unknown', 'not available', '0'])
const TWO_WHEELER = [
  'activa', 'swish', 'scooter', 'thunderbird', 'bullet', 'caliber', 'ct 100', 'ct 110',
  'wego', 'pulsar', 'splendor', 'shine', 'jupiter', 'ntorq', 'fascino', 'glamour', 'sport',
]

// ---------------------------------------------------------------- helpers
const clean = (v) => {
  if (v === null || v === undefined) return null
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v === 0 ? null : v
  let s = String(v).trim()
  if (PLACEHOLDERS.has(s.toLowerCase())) return null
  // sources sometimes emit ', 484661' / 'MAHARASHTRA ,' — tidy separators only, never add data
  s = s.replace(/^[\s,;/-]+/, '').replace(/[\s,;/-]+$/, '').trim()
  return s || null
}

/** DD/MM/YYYY or ISO -> DD-MMM-YYYY (what an RC prints) */
function cardDate(v) {
  if (!v) return null
  const s = String(v).trim()
  let d, m, y
  let r = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s)
  if (r) { d = +r[1]; m = +r[2]; y = +r[3] }
  else {
    r = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
    if (!r) return null
    y = +r[1]; m = +r[2]; d = +r[3]
  }
  if (y < 1900) return null                       // 0001-01-01 sentinel
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]
  if (!mon || d < 1 || d > 31) return null
  return `${String(d).padStart(2, '0')}-${mon}-${y}`
}

const daysSince = (d) => Math.max(0, Math.round((Date.now() - d.getTime()) / 86400000))
const parseStamp = (s) => {
  if (!s) return null
  const m = /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(String(s).trim())
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6])
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

async function jget(url) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; OSINTS-RC/1.0)', accept: 'application/json' },
    })
    if (!res.ok) return null
    return await res.json()
  } catch { return null } finally { clearTimeout(t) }
}

// ---------------------------------------------------------------- adapters
async function fetchPrimary(reg) {
  const d = await jget(PRIMARY + encodeURIComponent(reg))
  if (!d || d.statusCode !== 200 || !d.response) {
    return { ok: false, reason: d ? (d.description || d.message || `statusCode ${d.statusCode}`) : 'unreachable', fields: {} }
  }
  const r = d.response
  const stamp = parseStamp(r.lmDate)
  return {
    ok: true,
    source: 'primary',
    lastSeen: stamp ? stamp.toISOString() : null,
    ageDays: stamp ? daysSince(stamp) : null,
    masked: false,
    fields: {
      regNo: clean(r.regNo),
      owner: clean(r.owner),
      fatherName: clean(r.ownerFatherName),
      maker: clean(r.manufacturer),
      model: clean(r.vehicle),
      variant: clean(r.variant),
      chassis: clean(r.chassis),
      engine: clean(r.engine),
      fuel: clean(r.fuelType),
      vehicleClass: clean(r.vehicleClass),
      vehicleType: clean(r.vehicleType),
      bodyType: null,                      // not offered — never guessed
      seats: clean(r.seatCapacity),
      cc: clean(r.cubicCapacity),
      cylinders: null,                     // not offered — never guessed
      colour: clean(r.color),
      regDate: clean(r.regDate),
      regValidUpto: null,
      insuranceUpto: clean(r.insuranceUpto),
      insurer: clean(r.insuranceCompanyName),
      policyNo: clean(r.insurancePolicyNumber),
      financer: clean(r.financerName),
      norms: null,                         // not offered — never guessed
      address: clean(r.presentAddress),
      pincode: clean(r.pincode),
      state: clean((r.rtoData || {}).statename),
      rto: clean(r.regAuthority),
      mfgDate: clean(r.manufacturerMonthYear),
      puccUpto: clean(r.puccValidUpto),
      puccNo: clean(r.puccNumber),
      pendingChallans: null,
      taxUpto: null,
      recordAgeDays: stamp ? daysSince(stamp) : null,
    },
  }
}

async function fetchSecondary(reg) {
  let last = null
  for (let i = 0; i < SECONDARY_ATTEMPTS; i++) {
    const d = await jget(SECONDARY + encodeURIComponent(reg))
    last = d
    const inner = d && d.data && d.data.data
    const rc = inner && inner.rc_details
    if (rc && (rc.rc_maker_model || rc.rc_maker_desc || rc.rc_owner_name && rc.rc_owner_name !== 'N/A')) {
      const stamp = parseStamp(rc.updated_at)
      const addr = clean(rc.rc_present_address)
      return {
        ok: true,
        source: 'secondary',
        lastSeen: stamp ? stamp.toISOString() : null,
        ageDays: stamp ? daysSince(stamp) : null,
        masked: /\*/.test(String(rc.rc_owner_name || '')),
        fields: {
          regNo: clean(rc.rc_regn_no),
          owner: clean(rc.rc_owner_name),
          fatherName: null,
          maker: clean(rc.rc_maker_desc),
          model: clean(rc.rc_maker_model),
          variant: null,
          chassis: clean(rc.rc_chasi_no),
          engine: clean(rc.rc_eng_no),
          fuel: clean(rc.rc_fuel_desc),
          vehicleClass: clean(rc.rc_vh_class_desc),
          vehicleType: clean(rc.rc_vch_catg),
          bodyType: clean(rc.rc_body_type_desc),
          seats: clean(rc.rc_seat_cap),
          cc: clean(rc.rc_cubic_cap),
          cylinders: clean(rc.rc_no_cyl),
          colour: clean(rc.rc_color),
          regDate: clean(rc.rc_regn_dt),
          regValidUpto: clean(rc.rc_regn_upto),
          insuranceUpto: null,
          insurer: clean(((inner.insurance || []).find((x) => x.is_active) || {}).insurance_company),
          policyNo: clean(((inner.insurance || []).find((x) => x.is_active) || {}).insurance_policy_no),
          financer: clean(rc.rc_financer),
          norms: clean(rc.rc_norms_desc),
          address: addr,
          pincode: (addr && /(\d{6})\s*$/.exec(addr) || [])[1] || null,
          state: clean(rc.state_cd),
          rto: clean(rc.rc_registered_at),
          mfgDate: clean(rc.rc_manu_month_yr),
          puccUpto: clean(((inner.puc || []).find((x) => x.is_active) || {}).pucc_valid_upto),
          puccNo: clean(((inner.puc || []).find((x) => x.is_active) || {}).pucc_no),
          pendingChallans: inner.challan_status ? (inner.pending_challan_count ?? (inner.challans || []).length) : null,
          taxUpto: clean(rc.rc_tax_upto),
          recordAgeDays: stamp ? daysSince(stamp) : null,
        },
      }
    }
    await new Promise((r) => setTimeout(r, 350))
  }
  const inner = last && last.data && last.data.data
  return { ok: false, reason: inner && inner.rc_details ? 'record returned empty (round-robin dead backend)' : 'unreachable', fields: {} }
}

// ---------------------------------------------------------------- merge
const norm = (s) => String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9*]/g, '')

function agreement(a, b) {
  if (a == null || b == null) return 'single'
  const na = norm(a), nb = norm(b)
  if (!na || !nb) return 'single'
  if (na === nb || na.includes(nb) || nb.includes(na)) return 'agree'
  // a masked value that contains the other is an agreement, not a conflict
  if (na.includes('*') || nb.includes('*')) {
    const masked = na.includes('*') ? na : nb
    const full = na.includes('*') ? nb : na
    const rx = new RegExp('^' + masked.replace(/\*/g, '[A-Z0-9]{0,4}') + '$')
    if (rx.test(full)) return 'mask-agree'
  }
  return 'conflict'
}

/** internal coherence test for one source, run before merging */
function chimeras(f, label) {
  const out = []
  const model = String(f.model || '').toLowerCase()
  const seats = Number(f.seats)
  const cc = Number(f.cc)
  const bike = TWO_WHEELER.some((t) => model.includes(t))
  if (bike && seats >= 4) out.push(`${label}: model is a two-wheeler but seats=${seats}`)
  if (bike && cc > 600) out.push(`${label}: model is a two-wheeler but cc=${cc}`)
  if (!bike && cc && cc < 150 && seats >= 4) out.push(`${label}: car seats=${seats} but cc=${cc}`)
  return out
}

const COMPARE = ['owner', 'maker', 'model', 'chassis', 'engine', 'fuel', 'colour', 'seats', 'cc',
  'regDate', 'regValidUpto', 'insuranceUpto', 'financer', 'rto', 'state', 'pincode', 'cylinders', 'bodyType']

export async function resolve(reg) {
  const started = Date.now()
  const on = (id) => (SOURCE_REGISTRY.find((x) => x.id === id) || {}).enabled !== false
  const [p, s] = await Promise.all([
    on('primary') ? fetchPrimary(reg) : Promise.resolve({ ok: false, reason: 'disabled in source registry', fields: {} }),
    on('secondary') ? fetchSecondary(reg) : Promise.resolve({ ok: false, reason: 'disabled in source registry', fields: {} }),
  ])

  // explicit source health — the UI must never imply more verification than happened
  const sourceStatus = SOURCE_REGISTRY.map((meta) => {
    const res = meta.id === 'primary' ? p : s
    const disabled = meta.enabled === false
    return {
      id: meta.id,
      label: meta.label,
      host: meta.host,
      kind: meta.kind,
      enabled: !disabled,
      online: !disabled && res.ok,
      detail: disabled ? meta.note : res.ok ? 'returned a record' : (res.reason || 'unreachable'),
    }
  })

  const warnings = []
  if (!p.ok) warnings.push(`Primary source unavailable — ${p.reason}. Fields below come from the live scraper only.`)
  if (!s.ok) warnings.push(`Live scraper unavailable — ${s.reason}. Fields below come from a snapshot that may be months old.`)

  const sources = []
  if (p.ok) sources.push({ id: 'primary', kind: 'scraped snapshot table', lastSeen: p.lastSeen, ageDays: p.ageDays })
  if (s.ok) sources.push({ id: 'secondary', kind: 'live scraper (masked)', lastSeen: s.lastSeen, ageDays: s.ageDays })

  const fields = {}
  const conflicts = {}
  const keys = new Set([...Object.keys(p.fields || {}), ...Object.keys(s.fields || {})])

  for (const k of keys) {
    const a = p.fields ? p.fields[k] : null
    const b = s.fields ? s.fields[k] : null
    if (a == null && b == null) { fields[k] = { value: null, confidence: 'absent' }; continue }

    if (a != null && b != null) {
      const rel = COMPARE.includes(k) ? agreement(a, b) : 'agree'
      if (rel === 'conflict') {
        // prefer the FRESHER, UNMASKED source; record the other as an alternative
        const pAge = p.ageDays, sAge = s.ageDays
        const useSecondary = (sAge ?? 9999) < (pAge ?? 9999)
        const chosen = useSecondary ? b : a
        fields[k] = {
          value: chosen,
          confidence: 'conflict',
          source: useSecondary ? 'secondary' : 'primary',
          ageDays: useSecondary ? sAge : pAge,
          alternatives: [
            { value: a, source: 'primary', ageDays: pAge },
            { value: b, source: 'secondary', ageDays: sAge },
          ],
        }
        conflicts[k] = fields[k].alternatives
      } else {
        // mask-agree / agree: keep the UNMASKED one, but it is now cross-verified
        const unmasked = /\*/.test(String(a)) ? b : a
        fields[k] = {
          value: unmasked,
          confidence: rel === 'mask-agree' ? 'verified-pattern' : 'verified',
          source: 'both',
          ageDays: Math.min(p.ageDays ?? 9999, s.ageDays ?? 9999),
        }
      }
    } else if (a != null) {
      fields[k] = { value: a, confidence: 'single-source', source: 'primary', ageDays: p.ageDays }
    } else {
      fields[k] = { value: b, confidence: 'single-source', source: 'secondary', ageDays: s.ageDays }
    }
  }

  if (p.ok) {
    chimeras(p.fields, 'primary').forEach((w) => warnings.push(w))
    if (p.ageDays != null && p.ageDays > 120)
      warnings.push(`Snapshot is ${p.ageDays} days old — ownership, insurance and NOC state may have changed.`)
  }
  if (s.ok) chimeras(s.fields, 'live scraper').forEach((w) => warnings.push(w))

  const realConflicts = Object.keys(conflicts)
  if (realConflicts.length)
    warnings.push(`Sources disagree on: ${realConflicts.join(', ')}. The value shown is from the fresher source; the other is listed in Provenance.`)

  // present dates the way an RC prints them (21/1/2021 -> 21-Jan-2021)
  const DATE_FIELDS = ['regDate', 'regValidUpto', 'insuranceUpto', 'puccUpto', 'taxUpto']
  for (const k of DATE_FIELDS) {
    const fld = fields[k]
    if (!fld || fld.value == null) continue
    const pretty = cardDate(fld.value)
    if (pretty) fld.value = pretty
  }
  // mfg is MM/YYYY — format only when it is a full date
  if (fields.mfgDate && fields.mfgDate.value) {
    const m = /^(\d{1,2})[/-](\d{4})$/.exec(String(fields.mfgDate.value))
    if (m) fields.mfgDate.value = `${String(+m[1]).padStart(2, '0')}/${m[2]}`
  }

  const stateCode = (fields.regNo && fields.regNo.value || reg).slice(0, 2).toUpperCase()

  const activeCount = sourceStatus.filter((x) => x.enabled).length
  const onlineCount = sourceStatus.filter((x) => x.online).length
  const disabledCount = sourceStatus.length - activeCount
  if (onlineCount < sourceStatus.length) {
    warnings.unshift(
      `DEGRADED MODE — ${onlineCount} of ${sourceStatus.length} sources responded` +
      (disabledCount ? `, ${disabledCount} disabled at build time` : '') +
      '. Nothing below is cross-verified; every field is single-source.'
    )
  }
  if (onlineCount === 0) {
    warnings.unshift('NO SOURCE RESPONDED — this plate returned nothing. No value has been invented to fill the card.')
  }

  return {
    regNo: (fields.regNo && fields.regNo.value) || reg.toUpperCase(),
    stateCode,
    sources,
    sourceStatus,
    onlineCount,
    fields,
    conflicts,
    warnings: [...new Set(warnings)],
    elapsedMs: Date.now() - started,
  }
}

/** Reg number sanity — Indian plate grammar, no fabricated region lookups */
export function validateReg(input) {
  const reg = String(input || '').toUpperCase().replace(/[\s-]/g, '')
  if (!reg) return { ok: false, reg, error: 'Enter a registration number.' }
  if (!/^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/.test(reg))
    return { ok: false, reg, error: 'Not a valid Indian format. Expected e.g. MP54AA1199 or DL8CAB1234.' }
  return { ok: true, reg }
}
