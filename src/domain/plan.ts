// The mapping specification written before programming, as companies work: a specification per
// domain, reviewed and approved by someone other than its author, then programmed against.
// Once approved, every change is a new version with a reason, so the history shows what the
// datasets were built against at any time. The program is checked against the approved version.

import { parse, type Node } from './expr'
import type { DomainSpec, Rule } from './engine'
import { varsOf, type Version } from './standards'
import { originOf } from './spec'

export type PlanOrigin = '' | 'Collected' | 'Derived' | 'Assigned' | 'Protocol' | 'Not Available'
export const PLAN_ORIGINS: PlanOrigin[] = ['Collected', 'Derived', 'Assigned', 'Protocol', 'Not Available']
export interface PlanRow { variable: string; origin: PlanOrigin; source: string; method: string }
export type PlanStatus = 'Draft' | 'In review' | 'Approved'
export interface PlanVersion { version: string; utc: string; status: 'Approved'; author: string; approver: string; reason: string; rows: PlanRow[] }
export interface Plan { domain: string; status: PlanStatus; author: string; rows: PlanRow[]; versions: PlanVersion[]; reason?: string }

export function startPlan(domain: string, ver: Version, author: string): Plan {
  const rows = varsOf(domain, ver).filter((v) => v.core !== 'Perm').map((v) => ({ variable: v.name, origin: '' as PlanOrigin, source: '', method: '' }))
  return { domain, status: 'Draft', author, rows, versions: [] }
}
export const currentVersion = (p: Plan) => p.versions[p.versions.length - 1]
// 0.1 for the first draft, 1.0 at the first approval, then 1.1, 1.2… for each approved revision.
export const nextVersion = (p: Plan) => { const c = currentVersion(p); if (!c) return '1.0'; const [a, b] = c.version.split('.').map(Number); return `${a}.${b + 1}` }

// What a draft is still missing before it can go to review.
export function incomplete(p: Plan): string[] {
  const out: string[] = []
  for (const r of p.rows) {
    if (!r.origin) out.push(`${r.variable}: no origin`)
    else if (r.origin === 'Collected' && !/^[A-Z0-9_]+\.[A-Z0-9_]+/i.test(r.source)) out.push(`${r.variable}: a collected variable names its raw field as FORM.FIELD`)
    else if ((r.origin === 'Derived' || r.origin === 'Assigned') && !r.method.trim()) out.push(`${r.variable}: describe the derivation or the assigned value`)
  }
  if (p.status !== 'Draft' && p.versions.length && !p.reason?.trim()) out.push('A revision needs a reason')
  return out
}

// Raw fields an implemented rule reads.
function fieldsOf(n: Node, out: Set<string>) {
  if (n.k === 'var') out.add(n.name)
  else if (n.k === 'un') fieldsOf(n.a, out)
  else if (n.k === 'bin') { fieldsOf(n.a, out); fieldsOf(n.b, out) }
  else if (n.k === 'call') { n.args.forEach((a) => fieldsOf(a, out)); if (['subj', 'subjwhere'].includes(n.name.toLowerCase()) && n.args[0]?.k === 'lit' && n.args[1]?.k === 'lit') out.add(`${String(n.args[0].v)}.${String(n.args[1].v)}`) }
}
export function ruleFields(r: Rule | undefined): Set<string> {
  const out = new Set<string>()
  if (!r) return out
  if (r.kind === 'copy' || r.kind === 'recode') out.add(r.field)
  if (r.kind === 'expr') { try { fieldsOf(parse(r.expr), out) } catch { /* no fields */ } }
  return out
}

export interface Mismatch { variable: string; what: string }
// The program against the approved specification.
export function mismatches(plan: PlanRow[], spec: DomainSpec, rawFields: Record<string, string[]>): Mismatch[] {
  const out: Mismatch[] = []
  const planned = new Map(plan.map((r) => [r.variable, r]))
  for (const r of plan) if (!spec.vars.includes(r.variable) && r.origin !== 'Not Available') out.push({ variable: r.variable, what: 'In the specification but not programmed' })
  for (const v of spec.vars) {
    const p = planned.get(v)
    if (!p) { out.push({ variable: v, what: 'Programmed but not in the specification' }); continue }
    const rules = [{ source: spec.source, rule: spec.rules[v] }, ...(spec.parts ?? []).map((x) => ({ source: x.source, rule: x.rules[v] }))].filter((x) => x.rule)
    if (!rules.length) continue
    const impl = rules.map((x) => originOf(x.rule, x.source, rawFields[x.source] ?? []).origin)
    // Origins contradict when one side assigns a constant and the other uses data. (Collected
    // versus Derived is a judgement the field check below covers.)
    const assigned = impl.every((o) => o === 'Assigned'), planAssigned = p.origin === 'Assigned' || p.origin === 'Protocol'
    if (p.origin && p.origin !== 'Not Available' && assigned !== planAssigned) out.push({ variable: v, what: `Specification says ${p.origin}; the program ${assigned ? 'assigns a constant' : 'derives it from the data'}` })
    if (p.origin === 'Collected') {
      const named = p.source.split(/[;,\s]+/).filter(Boolean).map((s) => s.toUpperCase())
      const used = rules.flatMap((x) => [...ruleFields(x.rule)].map((f) => (f.includes('.') ? f : `${x.source}.${f}`).toUpperCase()))
      const missing = named.filter((n) => !used.includes(n))
      if (missing.length) out.push({ variable: v, what: `Specification names ${missing.join(', ')}; the program reads ${[...new Set(used)].join(', ') || 'no raw field'}` })
    }
  }
  return out
}

// Rows that differ between two versions.
export function diffRows(a: PlanRow[], b: PlanRow[]): { variable: string; change: string }[] {
  const A = new Map(a.map((r) => [r.variable, r])), B = new Map(b.map((r) => [r.variable, r]))
  const out: { variable: string; change: string }[] = []
  for (const [v, r] of B) {
    const o = A.get(v)
    if (!o) { out.push({ variable: v, change: 'Added' }); continue }
    for (const k of ['origin', 'source', 'method'] as const) if (o[k] !== r[k]) out.push({ variable: v, change: `${k}: “${o[k]}” → “${r[k]}”` })
  }
  for (const v of A.keys()) if (!B.has(v)) out.push({ variable: v, change: 'Removed' })
  return out
}

export function planCsv(p: Plan, labels: Record<string, string>): string {
  const q = (x: string) => (/[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x)
  const v = currentVersion(p)
  return [`# ${p.domain} mapping specification, version ${v?.version ?? '0.1 (draft)'}${v ? `, approved ${v.utc.slice(0, 10)} by ${v.approver}` : ''}`, 'Variable,Label,Origin,Source,Method', ...p.rows.map((r) => [r.variable, labels[r.variable] ?? '', r.origin, r.source, r.method].map(q).join(','))].join('\n')
}
