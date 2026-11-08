// Dataset exports written in the browser: SAS Version 5 transport (XPT), the format FDA and
// PMDA require (Study Data Technical Conformance Guide: names up to 8 characters, labels up to
// 40, character values up to 200, ASCII), and CDISC Dataset-JSON v1.1, the JSON exchange
// format FDA asked for comments on in 2025 as a possible successor.

import type { Built } from './engine'
import { metaOf, domainInfo, isRel, relMetaKey, relLabel, type Version } from './standards'
import { STUDY } from './study'

const ASCII = /^[\x20-\x7e]*$/
export interface ExportReport { warnings: string[] }

function varMeta(b: Built, v: string, ver: Version) {
  const base = isRel(b.domain) ? relMetaKey(b.domain) : b.domain
  const m = metaOf(base, v, ver)
  // A non-standard variable of an NS-- dataset is numeric when every value is a number.
  const type = m?.type ?? (b.rows.every((r) => r[v] === '' || /^-?\d+(\.\d+)?$/.test(r[v])) && b.rows.some((r) => r[v] !== '') ? 'Num' : 'Char')
  return { type, label: (m?.label ?? b.labels?.[v] ?? v).slice(0, 40) }
}
const datasetLabel = (b: Built) => (isRel(b.domain) ? relLabel(b.domain) : domainInfo(b.domain)?.name ?? b.domain).slice(0, 40)

// ---------- SAS V5 transport ----------
const pad = (s: string, n: number) => (s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length))
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const sasDate = (d: Date) => `${String(d.getUTCDate()).padStart(2, '0')}${MONTHS[d.getUTCMonth()]}${String(d.getUTCFullYear() % 100).padStart(2, '0')}:${[d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()].map((x) => String(x).padStart(2, '0')).join(':')}`

// IEEE double to IBM System/370 hexadecimal floating point, 8 bytes, big-endian.
export function ibm(x: number): Uint8Array {
  const out = new Uint8Array(8)
  if (x === 0 || !Number.isFinite(x)) return out
  const sign = x < 0 ? 0x80 : 0
  let v = Math.abs(x), e = 0
  while (v >= 1) { v /= 16; e++ }
  while (v < 1 / 16) { v *= 16; e-- }
  let hi = Math.floor(v * 2 ** 24)
  let lo = Math.round((v * 2 ** 24 - hi) * 2 ** 32)
  if (lo >= 2 ** 32) { lo -= 2 ** 32; hi++ }
  if (hi >= 2 ** 24) { hi /= 16; e++ }
  out[0] = sign | ((e + 64) & 0x7f)
  out[1] = (hi >>> 16) & 0xff; out[2] = (hi >>> 8) & 0xff; out[3] = hi & 0xff
  out[4] = (lo >>> 24) & 0xff; out[5] = (lo >>> 16) & 0xff; out[6] = (lo >>> 8) & 0xff; out[7] = lo & 0xff
  return out
}
const MISSING = (() => { const b = new Uint8Array(8); b[0] = 0x2e; return b })()

