// Missions. Each scores one or more of the learner's datasets against the hidden reference,
// record by record (records are matched through their trace back to the raw row, or by the
// natural key for trial design tables, so a wrong VISITNUM costs credit on VISITNUM only).
// Score per domain (decision D9): credit per reference variable, averaged, minus 3 points for
// each kind of Error or Reject finding left in the dataset under the project's rule set (at
// most 30); a pass or fail mark per domain. The mission score is the mean of its domains.

import { build, type Built, type DomainSpec } from './engine'
import { check, summarise, type Finding } from './conformance'
import { referenceSpec, studyData, AETRTEM } from './reference'
import { designBuilt, referenceDesign, TEXT_VARS, TS_TEXT_PARAMS } from './design'
import { metaOf, isRel, relParent, relName, relMetaKey, dsName, type Version } from './standards'
import type { MissionRun, Project } from './project'
import { log } from './project'

export type MissionKind = 'map' | 'design' | 'fix'
export interface MissionDef { id: string; domains: string[]; kind: MissionKind; phase: number; title: string; brief: string; watch: string[]; pass: string }
const PASS = '70% or more in every domain, with no Required-variable, DOMAIN, duplicate-subject, --SEQ or Reject findings'
export const MISSIONS: MissionDef[] = [
  { id: 'S1', domains: ['DM', 'SUPPDM'], kind: 'map', phase: 1, title: 'Map DM end to end, with SUPPDM', pass: PASS,
    brief: 'Build the Demographics domain for all 90 screened subjects of GLV-12-301 from the DM, IC, EX, SV, DS and IRT raw data, following the study’s SDTM conventions, and the individual races of a subject with more than one in SUPPDM (NSDM in the v4.0 draft) as RACE1 and RACE2.',
    watch: ['Screen failures have no arm: ARMNRS says why', 'One subject was randomised but never dosed', 'One subject received the other arm’s kits for the whole study', 'One subject died during treatment', 'One subject recorded two races', 'Reference dates come from different forms'] },
  { id: 'S2', domains: ['VS'], kind: 'map', phase: 1, title: 'Map VS from wide to tall', pass: PASS,
    brief: 'Build the Vital Signs domain: one record per test per visit from the wide raw form, with original and standard results, visits, study days, epochs and the last-observation-before-exposure flag. The study’s reference DM supplies RFSTDTC and RFXSTDTC.',
    watch: ['The US site records weight in pounds and height in inches', 'Day 1 vital signs were not done for one subject', 'One subject’s Day 1 vital signs were taken after the dose', 'Unscheduled visits need their own visit numbers', 'A screening temperature is missing: no record, not a null result', 'Raw units are not always CT values'] },
  { id: 'S3', domains: ['AE', 'SUPPAE'], kind: 'map', phase: 2, title: 'Map AE with its coding and SUPPAE', pass: PASS,
    brief: 'Build AE from the adverse event form and the coding export, and the treatment emergent flag AETRTEM in SUPPAE (in the v4.0 draft, a column of NSAE).',
    watch: ['The coded hierarchy has eight variables plus codes; AEBODSYS is the primary system class', 'One AE start date is known only to the month', 'The fatal event has seriousness criteria', 'Labels such as “Recovered/resolved” are not CT values', 'AETRTEM needs the first dose date, and nothing for subjects never dosed'] },
  { id: 'S4', domains: ['CM'], kind: 'map', phase: 2, title: 'Map CM with partial dates', pass: PASS,
    brief: 'Build CM from the medication form and the drug coding export.',
    watch: ['Metformin start dates are often known only to the year or month', 'Trade names stay in CMTRT; CMDECOD is the standard name', 'Medications still taken at the end of the study need CMENRTPT and CMENTPT', 'Prior medications started before the study: which epoch?'] },
  { id: 'S5', domains: ['EX'], kind: 'map', phase: 2, title: 'Map EX from kit intervals', pass: PASS,
    brief: 'Build EX: one record per constant-dosing interval, with the treatment and dose actually taken.',
    watch: ['The CRF is blinded: the treatment comes from the IRT kit arm', 'Placebo has a dose of 0', 'Only the first record has a time', 'The subject with the other arm’s kits took that arm’s treatment'] },
  { id: 'S6', domains: ['DS'], kind: 'map', phase: 2, title: 'Map DS from three sources', pass: PASS,
    brief: 'Build DS from the end-of-study form, the consent form and the IRT file: disposition events and protocol milestones in one domain. Use “Add a source” in the workspace.',
    watch: ['Disposition events and protocol milestones use different codelists', 'Each subject has one disposition event per epoch', 'DSTERM is the reported text, or the CT term when nothing was written'] },
  { id: 'S7', domains: ['LB'], kind: 'map', phase: 2, title: 'Map LB from a messy lab transfer', pass: PASS,
    brief: 'Build LB from the central laboratory’s file: vendor test codes and units, SI conversion, reference ranges, abnormal flags, and the problems the file came with.',
    watch: ['Some results were sent twice', 'One site’s units came as mg/dl', 'A result reported as “<5”', 'A haemolysed sample was not reported', 'The lab standards table on the Study tab has the codes, units and factors'] },
  { id: 'S8', domains: ['TA', 'TE', 'TV', 'TI', 'TS'], kind: 'design', phase: 2, title: 'Build the trial design domains', pass: PASS,
    brief: 'From the protocol facts on the Study tab, build TA (arms and their elements), TE (elements), TV (planned visits), TI (eligibility criteria) and TS (trial summary) on the Trial design tab.',
    watch: ['Every arm runs through the same three epochs', 'TABRANCH sits on the element at whose end randomisation happens', 'TS needs SSTDTC (FDA rejects a study without it), SDTMVER and SDTIGVER', 'Several countries: one FCNTRY record each', 'Durations are ISO 8601: P26W, P18Y'] },
  { id: 'S9', domains: ['AE', 'SUPPAE', 'LB'], kind: 'fix', phase: 2, title: 'Fix a broken delivery', pass: PASS,
    brief: 'A colleague’s AE and LB mappings fail validation. Starting this mission replaces your AE and LB mappings with theirs (export your project first if you want to keep yours). Find every problem with the checks and fix the rules.',
    watch: ['Run the checks under the FDA rule set as well as CDISC', 'Some problems are only visible against the conventions, not the checks'] },
]
const BLOCKING = new Set(['TRN-001', 'TRN-002', 'TRN-006', 'TRN-007', 'TRN-008'])

