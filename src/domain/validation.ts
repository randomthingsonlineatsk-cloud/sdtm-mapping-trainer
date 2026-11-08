// Validation runs, as a validator reports them: every dataset of the package (and define.xml)
// checked under one rule set, findings grouped into issues (one per check, dataset and
// variable, with record and subject counts), and each issue either fixed in the mapping or
// explained for the reviewer's guide. Reject findings cannot be explained: they stop the
// submission. Findings that mean the mapping is wrong (a Required variable missing or null,
// duplicate --SEQ, a wrong DOMAIN) cannot be explained either. Explanations stay with the
// project, keyed by dataset, check and variable, so they carry over from run to run.

import { build, type Built, type StudyData } from './engine'
import { check, RULES, type Finding, type Severity } from './conformance'
import { checkRelrec } from './relrec'
import { buildDefine, checkDefine, DEFINE_RULES } from './define'
import { crfPages, layoutAcrf } from './acrf'
import { allDatasets } from './datasets'
import { TRIAL_DESIGN, isRel } from './standards'
import { isGlv, refSpecFor, type Project } from './project'

export const MUST_FIX = new Set(['TRN-001', 'TRN-002', 'TRN-006', 'TRN-007', 'TRN-008'])
export interface Explanation { text: string; by: string; utc: string }
export interface ValidationRun { utc: string; ruleSet: string; transfer: number; version: string; reject: number; error: number; warning: number; keys: string[] }
export interface Issue {
  key: string; dataset: string; rule: string; sev: Severity; variable: string; check: string
  count: number; subjects: number; message: string; findings: Finding[]
}
export type IssueStatus = 'Must fix' | 'Explained' | 'Open'

export const issueKey = (dataset: string, rule: string, variable: string) => `${dataset}|${rule}|${variable}`
export const findingKey = (f: Finding) => issueKey(f.domain, f.rule, f.variable)
// define.xml is written by the sponsor, so its findings are fixed, never explained.
export const canExplain = (i: { rule: string; sev: Severity }) => i.sev !== 'Reject' && !MUST_FIX.has(i.rule) && !i.rule.startsWith('DEF-')
export function statusOf(i: Issue, p: Project): IssueStatus {
  if (!canExplain(i)) return 'Must fix'
  return explanationOf(p, i.key) ? 'Explained' : 'Open'
}
// An explanation counts once it says something: at least 20 characters.
export const explanationOf = (p: Project, key: string) => { const e = p.explain?.[key]; return e && e.text.trim().length >= 20 ? e : undefined }

// Every finding of the package under the project's rule set.
export function packageFindings(p: Project, data: StudyData, all: Map<string, Built> = allDatasets(p, data)): Finding[] {
  const dm = p.imported ? (p.specs.DM?.vars.length ? all.get('DM') : undefined) : build(refSpecFor(p, 'DM'), data, p.version)
  const ctx = { dm, ta: all.get('TA'), tv: all.get('TV'), ts: all.get('TS'), tu: all.get('TU'), set: p.ruleSet }
  const out: Finding[] = []
  for (const [name, b] of all) {
    if (isRel(name)) continue // checked with its parent (TRN-049)
    if (name === 'RELREC') { out.push(...checkRelrec(b, Object.fromEntries([...all].filter(([k]) => p.specs[k])))); continue }
    out.push(...check(b, p.version, name === 'DM' ? { ...ctx, dm: undefined } : ctx))
  }
  if (isGlv(p) && all.size) {
    const model = buildDefine({ builts: all, specs: p.specs, version: p.version, laid: layoutAcrf(crfPages(data.forms), p.acrf ?? {}), designDomains: TRIAL_DESIGN })
    for (const f of checkDefine(model, all)) out.push({ rule: f.rule, sev: f.sev, domain: 'define.xml', variable: f.where, msg: f.msg })
  }
  return out
}

export const checkText = (rule: string) => RULES.find((r) => r.id === rule)?.text ?? DEFINE_RULES[rule] ?? rule
const RANK: Record<Severity, number> = { Reject: 0, Error: 1, Warning: 2 }
export function toIssues(findings: Finding[]): Issue[] {
  const m = new Map<string, Issue>()
  for (const f of findings) {
    const key = findingKey(f)
    const i = m.get(key) ?? { key, dataset: f.domain, rule: f.rule, sev: f.sev, variable: f.variable, check: checkText(f.rule), count: 0, subjects: 0, message: f.msg, findings: [] }
    if (RANK[f.sev] < RANK[i.sev]) i.sev = f.sev
    i.count++; i.findings.push(f); m.set(key, i)
  }
  for (const i of m.values()) i.subjects = new Set(i.findings.map((f) => f.usubjid).filter(Boolean)).size
  return [...m.values()].sort((a, b) => RANK[a.sev] - RANK[b.sev] || a.dataset.localeCompare(b.dataset) || a.rule.localeCompare(b.rule) || a.variable.localeCompare(b.variable))
}

export function runSummary(p: Project, issues: Issue[], now = new Date()): ValidationRun {
  const n = (s: Severity) => issues.filter((i) => i.sev === s).reduce((a, i) => a + i.count, 0)
  return { utc: now.toISOString(), ruleSet: p.ruleSet, transfer: p.transfer ?? 1, version: p.version, reject: n('Reject'), error: n('Error'), warning: n('Warning'), keys: issues.map((i) => i.key) }
}
// What changed since a previous run: issues that are new, and issues no longer raised (fixed).
export function sinceRun(prev: ValidationRun | undefined, issues: Issue[]) {
  if (!prev) return { added: [] as string[], fixed: [] as string[] }
  const now = new Set(issues.map((i) => i.key)), before = new Set(prev.keys)
  return { added: [...now].filter((k) => !before.has(k)), fixed: [...before].filter((k) => !now.has(k)) }
}

const q = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
const row = (xs: unknown[]) => xs.map(q).join(',')
// The run report: one line per issue, as a validator's issue summary, with its status and the
// explanation that goes into the reviewer's guide.
export function reportCsv(p: Project, issues: Issue[], run: ValidationRun): string {
  const head = ['Study', 'Run (UTC)', 'Rule set', 'Transfer', 'SDTMIG', 'Dataset', 'Check', 'Severity', 'Variable', 'Records', 'Subjects', 'Check description', 'First message', 'Status', 'Explanation', 'Explained by', 'Explained (UTC)']
  return [row(head), ...issues.map((i) => { const e = explanationOf(p, i.key); return row([p.study, run.utc, run.ruleSet, run.transfer, run.version === '3.4' ? '3.4' : run.version === 'send' ? 'SENDIG 3.1.1' : '4.0 draft', i.dataset, i.rule, i.sev, i.variable, i.count, i.subjects, i.check, i.message, statusOf(i, p), e?.text ?? '', e?.by ?? '', e?.utc ?? '']) })].join('\r\n') + '\r\n'
}
// The details: one line per finding, with the record it was raised on.
export function detailsCsv(issues: Issue[]): string {
  return [row(['Dataset', 'Check', 'Severity', 'Variable', 'USUBJID', 'Record', 'Message']), ...issues.flatMap((i) => i.findings.map((f) => row([i.dataset, i.rule, f.sev, i.variable, f.usubjid ?? '', f.row === undefined ? '' : f.row + 1, f.msg])))].join('\r\n') + '\r\n'
}
