// Phase 1 conformance checks. Each rule is written for this trainer from the public
// descriptions of the CDISC conformance rules and the FDA validator and business rules
// (required and expected variables, controlled terminology, ISO 8601, sequence numbers, study
// days, the DM arm rules). Phase 2 adds the full CDISC, FDA and PMDA rule sets with their
// severities and an explain-or-fix workflow.

import type { Built } from './engine'
import { varsOf, CT, metaOf, type Version } from './standards'
import { studyDay } from './engine'

export type Severity = 'Error' | 'Warning'
export interface Rule { id: string; sev: Severity; text: string; basis: string }
export interface Finding { rule: string; sev: Severity; domain: string; variable: string; row?: number; usubjid?: string; msg: string }

export const RULES: Rule[] = [
  { id: 'TRN-001', sev: 'Error', text: 'A Required variable is missing from the dataset', basis: 'SDTMIG core status: Required' },
  { id: 'TRN-002', sev: 'Error', text: 'A Required variable is null', basis: 'SDTMIG core status: Required values cannot be null' },
  { id: 'TRN-003', sev: 'Warning', text: 'An Expected variable is missing from the dataset', basis: 'SDTMIG core status: Expected columns must be present, even when null' },
  { id: 'TRN-004', sev: 'Error', text: 'Value not in a non-extensible codelist (extensible: warning)', basis: 'CDISC controlled terminology' },
  { id: 'TRN-005', sev: 'Error', text: 'Date/time is not in ISO 8601 format', basis: 'SDTMIG: --DTC variables in ISO 8601' },
  { id: 'TRN-006', sev: 'Error', text: '--SEQ is not unique within USUBJID', basis: 'SDTMIG: --SEQ uniquely identifies a record within a subject' },
  { id: 'TRN-007', sev: 'Error', text: 'DOMAIN does not match the dataset name', basis: 'SDTMIG: DOMAIN is the two-letter domain code' },
  { id: 'TRN-008', sev: 'Error', text: 'More than one DM record for a subject', basis: 'SDTMIG DM: one record per subject' },
  { id: 'TRN-009', sev: 'Error', text: 'USUBJID not found in DM', basis: 'Every subject in a domain must be in DM' },
  { id: 'TRN-010', sev: 'Error', text: '--DY is 0', basis: 'SDTMIG: there is no study day 0' },
  { id: 'TRN-011', sev: 'Error', text: '--DY does not match --DTC and RFSTDTC', basis: 'SDTMIG: study day calculation' },
  { id: 'TRN-012', sev: 'Error', text: 'ARMCD and ARMNRS (or ACTARMCD and ARMNRS) are both null or both populated', basis: 'SDTMIG v3.4 DM: ARMNRS is populated exactly when an arm is null' },
  { id: 'TRN-013', sev: 'Error', text: 'AGE is populated but AGEU is null', basis: 'SDTMIG DM' },
  { id: 'TRN-014', sev: 'Error', text: 'DTHFL is not Y or null, or DTHDTC is populated without DTHFL = Y', basis: 'SDTMIG DM: DTHFL is Y or null' },
  { id: 'TRN-015', sev: 'Error', text: '--ORRES is populated but --STRESC is null', basis: 'SDTMIG findings: every original result has a standard result' },
  { id: 'TRN-016', sev: 'Error', text: '--STRESN does not equal the numeric value of --STRESC', basis: 'SDTMIG findings' },
  { id: 'TRN-017', sev: 'Error', text: '--STAT is NOT DONE but a result is present (warning: no --REASND)', basis: 'SDTMIG findings: not-done records carry no result' },
  { id: 'TRN-018', sev: 'Warning', text: '--ORRES is populated but --ORRESU is null', basis: 'SDTMIG findings: units for results that have them' },
  { id: 'TRN-019', sev: 'Error', text: 'A numeric variable holds a non-numeric value', basis: 'SDTMIG variable type Num' },
  { id: 'TRN-020', sev: 'Warning', text: 'More than one standard unit for the same test', basis: 'SDTMIG findings: one standard unit per test' },
  { id: 'TRN-021', sev: 'Error', text: 'Reference start is after reference end', basis: 'SDTMIG DM: RFSTDTC on or before RFENDTC' },
]
const ISO = /^(\d{4})(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01])(T([01]\d|2[0-3])(:[0-5]\d(:[0-5]\d(\.\d+)?)?)?)?)?)?$/
export const isIso8601 = (s: string) => ISO.test(s)
const isNum = (s: string) => /^-?\d+(\.\d+)?(e-?\d+)?$/i.test(s)