const same = (a: string, b: string) => {
  if (a === b) return true
  const x = Number(a), y = Number(b)
  return a !== '' && b !== '' && !Number.isNaN(x) && !Number.isNaN(y) && Math.abs(x - y) < 1e-6
}

export interface Comparison { perVar: NonNullable<MissionRun['perVar']>; matched: number; refRows: number; learnerRows: number; extra: number }
export function compare(mine: Built, ref: Built, ver: Version, textVars: string[] = []): Comparison {
  const byTrace = new Map(mine.rows.map((r) => [r.__trace, r]))
  const refTraces = new Set(ref.rows.map((r) => r.__trace))
  const extra = mine.rows.filter((r) => !refTraces.has(r.__trace)).length
  const denom = Math.max(ref.rows.length, mine.rows.length) || 1
  const matched = ref.rows.filter((r) => byTrace.has(r.__trace)).length
  const base = isRel(ref.domain) ? relMetaKey(ref.domain) : ref.domain
  const perVar = ref.vars.map((v) => {
    const core = metaOf(base, v, ver)?.core ?? ''
    if (!mine.vars.includes(v)) return { v, credit: 0, core, examples: [`${v} is not in your dataset`] }
    const loose = v.endsWith('SEQ') || v === 'IDVARVAL' || v === 'IDVARVLN' || textVars.includes(v)
    let ok = 0; const examples: string[] = []
    for (const r of ref.rows) {
      const m = byTrace.get(r.__trace); if (!m) continue
      const text = loose || (ref.domain === 'TS' && v === 'TSVAL' && TS_TEXT_PARAMS.includes(r.TSPARMCD))
      const good = text ? (m[v] ?? '') !== '' || (r[v] ?? '') === '' : same(m[v] ?? '', r[v] ?? '')
      if (good) ok++
      else if (examples.length < 3) examples.push(`${r.USUBJID || r.__trace.split(':')[1]}${r[`${base}TESTCD`] ? ` ${r[`${base}TESTCD`]}` : ''}${r.VISIT ? ` ${r.VISIT}` : ''}: expected “${r[v] ?? ''}”, yours “${m[v] ?? ''}”`)
    }
    return { v, credit: ok / denom, core, examples }
  })
  return { perVar, matched, refRows: ref.rows.length, learnerRows: mine.rows.length, extra }
}

