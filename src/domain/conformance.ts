// Conformance checks. Each rule is written for this trainer from the public descriptions of
// the CDISC conformance rules, the FDA validator and business rules and technical rejection
// criteria, and the PMDA validation rules. Three rule sets give each rule the severity it has
// in that context (CDISC: Error or Warning; FDA and PMDA: Reject, Error or Warning). The
// severities are assigned for training from the agencies' published categories; the current
// rule files are the authority. Phase 3 adds explaining findings in the reviewer's guide.

import type { Built } from './engine'
import { varsOf, CT, metaOf, type Version } from './standards'
import { studyDay, cmpDtc } from './engine'

export type Severity = 'Reject' | 'Error' | 'Warning'
// TS parameters the FDA Study Data Technical Conformance Guide expects (SSTDTC has its own
// rejection rule, TRN-030), and the parameters whose values must carry a code.
export const FDA_TS = ['TRT', 'REGID', 'OUTMSPRI', 'PCLAS', 'FCNTRY', 'ADAPT', 'DCUTDTC', 'DCUTDESC', 'INTMODEL', 'NARMS', 'STYPE', 'INTTYPE', 'SENDTC', 'ACTSUB', 'HLTSUBJI']
export const CODED_TS: Record<string, string[]> = { TRT: ['UNII'], COMPTRT: ['UNII'], CURTRT: ['UNII'], INDIC: ['SNOMED'], PCLAS: ['MED-RT', 'NDF-RT'] }
export type RuleSet = 'CDISC' | 'FDA' | 'PMDA'
export const RULE_SETS: { id: RuleSet; name: string; note: string }[] = [
  { id: 'CDISC', name: 'CDISC conformance', note: 'Conformance with the SDTM and SDTMIG as written (modelled on the CDISC conformance rules run by the open CDISC rules engine, CORE).' },
  { id: 'FDA', name: 'FDA', note: 'Modelled on the FDA validator rules, business rules and technical rejection criteria: a Reject stops the submission at the gateway.' },
  { id: 'PMDA', name: 'PMDA', note: 'Modelled on the PMDA validation rules: Reject findings must be fixed; Error findings must be fixed or explained in the reviewer’s guide.' },
]
export interface Rule { id: string; sev: Severity; text: string; basis: string; sets?: Partial<Record<RuleSet, Severity | null>> }
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
  { id: 'TRN-030', sev: 'Error', text: 'TS has no Study Start Date (SSTDTC)', basis: 'FDA technical rejection criteria and Study Data Technical Conformance Guide: TS with SSTDTC', sets: { FDA: 'Reject', PMDA: 'Error' } },
  { id: 'TRN-031', sev: 'Error', text: 'TS has no SDTM or SDTMIG version (SDTMVER, SDTIGVER)', basis: 'Study Data Technical Conformance Guide: TS parameters' },
  { id: 'TRN-035', sev: 'Warning', text: 'TS lacks a parameter FDA expects (TRT, REGID, OUTMSPRI, PCLAS, FCNTRY, ADAPT, DCUTDTC, DCUTDESC, INTMODEL, NARMS, STYPE, INTTYPE, SENDTC, ACTSUB, HLTSUBJI)', basis: 'Study Data Technical Conformance Guide: trial summary parameters; FDA business rules', sets: { FDA: 'Error' } },
  { id: 'TRN-036', sev: 'Warning', text: 'A TS value that must be coded has no code: TRT, COMPTRT and CURTRT with an FDA SRS UNII, INDIC with a SNOMED CT concept, PCLAS with a MED-RT class (TSVALCD and TSVCDREF)', basis: 'Study Data Technical Conformance Guide: coded TS values; FDA validator rules', sets: { FDA: 'Error' } },
  { id: 'TRN-037', sev: 'Error', text: 'TS: TSVALNF must be populated exactly when TSVAL is null', basis: 'SDTMIG TS assumptions: null flavors (ISO 21090)' },
  { id: 'TRN-038', sev: 'Error', text: 'TS value in the wrong format: SSTDTC, SENDTC and DCUTDTC must be ISO 8601; NARMS, PLANSUB and ACTSUB numbers', basis: 'SDTMIG TS; FDA validator rules' },
  { id: 'TRN-039', sev: 'Warning', text: 'TS: an add-on study (ADDON = Y) has no current treatment (CURTRT)', basis: 'FDA validator rules: CURTRT when ADDON is Y', sets: { FDA: 'Error' } },
  { id: 'TRN-032', sev: 'Error', text: 'ARMCD or ACTARMCD in DM is not an arm in TA', basis: 'SDTMIG: arms in DM come from TA' },
  { id: 'TRN-033', sev: 'Warning', text: 'A planned VISITNUM is not in TV', basis: 'SDTMIG: scheduled visits are defined in TV' },
  { id: 'TRN-034', sev: 'Error', text: 'EPOCH value is not an epoch in TA', basis: 'SDTMIG: EPOCH values come from TA' },
  { id: 'TRN-040', sev: 'Warning', text: 'AEBODSYS differs from AESOC', basis: 'SDTMIG AE: AEBODSYS is the primary system organ class' },
  { id: 'TRN-041', sev: 'Error', text: 'Start date/time is after end date/time', basis: 'SDTMIG: --STDTC on or before --ENDTC' },
  { id: 'TRN-042', sev: 'Warning', text: 'AESER is Y but no seriousness criterion is Y', basis: 'SDTMIG AE: a serious event has at least one criterion' },
  { id: 'TRN-043', sev: 'Warning', text: '--NRIND does not agree with the standard result and range', basis: 'SDTMIG findings: --NRIND against --STNRLO and --STNRHI' },
  { id: 'TRN-044', sev: 'Error', text: '--STRESC is numeric but --STRESN is null', basis: 'SDTMIG findings' },
  { id: 'TRN-045', sev: 'Error', text: 'Reference range lower limit above the upper limit', basis: 'SDTMIG findings' },
  { id: 'TRN-046', sev: 'Warning', text: 'EXDOSE above 0 for PLACEBO, or negative', basis: 'SDTMIG EX: placebo dose is 0' },
  { id: 'TRN-047', sev: 'Error', text: 'More than one disposition event for a subject in the same epoch', basis: 'SDTMIG DS: one disposition event per epoch' },
  { id: 'TRN-048', sev: 'Error', text: 'DSDECOD not in the codelist for its DSCAT (NCOMPLT for disposition events, PROTMLST for milestones)', basis: 'CDISC CT: DSDECOD codelist depends on DSCAT' },
  { id: 'TRN-049', sev: 'Error', text: 'SUPP-- or NS--: a qualifier or non-standard variable name that is not a valid SAS V5 name or reuses a standard variable, a label over 40 characters, or a record with no parent record', basis: 'SDTMIG v3.4 supplemental qualifiers; SDTMIG v4.0 draft non-standard variable datasets; SAS V5 transport limits' },
  { id: 'TRN-050', sev: 'Warning', text: 'Duplicate findings records (same subject, test, visit and date/time)', basis: 'FDA validator rules: duplicate records' },
  { id: 'TRN-052', sev: 'Error', text: 'Value longer than 200 characters', basis: 'SAS V5 transport format limit (Study Data Technical Conformance Guide)' },
  { id: 'TRN-053', sev: 'Error', text: '--TESTCD over 8 characters or not starting with a letter, or --TEST over 40 (IETEST over 200)', basis: 'SDTMIG findings; SAS V5 transport limits' },
]
export const severityIn = (rule: string, set: RuleSet): Severity | null => { const r = RULES.find((x) => x.id === rule); if (!r) return null; const s = r.sets?.[set]; return s === undefined ? r.sev : s }
const ISO = /^(\d{4})(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01])(T([01]\d|2[0-3])(:[0-5]\d(:[0-5]\d(\.\d+)?)?)?)?)?)?$/
export const isIso8601 = (s: string) => ISO.test(s)
const isNum = (s: string) => /^-?\d+(\.\d+)?(e-?\d+)?$/i.test(s)

