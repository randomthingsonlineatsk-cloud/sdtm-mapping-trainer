// The mapping engine. A domain specification says which raw form drives the records, how a wide
// findings form is turned tall (one record per test), and how each SDTM variable is filled. The
// engine builds the dataset, keeps a trace from every output record back to its raw row, sorts
// it, numbers --SEQ and sets --LOBXFL. The same engine builds the hidden reference mappings, so
// learner and reference datasets line up record by record.

import { parse, evaluate, validate, fmt, isBlank, toNum, type Node, type Val } from './expr'
import { CT, decode, type Version } from './standards'
import { SITES, ARMS, VISITS, LAB_STANDARDS, CRITERIA, type Visit } from './study'
import type { Row } from './seed'
import { toIso, toIsoTime, anyDate, ISO_PARTIAL } from './rawdate'

export type Rule =
  | { kind: 'copy'; field: string }
  | { kind: 'const'; value: string }
  | { kind: 'recode'; field: string; table: Record<string, string> }
  | { kind: 'expr'; expr: string }
  | { kind: 'seq' }
  | { kind: 'lobxfl'; result: string; dtc: string; by: string }
export const RULE_LABEL: Record<Rule['kind'], string> = { copy: 'Copy a raw field', const: 'Assign a constant', recode: 'Recode raw values to CT', expr: 'Derive with an expression', seq: 'Sequence number (--SEQ)', lobxfl: 'Last observation before exposure flag' }

export interface TestMap { code: string; field: string; unit?: string; unitField?: string }
export interface Transpose { tests: TestMap[]; drop: string }
export interface SuppQual { qnam: string; qlabel: string; expr: string; qorig: 'Collected' | 'Derived' | 'Assigned'; qeval?: string }
// Further raw sources stacked into the same domain (DS from the disposition form, the consent
// form and the IRT file), each with its own rules for the same variables.
export interface Part { source: string; filter?: string; transpose?: Transpose; rules: Record<string, Rule>; supp?: SuppQual[] }
export interface DomainSpec { domain: string; source: string; filter?: string; transpose?: Transpose; vars: string[]; rules: Record<string, Rule>; sort: string[]; parts?: Part[]; supp?: SuppQual[] }

export type OutRow = Record<string, string> & { __trace: string; __subj: string }
export interface Built { domain: string; vars: string[]; rows: OutRow[]; errors: Record<string, { count: number; first: string }>; warnings: string[]; supp?: Built; labels?: Record<string, string>; origins?: Record<string, string> }

// ---------- the study context the functions read ----------
export interface StudyData { forms: Record<string, Row[]>; studyId: string; refDm?: Map<string, OutRow>; visits?: Visit[]; arms?: { code: string; name: string }[]; sites?: { id: string; iso: string }[] }
const UNSCHEDULED = new Set(['Unscheduled', 'UNS'])

const DATE = /^\d{4}-\d{2}-\d{2}$/
export const fullDate = (s: string) => DATE.test(s.slice(0, 10)) ? s.slice(0, 10) : ''
// Compare two ISO 8601 values: to the minute when both carry a time, otherwise by date.
export function cmpDtc(a: string, b: string): number {
  if (a.length > 10 && b.length > 10) return a.slice(0, 16) < b.slice(0, 16) ? -1 : a.slice(0, 16) > b.slice(0, 16) ? 1 : 0
  const x = a.slice(0, 10), y = b.slice(0, 10)
  return x < y ? -1 : x > y ? 1 : 0
}
export function studyDay(dtc: string, ref: string): number | '' {
  const d = fullDate(dtc), r = fullDate(ref)
  if (!d || !r) return ''
  const diff = Math.round((Date.parse(d + 'T00:00:00Z') - Date.parse(r + 'T00:00:00Z')) / 86400000)
  return diff >= 0 ? diff + 1 : diff
}
const FACTOR: Record<string, Record<string, number>> = { LB: { kg: 0.45359237 }, lb: { kg: 0.45359237 }, in: { cm: 2.54 }, kg: { LB: 1 / 0.45359237 }, cm: { in: 1 / 2.54 } }
export const STD_UNIT: Record<string, string> = { SYSBP: 'mmHg', DIABP: 'mmHg', PULSE: 'beats/min', WEIGHT: 'kg', HEIGHT: 'cm', TEMP: 'C', BMI: 'kg/m2' }