export function startMission(p: Project, id: string): MissionRun {
  const def = MISSIONS.find((m) => m.id === id)!
  const run: MissionRun = { id, startedUtc: new Date().toISOString(), version: p.version, ruleSet: p.ruleSet }
  if (def.kind === 'fix') { p.specs.AE = brokenSpec('AE', p.version); p.specs.LB = brokenSpec('LB', p.version) }
  p.missions.push(run)
  log(p, `Mission ${id} started (${p.version === '3.4' ? 'SDTMIG v3.4' : 'SDTMIG v4.0 draft'}, ${p.ruleSet} rules)`)
  return run
}
export const activeRun = (p: Project, id: string) => [...p.missions].reverse().find((m) => m.id === id && m.score === undefined)
export const bestRun = (p: Project, id: string) => p.missions.filter((m) => m.id === id && m.score !== undefined).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]

export interface DomainResult { domain: string; score: number; passed: boolean; comparison: Comparison; findings: Finding[] }
export function evaluateMission(p: Project, id: string): { score: number; passed: boolean; domains: DomainResult[]; detail: string[] } {
  const def = MISSIONS.find((m) => m.id === id)!
  if (p.imported) throw new Error('Missions run on GLV-12-301. Open or start a GLV-12-301 project.')
  const data = studyData()
  const ver = p.version
  const refDesign = referenceDesign(ver)
  const ctxBase = { dm: build(referenceSpec('DM', ver), data, ver), ta: designBuilt('TA', refDesign.TA, ver), tv: designBuilt('TV', refDesign.TV, ver), set: p.ruleSet }
  const results: DomainResult[] = []
  const errs: string[] = []
  for (const d of def.domains) {
    let mine: Built, ref: Built
    if (def.kind === 'design') {
      mine = designBuilt(d, p.design[d] ?? [], ver); ref = designBuilt(d, refDesign[d], ver)
    } else if (isRel(d)) {
      const parent = relParent(d)
      const spec = p.specs[parent]
      const m = spec?.vars.length ? build(spec, data, ver) : undefined
      mine = m?.supp ?? { domain: relName(parent, ver), vars: [], rows: [], errors: {}, warnings: [] }
      ref = build(referenceSpec(parent, ver), data, ver).supp!
    } else {
      const spec = p.specs[d]
      if (!spec?.vars.length) throw new Error(`Map ${d} first: the workspace has no ${d} variables yet.`)
      mine = build(spec, data, ver); ref = build(referenceSpec(d, ver), data, ver)
      for (const [v, e] of Object.entries(mine.errors)) errs.push(`${d}.${v} (${e.count}×: ${e.first})`)
    }
    // The parent's checks cover its SUPP--/NS-- dataset (TRN-049); score each on its own findings.
    const findings = isRel(d) ? (() => { const spec = p.specs[relParent(d)]; return spec?.vars.length ? check(build(spec, data, ver), ver, relParent(d) === 'DM' ? { ...ctxBase, dm: undefined } : ctxBase).filter((f) => f.domain === mine.domain) : [] })() : check(mine, ver, d === 'DM' ? { ...ctxBase, dm: undefined } : ctxBase).filter((f) => !isRel(f.domain))
    const comparison = compare(mine, ref, ver, TEXT_VARS[d] ?? [])
    const kinds = summarise(findings).filter((s) => s.sev !== 'Warning')
    const raw = comparison.perVar.length ? (comparison.perVar.reduce((a, x) => a + x.credit, 0) / comparison.perVar.length) * 100 : 0
    const score = Math.max(0, Math.round(raw - Math.min(30, 3 * kinds.length)))
    const blocking = kinds.filter((k) => BLOCKING.has(k.rule) || k.sev === 'Reject')
    results.push({ domain: dsName(d, ver), score, passed: score >= 70 && !blocking.length, comparison, findings })
  }
  const score = Math.round(results.reduce((a, r) => a + r.score, 0) / results.length)
  const passed = results.every((r) => r.passed)
  const detail = [
    ...results.map((r) => { const k = summarise(r.findings).filter((s) => s.sev !== 'Warning'); return `${r.domain}: ${r.score}% (${r.passed ? 'pass' : 'fail'}) · ${r.comparison.matched} of ${r.comparison.refRows} reference records matched, ${r.comparison.extra} extra · ${k.length} kind${k.length === 1 ? '' : 's'} of Error/Reject finding${k.length ? `: ${k.map((x) => `${x.rule} ${x.variable}`).join(', ')}` : ''}` }),
    ...(errs.length ? [`Rules that failed while building: ${errs.join('; ')}`] : []),
  ]
  return { score, passed, domains: results, detail }
}
export function finishMission(p: Project, id: string) {
  const run = activeRun(p, id) ?? startMission(p, id)
  const r = evaluateMission(p, id)
  Object.assign(run, {
    endedUtc: new Date().toISOString(), score: r.score, passed: r.passed, detail: r.detail, ruleSet: p.ruleSet,
    perVar: r.domains.flatMap((d) => d.comparison.perVar.map((x) => ({ ...x, v: r.domains.length > 1 ? `${d.domain}.${x.v}` : x.v, credit: Math.round(x.credit * 1000) / 1000 }))),
    domainPass: Object.fromEntries(r.domains.map((d) => [d.domain, d.passed])), domainScores: Object.fromEntries(r.domains.map((d) => [d.domain, d.score])),
    findings: r.domains.reduce((a, d) => a + d.findings.length, 0),
  })
  log(p, `Mission ${id} scored ${r.score}% (${r.passed ? 'pass' : 'not passed'})`)
  return run
}

