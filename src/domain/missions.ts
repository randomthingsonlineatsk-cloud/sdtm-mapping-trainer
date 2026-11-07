// Missions. Each scores one or more of the learner's datasets against the hidden reference,
// record by record (records are matched through their trace back to the raw row, or by the
// natural key for trial design tables, so a wrong VISITNUM costs credit on VISITNUM only).
// Score per domain (decision D9): credit per reference variable, averaged, minus 3 points for
// each kind of Error or Reject finding left in the dataset under the project's rule set and
// not explained (an explanation counts only for a finding the reference mapping raises too:
// a data issue, not a mapping bug) (at
// most 30); a pass or fail mark per domain. The mission score is the mean of its domains.

import { build, type Built, type DomainSpec } from './engine'
import { check, summarise, type Finding } from './conformance'
import { referenceSpec, studyData, AETRTEM, SORT, REF_RELREC, REF_CUSTOM, REF_DOMAINS } from './reference'
import { buildRelrec, checkRelrec } from './relrec'
import { crfPages, suggest, checkAcrf, domainsOf, namedVars, NOT_SUBMITTED } from './acrf'
import { compareDatasets } from './qc'
import { refSpecFor, studyIdOf, isPk, type Level } from './project'
import { pkData, PK_RELREC } from './pk'
import { STUDY } from './study'
import { rBuilt, rekey } from './rlib'
// Natural keys that match an R program's rows to the reference's.
export const R_KEYS: Record<string, string[]> = { CM: ['USUBJID', 'CMSPID'] }
import { TRIAL_DESIGN } from './standards'
import { canExplain, explanationOf, issueKey, findingKey, packageFindings, toIssues, statusOf } from './validation'
import { planPackage } from './package'
import { currentVersion, mismatches } from './plan'
import { RAW_FIELDS } from './seed'
import { designBuilt, referenceDesign, TEXT_VARS, TS_TEXT_PARAMS } from './design'
import { metaOf, isRel, relParent, relName, relMetaKey, dsName, type Version } from './standards'
import type { MissionRun, Project } from './project'
import { log } from './project'