export function studyFns(data: StudyData, row: Record<string, string>, subj: string): Record<string, (...a: Val[]) => Val> {
  const S = (x: Val) => (isBlank(x) ? '' : fmt(x))
  const mine = (form: string) => (data.forms[form] ?? []).filter((r) => r.SUBJID === subj)
  const agg = (vals: string[], how: string) => {
    const v = vals.filter((x) => x !== '')
    if (!v.length) return ''
    if (how === 'last') return v[v.length - 1]
    if (how === 'min' || how === 'max') {
      // Numbers compare as numbers and raw dates (10-MAR-2026, 20260310) as dates; the raw value is returned.
      const nums = v.every((x) => toNum(x) !== null && !/^\d{8}$/.test(x)), dates = !nums && v.every((x) => anyDate(x) !== null)
      const s = nums ? [...v].sort((a, b) => Number(a) - Number(b)) : dates ? [...v].sort((a, b) => anyDate(a)!.localeCompare(anyDate(b)!)) : [...v].sort()
      return how === 'min' ? s[0] : s[s.length - 1]
    }
    if (how === 'count') return String(v.length)
    return v[0]
  }
  const dm = (v: Val) => data.refDm?.get(subj)?.[S(v)] ?? ''
  const visitByRaw = (x: string) => (data.visits ?? VISITS).find((v) => v.raw === x)
  const visitInfo = (visit: string, rawDate: string): { num: number | ''; name: string } => {
    const v = visitByRaw(visit)
    if (v) return { num: v.num, name: v.name }
    const date = anyDate(rawDate) ?? ''
    if (!UNSCHEDULED.has(visit) || !DATE.test(date)) return { num: '', name: '' }
    const sv = mine('SV').map((r) => ({ r, d: anyDate(r.VISDAT) ?? '' })).filter((x) => DATE.test(x.d)).sort((a, b) => a.d.localeCompare(b.d) || a.r.__id.localeCompare(b.r.__id))
    let base = 0, k = 0
    for (const { r, d } of sv) {
      if (d > date) break
      const sch = visitByRaw(r.VISIT)
      if (sch) { base = sch.num; k = 0 } else if (UNSCHEDULED.has(r.VISIT)) k++
    }
    const num = Math.round((base + k / 100) * 100) / 100
    return { num, name: `UNSCHEDULED ${num.toFixed(2)}` }
  }
  return {
    iso: (d, t) => {
      const ds = S(d), ts = S(t); if (!ds) return ''
      if (!ISO_PARTIAL.test(ds)) throw new Error(`“${ds}” is not ISO 8601. Convert it with dtc(field, '${/^\d{8}$/.test(ds) ? 'YYYYMMDD' : 'DD-MMM-YYYY'}')`)
      return DATE.test(ds) && /^\d{2}:\d{2}(:\d{2})?$/.test(ts) ? `${ds}T${ts}` : ds
    },
    // The raw date in the given informat to ISO 8601, keeping a partial date partial; a time is
    // added only to a complete date.
    dtc: (d, informat, t) => {
      const ds = toIso(S(d), S(informat) || 'DD-MMM-YYYY'); if (!ds) return ''
      const ts = toIsoTime(S(t))
      return ts && DATE.test(ds) ? `${ds}T${ts}` : ds
    },
    subj: (form, field, how) => agg(mine(S(form)).map((r) => r[S(field)] ?? ''), S(how) || 'first'),
    subjwhere: (form, field, wf, wv, how) => agg(mine(S(form)).filter((r) => (r[S(wf)] ?? '') === S(wv)).map((r) => r[S(field)] ?? ''), S(how) || 'first'),
    irt: (field) => mine('IRT')[0]?.[S(field)] ?? '',
    country: (site) => (data.sites ?? SITES).find((s) => s.id === S(site))?.iso ?? '',
    // The protocol's eligibility criteria (as in TI): ti('IN02', 'text') or ti('IN02', 'cat').
    ti: (code, what) => { const c = CRITERIA.find((x) => x.code === S(code)); return !c ? '' : S(what) === 'cat' ? c.cat : c.text },
    armname: (code) => (data.arms ?? ARMS).find((a) => a.code === S(code))?.name ?? '',
    // Hours as an ISO 8601 duration: 2 is PT2H, 0.5 is PT30M, -0.25 is -PT15M, 1.5 is PT1H30M.
    isodur: (hours) => {
      const n = toNum(hours); if (n === null) return ''
      const m = Math.round(Math.abs(n) * 60), h = Math.floor(m / 60), mm = m % 60
      return `${n < 0 ? '-' : ''}PT${h ? `${h}H` : ''}${mm || !h ? `${mm}M` : ''}`.replace('PT0M', 'PT0H')
    },
    // Hours between two ISO 8601 date/times (b minus a), to 2 decimals.
    hours: (a, b) => {
      const t = (x: string) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(x) ? Date.parse(`${x}${x.length === 16 ? ':00' : ''}Z`) : NaN)
      const x = t(S(a)), y = t(S(b))
      return Number.isNaN(x) || Number.isNaN(y) ? '' : Math.round(((y - x) / 3600000) * 100) / 100
    },
    age: (birth, ref) => {
      const b = fullDate(anyDate(S(birth)) ?? ''), r = fullDate(anyDate(S(ref)) ?? ''); if (!b || !r) return ''
      let a = Number(r.slice(0, 4)) - Number(b.slice(0, 4))
      if (r.slice(5) < b.slice(5)) a--
      return a
    },
    dm,
    studyday: (dtc, ref) => studyDay(S(dtc), ref === undefined ? dm('RFSTDTC') : S(ref)),
    epoch: (dtc) => {
      const d = S(dtc); if (!fullDate(d)) return ''
      const st = dm('RFXSTDTC'), en = dm('RFXENDTC')
      if (!st) return 'SCREENING'
      if (cmpDtc(d, st) < 0) return 'SCREENING'
      return !en || d.slice(0, 10) <= en.slice(0, 10) ? 'TREATMENT' : 'FOLLOW-UP'
    },
    visitnum: (visit, date) => visitInfo(S(visit), S(date)).num,
    visitname: (visit, date) => visitInfo(S(visit), S(date)).name,
    visitdy: (visit) => visitByRaw(S(visit))?.day ?? '',
    planned: (testcd) => !!visitByRaw(row.VISIT ?? '')?.vs.includes(S(testcd)),
    convert: (value, from, to, dec) => {
      const n = toNum(value); if (n === null) return ''
      const f = S(from), t = S(to)
      if (f === t) return n
      const k = FACTOR[f]?.[t]; if (k === undefined) throw new Error(`No conversion from ${f || '(blank)'} to ${t || '(blank)'}`)
      const d = toNum(dec) ?? 1
      return Math.round(n * k * 10 ** d) / 10 ** d
    },
    stdunit: (testcd) => STD_UNIT[S(testcd)] ?? '',
    ctdecode: (list, value) => decode(S(list), S(value)),
    lab: (code, what, unit) => {
      const t = LAB_STANDARDS.find((x) => x.vendor === S(code)); if (!t) return ''
      const w = S(what) || 'testcd'
      if (w === 'factor') {
        // With the reported unit, the factor from that unit: 1 when it is already the standard unit.
        const u = S(unit).toLowerCase(); if (!u) return t.factor
        if (u === t.stdunit.toLowerCase()) return 1
        if (u === t.conv.toLowerCase()) return t.factor
        throw new Error(`No conversion for ${S(code)} from ${S(unit)} in the lab standards`)
      }
      return w === 'decimals' ? t.decimals : w === 'stdunit' ? t.stdunit : w === 'conv' ? t.conv : w === 'spec' ? t.spec : t.testcd
    },
    inct: (list, value) => !!CT[S(list)]?.terms.some((t) => t.value === S(value)),
  }
}
export const FN_HELP: { sig: string; what: string }[] = [
  { sig: "concat(a, b, …)", what: 'Joins text: concat(\'GLV-12-301-\', SUBJID)' },
  { sig: "dtc(date, informat, time)", what: "A raw date to ISO 8601. informat: 'DD-MMM-YYYY' (EDC: 10-MAR-2026, UN-MAR-2026, UN-UNK-2019), 'YYYYMMDD' (lab) or 'ISO 8601'. Unknown parts are dropped, not imputed: UN-MAR-2026 gives 2026-03. time (HH:MM or HHMM) is added to complete dates only." },
  { sig: 'iso(date, time)', what: 'Joins a date that is already ISO 8601 (the IRT file) with an optional time: 2026-03-10T09:00.' },
  { sig: "upper(x), lower(x), trim(x), substr(x, start, n), replace(x, a, b)", what: 'Text functions' },
  { sig: "wrap(x, width, n)", what: "The nth line of x cut at spaces into lines of at most width characters: wrap(COMMENT, 200, 1) for COVAL, wrap(COMMENT, 200, 2) for COVAL1" },
  { sig: "part(x, sep, n)", what: "The nth piece of x split at sep, trimmed: part('White; Asian', ';', 2) is Asian. Blank when there is no nth piece." },
  { sig: "if(condition, a, b)", what: 'a when the condition is true, otherwise b' },
  { sig: 'coalesce(a, b, …)', what: 'The first value that is not blank' },
  { sig: "contains(x, 'text'), present(x), isblank(x), x in ('A', 'B')", what: 'Tests' },
  { sig: "subj(form, field, how)", what: "One value per subject from another raw form; how = 'first', 'last', 'min', 'max' or 'count'. subj('EX', 'EXSTDAT', 'min')" },
  { sig: "subjwhere(form, field, whereField, whereValue, how)", what: "As subj, only rows where whereField equals whereValue. subjwhere('DS', 'DSSTDAT', 'DSDECOD', 'Death', 'first')" },
  { sig: "irt(field)", what: "The subject's value in the IRT randomisation file: irt('RANDARM')" },
  { sig: "ti(code, what)", what: "A protocol eligibility criterion, as in TI: ti('IN02', 'text') is its text, ti('IN02', 'cat') INCLUSION or EXCLUSION" },
  { sig: 'armname(code), country(siteid)', what: 'Arm description from TA; ISO 3166 alpha-3 country of a site' },
  { sig: 'isodur(hours), hours(dtc1, dtc2)', what: "Hours as an ISO 8601 duration (isodur(0.5) is PT30M, isodur(-0.25) is -PT15M, isodur(24) is PT24H); hours from one ISO date/time to another" },
  { sig: 'age(birthdate, refdate)', what: 'Completed years between two full dates' },
  { sig: "dm(var)", what: "A variable of this subject's record in the study's reference DM: dm('RFSTDTC')" },
  { sig: 'studyday(dtc, ref)', what: 'Study day of dtc relative to ref (default: RFSTDTC). No day 0; blank for partial dates.' },
  { sig: 'epoch(dtc)', what: 'SCREENING, TREATMENT or FOLLOW-UP from RFXSTDTC and RFXENDTC, as the conventions define' },
  { sig: 'visitnum(VISIT, date), visitname(VISIT, date), visitdy(VISIT)', what: 'TV visit number and name; unscheduled visits get the last scheduled number + .01' },
  { sig: 'planned(testcd)', what: 'Is this test planned at the row’s visit?' },
  { sig: 'convert(value, fromUnit, toUnit, decimals)', what: "Unit conversion (LB to kg, in to cm). Same unit returns the number unchanged." },
  { sig: 'stdunit(testcd), ctdecode(codelist, value), inct(codelist, value)', what: 'Standard unit of a vital sign; CT decode (ctdecode(\'VSTESTCD\', \'SYSBP\') is Systolic Blood Pressure); is a value in a codelist' },
  { sig: 'num(x), str(x), round(x, d), min(…), max(…)', what: 'Numbers and conversions' },
  { sig: 'isdup(a, b, …)', what: 'True when an earlier row of this raw form had the same values: use in a filter to drop resent records, e.g. not isdup(ACCSNUM, TESTCODE)' },
  { sig: 'lab(code, what, unit)', what: "Lab test facts for a vendor test code: lab('FPG', 'testcd') is GLUC; what = 'testcd', 'stdunit', 'conv', 'factor', 'decimals'. lab(TESTCODE, 'factor', UNITS) is the factor from the unit the lab reported: 1 when it is already the standard unit, an error for a unit the standards do not know." },
]
export const STUDY_FN_NAMES = [...Object.keys(studyFns({ forms: {}, studyId: '' }, {}, '')), 'isdup']
export const PSEUDO = ['__TESTCD', '__RESULT', '__UNIT', '__FIELD']

