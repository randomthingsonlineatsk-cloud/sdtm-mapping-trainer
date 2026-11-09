// The Traceability Graph: for one SDTM value, its path back to where it was collected. Raw
// source (CRF page or vendor file) → raw record and fields → the mapping rule (and the approved
// specification version it was programmed against) → the SDTM value → its define.xml origin →
// the validation findings on that record and variable. Reviewers ask for exactly this chain
// (traceability from the data back to the collection instruments, FDA Study Data Technical
// Conformance Guide); the engine already keeps a trace key on every record.

import type { Built, DomainSpec, OutRow, Rule } from './engine'
import { tokenize } from './expr'
import type { Version } from './standards'
import { metaOf } from './standards'
import { FORM_INFO, type Row } from './seed'
import { originOf, describe } from './spec'
import { acrfPageOf, type LaidPage } from './acrf'
import type { Finding } from './conformance'
import type { Plan } from './plan'

export interface TraceNode { id: 'source' | 'raw' | 'rule' | 'spec' | 'value' | 'define' | 'findings'; title: string; lines: string[]; tone: 'blue' | 'green' | 'amber' | 'red' | 'grey' | 'purple' }
export interface Trace { domain: string; variable: string; value: string; nodes: TraceNode[]; edges: [TraceNode['id'], TraceNode['id'], string][]; broken: string[] }

export function parseTrace(t: string): { form: string; id: string; field?: string; part?: number } {
  const [main, again] = t.split('~')
  const [form, id, field] = main.split(':')
  return { form, id, field: field?.split('#')[0] || undefined, part: again ? Number(again) : undefined }
}

// The raw fields a rule reads: named in copy/recode, or identifiers in an expression that are
// fields of the raw form (functions and the transposition pseudo-fields resolved separately).
export function fieldsRead(rule: Rule | undefined, rawFields: string[], testField?: string): string[] {
  if (!rule) return []
  const raw = new Set(rawFields)
  const pseudo = (f: string) => (f === '__RESULT' || f === '__FIELD') && testField ? [testField] : f === '__UNIT' || f === '__TESTCD' ? [] : [f]
  if (rule.kind === 'copy' || rule.kind === 'recode') return pseudo(rule.field).filter((f) => raw.has(f) || f === testField)
  if (rule.kind === 'expr') {
    let toks: ReturnType<typeof tokenize> = []
    try { toks = tokenize(rule.expr) } catch { return [] }
    const out = new Set<string>()
    toks.forEach((t, i) => { if (t.t === 'id' && toks[i + 1]?.t !== 'lp') for (const f of pseudo(t.v)) if (raw.has(f) || f === testField) out.add(f) })
    return [...out]
  }
  if (rule.kind === 'lobxfl') return []
  return []
}

export interface TraceInput {
  domain: string; built: Built; rowIndex: number; variable: string
  spec: DomainSpec; forms: Record<string, Row[]>; version: Version
  laid: LaidPage[]; specs: Record<string, DomainSpec>; findings: Finding[]; plan?: Plan
  formInfo?: Record<string, { name: string; source: string }>
}