export type MissionKind = 'map' | 'design' | 'fix' | 'qc' | 'rerun' | 'spec' | 'relrec' | 'custom' | 'acrf' | 'package' | 'capstone' | 'r'
export interface MissionDef { id: string; domains: string[]; kind: MissionKind; phase: number; title: string; brief: string; watch: string[]; pass: string; study?: string }
// The missions of the project's study (GLV-12-301 unless a mission names another).
export const missionsFor = (p: Project) => MISSIONS.filter((m) => (m.study ?? STUDY.id) === studyIdOf(p))
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
    watch: ['Every arm runs through the same three epochs', 'TABRANCH sits on the element at whose end randomisation happens', 'TS needs SSTDTC (FDA rejects a study without it), SDTMVER and SDTIGVER', 'Several countries: one FCNTRY record each', 'Durations are ISO 8601: P26W, P18Y', 'FDA also expects REGID, OUTMSPRI, PCLAS, ADAPT, INTMODEL, INTTYPE and the data cut-off for the transfer you work on', 'The treatment, background metformin, the indication and the class carry codes in TSVALCD (see Coding of TS values on the Study tab)'] },
  { id: 'S9', domains: ['AE', 'SUPPAE', 'LB'], kind: 'fix', phase: 2, title: 'Fix a broken delivery', pass: PASS,
    brief: 'A colleague’s AE and LB mappings fail validation. Starting this mission replaces your AE and LB mappings with theirs (export your project first if you want to keep yours). Find every problem with the checks and fix the rules.',
    watch: ['Run the checks under the FDA rule set as well as CDISC', 'Some problems are only visible against the conventions, not the checks'] },
  { id: 'S10', domains: ['VS'], kind: 'qc', phase: 2, title: 'Independent QC of a colleague’s VS', pass: 'Production and QC VS each 70% or more against the reference with no blocking finding, the comparison clean, and your QC sign-off',
    brief: 'A colleague has programmed VS and it passes every conformance check. As the QC programmer, write your own VS independently on the QC side of the Mapping workspace, from the study conventions and without reading their rules. Compare the two on the QC compare tab, find out who is right for every difference, correct production where it is wrong, and sign off when the comparison is clean. Starting replaces your production VS with the colleague’s and clears your QC VS.',
    watch: ['Clean conformance checks do not mean correct data: the compare finds what the checks cannot', 'Investigate each difference before fixing either side; QC can be wrong too', 'Independence: write the QC rules from the conventions, not from the production rules'] },
  { id: 'S11', domains: ['DM', 'AE', 'LB'], kind: 'rerun', phase: 2, title: 'Re-run on the final transfer', pass: PASS,
    brief: 'Transfer 2 has arrived at database lock. Starting this mission switches the project to it; your mappings stay as they are. Review what changed on the Raw data tab, re-run DM, AE and LB, and make every change land correctly: a mapping that worked on transfer 1 is not guaranteed to work on transfer 2.',
    watch: ['The central laboratory changed units part-way through: a conversion that assumes one unit converts some results twice', 'Late-entered events and a corrected date of birth', 'The coding was up-versioned: a hard-coded term would now be wrong', 'Compare each dataset with transfer 1 on the Datasets tab and explain every change'] },
  { id: 'S12', domains: ['IE', 'MH'], kind: 'map', phase: 2, title: 'Map IE and MH', pass: PASS,
    brief: 'Build IE from the eligibility form (only the criteria that were not met) and MH from the medical history form with its coding.',
    watch: ['IE holds only criteria not met: subjects who met all of them have no records', 'An inclusion criterion not met is N; an exclusion criterion met is Y', 'IETEST is the criterion text from the protocol (TI), and may be longer than 40 characters', 'Medical history dates are often partial', 'Conditions ongoing at screening'] },
  { id: 'S13', domains: ['EC', 'DV', 'CO'], kind: 'map', phase: 2, title: 'Map EC, DV and CO', pass: PASS,
    brief: 'Build EC (exposure as collected, still blinded) from the dosing form, DV from the protocol deviation log exported from the CTMS, and CO from the sites’ comments.',
    watch: ['EC records what the site saw: a blinded kit, in tablets; EX records what was given', 'The deviation log comes from another system, with its own date format', 'Each comment links to the domain of the form it was written on', 'A comment over 200 characters continues in COVAL1, split between words'] },
  { id: 'S14', domains: ['CM'], kind: 'spec', phase: 2, title: 'Specification first: CM', pass: 'CM 70% or more with no blocking finding, a specification approved by a reviewer other than its author, and a program that follows the approved version',
    brief: 'Work the way a sponsor or CRO does. Write the CM specification on the Specification tab, have it reviewed and approved by someone else, then program CM against it. When the program has to differ, revise the specification with a reason and approve the new version. Starting clears your CM specification and program.',
    watch: ['Name the raw field of every collected variable as FORM.FIELD', 'Describe each derivation in words someone else could program from', 'The author cannot approve their own specification', 'A change after approval is a new version with a reason, not an edit'] },
  { id: 'S15', domains: ['RELREC'], kind: 'relrec', phase: 3, title: 'Relate records with RELREC', pass: PASS,
    brief: 'Build RELREC on the Relationships tab: link each adverse event to the medications given for it, and each abnormal-lab adverse event to the ALT result behind it. AE, CM and LB must be mapped first; RELREC points to their --SEQ.',
    watch: ['The CRF links them with fields that are not SDTM variables: CMAENO (the AE number) and AELBACC (the lab accession number)', 'Only the ALT result, not every test in that sample', 'Each related group shares one RELID; IDVAR is --SEQ', 'Rebuild RELREC whenever --SEQ changes'] },
  { id: 'S16', domains: ['XE'], kind: 'custom', phase: 3, title: 'A custom domain for diabetes education', pass: PASS + ', and the custom domain defined with its class, structure and the reason no standard domain fits',
    brief: 'The sites recorded diabetes education sessions (EDU form). Check that no published domain fits, then define the sponsor domain XE (Interventions class) in the Mapping workspace and map it.',
    watch: ['Custom domain codes start with X, Y or Z', 'Choose the observation class: the session is something given to the subject', 'Write down why PR, ML, CM and the others do not fit', 'A duration is ISO 8601: PT30M'] },
  { id: 'S17', domains: ['aCRF'], kind: 'acrf', phase: 3, title: 'Annotate the CRF', pass: '90% of fields annotated with the variables the study’s mapping puts them in, and no aCRF errors against your own mapping',
    brief: 'On the aCRF tab, annotate every unique CRF page: the variable each field is submitted in, in the standard syntax, or [NOT SUBMITTED]. The suggestions come from your own mapping, so map the domains first; the score compares your annotations with what the study’s reference mapping implies.',
    watch: ['Findings: VSORRES when VSTESTCD = SYSBP, and the unit field too', 'Supplemental qualifiers: QVAL when QNAM = RACE1 in SUPPDM', 'A field another domain looks up (the consent date for RFICDTC) carries that domain’s variable as DM.RFICDTC', 'Link fields (CMAENO, AELBACC) are annotated RELREC', 'Derived variables are not annotated'] },
  { id: 'S18', domains: ['Package'], kind: 'package', phase: 3, title: 'Validate and explain: the FDA package', pass: '70% or more, with nothing left to fix, every Error explained, no mapping finding explained away, and the data issue left as collected',
    brief: 'The database is locked (transfer 2) and the package goes to the FDA. Run validation under the FDA rule set; fix what the mapping causes; explain, in the words a reviewer needs, what is true of the data; complete the reviewer’s guide; then build the submission folder on the Submission tab. Map the core domains (DM, AE, CM, DS, EX, LB, VS) and the trial design first.',
    watch: ['Reject findings stop the package at the gateway: fix them', 'Some findings come from the data, not the mapping: read the site’s comments (CO) before explaining', 'Never change data in the mapping to make a finding go away', 'An explanation says what the records show, why, and what was done', 'Run validation again after the last change'] },
  { id: 'S22', domains: ['DM', 'SUPPDM', 'VS', 'AE', 'SUPPAE', 'CM', 'EX', 'DS', 'LB', 'IE', 'MH', 'EC', 'DV', 'CO', 'SV', 'XE', 'RELREC', 'TA', 'TE', 'TV', 'TI', 'TS'], kind: 'capstone', phase: 4, title: 'Capstone: the full submission package', pass: '70% or more, with every dataset passing, mission S18’s conditions met and no package check that stops the package',
    brief: 'The whole job, as a study programmer does it at database lock: every domain of GLV-12-301 from transfer 2 (with SUPPDM, SUPPAE, the custom XE and RELREC), the trial design, the annotated CRF, define.xml, a clean FDA validation run with every data issue explained, and the reviewer’s guide; then the package on the Submission tab. Datasets count 60%, the package 40%.',
    watch: ['Start from the mappings you built in the earlier missions; transfer 2 changes the data, not the conventions', 'Every dataset is scored as in its own mission', 'Annotate every CRF page again if the mapping changed', 'Fix, then explain, then run validation last', 'The Submission tab lists anything that would stop the package'] },
  { id: 'S23', domains: ['CM'], kind: 'r', phase: 4, title: 'Program CM in R', pass: PASS,
    brief: 'Write CM as a clinical programmer does, in real R running in your browser (base R, with the study’s helper functions for dates, study days and epochs). Build a data frame called cm from raw$CM, save its result, and it is scored like any other CM: variable by variable against the reference, with the conformance checks.',
    watch: ['Every raw column is character, blanks are ""', 'dtc_iso() keeps partial dates partial (UN-MAR-2026 is 2026-03)', 'Sort by the CM keys before numbering CMSEQ with seq_within()', 'Ongoing medications: CMENRTPT ONGOING with CMENTPT END OF STUDY', 'Rows are matched to the reference by USUBJID and CMSPID'] },
  { id: 'S19', study: 'PKX-07-101', domains: ['DM', 'EX'], kind: 'map', phase: 3, title: 'PK study: DM and EX with exact dose times', pass: PASS,
    brief: 'PKX-07-101 is a first-in-human study: every concentration is timed from a dose, so the dose times matter. Map DM (reference dates to the minute, arms from the IRT, screen failures) and EX (one record per dose, unblinded from the IRT kit arm, with the clock time from the dosing log).',
    watch: ['RFSTDTC and RFXSTDTC carry the time of the first dose; RFENDTC the last dose', 'Part A doses once (EXDOSFRQ ONCE), Part B daily for 7 days (QD)', 'Placebo: EXTRT PLACEBO, EXDOSE 0', 'The dosing log time is 24-hour HH:MM'] },
  { id: 'S20', study: 'PKX-07-101', domains: ['PC'], kind: 'map', phase: 3, title: 'PK study: PC with nominal and actual times', pass: PASS,
    brief: 'Map the bioanalytical file to PC: one record per reportable sample result, with the planned time point (PCTPT, PCTPTNUM, PCELTM), what it is timed from (PCTPTREF and PCRFTDTC from the dosing log), and the actual collection time (PCDTC). Results below the LLOQ stay BLQ.',
    watch: ['Only the reportable run (FINAL = Y): one sample was reassayed', 'VISIT is when the sample was drawn; PCTPTREF is the dose it is timed from: the 24 h sample of a Day 1 dose is drawn on Day 2', 'PCELTM is an ISO 8601 duration: PT30M, PT24H, −PT15M', 'BLQ: character result, PCSTRESN null, PCLLOQ on every record', 'A sample the lab never received is kept with PCSTAT NOT DONE', 'One pre-dose trough was drawn after the dose: keep both times as recorded'] },
  { id: 'S21', study: 'PKX-07-101', domains: ['PP', 'RELREC'], kind: 'map', phase: 3, title: 'PK study: PP, related to PC', pass: PASS,
    brief: 'Map the NCA output to PP with CT parameter codes and units, then relate each profile’s parameters to the concentrations they came from on the Relationships tab: PPGRPID and PCGRPID name the profile, and RELREC relates the two groups. PC must be mapped first.',
    watch: ['PPTESTCD and PPTEST from the PKPARMCD and PKPARM codelists', 'NCA units hr and hr*ng/mL become h and h*ng/mL', 'A parameter not calculated: PPSTAT NOT DONE with the reason', 'PPRFTDTC is the dose the profile follows', 'RELREC by group: IDVAR PPGRPID and PCGRPID, not --SEQ'] },
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
  const run: MissionRun = { id, startedUtc: new Date().toISOString(), version: p.version, ruleSet: p.ruleSet, level: p.missionLevel ?? 'standard' }
  if (def.kind === 'fix') { p.specs.AE = brokenSpec('AE', p.version); p.specs.LB = brokenSpec('LB', p.version) }
  if (def.kind === 'rerun') p.transfer = 2
  if (def.kind === 'package' || def.kind === 'capstone') { p.transfer = 2; p.ruleSet = 'FDA'; run.ruleSet = 'FDA' }
  if (def.kind === 'spec') for (const d of def.domains) { delete p.specs[d]; if (p.plan) delete p.plan[d] }
  if (def.kind === 'qc') { p.specs.VS = brokenSpec('VS', p.version); if (p.qc) delete p.qc.VS; if (p.qcLog) delete p.qcLog.VS; if (p.qcSignoff) delete p.qcSignoff.VS }
  p.missions.push(run)
  log(p, `Mission ${id} started (${p.version === '3.4' ? 'SDTMIG v3.4' : 'SDTMIG v4.0 draft'}, ${p.ruleSet} rules)`)
  return run
}
export const activeRun = (p: Project, id: string) => [...p.missions].reverse().find((m) => m.id === id && m.score === undefined)
export const bestRun = (p: Project, id: string) => p.missions.filter((m) => m.id === id && m.score !== undefined).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]