// ---------- building ----------
const parsed = new Map<string, Node>()
const ast = (src: string) => { let n = parsed.get(src); if (!n) { n = parse(src); parsed.set(src, n) } return n }
export function ruleError(rule: Rule, fields: string[]): string {
  if (rule.kind === 'expr') return rule.expr.trim() ? validate(rule.expr, fields, STUDY_FN_NAMES) : 'Write an expression.'
  if ((rule.kind === 'copy' || rule.kind === 'recode') && !fields.includes(rule.field)) return `Unknown field ${rule.field || '(none)'}`
  return ''
}
const numericSort = (a: string, b: string) => { const x = Number(a), y = Number(b); return a !== '' && b !== '' && !Number.isNaN(x) && !Number.isNaN(y) ? x - y : a.localeCompare(b) }

export function build(spec: DomainSpec, data: StudyData, ver: Version = '3.4'): Built {
  const errors: Built['errors'] = {}
  const warnings: string[] = []
  const fail = (v: string, msg: string) => { const e = (errors[v] ??= { count: 0, first: msg }); e.count++ }
  const rows: OutRow[] = []
  const supp: { row: OutRow; q: SuppQual; value: string }[] = []
  const parts: Part[] = [{ source: spec.source, filter: spec.filter, transpose: spec.transpose, rules: spec.rules }, ...(spec.parts ?? [])]
  for (const [pi, part] of parts.entries()) {
    const label = pi === 0 ? '' : `part ${pi + 1}: `
    const pfail = (v: string, msg: string) => fail(v, label + msg)
    const src = data.forms[part.source] ?? []
    if (!src.length) warnings.push(`The raw form ${part.source} has no rows.`)
    const pspec: DomainSpec = { ...spec, rules: part.rules, transpose: part.transpose }
    const order = evalOrder(pspec, new Set([...Object.keys(src[0] ?? {}), ...(part.transpose ? PSEUDO : [])]))
    const firstOf = new Map<string, string>()
    for (const r of src) {
      const subj = r.SUBJID ?? ''
      const fns = studyFns(data, r, subj)
      // isdup(a, b, …): true when an earlier row of this form had the same values (a resent record).
      fns.isdup = (...xs) => { const k = xs.map((x) => fmt(x)).join('\u0001'); const id = firstOf.get(k); if (id === undefined) { firstOf.set(k, r.__id); return false } return id !== r.__id }
      const evalIn = (expr: string, values: Record<string, string>, out: Record<string, string>) => evaluate(ast(expr), { get: (n) => (Object.hasOwn(values, n) ? values[n] : out[n] ?? ''), fn: fns })
      if (part.filter?.trim()) { try { if (evalIn(part.filter, r, {}) !== true) continue } catch (e) { pfail('(filter)', (e as Error).message); continue } }
      const variants: { values: Record<string, string>; trace: string }[] = []
      if (part.transpose) {
        for (const t of part.transpose.tests) {
          const values = { ...r, __TESTCD: t.code, __FIELD: t.field, __RESULT: r[t.field] ?? '', __UNIT: t.unitField ? r[t.unitField] ?? '' : t.unit ?? '' }
          try { if (part.transpose.drop.trim() && evalIn(part.transpose.drop, values, {}) === true) continue } catch (e) { pfail('(drop)', (e as Error).message); continue }
          variants.push({ values, trace: `${part.source}:${r.__id}:${t.field}` })
        }
      } else variants.push({ values: r, trace: `${part.source}:${r.__id}` })
      for (const { values, trace } of variants) {
        const out: OutRow = { __trace: trace, __subj: subj } as OutRow
        for (const v of order) {
          const rule = part.rules[v]
          if (!rule || rule.kind === 'seq' || rule.kind === 'lobxfl' || (rule.kind === 'expr' && !rule.expr.trim()) || (rule.kind === 'copy' && !rule.field)) { out[v] = ''; continue }
          try {
            let val: Val = ''
            if (rule.kind === 'copy') val = values[rule.field] ?? ''
            else if (rule.kind === 'const') val = rule.value
            else if (rule.kind === 'recode') { const raw = values[rule.field] ?? ''; val = raw === '' ? '' : rule.table[raw] ?? raw; if (raw !== '' && rule.table[raw] === undefined) pfail(v, `No recode for "${raw}"`) }
            else val = evalIn(rule.expr, values, out)
            out[v] = typeof val === 'boolean' ? (val ? 'Y' : '') : fmt(val)
          } catch (e) { out[v] = ''; pfail(v, (e as Error).message) }
        }
        for (const q of (pi === 0 ? spec.supp ?? [] : part.supp ?? [])) {
          if (!q.expr.trim()) continue
          try { const x = evalIn(q.expr, values, out); const val = typeof x === 'boolean' ? (x ? 'Y' : '') : fmt(x); if (val !== '') supp.push({ row: out, q, value: val }) } catch (e) { fail(`SUPP ${q.qnam}`, (e as Error).message) }
        }
        rows.push(out)
      }
    }
  }
  // Sort, then sequence numbers and the pre-exposure flag.
  const keys = spec.sort.filter((k) => spec.vars.includes(k))
  rows.sort((a, b) => { for (const k of keys) { const c = numericSort(a[k] ?? '', b[k] ?? ''); if (c) return c } return a.__trace.localeCompare(b.__trace) })
  for (const v of spec.vars) {
    const rule = spec.rules[v]
    if (rule?.kind === 'seq') {
      const n = new Map<string, number>()
      for (const r of rows) { const k = r.USUBJID ?? r.__subj; const i = (n.get(k) ?? 0) + 1; n.set(k, i); r[v] = String(i) }
    }
    if (rule?.kind === 'lobxfl') {
      if (!spec.vars.includes(rule.result) || !spec.vars.includes(rule.dtc)) { fail(v, `Needs ${rule.result} and ${rule.dtc} in the dataset`); continue }
      const best = new Map<string, OutRow>()
      for (const r of rows) {
        const st = data.refDm?.get(r.__subj)?.RFXSTDTC ?? ''
        const res = r[rule.result] ?? '', dtc = r[rule.dtc] ?? ''
        if (!st || res === '' || !dtc || cmpDtc(dtc, st) > 0) continue
        const k = `${r.__subj}|${rule.by ? r[rule.by] ?? '' : ''}`
        const cur = best.get(k)
        if (!cur || cmpDtc(dtc, cur[rule.dtc]) >= 0) best.set(k, r)
      }
      const flagged = new Set(best.values())
      for (const r of rows) r[v] = flagged.has(r) ? 'Y' : ''
    }
  }
  const out: Built = { domain: spec.domain, vars: spec.vars, rows, errors, warnings }
  if (spec.supp?.length || spec.parts?.some((p) => p.supp?.length)) out.supp = ver === '3.4' ? suppDataset(spec, supp) : nsDataset(spec, supp)
  return out
}

