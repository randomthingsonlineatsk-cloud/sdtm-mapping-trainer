// Independent QC programming, as companies validate SDTM datasets: a second programmer writes
// the same domain from the specification without looking at the production program, and the two
// datasets are compared record by record (PROC COMPARE in SAS, diffdf or arsenal in R). Every
// difference is investigated and resolved (production fixed, QC fixed, or explained) until the
// comparison is clean, and the QC programmer signs off.

import type { Built } from './engine'
import type { DomainSpec, Rule } from './engine'

export interface ValueDiff { key: string; base: string; compare: string }
export interface VarDiff { v: string; count: number; examples: ValueDiff[] }
export interface Comparison {
  keys: string[]
  baseObs: number; compareObs: number; matchedObs: number
  varsBoth: string[]; onlyBase: string[]; onlyCompare: string[]
  dupBase: string[]; dupCompare: string[]
  obsOnlyBase: string[]; obsOnlyCompare: string[]
  diffs: VarDiff[]
  unequalValues: number
  clean: boolean
}

// Values are equal when the text is equal, or when both are numbers of the same value (1 and 1.0).
const num = /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/
export const same = (a: string, b: string) => a === b || (num.test(a) && num.test(b) && Number(a) === Number(b))

export function compareDatasets(base: Built, compare: Built, keys: string[]): Comparison {
  const k = keys.filter((x) => base.vars.includes(x) && compare.vars.includes(x))
  const keyOf = (r: Record<string, string>) => k.map((x) => r[x] ?? '').join(' | ')
  const index = (b: Built) => {
    const m = new Map<string, Record<string, string>>(), dup = new Set<string>()
    for (const r of b.rows) { const key = keyOf(r); if (m.has(key)) dup.add(key); else m.set(key, r) }
    return { m, dup: [...dup] }
  }
  const B = index(base), C = index(compare)
  const varsBoth = base.vars.filter((v) => compare.vars.includes(v))
  const obsOnlyBase = [...B.m.keys()].filter((x) => !C.m.has(x))
  const obsOnlyCompare = [...C.m.keys()].filter((x) => !B.m.has(x))
  const diffs: VarDiff[] = []
  let matchedObs = 0
  const byVar = new Map<string, VarDiff>()
  for (const [key, r] of B.m) {
    const c = C.m.get(key); if (!c) continue
    matchedObs++
    for (const v of varsBoth) {
      if (k.includes(v)) continue
      const a = r[v] ?? '', b = c[v] ?? ''
      if (same(a, b)) continue
      const d = byVar.get(v) ?? { v, count: 0, examples: [] }
      d.count++; if (d.examples.length < 10) d.examples.push({ key, base: a, compare: b })
      byVar.set(v, d)
    }
  }
  for (const v of varsBoth) { const d = byVar.get(v); if (d) diffs.push(d) }
  const onlyBase = base.vars.filter((v) => !compare.vars.includes(v)), onlyCompare = compare.vars.filter((v) => !base.vars.includes(v))
  const unequalValues = diffs.reduce((a, d) => a + d.count, 0)
  return {
    keys: k, baseObs: base.rows.length, compareObs: compare.rows.length, matchedObs, varsBoth, onlyBase, onlyCompare, dupBase: B.dup, dupCompare: C.dup,
    obsOnlyBase, obsOnlyCompare, diffs, unequalValues,
    clean: !unequalValues && !obsOnlyBase.length && !obsOnlyCompare.length && !onlyBase.length && !onlyCompare.length && !B.dup.length && !C.dup.length && base.rows.length === compare.rows.length,
  }
}