export interface DomainResult { domain: string; score: number; passed: boolean; comparison: Comparison; findings: Finding[]; counted?: number }
export function evaluateMission(p: Project, id: string): { score: number; passed: boolean; domains: DomainResult[]; detail: string[] } {
  const def = MISSIONS.find((m) => m.id === id)!
  if (p.imported) throw new Error('Missions run on the trainer’s studies. Open or start a GLV-12-301 or PKX-07-101 project.')
  if ((def.study ?? STUDY.id) !== studyIdOf(p)) throw new Error(`Mission ${id} runs on ${def.study ?? STUDY.id}: open a project on that study.`)
  const data = isPk(p) ? pkData() : studyData(p.transfer ?? 1)
  const cost = levelOf(p, id) === 'expert' ? 2 : 1
  const referenceSpec = (d: string, _v: Version) => refSpecFor(p, d)
  const ver = p.version
  if (def.kind === 'acrf') return evaluateAcrf(p, data)
  if (def.kind === 'package') return evaluatePackage(p, data)
  const refDesign = referenceDesign(ver, p.transfer ?? 1)
  const ctxBase = { dm: build(referenceSpec('DM', ver), data, ver), ...(isPk(p) ? {} : { ta: designBuilt('TA', refDesign.TA, ver), tv: designBuilt('TV', refDesign.TV, ver) }), set: p.ruleSet }
  const results: DomainResult[] = []
  const errs: string[] = []
  const explainedOk: string[] = [], explainedWrongly: string[] = []
  const tracks: { d: string; qc: boolean }[] = def.domains.flatMap((d) => (def.kind === 'qc' ? [{ d, qc: false }, { d, qc: true }] : [{ d, qc: false }]))
  for (const { d, qc } of tracks) {
    let mine: Built, ref: Built, relFindings: Finding[] | null = null
    let refKeys = new Set<string>()
    if (def.kind === 'r') {
      const out = p.rOut?.[d]
      if (!out) throw new Error(`Run your R program for ${d} on the R tab and save its result first.`)
      const keys = R_KEYS[d] ?? ['USUBJID']
      mine = rBuilt(d, out, keys); ref = rekey(build(referenceSpec(d, ver), data, ver), keys)
      refKeys = new Set(check(ref, ver, ctxBase).map(findingKey))
    } else if (def.kind === 'design' || (def.kind === 'capstone' && TRIAL_DESIGN.includes(d))) {
      mine = designBuilt(d, p.design[d] ?? [], ver); ref = designBuilt(d, refDesign[d], ver)
    } else if (d === 'RELREC') {
      const need = isPk(p) ? ['PC', 'PP'] : ['AE', 'CM', 'LB']
      for (const x of need) if (!p.specs[x]?.vars.length) throw new Error(`Map ${x} first: RELREC points to its records.`)
      const mineB = Object.fromEntries(need.map((x) => [x, build(p.specs[x], data, ver)]))
      const refB = Object.fromEntries(need.map((x) => [x, build(referenceSpec(x, ver), data, ver)]))
      mine = buildRelrec(p.relrec ?? [], mineB, data); ref = buildRelrec(isPk(p) ? PK_RELREC : REF_RELREC, refB, data)
      relFindings = checkRelrec(mine, mineB)
    } else if (isRel(d)) {
      const parent = relParent(d)
      const spec = p.specs[parent]
      const m = spec?.vars.length ? build(spec, data, ver) : undefined
      mine = m?.supp ?? { domain: relName(parent, ver), vars: [], rows: [], errors: {}, warnings: [] }
      ref = build(referenceSpec(parent, ver), data, ver).supp!
    } else {
      const spec = qc ? p.qc?.[d] : p.specs[d]
      if (!spec?.vars.length) throw new Error(qc ? `Write your QC ${d} first: switch the Mapping workspace to QC.` : `Map ${d} first: the workspace has no ${d} variables yet.`)
      mine = build(spec, data, ver); ref = build(referenceSpec(d, ver), data, ver)
      refKeys = new Set(check(ref, ver, d === 'DM' ? { ...ctxBase, dm: undefined } : ctxBase).map(findingKey))
      for (const [v, e] of Object.entries(mine.errors)) errs.push(`${d}.${v} (${e.count}×: ${e.first})`)
    }
    // The parent's checks cover its SUPP--/NS-- dataset (TRN-049); score each on its own findings.
    const findings = relFindings ?? (isRel(d) ? (() => { const spec = p.specs[relParent(d)]; return spec?.vars.length ? check(build(spec, data, ver), ver, relParent(d) === 'DM' ? { ...ctxBase, dm: undefined } : ctxBase).filter((f) => f.domain === mine.domain) : [] })() : check(mine, ver, d === 'DM' ? { ...ctxBase, dm: undefined } : ctxBase).filter((f) => !isRel(f.domain)))
    const comparison = compare(mine, ref, ver, TEXT_VARS[d] ?? [])
    const all = summarise(findings).filter((s) => s.sev !== 'Warning')
    const keyOf = (k: (typeof all)[number]) => issueKey(k.first.domain, k.rule, k.variable)
    const explained = all.filter((k) => canExplain(k) && explanationOf(p, keyOf(k)) && refKeys.has(keyOf(k)))
    const kinds = all.filter((k) => !explained.includes(k))
    for (const k of all) if (!explained.includes(k) && explanationOf(p, keyOf(k))) explainedWrongly.push(`${k.first.domain} ${k.rule} ${k.variable}`)
    for (const k of explained) explainedOk.push(`${k.first.domain} ${k.rule} ${k.variable}`)
    const raw = comparison.perVar.length ? (comparison.perVar.reduce((a, x) => a + x.credit, 0) / comparison.perVar.length) * 100 : 0
    const score = Math.max(0, Math.round(raw - Math.min(30 * cost, 3 * cost * kinds.length)))
    const blocking = kinds.filter((k) => BLOCKING.has(k.rule) || k.sev === 'Reject')
    results.push({ domain: `${dsName(d, ver)}${qc ? ' (QC)' : ''}`, score, passed: score >= 70 && !blocking.length, comparison, findings, counted: kinds.length })
  }
  const score = Math.round(results.reduce((a, r) => a + r.score, 0) / results.length)
  let passed = results.every((r) => r.passed)
  const qcNotes: string[] = []
  if (def.kind === 'custom') for (const d of def.domains) {
    const c = p.custom?.find((x) => x.code === d)
    if (!c) { passed = false; qcNotes.push(`${d} is not defined as a custom domain`) }
    else {
      if (c.cls !== REF_CUSTOM.cls) { passed = false; qcNotes.push(`${d}: class ${c.cls}; an education session is given to the subject (Interventions)`) }
      if (c.reason.trim().length < 20) { passed = false; qcNotes.push(`${d}: say why no standard domain fits`) }
    }
  }
  if (def.kind === 'spec') for (const d of def.domains) {
    const plan = p.plan?.[d], cur = plan && currentVersion(plan)
    if (!cur) { passed = false; qcNotes.push(`${d}: no approved specification`); continue }
    if (cur.approver === cur.author) { passed = false; qcNotes.push(`${d}: specification approved by its own author`) }
    const forms = Object.keys(data.forms)
    const mm = mismatches(cur.rows, p.specs[d], Object.fromEntries(forms.map((f) => [f, RAW_FIELDS[f]?.map((x) => x.name) ?? []])))
    if (mm.length) { passed = false; qcNotes.push(`${d}: the program differs from specification ${cur.version} in ${mm.length} place${mm.length === 1 ? '' : 's'}: ${mm.slice(0, 3).map((x) => `${x.variable} (${x.what})`).join('; ')}`) }
    else qcNotes.push(`${d}: the program follows specification ${cur.version}`)
  }
  if (def.kind === 'qc') for (const d of def.domains) {
    const c = compareDatasets(build(p.specs[d], data, ver), build(p.qc![d], data, ver), SORT[d] ?? ['USUBJID'])
    const run = activeRun(p, id) ?? [...p.missions].reverse().find((m) => m.id === id)
    const signed = p.qcSignoff?.[d] && (!run || p.qcSignoff[d].utc >= run.startedUtc)
    if (!c.clean) { passed = false; qcNotes.push(`${d} comparison not clean: ${c.unequalValues} unequal values, ${c.obsOnlyBase.length + c.obsOnlyCompare.length} unmatched records, ${c.onlyBase.length + c.onlyCompare.length} unmatched variables`) }
    else qcNotes.push(`${d} comparison clean`)
    if (!signed) { passed = false; qcNotes.push(`${d}: QC not signed off on the QC compare tab`) }
  }
  const detail = [
    ...qcNotes,
    ...results.map((r) => { const k = summarise(r.findings).filter((s) => s.sev !== 'Warning'); return `${r.domain}: ${r.score}% (${r.passed ? 'pass' : 'fail'}) · ${r.comparison.matched} of ${r.comparison.refRows} reference records matched, ${r.comparison.extra} extra · ${k.length} kind${k.length === 1 ? '' : 's'} of Error/Reject finding${k.length ? `: ${k.map((x) => `${x.rule} ${x.variable}`).join(', ')}` : ''}${k.length !== (r.counted ?? k.length) ? ` (${k.length - (r.counted ?? 0)} explained)` : ''}` }),
    ...(explainedOk.length ? [`Explained data issues (not deducted): ${explainedOk.join('; ')}`] : []),
    ...(explainedWrongly.length ? [`Explained, but the reference mapping does not raise them, so they come from the mapping and still count: ${explainedWrongly.join('; ')}. Fix the mapping instead.`] : []),
    ...(errs.length ? [`Rules that failed while building: ${errs.join('; ')}`] : []),
  ]
  if (def.kind === 'capstone') {
    // The datasets count 60%, the package (fixed, explained, guide, current run) 40%; it passes
    // only when every dataset passes, the package mission passes and nothing stops the package.
    const pkg = evaluatePackage(p, data)
    const stops = planPackage(p, data).findings.filter((f) => f.sev === 'Error')
    const total = Math.round(0.6 * score + 0.4 * pkg.score)
    const ok = passed && pkg.passed && !stops.length
    return { score: total, passed: total >= 70 && ok, domains: [...results, ...pkg.domains], detail: [
      `Datasets: ${score}% (60% of the score); every dataset ${passed ? 'passes' : 'must pass'}`,
      `Package: ${pkg.score}% (40% of the score)${pkg.passed ? '' : ', not passed'}`,
      ...(stops.length ? [`The package is not ready: ${stops.map((f) => `${f.rule} ${f.where}: ${f.msg}`).join('; ')}`] : ['Package checks: nothing stops the package']),
      ...pkg.detail, ...detail,
    ] }
  }
  return { score, passed, domains: results, detail }
}
// Levels, as in the CDM Console. The pass mark is the same at every level.
export const LEVEL_TEXT: Record<Level, string> = {
  guided: 'Guided: tips, and progress checks that show which variables still differ from the reference.',
  standard: 'Standard: tips, and progress checks that show the score only.',
  expert: 'Expert: no tips and no progress checks; each kind of Error or Reject finding costs 6 points instead of 3 (at most 60).',
}
export const levelOf = (p: Project, id: string): Level => activeRun(p, id)?.level ?? p.missionLevel ?? 'standard'