// Supplemental qualifiers: one SUPP-- record per parent record and qualifier that has a value.
// Subject-level domains (DM) have no --SEQ, so IDVAR and IDVARVAL are null.
export const SUPP_VARS = ['STUDYID', 'RDOMAIN', 'USUBJID', 'IDVAR', 'IDVARVAL', 'QNAM', 'QLABEL', 'QVAL', 'QORIG', 'QEVAL']
function suppDataset(spec: DomainSpec, items: { row: OutRow; q: SuppQual; value: string }[]): Built {
  const seq = `${spec.domain}SEQ`
  const idvar = spec.vars.includes(seq) ? seq : ''
  const rows = items.map(({ row, q, value }, i) => ({ __trace: `${row.__trace}#${q.qnam}`, __subj: row.__subj, __i: String(i), STUDYID: row.STUDYID ?? '', RDOMAIN: spec.domain, USUBJID: row.USUBJID ?? '', IDVAR: idvar, IDVARVAL: idvar ? row[seq] ?? '' : '', QNAM: q.qnam, QLABEL: q.qlabel, QVAL: value, QORIG: q.qorig, QEVAL: q.qeval ?? '' } as OutRow))
  rows.sort((a, b) => a.USUBJID.localeCompare(b.USUBJID) || numericSort(a.IDVARVAL, b.IDVARVAL) || a.QNAM.localeCompare(b.QNAM))
  return { domain: `SUPP${spec.domain}`, vars: SUPP_VARS, rows, errors: {}, warnings: [] }
}

