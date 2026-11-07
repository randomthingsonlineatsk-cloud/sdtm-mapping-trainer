// Raw date formats as they arrive from the data sources, and their conversion to ISO 8601.
// - EDC exports: DD-MMM-YYYY (10-MAR-2026). An unknown day or month is exported as UN or UNK
//   (UN-MAR-2026, UN-UNK-2019), the convention most EDC systems use for partial dates.
// - Central laboratory transfers: YYYYMMDD (20260310) with times as HHMM (0915).
// - The CTMS protocol deviation log: DD/MM/YYYY (14/03/2026).
// - IRT files: ISO 8601 already.
// SDTM keeps only what was collected: an unknown day gives 2026-03, an unknown month 2019 (the
// day is not kept without its month), and nothing is imputed.

export const INFORMATS = ['DD-MMM-YYYY', 'YYYYMMDD', 'DD/MM/YYYY', 'ISO 8601'] as const
export type Informat = (typeof INFORMATS)[number]
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const UNK = /^(UN|UK|UNK|NK|XX|--)$/i
export const ISO_PARTIAL = /^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2})?)?)?)?$/

const valid = (y: number, m: number, d: number) => { const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d }
const p2 = (n: number) => String(n).padStart(2, '0')

// Converts one raw date to ISO 8601 (possibly partial), or throws with the reason.
export function toIso(text: string, informat: string): string {
  const s = text.trim()
  if (!s) return ''
  const f = informat.trim().toUpperCase()
  if (f === 'DD-MMM-YYYY') {
    const m = /^([0-9]{1,2}|[A-Za-z-]{2})[-\s]([A-Za-z]{3}|[A-Za-z]{2}|--)[-\s]([0-9]{4})$/.exec(s)
    if (!m) throw new Error(`“${s}” is not DD-MMM-YYYY`)
    const y = Number(m[3])
    if (UNK.test(m[2])) return String(y)
    const mi = MON.indexOf(m[2].toUpperCase())
    if (mi < 0) throw new Error(`“${m[2]}” in “${s}” is not a month`)
    if (UNK.test(m[1])) return `${y}-${p2(mi + 1)}`
    const d = Number(m[1])
    if (!valid(y, mi + 1, d)) throw new Error(`“${s}” is not a calendar date`)
    return `${y}-${p2(mi + 1)}-${p2(d)}`
  }
  if (f === 'YYYYMMDD') {
    const m = /^(\d{4})(\d{2})(\d{2})$/.exec(s)
    if (!m) throw new Error(`“${s}” is not YYYYMMDD`)
    if (!valid(+m[1], +m[2], +m[3])) throw new Error(`“${s}” is not a calendar date`)
    return `${m[1]}-${m[2]}-${m[3]}`
  }
  if (f === 'DD/MM/YYYY') {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s)
    if (!m) throw new Error(`“${s}” is not DD/MM/YYYY`)
    if (!valid(+m[3], +m[2], +m[1])) throw new Error(`“${s}” is not a calendar date`)
    return `${m[3]}-${m[2]}-${m[1]}`
  }
  if (f === 'ISO 8601' || f === 'ISO' || f === 'ISO8601') {
    if (!ISO_PARTIAL.test(s)) throw new Error(`“${s}” is not ISO 8601`)
    return s
  }
  throw new Error(`Unknown informat “${informat}”: use ${INFORMATS.map((x) => `'${x}'`).join(', ')}`)
}

// A time of day as HH:MM or HH:MM:SS, from HH:MM, HH:MM:SS or HHMM.
export function toIsoTime(text: string): string {
  const s = text.trim()
  if (!s) return ''
  let m = /^(\d{2}):(\d{2})(:(\d{2}))?$/.exec(s)
  if (!m) { const c = /^(\d{2})(\d{2})$/.exec(s); if (c) m = [s, c[1], c[2]] as unknown as RegExpExecArray }
  if (!m || +m[1] > 23 || +m[2] > 59) throw new Error(`“${s}” is not a time (HH:MM or HHMM)`)
  return m[4] ? `${m[1]}:${m[2]}:${m[4]}` : `${m[1]}:${m[2]}`
}

// Recognises any of the study's raw formats (for helper functions that read raw dates, such as
// the visit window and age calculations). Returns null when the text is not a date.
export function anyDate(text: string): string | null {
  const s = (text ?? '').trim()
  if (!s) return null
  for (const f of INFORMATS) { try { return toIso(s, f) } catch { /* next */ } }
  return null
}

// ISO 8601 (possibly partial) to the EDC export format, used to build the raw data.
export function toEdc(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  if (!m) return `UN-UNK-${y}`
  return `${d ?? 'UN'}-${MON[Number(m) - 1]}-${y}`
}
export const toYmd = (iso: string) => iso.slice(0, 10).replace(/-/g, '')
export const toDmy = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')
