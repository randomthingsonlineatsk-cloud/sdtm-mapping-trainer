// The mapping specification, generated from the learner's rules: for every dataset variable its
// label, type, length, core status, origin (Define-XML 2.1 origin types), source and method.
// Value-level metadata lists each test of a wide-to-tall mapping.

import type { Built, DomainSpec, Rule } from './engine'
import { parse, type Node } from './expr'
import { metaOf, type Version } from './standards'
import { FORM_INFO } from './seed'

export interface SpecRow { dataset: string; variable: string; label: string; type: string; length: string; core: string; codelist: string; origin: string; source: string; method: string }
const COLLECTED_FNS = new Set(['iso', 'upper', 'trim', 'replace'])

function onlyRaw(n: Node, raw: Set<string>): boolean {
  if (n.k === 'lit') return true
  if (n.k === 'var') return raw.has(n.name)
  if (n.k === 'call') return COLLECTED_FNS.has(n.name.toLowerCase()) && n.args.every((a) => onlyRaw(a, raw))
  return false
}
export function originOf(rule: Rule | undefined, source: string, rawFields: string[]): { origin: string; source: string } {
  const who = FORM_INFO[source]?.source === 'EDC' || !FORM_INFO[source] ? 'Investigator' : 'Vendor'
  if (!rule) return { origin: 'Not Available', source: '' }
  if (rule.kind === 'const') return { origin: 'Assigned', source: 'Sponsor' }
  if (rule.kind === 'copy' || rule.kind === 'recode') return { origin: 'Collected', source: who }
  if (rule.kind === 'expr') { try { if (onlyRaw(parse(rule.expr), new Set(rawFields))) return { origin: 'Collected', source: who } } catch { /* fall through */ } }
  return { origin: 'Derived', source: 'Sponsor' }
}
export function describe(rule: Rule | undefined): string {
  if (!rule) return ''
  switch (rule.kind) {
    case 'copy': return `Copy ${rule.field}`
    case 'const': return rule.value === '' ? 'Null' : `“${rule.value}”`
    case 'recode': return `Recode ${rule.field}: ${Object.entries(rule.table).map(([a, b]) => `${a} → ${b}`).join('; ')}`
    case 'expr': return rule.expr
    case 'seq': return 'Sequence number within USUBJID after sorting by the keys'
    case 'lobxfl': return `Y on the last non-missing ${rule.result} per subject and ${rule.by} with ${rule.dtc} on or before RFXSTDTC`
  }
}
export function specRows(spec: DomainSpec, built: Built, ver: Version, rawFields: string[]): SpecRow[] {
  return spec.vars.map((v) => {
    const m = metaOf(spec.domain, v, ver)
    const rules = [spec.rules[v], ...(spec.parts ?? []).map((p) => p.rules[v])]
    const sources = [spec.source, ...(spec.parts ?? []).map((p) => p.source)]
    const o = originOf(spec.rules[v], spec.source, rawFields)
    const len = m?.type === 'Num' ? '8' : String(Math.max(1, ...built.rows.map((r) => (r[v] ?? '').length)))
    return {
      dataset: spec.domain, variable: v, label: m?.label ?? '', type: m?.type ?? '', length: len, core: m?.core ?? '', codelist: m?.ct ?? '',
      origin: `${o.origin}${o.source ? ` (${o.source})` : ''}`, source: rules.map((r, i) => (r && (r.kind === 'copy' || r.kind === 'recode') ? `${sources[i]}.${r.field}` : r && r.kind !== 'const' ? sources[i] : '')).filter(Boolean).join('; '),
      method: rules.map((r, i) => (r ? `${rules.length > 1 ? `[${sources[i]}] ` : ''}${describe(r)}` : '')).filter(Boolean).join(' | '),
    }
  })
}
export function valueLevel(spec: DomainSpec): { test: string; field: string; unit: string }[] {
  return (spec.transpose?.tests ?? []).map((t) => ({ test: t.code, field: `${spec.source}.${t.field}`, unit: t.unitField ? `from ${t.unitField}` : t.unit ?? '' }))
}
export function specCsv(rows: SpecRow[]): string {
  const h = ['Dataset', 'Variable', 'Label', 'Type', 'Length', 'Core', 'Codelist', 'Origin', 'Source', 'Method / derivation']
  const q = (x: string) => (/[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x)
  return [h.join(','), ...rows.map((r) => [r.dataset, r.variable, r.label, r.type, r.length, r.core, r.codelist, r.origin, r.source, r.method].map(q).join(','))].join('\n')
}
