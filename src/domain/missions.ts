// Phase 1 missions: map DM and map VS end to end. The learner's dataset is compared with the
// hidden reference mapping record by record (records are matched through their trace back to
// the raw row, so a wrong VISITNUM costs credit on VISITNUM only). Score (decision D9): credit
// per reference variable, averaged, minus 3 points for each kind of conformance error left in
// the dataset (Phase 2 lets a learner explain findings instead); and a pass or fail mark per
// domain.

import { build, type Built } from './engine'
import { check, summarise, type Finding } from './conformance'
import { referenceSpec, studyData } from './reference'
import { metaOf, type Version } from './standards'
import type { MissionRun, Project } from './project'
import { log } from './project'

export interface MissionDef { id: string; domain: 'DM' | 'VS'; phase: number; title: string; brief: string; watch: string[]; pass: string }
export const MISSIONS: MissionDef[] = [
  { id: 'S1', domain: 'DM', phase: 1, title: 'Map DM end to end', pass: '70% or more, and no Required-variable, DOMAIN, duplicate-subject or --SEQ errors',
    brief: 'Build the Demographics domain for all 90 screened subjects of GLV-12-301 from the DM, IC, EX, SV, DS and IRT raw data, following the study’s SDTM conventions.',
    watch: ['Screen failures have no arm: ARMNRS says why', 'One subject was randomised but never dosed', 'One subject received the other arm’s kits for the whole study', 'One subject died during treatment', 'One subject recorded two races', 'Reference dates come from different forms'] },
  { id: 'S2', domain: 'VS', phase: 1, title: 'Map VS from wide to tall', pass: '70% or more, and no Required-variable, DOMAIN or --SEQ errors',
    brief: 'Build the Vital Signs domain: one record per test per visit from the wide raw form, with original and standard results, visits, study days, epochs and the last-observation-before-exposure flag. The study’s reference DM supplies RFSTDTC and RFXSTDTC.',
    watch: ['The US site records weight in pounds and height in inches', 'Day 1 vital signs were not done for one subject', 'One subject’s Day 1 vital signs were taken after the dose', 'Unscheduled visits need their own visit numbers', 'A screening temperature is missing: no record, not a null result', 'Raw units are not always CT values'] },
]
const BLOCKING = new Set(['TRN-001', 'TRN-002', 'TRN-006', 'TRN-007', 'TRN-008'])

const same = (a: string, b: string) => {
  if (a === b) return true
  const x = Number(a), y = Number(b)
  return a !== '' && b !== '' && !Number.isNaN(x) && !Number.isNaN(y) && Math.abs(x - y) < 1e-6
}

export interface Comparison { perVar: NonNullable<MissionRun['perVar']>; matched: number; refRows: number; learnerRows: number; extra: number }
export function compare(mine: Built, ref: Built, ver: Version): Comparison {
  const byTrace = new Map(mine.rows.map((r) => [r.__trace, r]))
  const refTraces = new Set(ref.rows.map((r) => r.__trace))
  const extra = mine.rows.filter((r) => !refTraces.has(r.__trace)).length
  const denom = Math.max(ref.rows.length, mine.rows.length) || 1
  const matched = ref.rows.filter((r) => byTrace.has(r.__trace)).length
  const perVar = ref.vars.map((v) => {
    const core = metaOf(ref.domain, v, ver)?.core ?? ''
    if (!mine.vars.includes(v)) return { v, credit: 0, core, examples: [`${v} is not in your dataset`] }
    const isSeq = v === `${ref.domain}SEQ`
    let ok = 0; const examples: string[] = []
    for (const r of ref.rows) {
      const m = byTrace.get(r.__trace); if (!m) continue
      const good = isSeq ? m[v] !== '' : same(m[v] ?? '', r[v] ?? '')
      if (good) ok++
      else if (examples.length < 3) examples.push(`${r.USUBJID}${r[`${ref.domain}TESTCD`] ? ` ${r[`${ref.domain}TESTCD`]}` : ''}${r.VISIT ? ` ${r.VISIT}` : ''}: expected “${r[v] ?? ''}”, yours “${m[v] ?? ''}”`)
    }
    return { v, credit: ok / denom, core, examples }
  })
  return { perVar, matched, refRows: ref.rows.length, learnerRows: mine.rows.length, extra }
}

export function startMission(p: Project, id: string): MissionRun {
  const run: MissionRun = { id, startedUtc: new Date().toISOString(), version: p.version }
  p.missions.push(run)
  log(p, `Mission ${id} started (${p.version === '3.4' ? 'SDTMIG v3.4' : 'SDTMIG v4.0 draft'})`)
  return run
}
export const activeRun = (p: Project, id: string) => [...p.missions].reverse().find((m) => m.id === id && m.score === undefined)
export const bestRun = (p: Project, id: string) => p.missions.filter((m) => m.id === id && m.score !== undefined).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]

export function evaluateMission(p: Project, id: string): { score: number; passed: boolean; comparison: Comparison; findings: Finding[]; detail: string[] } {
  const def = MISSIONS.find((m) => m.id === id)!
  if (p.imported) throw new Error('Missions run on GLV-12-301. Open or start a GLV-12-301 project.')
  const spec = p.specs[def.domain]
  if (!spec?.vars.length) throw new Error(`Map ${def.domain} first: the workspace has no ${def.domain} variables yet.`)
  const data = studyData()
  const mine = build(spec, data)
  const ref = build(referenceSpec(def.domain, p.version), data)
  // Other domains are checked against the study's reference DM, the same DM the study functions use.
  const dm = def.domain === 'DM' ? undefined : build(referenceSpec('DM', p.version), data)
  const findings = check(mine, p.version, dm)
  const comparison = compare(mine, ref, p.version)
  const kinds = summarise(findings).filter((s) => s.sev === 'Error')
  const raw = (comparison.perVar.reduce((a, x) => a + x.credit, 0) / comparison.perVar.length) * 100
  const score = Math.max(0, Math.round(raw - Math.min(30, 3 * kinds.length)))
  const blocking = kinds.filter((k) => BLOCKING.has(k.rule))
  const passed = score >= 70 && !blocking.length
  const errs = Object.entries(mine.errors)
  const detail = [
    `${comparison.matched} of ${comparison.refRows} reference records matched; ${comparison.extra} records not in the reference`,
    `Variable credit ${Math.round(raw)}% across ${comparison.perVar.length} reference variables`,
    `${kinds.length} kind${kinds.length === 1 ? '' : 's'} of conformance error (−${Math.min(30, 3 * kinds.length)})`,
    ...(blocking.length ? [`Blocking: ${blocking.map((b) => `${b.rule} on ${b.variable}`).join(', ')}`] : []),
    ...(errs.length ? [`Rules that failed while building: ${errs.map(([v, e]) => `${v} (${e.count}×: ${e.first})`).join('; ')}`] : []),
  ]
  return { score, passed, comparison, findings, detail }
}
export function finishMission(p: Project, id: string) {
  const run = activeRun(p, id) ?? startMission(p, id)
  const r = evaluateMission(p, id)
  Object.assign(run, { endedUtc: new Date().toISOString(), score: r.score, passed: r.passed, detail: r.detail, perVar: r.comparison.perVar.map((x) => ({ ...x, credit: Math.round(x.credit * 1000) / 1000 })), domainPass: { [MISSIONS.find((m) => m.id === id)!.domain]: r.passed }, findings: r.findings.length })
  log(p, `Mission ${id} scored ${r.score}% (${r.passed ? 'pass' : 'not passed'})`)
  return run
}