// The items a QC programmer has to resolve, one per kind of difference.
export interface QcItem { id: string; what: string; count: number }
export function qcItems(c: Comparison): QcItem[] {
  return [
    ...c.onlyBase.map((v) => ({ id: `var-only-prod:${v}`, what: `${v} is in production only`, count: 1 })),
    ...c.onlyCompare.map((v) => ({ id: `var-only-qc:${v}`, what: `${v} is in QC only`, count: 1 })),
    ...(c.dupBase.length ? [{ id: 'dup-prod', what: `Production has ${c.dupBase.length} duplicate key${c.dupBase.length === 1 ? '' : 's'}`, count: c.dupBase.length }] : []),
    ...(c.dupCompare.length ? [{ id: 'dup-qc', what: `QC has ${c.dupCompare.length} duplicate key${c.dupCompare.length === 1 ? '' : 's'}`, count: c.dupCompare.length }] : []),
    ...(c.obsOnlyBase.length ? [{ id: 'obs-only-prod', what: `${c.obsOnlyBase.length} record${c.obsOnlyBase.length === 1 ? '' : 's'} in production only`, count: c.obsOnlyBase.length }] : []),
    ...(c.obsOnlyCompare.length ? [{ id: 'obs-only-qc', what: `${c.obsOnlyCompare.length} record${c.obsOnlyCompare.length === 1 ? '' : 's'} in QC only`, count: c.obsOnlyCompare.length }] : []),
    ...c.diffs.map((d) => ({ id: `values:${d.v}`, what: `${d.v}: ${d.count} unequal value${d.count === 1 ? '' : 's'}`, count: d.count })),
  ]
}

// How much of the QC program repeats the production one rule for rule. Double programming is
// only independent when the second programmer works from the specification, not the code.
const ruleText = (r: Rule | undefined) => JSON.stringify(r ?? null).replace(/\s+/g, '')
export function sharedRules(prod: DomainSpec, qc: DomainSpec): { same: number; total: number } {
  const vars = qc.vars.filter((v) => qc.rules[v] && !['seq', 'const'].includes(qc.rules[v].kind) && !(qc.rules[v].kind === 'copy'))
  return { same: vars.filter((v) => ruleText(prod.rules[v]) === ruleText(qc.rules[v])).length, total: vars.length }
}

// A plain-text report in the layout QC programmers file with the validation documentation.
export function reportText(domain: string, c: Comparison, when = new Date()): string {
  const L: string[] = []
  const line = '-'.repeat(78)
  L.push(`Dataset comparison: ${domain}   production (BASE) vs independent QC (COMPARE)`, `Run ${when.toISOString().slice(0, 16).replace('T', ' ')} UTC`, line)
  L.push('Dataset summary', `  BASE     ${String(c.baseObs).padStart(6)} records  ${c.varsBoth.length + c.onlyBase.length} variables`, `  COMPARE  ${String(c.compareObs).padStart(6)} records  ${c.varsBoth.length + c.onlyCompare.length} variables`, `  ID variables: ${c.keys.join(' ') || '(none)'}`, '')
  L.push('Variables summary', `  In both: ${c.varsBoth.length}`, `  In BASE only: ${c.onlyBase.join(' ') || 'none'}`, `  In COMPARE only: ${c.onlyCompare.join(' ') || 'none'}`, '')
  L.push('Observation summary', `  Matched by ID: ${c.matchedObs}`, `  In BASE only: ${c.obsOnlyBase.length}`, `  In COMPARE only: ${c.obsOnlyCompare.length}`, `  Duplicate IDs: BASE ${c.dupBase.length}, COMPARE ${c.dupCompare.length}`, '')
  L.push('Values comparison summary', `  Variables with all values equal: ${c.varsBoth.length - c.keys.length - c.diffs.length}`, `  Variables with unequal values: ${c.diffs.length}`, `  Total unequal values: ${c.unequalValues}`, '')
  for (const d of c.diffs) {
    L.push(`  ${d.v}: ${d.count} unequal`)
    for (const e of d.examples) L.push(`    ${e.key.padEnd(46)} BASE ${JSON.stringify(e.base).padEnd(18)} COMPARE ${JSON.stringify(e.compare)}`)
  }
  for (const [t, xs] of [['Records in BASE only', c.obsOnlyBase], ['Records in COMPARE only', c.obsOnlyCompare]] as const) if (xs.length) { L.push('', `  ${t}:`, ...xs.slice(0, 20).map((x) => `    ${x}`), ...(xs.length > 20 ? [`    … and ${xs.length - 20} more`] : [])) }
  L.push(line, c.clean ? 'NOTE: No unequal values were found. All values compared are exactly equal.' : 'NOTE: Differences found. Resolve each before sign-off.')
  return L.join('\n')
}