// S9: the colleague's AE and LB mappings, each with planted problems.
export function brokenSpec(d: 'AE' | 'LB', ver: Version): DomainSpec {
  const s = referenceSpec(d, ver)
  const e = (expr: string) => ({ kind: 'expr' as const, expr })
  if (d === 'AE') {
    s.rules.DOMAIN = { kind: 'const', value: 'Ae' }
    s.rules.AESEQ = { kind: 'const', value: '1' }
    s.rules.AESTDTC = e("concat(substr(AESTDAT, 9, 2), '/', substr(AESTDAT, 6, 2), '/', substr(AESTDAT, 1, 4))")
    s.rules.AEBODSYS = { kind: 'copy', field: 'AEHLGT' }
    s.rules.AEOUT = { kind: 'copy', field: 'AEOUT' }
    s.supp = [{ ...AETRTEM, qnam: 'AETREATEMERG' }]
  } else {
    delete s.filter
    s.rules.LBTESTCD = { kind: 'copy', field: 'TESTCODE' }
    s.rules.LBTEST = { kind: 'copy', field: 'TESTNAME' }
    s.rules.LBORRESU = { kind: 'copy', field: 'UNITS' }
    s.rules.LBSTRESN = { kind: 'copy', field: 'RESULT' }
    s.rules.LBNRIND = { kind: 'const', value: 'NORMAL' }
  }
  return s
}