export function toXpt(b: Built, ver: Version, now = new Date()): { bytes: Uint8Array; report: ExportReport } {
  const warnings: string[] = []
  const enc = (s: string) => { if (!ASCII.test(s)) warnings.push(`Non-ASCII text replaced: “${s.slice(0, 30)}”`); return s.replace(/[^\x20-\x7e]/g, '?') }
  const name = b.domain.slice(0, 8).toUpperCase()
  if (b.domain.length > 8) warnings.push(`Dataset name ${b.domain} cut to ${name}`)
  const vars = b.vars.map((v, i) => {
    const m = varMeta(b, v, ver)
    if (v.length > 8) warnings.push(`Variable ${v} is longer than 8 characters`)
    const len = m.type === 'Num' ? 8 : Math.max(1, ...b.rows.map((r) => (r[v] ?? '').length))
    if (m.type === 'Char' && len > 200) warnings.push(`${v} has values over 200 characters`)
    return { v, i, type: m.type, label: m.label, len: m.type === 'Num' ? 8 : Math.min(200, len) }
  })
  let pos = 0
  const posOf = vars.map((x) => { const p = pos; pos += x.len; return p })
  const rowLen = pos
  const chunks: Uint8Array[] = []
  const text = (s: string) => chunks.push(new TextEncoder().encode(s))
  const dt = sasDate(now)
  text(pad('HEADER RECORD*******LIBRARY HEADER RECORD!!!!!!!000000000000000000000000000000', 80))
  text(pad('SAS     SAS     SASLIB  9.4     X64_10PR' + ' '.repeat(24) + dt, 80))
  text(pad(dt, 80))
  text(pad('HEADER RECORD*******MEMBER  HEADER RECORD!!!!!!!000000000000000001600000000140', 80))
  text(pad('HEADER RECORD*******DSCRPTR HEADER RECORD!!!!!!!000000000000000000000000000000', 80))
  text(pad('SAS     ' + pad(name, 8) + 'SASDATA 9.4     X64_10PR' + ' '.repeat(24) + dt, 80))
  text(pad(dt + ' '.repeat(16) + pad(enc(datasetLabel(b)), 40) + pad('', 8), 80))
  text(pad(`HEADER RECORD*******NAMESTR HEADER RECORD!!!!!!!000000${String(vars.length).padStart(4, '0')}00000000000000000000`, 80))
  const ns = new Uint8Array(140 * vars.length)
  const dv = new DataView(ns.buffer)
  const put = (o: number, s: string, n: number) => { const t = new TextEncoder().encode(pad(enc(s), n)); ns.set(t.slice(0, n), o) }
  vars.forEach((x, k) => {
    const o = 140 * k
    dv.setInt16(o, x.type === 'Num' ? 1 : 2); dv.setInt16(o + 2, 0); dv.setInt16(o + 4, x.len); dv.setInt16(o + 6, k + 1)
    put(o + 8, x.v.slice(0, 8), 8); put(o + 16, x.label, 40); put(o + 56, '', 8)
    dv.setInt16(o + 64, 0); dv.setInt16(o + 66, 0); dv.setInt16(o + 68, 0); put(o + 70, '', 2); put(o + 72, '', 8)
    dv.setInt16(o + 80, 0); dv.setInt16(o + 82, 0); dv.setInt32(o + 84, posOf[k])
  })
  chunks.push(ns)
  const nsPad = (80 - (ns.length % 80)) % 80; if (nsPad) text(' '.repeat(nsPad))
  text(pad('HEADER RECORD*******OBS     HEADER RECORD!!!!!!!000000000000000000000000000000', 80))
  const obs = new Uint8Array(rowLen * b.rows.length)
  b.rows.forEach((r, ri) => {
    vars.forEach((x, k) => {
      const o = ri * rowLen + posOf[k]
      const val = r[x.v] ?? ''
      if (x.type === 'Num') { const n = Number(val); obs.set(val === '' || Number.isNaN(n) ? MISSING : ibm(n), o) }
      else obs.set(new TextEncoder().encode(pad(enc(val), x.len)), o)
    })
  })
  chunks.push(obs)
  const obsPad = (80 - (obs.length % 80)) % 80; if (obsPad) text(' '.repeat(obsPad))
  const total = chunks.reduce((a, c) => a + c.length, 0)
  const bytes = new Uint8Array(total); let at = 0
  for (const c of chunks) { bytes.set(c, at); at += c.length }
  return { bytes, report: { warnings: [...new Set(warnings)] } }
}

// ---------- CDISC Dataset-JSON v1.1 ----------
export function toDatasetJson(b: Built, ver: Version, keys: string[] = [], now = new Date()) {
  const cols = b.vars.map((v) => {
    const m = varMeta(b, v, ver)
    const vals = b.rows.map((r) => r[v] ?? '').filter((x) => x !== '')
    const dataType = m.type === 'Char' ? 'string' : vals.every((x) => Number.isInteger(Number(x))) ? 'integer' : 'double'
    const len = m.type === 'Char' ? Math.max(1, ...vals.map((x) => x.length)) : undefined
    const k = keys.indexOf(v)
    return { itemOID: `IT.${b.domain}.${v}`, name: v, label: m.label, dataType, ...(len ? { length: len } : {}), ...(k >= 0 ? { keySequence: k + 1 } : {}) }
  })
  const study = b.rows[0]?.STUDYID || STUDY.id
  return {
    datasetJSONCreationDateTime: now.toISOString().slice(0, 19),
    datasetJSONVersion: '1.1.0',
    fileOID: `${study}.${b.domain}`,
    originator: 'SDTM Mapping Trainer (training data, fictional study)',
    sourceSystem: { name: 'SDTM Mapping Trainer', version: '2' },
    studyOID: study,
    metaDataVersionOID: `MDV.${study}.${ver === '3.4' ? 'SDTMIG.3.4' : ver === 'send' ? 'SENDIG.3.1.1' : 'SDTMIG.4.0.DRAFT'}`,
    metaDataRef: 'define.xml',
    itemGroupOID: `IG.${b.domain}`,
    records: b.rows.length,
    name: b.domain,
    label: datasetLabel(b),
    columns: cols,
    rows: b.rows.map((r) => cols.map((c) => { const x = r[c.name] ?? ''; return x === '' ? null : c.dataType === 'string' ? x : Number(x) })),
  }
}