// SDTMIG v4.0 draft: NS-- holds the same values horizontally, one record per parent record that
// has at least one non-standard value. IDVAR is --SEQ and IDVARVLN its numeric value, except in
// NSDM (one record per subject), where both are null. Each non-standard variable is a column,
// named by its QNAM; its label and origin go to define.xml rather than into the data.
export const NS_KEYS = ['STUDYID', 'RDOMAIN', 'USUBJID', 'IDVAR', 'IDVARVLN']
function nsDataset(spec: DomainSpec, items: { row: OutRow; q: SuppQual; value: string }[]): Built {
  const seq = `${spec.domain}SEQ`
  const idvar = spec.vars.includes(seq) ? seq : ''
  const quals = [...(spec.supp ?? []), ...(spec.parts ?? []).flatMap((p) => p.supp ?? [])].filter((q, i, a) => q.qnam && a.findIndex((x) => x.qnam === q.qnam) === i)
  const names = quals.map((q) => q.qnam)
  const byParent = new Map<OutRow, OutRow>()
  for (const { row, q, value } of items) {
    let r = byParent.get(row)
    if (!r) { r = { __trace: row.__trace, __subj: row.__subj, STUDYID: row.STUDYID ?? '', RDOMAIN: spec.domain, USUBJID: row.USUBJID ?? '', IDVAR: idvar, IDVARVLN: idvar ? row[seq] ?? '' : '', ...Object.fromEntries(names.map((n) => [n, ''])) } as OutRow; byParent.set(row, r) }
    r[q.qnam] = value
  }
  const rows = [...byParent.values()].sort((a, b) => a.USUBJID.localeCompare(b.USUBJID) || numericSort(a.IDVARVLN, b.IDVARVLN))
  return { domain: `NS${spec.domain}`, vars: [...NS_KEYS, ...names], rows, errors: {}, warnings: [], labels: Object.fromEntries(quals.map((q) => [q.qnam, q.qlabel])), origins: Object.fromEntries(quals.map((q) => [q.qnam, q.qorig])) }
}