export function check(b: Built, ver: Version, dm?: Built): Finding[] {
  const out: Finding[] = []
  const d = b.domain
  const add = (rule: string, variable: string, msg: string, row?: number, sev?: Severity) => out.push({ rule, sev: sev ?? RULES.find((r) => r.id === rule)!.sev, domain: d, variable, row, usubjid: row !== undefined ? b.rows[row]?.USUBJID : undefined, msg })
  const meta = varsOf(d, ver)
  for (const m of meta) {
    if (m.core === 'Req' && !b.vars.includes(m.name)) add('TRN-001', m.name, `${m.name} (Required) is not in ${d}`)
    if (m.core === 'Exp' && !b.vars.includes(m.name)) add('TRN-003', m.name, `${m.name} (Expected) is not in ${d}`)
  }
  const has = (v: string) => b.vars.includes(v)
  b.rows.forEach((r, i) => {
    for (const v of b.vars) {
      const m = metaOf(d, v, ver); const x = r[v] ?? ''
      if (m?.core === 'Req' && x === '') add('TRN-002', v, `${v} is null`, i)
      if (x === '') continue
      if (m?.ct && CT[m.ct] && !CT[m.ct].terms.some((t) => t.value === x)) add('TRN-004', v, `"${x}" is not in codelist ${m.ct}${CT[m.ct].extensible ? ' (extensible)' : ''}`, i, CT[m.ct].extensible ? 'Warning' : 'Error')
      if (/DTC$/.test(v) && !isIso8601(x)) add('TRN-005', v, `"${x}" is not ISO 8601`, i)
      if (m?.type === 'Num' && !isNum(x)) add('TRN-019', v, `"${x}" is not a number`, i)
    }
    if (has('DOMAIN') && r.DOMAIN !== d) add('TRN-007', 'DOMAIN', `DOMAIN is "${r.DOMAIN}"`, i)
    // Study day against the DM reference start.
    const dmRow = d === 'DM' ? r : dm?.rows.find((x) => x.USUBJID === r.USUBJID)
    for (const v of b.vars.filter((x) => /DY$/.test(x) && x !== 'VISITDY')) {
      const val = r[v]; if (!val) continue
      if (val === '0') { add('TRN-010', v, `${v} is 0`, i); continue }
      const dtc = r[v.replace(/DY$/, 'DTC')] ?? (v === 'DMDY' ? r.DMDTC : '')
      const ref = dmRow?.RFSTDTC ?? ''
      if (dtc && ref) { const exp = studyDay(dtc, ref); if (exp !== '' && String(exp) !== val) add('TRN-011', v, `${v} is ${val}; from ${dtc} and RFSTDTC ${ref} it is ${exp}`, i) }
    }
    if (d === 'DM') {
      if (has('ARMNRS')) {
        const armNull = has('ARMCD') && !r.ARMCD, actNull = has('ACTARMCD') && !r.ACTARMCD
        if ((armNull || actNull) !== !!r.ARMNRS) add('TRN-012', 'ARMNRS', r.ARMNRS ? `ARMNRS is "${r.ARMNRS}" but both arms are populated` : 'An arm is null but ARMNRS is null', i)
      }
      if (r.AGE && has('AGEU') && !r.AGEU) add('TRN-013', 'AGEU', 'AGEU is null', i)
      if ((r.DTHFL && r.DTHFL !== 'Y') || (r.DTHDTC && r.DTHFL !== 'Y')) add('TRN-014', 'DTHFL', `DTHFL is "${r.DTHFL ?? ''}"${r.DTHDTC ? ` with DTHDTC ${r.DTHDTC}` : ''}`, i)
      if (r.RFSTDTC && r.RFENDTC && r.RFSTDTC.slice(0, 10) > r.RFENDTC.slice(0, 10)) add('TRN-021', 'RFSTDTC', `RFSTDTC ${r.RFSTDTC} is after RFENDTC ${r.RFENDTC}`, i)
    }
    const p = d
    if (has(`${p}ORRES`) && r[`${p}ORRES`] && has(`${p}STRESC`) && !r[`${p}STRESC`]) add('TRN-015', `${p}STRESC`, `${p}ORRES is "${r[`${p}ORRES`]}" but ${p}STRESC is null`, i)
    if (r[`${p}STRESN`] && r[`${p}STRESC`] && Number(r[`${p}STRESN`]) !== Number(r[`${p}STRESC`])) add('TRN-016', `${p}STRESN`, `${p}STRESN ${r[`${p}STRESN`]} vs ${p}STRESC ${r[`${p}STRESC`]}`, i)
    if (r[`${p}STAT`] === 'NOT DONE') {
      if (r[`${p}ORRES`]) add('TRN-017', `${p}STAT`, `NOT DONE with ${p}ORRES "${r[`${p}ORRES`]}"`, i)
      else if (has(`${p}REASND`) && !r[`${p}REASND`]) add('TRN-017', `${p}REASND`, 'NOT DONE without a reason', i, 'Warning')
    }
    if (has(`${p}ORRESU`) && r[`${p}ORRES`] && !r[`${p}ORRESU`]) add('TRN-018', `${p}ORRESU`, `${p}ORRES "${r[`${p}ORRES`]}" has no unit`, i)
  })
  const seqVar = `${d}SEQ`
  if (has(seqVar)) {
    const seen = new Set<string>()
    b.rows.forEach((r, i) => { const k = `${r.USUBJID}|${r[seqVar]}`; if (seen.has(k)) add('TRN-006', seqVar, `${seqVar} ${r[seqVar]} repeats for ${r.USUBJID}`, i); seen.add(k) })
  }
  if (d === 'DM') { const seen = new Set<string>(); b.rows.forEach((r, i) => { if (seen.has(r.USUBJID)) add('TRN-008', 'USUBJID', `${r.USUBJID} has more than one DM record`, i); seen.add(r.USUBJID) }) }
  else if (dm && has('USUBJID')) { const ids = new Set(dm.rows.map((x) => x.USUBJID)); b.rows.forEach((r, i) => { if (r.USUBJID && !ids.has(r.USUBJID)) add('TRN-009', 'USUBJID', `${r.USUBJID} is not in DM`, i) }) }
  if (has(`${d}TESTCD`) && has(`${d}STRESU`)) {
    const units = new Map<string, Set<string>>()
    for (const r of b.rows) if (r[`${d}STRESU`]) (units.get(r[`${d}TESTCD`]) ?? units.set(r[`${d}TESTCD`], new Set()).get(r[`${d}TESTCD`])!).add(r[`${d}STRESU`])
    for (const [t, u] of units) if (u.size > 1) add('TRN-020', `${d}STRESU`, `${t} has standard units ${[...u].join(', ')}`)
  }
  return out
}
export const summarise = (f: Finding[]) => {
  const m = new Map<string, { rule: string; sev: Severity; variable: string; count: number; first: Finding }>()
  for (const x of f) { const k = `${x.rule}|${x.variable}|${x.sev}`; const e = m.get(k); if (e) e.count++; else m.set(k, { rule: x.rule, sev: x.sev, variable: x.variable, count: 1, first: x }) }
  return [...m.values()].sort((a, b) => (a.sev === b.sev ? a.rule.localeCompare(b.rule) : a.sev === 'Error' ? -1 : 1))
}