export interface CheckContext { dm?: Built; ta?: Built; tv?: Built; ts?: Built; set?: RuleSet }
export function check(b: Built, ver: Version, dmOrCtx?: Built | CheckContext): Finding[] {
  const ctx: CheckContext = dmOrCtx && 'rows' in dmOrCtx ? { dm: dmOrCtx } : (dmOrCtx as CheckContext) ?? {}
  const dm = ctx.dm
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
      if (d === 'DS' && v === 'DSDECOD') { const list = r.DSCAT === 'PROTOCOL MILESTONE' ? 'PROTMLST' : 'NCOMPLT'; if (!CT[list].terms.some((t) => t.value === x)) add('TRN-048', v, `"${x}" is not in ${list} (DSCAT ${r.DSCAT || 'null'})`, i) }
      else if (m?.ct && CT[m.ct] && !CT[m.ct].terms.some((t) => t.value === x)) add('TRN-004', v, `"${x}" is not in codelist ${m.ct}${CT[m.ct].extensible ? ' (extensible)' : ''}`, i, CT[m.ct].extensible ? 'Warning' : 'Error')
      if (x.length > 200) add('TRN-052', v, `${v} is ${x.length} characters long`, i)
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
    const st = r[`${p}STDTC`], en = r[`${p}ENDTC`]
    if (st && en && isIso8601(st) && isIso8601(en) && cmpDtc(st, en) > 0) add('TRN-041', `${p}STDTC`, `${p}STDTC ${st} is after ${p}ENDTC ${en}`, i)
    if (d === 'AE') {
      if (has('AEBODSYS') && has('AESOC') && r.AEBODSYS !== r.AESOC) add('TRN-040', 'AEBODSYS', `AEBODSYS "${r.AEBODSYS}" vs AESOC "${r.AESOC}"`, i)
      const crit = ['AESDTH', 'AESHOSP', 'AESLIFE', 'AESDISAB', 'AESCONG', 'AESMIE'].filter((c) => has(c))
      if (r.AESER === 'Y' && crit.length && !crit.some((c) => r[c] === 'Y')) add('TRN-042', 'AESER', 'Serious, with no criterion ticked', i)
    }
    if (r[`${p}STRESC`] && isNum(r[`${p}STRESC`]) && has(`${p}STRESN`) && !r[`${p}STRESN`]) add('TRN-044', `${p}STRESN`, `${p}STRESC "${r[`${p}STRESC`]}" has no ${p}STRESN`, i)
    const lo = r[`${p}STNRLO`], hi = r[`${p}STNRHI`], sn = r[`${p}STRESN`]
    if (lo && hi && Number(lo) > Number(hi)) add('TRN-045', `${p}STNRLO`, `Range ${lo} to ${hi}`, i)
    if (has(`${p}NRIND`) && sn && lo && hi && isNum(sn)) {
      const n = Number(sn), exp = n < Number(lo) ? 'LOW' : n > Number(hi) ? 'HIGH' : 'NORMAL'
      if (r[`${p}NRIND`] && r[`${p}NRIND`] !== exp && !(exp !== 'NORMAL' && r[`${p}NRIND`] === 'ABNORMAL')) add('TRN-043', `${p}NRIND`, `${p}NRIND ${r[`${p}NRIND`]} for ${sn} in ${lo} to ${hi}`, i)
    }
    if (d === 'EX' && r.EXDOSE && (Number(r.EXDOSE) < 0 || (r.EXTRT === 'PLACEBO' && Number(r.EXDOSE) > 0))) add('TRN-046', 'EXDOSE', `EXDOSE ${r.EXDOSE} for ${r.EXTRT}`, i)
    if (has(`${d}TESTCD`) && r[`${d}TESTCD`] && (r[`${d}TESTCD`].length > 8 || !/^[A-Z]/.test(r[`${d}TESTCD`]))) add('TRN-053', `${d}TESTCD`, `"${r[`${d}TESTCD`]}"`, i)
    // IETEST is the exception: it holds the criterion text, up to 200 characters.
    if (has(`${d}TEST`) && (r[`${d}TEST`] ?? '').length > (d === 'IE' ? 200 : 40)) add('TRN-053', `${d}TEST`, `${d}TEST is ${r[`${d}TEST`].length} characters`, i)
    if (r.EPOCH && ctx.ta && !ctx.ta.rows.some((t) => t.EPOCH === r.EPOCH)) add('TRN-034', 'EPOCH', `EPOCH "${r.EPOCH}" is not in TA`, i)
    if (d === 'DM' && ctx.ta) for (const v of ['ARMCD', 'ACTARMCD']) if (r[v] && !ctx.ta.rows.some((t) => t.ARMCD === r[v])) add('TRN-032', v, `${v} "${r[v]}" is not in TA`, i)
    if (ctx.tv && r.VISITNUM && Number.isInteger(Number(r.VISITNUM)) && !ctx.tv.rows.some((t) => t.VISITNUM === r.VISITNUM)) add('TRN-033', 'VISITNUM', `VISITNUM ${r.VISITNUM} is not in TV`, i)
  })
  if (has(`${d}TESTCD`) && has(`${d}DTC`)) {
    const seen = new Map<string, number>()
    b.rows.forEach((r, i) => { if (r[`${d}STAT`] === 'NOT DONE') return; const k = `${r.USUBJID}|${r[`${d}TESTCD`]}|${r.VISITNUM ?? ''}|${r[`${d}DTC`]}`; if (seen.has(k)) add('TRN-050', `${d}TESTCD`, `${r[`${d}TESTCD`]} for ${r.USUBJID} at ${r[`${d}DTC`]} repeats record ${seen.get(k)! + 1}`, i); else seen.set(k, i) })
  }
  if (d === 'DS' && has('DSCAT') && has('EPOCH')) {
    const seen = new Set<string>()
    b.rows.forEach((r, i) => { if (r.DSCAT !== 'DISPOSITION EVENT') return; const k = `${r.USUBJID}|${r.EPOCH}`; if (seen.has(k)) add('TRN-047', 'DSDECOD', `Second disposition event for ${r.USUBJID} in ${r.EPOCH || 'null epoch'}`, i); seen.add(k) })
  }
  if (d === 'TS') {
    if (!b.rows.some((r) => r.TSPARMCD === 'SSTDTC' && r.TSVAL)) add('TRN-030', 'TSPARMCD', 'No TSPARMCD = SSTDTC with a value')
    for (const p2 of ['SDTMVER', 'SDTIGVER']) if (!b.rows.some((r) => r.TSPARMCD === p2 && r.TSVAL)) add('TRN-031', 'TSPARMCD', `No TSPARMCD = ${p2}`)
    const has1 = (code: string) => b.rows.some((r) => r.TSPARMCD === code && (r.TSVAL || r.TSVALNF))
    for (const code of FDA_TS) if (!has1(code)) add('TRN-035', 'TSPARMCD', `No TSPARMCD = ${code}`)
    b.rows.forEach((r, i) => {
      const need = CODED_TS[r.TSPARMCD]
      if (need && r.TSVAL && !(r.TSPARMCD === 'COMPTRT' && r.TSVAL === 'PLACEBO') && (!r.TSVALCD || !need.includes(r.TSVCDREF))) add('TRN-036', 'TSVALCD', `${r.TSPARMCD} “${r.TSVAL}” needs TSVALCD with TSVCDREF ${need.join(' or ')}`, i)
      if (!!r.TSVAL === !!r.TSVALNF) add('TRN-037', r.TSVAL ? 'TSVALNF' : 'TSVAL', r.TSVAL ? `${r.TSPARMCD} has both TSVAL and TSVALNF` : `${r.TSPARMCD} has neither TSVAL nor TSVALNF`, i)
      if (['SSTDTC', 'SENDTC', 'DCUTDTC'].includes(r.TSPARMCD) && r.TSVAL && !isIso8601(r.TSVAL)) add('TRN-038', 'TSVAL', `${r.TSPARMCD} “${r.TSVAL}” is not ISO 8601`, i)
      if (['NARMS', 'PLANSUB', 'ACTSUB'].includes(r.TSPARMCD) && r.TSVAL && !isNum(r.TSVAL)) add('TRN-038', 'TSVAL', `${r.TSPARMCD} “${r.TSVAL}” is not a number`, i)
    })
    if (b.rows.some((r) => r.TSPARMCD === 'ADDON' && r.TSVAL === 'Y') && !has1('CURTRT')) add('TRN-039', 'TSPARMCD', 'ADDON is Y but there is no CURTRT')
  }
  const seqVar = `${d}SEQ`
  if (has(seqVar)) {
    const seen = new Set<string>()
    const within = d === 'TS' ? 'TSPARMCD' : 'USUBJID'
    b.rows.forEach((r, i) => { const k = `${r[within]}|${r[seqVar]}`; if (seen.has(k)) add('TRN-006', seqVar, `${seqVar} ${r[seqVar]} repeats for ${r[within]}`, i); seen.add(k) })
  }
  if (d === 'DM') { const seen = new Set<string>(); b.rows.forEach((r, i) => { if (seen.has(r.USUBJID)) add('TRN-008', 'USUBJID', `${r.USUBJID} has more than one DM record`, i); seen.add(r.USUBJID) }) }
  else if (dm && has('USUBJID')) { const ids = new Set(dm.rows.map((x) => x.USUBJID)); b.rows.forEach((r, i) => { if (r.USUBJID && !ids.has(r.USUBJID)) add('TRN-009', 'USUBJID', `${r.USUBJID} is not in DM`, i) }) }
  if (has(`${d}TESTCD`) && has(`${d}STRESU`)) {
    const units = new Map<string, Set<string>>()
    for (const r of b.rows) if (r[`${d}STRESU`]) (units.get(r[`${d}TESTCD`]) ?? units.set(r[`${d}TESTCD`], new Set()).get(r[`${d}TESTCD`])!).add(r[`${d}STRESU`])
    for (const [t, u] of units) if (u.size > 1) add('TRN-020', `${d}STRESU`, `${t} has standard units ${[...u].join(', ')}`)
  }
  if (b.supp) {
    // SUPP-- (v3.4) holds one record per value; NS-- (v4.0 draft) one record per parent record with
    // the non-standard variables as columns. Names follow SAS V5 rules (8 characters, starting with a
    // letter) and labels are at most 40 characters; neither may reuse a standard variable of the
    // parent; every record must point to a parent record through --SEQ (DM: IDVAR null).
    const rd = b.supp.domain, ns = rd.startsWith('NS'), seq = `${d}SEQ`
    const std = new Set(varsOf(d, ver).map((x) => x.name))
    const parent = new Set(b.rows.map((r) => `${r.USUBJID}|${r[seq] ?? ''}`))
    const subj = new Set(b.rows.map((r) => r.USUBJID))
    const push = (variable: string, usubjid: string, msg: string) => out.push({ rule: 'TRN-049', sev: 'Error', domain: rd, variable, usubjid, msg })
    const nameBad = (n: string) => n.length > 8 || !/^[A-Z][A-Z0-9_]*$/.test(n)
    if (ns) {
      for (const v of b.supp.vars.slice(5)) {
        const label = b.supp.labels?.[v] ?? ''
        if (nameBad(v)) push(v, '', `Non-standard variable name "${v}" is not a valid SAS V5 name (8 characters, starting with a letter)`)
        else if (std.has(v)) push(v, '', `${v} is a standard ${d} variable: it belongs in ${d}, not ${rd}`)
        else if (!label) push(v, '', `${v} has no label`)
        else if (label.length > 40) push(v, '', `Label of ${v} is ${label.length} characters`)
      }
      b.supp.rows.forEach((r) => {
        if (d === 'DM') { if (r.IDVAR || r.IDVARVLN) push('IDVAR', r.USUBJID, 'IDVAR and IDVARVLN must be null in NSDM'); else if (!subj.has(r.USUBJID)) push('USUBJID', r.USUBJID, `${r.USUBJID} not in DM`) }
        else if (r.IDVAR !== seq) push('IDVAR', r.USUBJID, `IDVAR must be ${seq} in ${rd}, not "${r.IDVAR}"`)
        else if (!parent.has(`${r.USUBJID}|${r.IDVARVLN}`)) push('IDVARVLN', r.USUBJID, `${seq} ${r.IDVARVLN} not in ${d}`)
      })
    } else {
      const seen = new Set<string>()
      b.supp.rows.forEach((r) => {
        const once = (k: string, f: () => void) => { if (!seen.has(k)) { seen.add(k); f() } }
        if (nameBad(r.QNAM)) once(`n${r.QNAM}`, () => push('QNAM', r.USUBJID, `QNAM "${r.QNAM}" is not a valid SAS V5 name (8 characters, starting with a letter)`))
        else if (std.has(r.QNAM)) once(`s${r.QNAM}`, () => push('QNAM', r.USUBJID, `${r.QNAM} is a standard ${d} variable: it belongs in ${d}, not ${rd}`))
        else if (r.QLABEL.length > 40) once(`l${r.QNAM}`, () => push('QLABEL', r.USUBJID, `QLABEL of ${r.QNAM} is ${r.QLABEL.length} characters`))
        if (d === 'DM' ? !subj.has(r.USUBJID) : r.IDVAR && !parent.has(`${r.USUBJID}|${r.IDVARVAL}`)) push('IDVARVAL', r.USUBJID, d === 'DM' ? `${r.USUBJID} not in DM` : `${r.IDVAR} ${r.IDVARVAL} not in ${d}`)
      })
    }
  }
  if (ctx.set) { for (const f of out) { const sv = severityIn(f.rule, ctx.set); f.sev = f.rule === 'TRN-004' || f.rule === 'TRN-017' ? (sv === 'Reject' ? 'Reject' : f.sev) : sv ?? f.sev } }
  return out
}
export const summarise = (f: Finding[]) => {
  const m = new Map<string, { rule: string; sev: Severity; variable: string; count: number; first: Finding }>()
  for (const x of f) { const k = `${x.rule}|${x.variable}|${x.sev}`; const e = m.get(k); if (e) e.count++; else m.set(k, { rule: x.rule, sev: x.sev, variable: x.variable, count: 1, first: x }) }
  const rank = { Reject: 0, Error: 1, Warning: 2 }
  return [...m.values()].sort((a, b) => rank[a.sev] - rank[b.sev] || a.rule.localeCompare(b.rule))
}