// Rules run in an order where a variable is derived before any expression that uses it
// (EPOCH = epoch(VSDTC) comes before VSDTC in the IG order). A cycle keeps the IG order.
function refsOf(n: Node, out: Set<string>) {
  if (n.k === 'var') out.add(n.name)
  else if (n.k === 'call') n.args.forEach((a) => refsOf(a, out))
  else if (n.k === 'un') refsOf(n.a, out)
  else if (n.k === 'bin') { refsOf(n.a, out); refsOf(n.b, out) }
}
export function evalOrder(spec: DomainSpec, rawFields: Set<string>): string[] {
  const deps = new Map<string, string[]>()
  for (const v of spec.vars) {
    const r = spec.rules[v]; const set = new Set<string>()
    if (r?.kind === 'expr') { try { refsOf(ast(r.expr), set) } catch { /* reported when evaluated */ } }
    deps.set(v, [...set].filter((x) => x !== v && spec.vars.includes(x) && !rawFields.has(x)))
  }
  const done: string[] = [], state = new Map<string, 1 | 2>()
  const visit = (v: string): boolean => {
    if (state.get(v) === 2) return true
    if (state.get(v) === 1) return false
    state.set(v, 1)
    for (const d of deps.get(v) ?? []) if (!visit(d)) return false
    state.set(v, 2); done.push(v); return true
  }
  for (const v of spec.vars) if (!visit(v)) return spec.vars
  return done
}

// Fields an expression may use in a spec: the raw form's fields, the transposition's
// pseudo-fields, and the target variables (an expression may use a variable derived above it).
export function fieldsFor(spec: DomainSpec, rawFields: string[]): string[] {
  return [...rawFields, ...(spec.transpose ? PSEUDO : []), ...spec.vars]
}
export const visitList = VISITS
export const csv = (b: Built) => [b.vars.join(','), ...b.rows.map((r) => b.vars.map((v) => { const x = r[v] ?? ''; return /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x }).join(','))].join('\n')
