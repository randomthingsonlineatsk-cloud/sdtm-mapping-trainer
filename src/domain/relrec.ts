// RELREC: which records of different domains belong together. Each relationship rule links the
// records of two domains whose keys are equal for the same subject: a medication to the adverse
// event it was given for, an abnormal-lab adverse event to the lab result behind it. Keys are
// SDTM variables, or raw fields of the record’s source row (CMAENO, AELBACC: collected on the
// CRF to link records, not submitted as variables). Each related group shares a RELID.

import { parse, evaluate } from './expr'
import type { Built, OutRow, StudyData } from './engine'
import type { Finding } from './conformance'

export interface RelSide { domain: string; key: string; filter?: string }
// group: the keys are --GRPID variables and whole groups are related: one RELREC record per
// group on each side, with IDVAR the group ID variable (as SDTMIG relates PP to PC).
export interface RelDef { id: string; label: string; a: RelSide; b: RelSide; group?: boolean }
export const RELREC_VARS = ['STUDYID', 'RDOMAIN', 'USUBJID', 'IDVAR', 'IDVARVAL', 'RELTYPE', 'RELID']

// A value of a record: its SDTM variable, else the raw field of the row it came from.
export function valueOf(row: OutRow, name: string, data: StudyData): string {
  if (name in row) return row[name] ?? ''
  const [form, id] = row.__trace.split(':')
  return (data.forms[form] ?? []).find((r) => r.__id === id)?.[name] ?? ''
}
function passes(row: OutRow, filter: string | undefined, data: StudyData): boolean {
  if (!filter?.trim()) return true
  try { return evaluate(parse(filter), { get: (n: string) => valueOf(row, n, data), fn: {} }) === true } catch { return false }
}

export function buildRelrec(defs: RelDef[], builts: Record<string, Built>, data: StudyData): Built {
  const rows: OutRow[] = []
  const errors: Built['errors'] = {}
  for (const d of defs) {
    const A = builts[d.a.domain], B = builts[d.b.domain]
    if (!A || !B) { errors[d.id] = { count: 1, first: `Map ${!A ? d.a.domain : d.b.domain} first` }; continue }
    const seqA = `${d.a.domain}SEQ`, seqB = `${d.b.domain}SEQ`
    const bBySubj = new Map<string, OutRow[]>()
    for (const r of B.rows) if (passes(r, d.b.filter, data)) (bBySubj.get(r.USUBJID) ?? bBySubj.set(r.USUBJID, []).get(r.USUBJID)!).push(r)
    const n = new Map<string, number>()
    if (d.group) {
      const seen = new Set<string>()
      for (const a of A.rows) {
        if (!passes(a, d.a.filter, data)) continue
        const ka = a[d.a.key] ?? ''; if (!ka || seen.has(`${a.USUBJID}|${ka}`)) continue
        const mb = (bBySubj.get(a.USUBJID) ?? []).find((b) => (b[d.b.key] ?? '') === ka); if (!mb) continue
        seen.add(`${a.USUBJID}|${ka}`)
        const k = (n.get(a.USUBJID) ?? 0) + 1; n.set(a.USUBJID, k)
        const g = (r: OutRow, dom: string, idvar: string): OutRow => ({ __trace: `${d.id}|${r.__trace}`, __subj: r.__subj, STUDYID: r.STUDYID ?? '', RDOMAIN: dom, USUBJID: r.USUBJID, IDVAR: idvar, IDVARVAL: r[idvar] ?? '', RELTYPE: '', RELID: `${d.id}${k}` })
        rows.push(g(a, d.a.domain, d.a.key), g(mb, d.b.domain, d.b.key))
      }
      continue
    }
    for (const a of A.rows) {
      if (!passes(a, d.a.filter, data)) continue
      const ka = valueOf(a, d.a.key, data); if (!ka) continue
      const match = (bBySubj.get(a.USUBJID) ?? []).filter((b) => valueOf(b, d.b.key, data) === ka)
      if (!match.length) continue
      const k = (n.get(a.USUBJID) ?? 0) + 1; n.set(a.USUBJID, k)
      const relid = `${d.id}${k}`
      const rec = (r: OutRow, dom: string, seq: string): OutRow => ({ __trace: `${d.id}|${r.__trace}`, __subj: r.__subj, STUDYID: r.STUDYID ?? '', RDOMAIN: dom, USUBJID: r.USUBJID, IDVAR: seq, IDVARVAL: r[seq] ?? '', RELTYPE: '', RELID: relid } as OutRow)
      rows.push(rec(a, d.a.domain, seqA), ...match.map((b) => rec(b, d.b.domain, seqB)))
    }
  }
  rows.sort((x, y) => x.USUBJID.localeCompare(y.USUBJID) || x.RELID.localeCompare(y.RELID, undefined, { numeric: true }) || x.RDOMAIN.localeCompare(y.RDOMAIN))
  return { domain: 'RELREC', vars: RELREC_VARS, rows, errors, warnings: [] }
}

// Every RELREC record must point to an existing record; a relationship needs at least two.
export function checkRelrec(rel: Built, builts: Record<string, Built>): Finding[] {
  const out: Finding[] = []
  const groups = new Map<string, number>()
  rel.rows.forEach((r, i) => {
    const k = `${r.USUBJID}|${r.RELID}`; groups.set(k, (groups.get(k) ?? 0) + 1)
    const parent = builts[r.RDOMAIN]
    if (!parent) out.push({ rule: 'TRN-054', sev: 'Error', domain: 'RELREC', variable: 'RDOMAIN', row: i, usubjid: r.USUBJID, msg: `No ${r.RDOMAIN} dataset` })
    else if (!parent.rows.some((p) => p.USUBJID === r.USUBJID && (p[r.IDVAR] ?? '') === r.IDVARVAL)) out.push({ rule: 'TRN-054', sev: 'Error', domain: 'RELREC', variable: 'IDVARVAL', row: i, usubjid: r.USUBJID, msg: `${r.RDOMAIN} has no record with ${r.IDVAR} = ${r.IDVARVAL}` })
  })
  for (const [k, c] of groups) if (c < 2) out.push({ rule: 'TRN-055', sev: 'Error', domain: 'RELREC', variable: 'RELID', usubjid: k.split('|')[0], msg: `RELID ${k.split('|')[1]} relates only one record` })
  return out
}