export function traceValue(inp: TraceInput): Trace {
  const { built, rowIndex, variable: v, spec } = inp
  const row: OutRow = built.rows[rowIndex]
  const t = parseTrace(row.__trace)
  const partIdx = [spec.source, ...(spec.parts ?? []).map((x) => x.source)].findIndex((s, i) => s === t.form && (t.part ? i === t.part - 1 : true))
  const part = partIdx <= 0 ? { source: spec.source, rules: spec.rules, transpose: spec.transpose } : spec.parts![partIdx - 1]
  const rule = part.rules[v]
  const src = inp.forms[t.form] ?? []
  const raw = src.find((r) => r.__id === t.id)
  const rawFields = Object.keys(src[0] ?? {}).filter((f) => f !== '__id')
  const read = fieldsRead(rule, rawFields, t.field)
  const info = (inp.formInfo ?? FORM_INFO)[t.form]
  const broken: string[] = []
  const pages = acrfPageOf(inp.laid, inp.specs, inp.domain, v)
  const value = row[v] ?? ''

  const nodes: TraceNode[] = []
  const collected = info?.source === 'EDC' || !info
  nodes.push({ id: 'source', title: collected ? 'CRF (collection instrument)' : `${info?.source === 'Vendor' ? 'Vendor file' : `${info?.source} file`}`, tone: 'blue', lines: [
    `${t.form}${info ? ` · ${info.name}` : ''}`,
    collected ? (pages.length ? `Annotated CRF page${pages.length > 1 ? 's' : ''} ${pages.join(', ')}` : rule && rule.kind !== 'const' && rule.kind !== 'seq' ? 'Not annotated on the aCRF for this variable' : 'Not on the CRF') : 'External data: the data transfer agreement is the source document',
    ...(raw?.VISIT ? [`Visit: ${raw.VISIT}`] : []),
  ] })
  if (collected && !pages.length && rule && (rule.kind === 'copy' || rule.kind === 'recode' || (rule.kind === 'expr' && read.length))) broken.push('The variable comes from the CRF but no aCRF page annotates it: the reviewer cannot follow it to the page (annotate it on the aCRF tab).')
  nodes.push({ id: 'raw', title: 'Raw record', tone: raw ? 'blue' : 'red', lines: raw ? [
    `${t.form} row ${t.id}${raw.SUBJID ? ` · subject ${raw.SUBJID}` : ''}`,
    ...(read.length ? read.map((f) => `${f} = ${raw[f] === '' || raw[f] === undefined ? '(blank)' : `“${raw[f]}”`}`) : ['No raw field is read for this variable']),
    ...(t.field ? [`Test column: ${t.field}`] : []),
  ] : [`${t.form} row ${t.id} not found in the current transfer`] })
  if (!raw) broken.push('The raw record behind this SDTM record is not in the current data transfer.')
  nodes.push({ id: 'rule', title: 'Mapping rule (your program)', tone: rule ? 'green' : 'red', lines: rule ? [
    rule.kind === 'expr' ? 'Expression' : rule.kind === 'copy' ? 'Copy' : rule.kind === 'recode' ? 'Recode to CT' : rule.kind === 'const' ? 'Constant' : rule.kind === 'seq' ? 'Sequence' : 'Derived flag',
    describe(rule).length > 160 ? `${describe(rule).slice(0, 160)}…` : describe(rule),
    ...(partIdx > 0 ? [`Part ${partIdx + 1} of the mapping (${part.source})`] : []),
  ] : ['No rule for this variable'] })
  const planVer = inp.plan?.versions.at(-1)
  const planRow = planVer?.rows.find((r) => r.variable === v)
  nodes.push({ id: 'spec', title: 'Mapping specification', tone: planRow ? 'green' : inp.plan ? 'amber' : 'grey', lines: planVer ? [
    `Approved version ${planVer.version} (${planVer.utc.slice(0, 10)}), approved by ${planVer.approver}`,
    planRow ? `${planRow.origin || '(origin not set)'}${planRow.source ? ` · ${planRow.source}` : ''}${planRow.method ? ` · ${planRow.method.length > 90 ? `${planRow.method.slice(0, 90)}…` : planRow.method}` : ''}` : 'This variable is not in the approved specification',
  ] : inp.plan ? [`Specification ${inp.plan.status.toLowerCase()}, not yet approved`] : ['No written specification for this domain (Plan tab)'] })
  if (planVer && !planRow) broken.push('The program fills a variable the approved specification does not list.')
  const meta = metaOf(inp.domain, v, inp.version)
  nodes.push({ id: 'value', title: `${inp.domain}.${v}`, tone: 'purple', lines: [
    value === '' ? '(null)' : `“${value}”`,
    `${row.USUBJID ?? ''}${row[`${inp.domain}SEQ`] ? ` · ${inp.domain}SEQ ${row[`${inp.domain}SEQ`]}` : ''}`,
    ...(meta ? [`${meta.label}${meta.ct ? ` · codelist ${meta.ct}` : ''}`] : []),
  ] })
  const o = originOf(spec.rules[v] ?? rule, spec.source, rawFields)
  nodes.push({ id: 'define', title: 'define.xml origin', tone: 'green', lines: [
    `${o.origin}${o.source ? ` · ${o.source}` : ''}`,
    ...(o.origin === 'Collected' && pages.length ? [`def:PDFPageRef ${pages.join(' ')}`] : []),
    ...(o.origin === 'Derived' ? ['Method: the derivation above'] : []),
  ] })
  if (o.origin === 'Collected' && collected && !pages.length && rule?.kind !== 'const') broken.push('define.xml would list the origin as Collected with no CRF page reference.')
  const fs = inp.findings.filter((f) => f.row === rowIndex && (f.variable === v || f.variable.split(/[,/ ]+/).includes(v)))
  nodes.push({ id: 'findings', title: 'Validation findings', tone: fs.some((f) => f.sev === 'Reject' || f.sev === 'Error') ? 'red' : fs.length ? 'amber' : 'green', lines: fs.length ? fs.slice(0, 4).map((f) => `${f.rule} (${f.sev}): ${f.msg.length > 90 ? `${f.msg.slice(0, 90)}…` : f.msg}`) : ['None on this value'] })
  return {
    domain: inp.domain, variable: v, value, nodes, broken,
    edges: [['source', 'raw', 'recorded as'], ['raw', 'rule', read.length ? `reads ${read.join(', ')}` : 'reads no field'], ['spec', 'rule', 'programmed against'], ['rule', 'value', 'produces'], ['value', 'define', 'described in'], ['value', 'findings', 'checked by']],
  }
}

// Traceability coverage for a whole dataset: each variable traced on its first non-null record.
export function coverage(base: Omit<TraceInput, 'rowIndex' | 'variable'>): { variable: string; ok: boolean; why: string[] }[] {
  return base.spec.vars.map((v) => {
    const i = base.built.rows.findIndex((r) => (r[v] ?? '') !== '')
    if (i < 0) return { variable: v, ok: true, why: [] }
    const t = traceValue({ ...base, rowIndex: i, variable: v })
    return { variable: v, ok: t.broken.length === 0, why: t.broken }
  })
}