export function finishMission(p: Project, id: string) {
  const run = activeRun(p, id) ?? startMission(p, id)
  const r = evaluateMission(p, id)
  Object.assign(run, {
    endedUtc: new Date().toISOString(), score: r.score, passed: r.passed, detail: [...r.detail, `Level: ${run.level ?? 'standard'}`], ruleSet: p.ruleSet,
    perVar: r.domains.flatMap((d) => d.comparison.perVar.map((x) => ({ ...x, v: r.domains.length > 1 ? `${d.domain}.${x.v}` : x.v, credit: Math.round(x.credit * 1000) / 1000 }))),
    domainPass: Object.fromEntries(r.domains.map((d) => [d.domain, d.passed])), domainScores: Object.fromEntries(r.domains.map((d) => [d.domain, d.score])),
    findings: r.domains.reduce((a, d) => a + d.findings.length, 0),
  })
  log(p, `Mission ${id} scored ${r.score}% (${r.passed ? 'pass' : 'not passed'})`)
  return run
}

// S9: the colleague's AE and LB mappings, each with planted problems.
export function brokenSpec(d: 'AE' | 'LB' | 'VS', ver: Version): DomainSpec {
  const s = referenceSpec(d, ver)
  const e = (expr: string) => ({ kind: 'expr' as const, expr })
  if (d === 'AE') {
    s.rules.DOMAIN = { kind: 'const', value: 'Ae' }
    s.rules.AESEQ = { kind: 'const', value: '1' }
    s.rules.AESTDTC = e("concat(substr(AESTDAT, 9, 2), '/', substr(AESTDAT, 6, 2), '/', substr(AESTDAT, 1, 4))")
    s.rules.AEBODSYS = { kind: 'copy', field: 'AEHLGT' }
    s.rules.AEOUT = { kind: 'copy', field: 'AEOUT' }
    s.supp = [{ ...AETRTEM, qnam: 'AETREATEMERG' }]
  } else if (d === 'VS') {
    // Each passes every conformance check; only an independent comparison finds them.
    s.rules.VSSTRESC = e('str(convert(__RESULT, VSORRESU, stdunit(__TESTCD), 0))')
    s.rules.VISITNUM = e("if(VISIT = 'Unscheduled', 99, visitnum(VISIT, VSDAT))")
    s.rules.VSLOBXFL = { kind: 'lobxfl', result: 'VSSTRESC', dtc: 'VSDTC', by: '' }
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

// S17: annotations against those the reference mapping implies, field by field, and the aCRF
// checks against the learner's own mapping.
function evaluateAcrf(p: Project, data: ReturnType<typeof studyData>) {
  const pages = crfPages(data.forms)
  const refSpecs = Object.fromEntries(REF_DOMAINS.map((d) => [d, referenceSpec(d, p.version)]))
  const perVar: NonNullable<MissionRun['perVar']> = []
  let ok = 0, total = 0
  for (const pg of pages) {
    const want = suggest(pg.form, refSpecs, REF_RELREC, p.version)
    const doms = domainsOf(pg.form, refSpecs)
    let good = 0; const examples: string[] = []
    for (const f of pg.fields) {
      total++
      const mine = (p.acrf?.[pg.form]?.[f.name] ?? '').trim()
      const key = (t: string) => (t === NOT_SUBMITTED ? [NOT_SUBMITTED] : namedVars(t, doms).map((x) => x.variable).sort())
      const a = key(mine), b = key(want[f.name])
      if (mine && a.length === b.length && a.every((x, i) => x === b[i])) { ok++; good++ }
      else if (examples.length < 3) examples.push(`${f.name}: expected “${want[f.name]}”, yours “${mine || '(none)'}”`)
    }
    perVar.push({ v: pg.form, credit: pg.fields.length ? good / pg.fields.length : 1, core: '', examples })
  }
  const errors = checkAcrf(pages, p.acrf ?? {}, p.specs, p.relrec ?? [], p.version).filter((f) => f.sev === 'Error')
  const score = Math.round((ok / Math.max(1, total)) * 100)
  const passed = score >= 90 && errors.length === 0
  const comparison = { perVar, matched: ok, refRows: total, learnerRows: total, extra: 0 }
  return { score, passed, domains: [{ domain: 'aCRF', score, passed, comparison, findings: [] }], detail: [`aCRF: ${ok} of ${total} fields annotated as the reference mapping implies`, `${errors.length} aCRF error${errors.length === 1 ? '' : 's'} against your own mapping${errors.length ? `: ${errors.slice(0, 3).map((e) => `${e.form}.${e.field} (${e.msg})`).join('; ')}` : ''}`] }
}

// S18: the package as a whole. 30 points for nothing left to fix, 30 for explaining exactly the
// issues that come from the data, 15 for what the explanation of the AE date issue says, 15 for
// a complete reviewer's guide, 10 for a validation run that matches the package (FDA, transfer 2).
const CORE = ['DM', 'AE', 'CM', 'DS', 'EX', 'LB', 'VS']
export const EXPLAIN_WORDS: [string, RegExp][] = [
  ['who confirmed it (the site, the investigator, a query)', /\b(site|investigator|query|queried)\b/i],
  ['against what (the source document)', /\b(source|medical record|confirm(ed)?|verif(ied|y))\b/i],
  ['what was done (left or submitted as collected)', /\b(as collected|as recorded|as reported|not changed|unchanged|left|no change)\b/i],
]
function evaluatePackage(p: Project, data: ReturnType<typeof studyData>) {
  for (const d of CORE) if (!p.specs[d]?.vars.length) throw new Error(`Map ${d} first: the package needs the core domains.`)
  if (!p.design.TS?.length) throw new Error('Build TS first (Trial design tab): the FDA gateway checks it.')
  const ver = p.version
  const plan = planPackage(p, data)
  const issues = plan.issues
  // What the reference mapping raises on the same data: the issues that are true of the data.
  const ref: Project = { ...p, specs: Object.fromEntries(Object.keys(p.specs).filter((d) => REF_DOMAINS.includes(d) || REF_CUSTOM.code === d).map((d) => [d, referenceSpec(d, ver)])), design: referenceDesign(ver, p.transfer ?? 1), relrec: p.relrec?.length ? REF_RELREC : undefined }
  const refKeys = new Set(toIssues(packageFindings(ref, data)).filter((i) => !i.rule.startsWith('DEF-')).map((i) => i.key))
  const must = issues.filter((i) => statusOf(i, p) === 'Must fix')
  const explainable = issues.filter((i) => canExplain(i))
  const legit = explainable.filter((i) => explanationOf(p, i.key) && refKeys.has(i.key))
  const wrong = explainable.filter((i) => explanationOf(p, i.key) && !refKeys.has(i.key))
  const missingData = [...refKeys].filter((k) => !issues.some((i) => i.key === k))
  const need = new Set([...explainable.map((i) => i.key), ...missingData])
  const a = Math.max(0, 30 - 10 * must.length)
  const b = need.size ? Math.max(0, Math.round((30 * legit.length) / need.size) - 10 * wrong.length) : 30
  const planted = issueKey('AE', 'TRN-041', 'AESTDTC')
  const txt = explanationOf(p, planted)?.text ?? ''
  const words = EXPLAIN_WORDS.filter(([, re]) => re.test(txt))
  const c = issues.some((i) => i.key === planted) ? words.length * 5 : 0
  const guide = plan.findings.filter((f) => f.rule === 'PKG-006')
  const d = Math.max(0, 15 - 5 * guide.filter((f) => f.sev === 'Error').length - 2 * guide.filter((f) => f.sev === 'Warning').length)
  const last = (p.validation ?? []).at(-1)
  const e = plan.findings.some((f) => f.rule === 'PKG-007') || last?.ruleSet !== 'FDA' ? 0 : 10
  const score = a + b + c + d + e
  const openErrors = issues.filter((i) => statusOf(i, p) === 'Open' && i.sev !== 'Warning')
  const passed = score >= 70 && !must.length && !openErrors.length && !wrong.length && !missingData.length
  const perVar = [
    { v: 'Nothing left to fix', credit: a / 30, core: '', examples: must.slice(0, 3).map((i) => `${i.dataset} ${i.rule} ${i.variable}`) },
    { v: 'Data issues explained, mapping issues fixed', credit: b / 30, core: '', examples: [...wrong.map((i) => `${i.dataset} ${i.rule} ${i.variable}: explained, but the mapping causes it`), ...missingData.map((k) => `${k.replace(/\|/g, ' ')}: the data raise this finding, but your datasets do not; data must not be changed to remove it`)].slice(0, 3) },
    { v: 'Explanation of the AE date issue', credit: c / 15, core: '', examples: EXPLAIN_WORDS.filter(([, re]) => !re.test(txt)).map(([w]) => `Missing: ${w}`) },
    { v: 'Reviewer’s guide complete', credit: d / 15, core: '', examples: guide.slice(0, 3).map((f) => `${f.where}: ${f.msg}`) },
    { v: 'Validation run current (FDA)', credit: e / 10, core: '', examples: e ? [] : ['Run validation under FDA after the last change'] },
  ]
  const detail = [
    `Nothing left to fix: ${a}/30${must.length ? ` (${must.length} must-fix issue${must.length === 1 ? '' : 's'})` : ''}`,
    `Data issues explained: ${b}/30 (${legit.length} of ${need.size} explained${wrong.length ? `; ${wrong.length} mapping finding${wrong.length === 1 ? '' : 's'} explained instead of fixed` : ''}${missingData.length ? `; ${missingData.length} data finding${missingData.length === 1 ? '' : 's'} missing from your datasets` : ''})`,
    `AE date issue explanation: ${c}/15${words.length < 3 ? ` (missing: ${EXPLAIN_WORDS.filter(([, re]) => !re.test(txt)).map(([w]) => w).join('; ')})` : ''}`,
    `Reviewer’s guide: ${d}/15${guide.length ? ` (${guide.length} finding${guide.length === 1 ? '' : 's'})` : ''}`,
    `Validation run: ${e}/10`,
  ]
  const comparison = { perVar, matched: legit.length, refRows: need.size, learnerRows: issues.length, extra: wrong.length }
  return { score, passed, domains: [{ domain: 'Package', score, passed, comparison, findings: [] }], detail }
}
