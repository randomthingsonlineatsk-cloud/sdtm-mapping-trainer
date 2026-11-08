// The diabetes study INS-22-305: a treat-to-target basal insulin study in type 2 diabetes, built
// for what the trainer's main diabetes study (GLV-12-301, tablets) does not have: an insulin dose
// titrated week by week (EX as constant-dosing intervals, with the reason for each change),
// glucose from the participants' own meters (LB, capillary blood, the meter's date and time), and
// hypoglycaemic episodes reported on their own eCRF page (CE), classified by the protocol in the
// levels of the International Hypoglycaemia Study Group (level 1 below 70 mg/dL, level 2 below
// 54 mg/dL, level 3 needing another person's help), and related to the meter reading taken at
// the time (RELREC by group). Insulin glargine is named as the comparator only. Everything else
// is fictional.

import { rng, addDays } from './util'
import { toEdc, toYmd } from './rawdate'
import { build, type DomainSpec, type OutRow, type Rule, type StudyData } from './engine'
import { varsOf, type Version } from './standards'
import type { Visit } from './study'
import type { Row } from './seed'
import type { StudyPack } from './studypack'
import type { RelDef } from './relrec'

export const INS_STUDY = {
  id: 'INS-22-305',
  title: 'A randomised, open-label, treat-to-target phase 3 study of once-daily Basalqin (INS-22) versus insulin glargine in insulin-naive adults with type 2 diabetes',
  short: 'Basalqin (INS-22) basal insulin: titration, meter glucose and hypoglycaemia',
  sponsor: 'Corvane Metabolic (fictional)',
  phase: 'Phase 3',
  indication: 'Type 2 diabetes mellitus (insulin-naive)',
  design: 'Open-label, randomised 1:1 to Basalqin or insulin glargine once daily by subcutaneous injection for 12 weeks, starting at 10 units and titrated weekly towards a fasting meter glucose of 80 to 130 mg/dL; participants measure fasting glucose with the study meter and report every hypoglycaemic episode',
}
export const INS_SITES = [
  { id: '301', name: 'Lakeshore Diabetes Centre (fictional)', country: 'India', iso: 'IND' },
  { id: '302', name: 'Clinica Metabolica del Norte (fictional)', country: 'Mexico', iso: 'MEX' },
]
export const INS_ARMS = [{ code: 'INS22', name: 'Basalqin once daily, titrated' }, { code: 'GLAR', name: 'Insulin glargine once daily, titrated' }]
const V = (raw: string, num: number, name: string, day: number, lo: number, hi: number): Visit => ({ raw, num, name, day, lo, hi, epoch: day < 1 ? 'SCREENING' : 'TREATMENT', vs: [] })
export const INS_VISITS: Visit[] = [V('Screening', 1, 'SCREENING', -14, -21, -1), V('Week 0', 2, 'WEEK 0', 1, 1, 1), V('Week 4', 3, 'WEEK 4', 29, 25, 33), V('Week 8', 4, 'WEEK 8', 57, 53, 61), V('Week 12', 5, 'WEEK 12', 85, 81, 89)]
export const INS_FORM_INFO: Record<string, { name: string; source: string; note: string }> = {
  DM: { name: 'Demographics', source: 'EDC', note: 'One row per participant screened.' },
  IC: { name: 'Informed consent', source: 'EDC', note: 'One row per participant.' },
  IRT: { name: 'Randomisation (IRT)', source: 'IRT', note: 'One row per randomised participant: the arm code.' },
  DOSE: { name: 'Insulin dose log', source: 'EDC', note: 'One row per period on the same daily dose: start and stop dates, the dose in units and why it changed (start of treatment, weekly titration, or a reduction after hypoglycaemia).' },
  SMBG: { name: 'Meter download', source: 'Device', note: 'The study meter’s readings, downloaded at each visit: date (YYYYMMDD), time (HHMM), glucose in mg/dL, the participant’s tag (Fasting, or Event for a reading taken during a hypoglycaemic episode) and the episode number for event readings.' },
  HYPO: { name: 'Hypoglycaemic episode', source: 'EDC', note: 'One row per episode the participant reported: date and time, the meter glucose if measured (mg/dL), whether another person’s help was needed, and how it was treated. Episodes are numbered per participant.' },
  SV: { name: 'Visits', source: 'EDC', note: 'One row per visit.' },
}
const F = (pairs: [string, string][]) => pairs.map(([name, label]) => ({ name, label }))
export const INS_RAW_FIELDS: Record<string, { name: string; label: string }[]> = {
  DM: F([['SUBJID', 'Participant number'], ['SITEID', 'Site'], ['DMDAT', 'Date of collection'], ['BRTHDAT', 'Date of birth'], ['SEX', 'Sex'], ['RACE', 'Race'], ['ETHNIC', 'Ethnicity']]),
  IC: F([['SUBJID', 'Participant number'], ['ICDAT', 'Date informed consent signed']]),
  IRT: F([['SUBJID', 'Participant number'], ['RANDNO', 'Randomisation number'], ['RANDDT', 'Randomisation date (ISO 8601)'], ['RANDARM', 'Arm (code)']]),
  DOSE: F([['SUBJID', 'Participant number'], ['STDAT', 'Start date'], ['ENDAT', 'Stop date'], ['DOSEU', 'Daily dose (units)'], ['CHGRSN', 'Reason for the dose']]),
  SMBG: F([['SUBJID', 'Participant number'], ['RDATE', 'Reading date (YYYYMMDD)'], ['RTIME', 'Reading time (HHMM)'], ['GLUC', 'Glucose (mg/dL)'], ['TAG', 'Tag'], ['EPISODE', 'Episode number']]),
  HYPO: F([['SUBJID', 'Participant number'], ['EPISODE', 'Episode number'], ['HYPODAT', 'Date'], ['HYPOTIM', 'Time (HH:MM)'], ['GLUC', 'Meter glucose (mg/dL)'], ['ASSIST', 'Needed another person’s help'], ['TREAT', 'Treatment']]),
  SV: F([['SUBJID', 'Participant number'], ['VISIT', 'Visit'], ['VISDAT', 'Date']]),
}
export const INS_FACTS: { what: string; value: string }[] = [
  { what: 'Phase', value: 'Phase 3, open-label, randomised 1:1, active comparator (insulin glargine), treat-to-target' },
  { what: 'Population', value: 'Adults with type 2 diabetes on metformin, insulin-naive, HbA1c 7.5% to 11%' },
  { what: 'Dosing', value: 'Once daily subcutaneous injection, starting at 10 units; adjusted weekly by the investigator from the fasting meter readings (+2 units if the mean is above 130 mg/dL, −2 units after a level 2 or 3 episode)' },
  { what: 'Glucose monitoring', value: 'Fasting meter glucose on at least 3 days a week, and a reading during any symptoms of hypoglycaemia' },
  { what: 'Hypoglycaemia', value: 'Every episode reported on its own eCRF page. Classified (International Hypoglycaemia Study Group): level 1, glucose below 70 mg/dL and at or above 54; level 2, below 54 mg/dL; level 3, needing another person’s help, whatever the glucose' },
]
export const INS_CONVENTIONS: { topic: string; rule: string }[] = [
  { topic: 'USUBJID', rule: 'STUDYID, a hyphen, and SUBJID: INS-22-305-301-004.' },
  { topic: 'DM', rule: 'RFSTDTC and RFXSTDTC the first dose; RFENDTC and RFXENDTC the last dose (the last stop date); RFPENDTC the last visit. ARM from the IRT.' },
  { topic: 'EX', rule: 'One record per period on a constant dose: EXTRT BASALQIN or INSULIN GLARGINE, EXDOSE the daily dose, EXDOSU U, EXDOSFRM INJECTION, SOLUTION, EXDOSFRQ QD, EXROUTE SUBCUTANEOUS, EXSTDTC and EXENDTC the start and stop dates. EXADJ the reason a dose changed (TITRATION or HYPOGLYCAEMIA); null for the starting dose.' },
  { topic: 'LB', rule: 'Meter readings: LBTESTCD GLUC, LBCAT SELF-MONITORED BLOOD GLUCOSE, LBSPEC CAPILLARY BLOOD, LBMETHOD GLUCOSE METER (a sponsor term). LBORRES in mg/dL as read; LBSTRESN in mmol/L (× 0.0555, 1 decimal). LBFAST Y for fasting readings. LBDTC the meter’s date and time. No reference ranges (the meter has none). No visit: readings are taken at home (VISITNUM null). LBGRPID HYPO-n for a reading taken during episode n.' },
  { topic: 'CE', rule: 'One record per hypoglycaemic episode: CETERM Hypoglycaemia, CEDECOD Hypoglycaemia, CECAT HYPOGLYCAEMIC EPISODE, CEPRESP Y and CEOCCUR Y (the eCRF page asks for these episodes), CESCAT the protocol’s level (LEVEL 1, LEVEL 2, LEVEL 3) from the glucose and the help needed, null when the glucose was 70 mg/dL or more and no help was needed. CESTDTC the date and time. CEGRPID HYPO-n.' },
  { topic: 'RELREC', rule: 'Each episode in CE and its meter reading in LB, by CEGRPID and LBGRPID: a group-level relationship per participant.' },
]

// ---------- generation ----------
export const INS_PLANTED: { level3NoGlucose?: string; notClassified?: string; doseReduced?: string; screenFail?: string } = {}
const pad = (n: number) => String(n).padStart(3, '0')
let cache: { forms: Record<string, Row[]>; subjects: { subj: string; arm?: string }[] } | null = null
export function insRaw() {
  if (cache) return cache
  const r = rng(22305)
  const forms: Record<string, Row[]> = { DM: [], IC: [], IRT: [], DOSE: [], SMBG: [], HYPO: [], SV: [] }
  let id = 0
  const push = (form: string, row: Record<string, string>) => forms[form].push({ __id: `${form}${++id}`, ...row } as Row)
  const subjects: { subj: string; arm?: string }[] = []
  let n = 0, randomised = 0, randno = 7000
  while (randomised < 40) {
    n++
    const site = n % 3 ? '301' : '302', subj = `${site}-${pad(n)}`
    const scr = addDays('2026-02-02', Math.floor(n * 1.4)), d1 = addDays(scr, 14 + r.int(0, 3))
    push('DM', { SUBJID: subj, SITEID: site, DMDAT: toEdc(scr), BRTHDAT: toEdc(addDays(scr, -Math.round((40 + r.next() * 30) * 365.25))), SEX: r.chance(0.5) ? 'Female' : 'Male', RACE: site === '301' ? 'Asian' : r.pick(['White', 'American Indian or Alaska Native', 'White']), ETHNIC: site === '302' ? 'Hispanic or Latino' : 'Not Hispanic or Latino' })
    push('IC', { SUBJID: subj, ICDAT: toEdc(scr) })
    push('SV', { SUBJID: subj, VISIT: 'Screening', VISDAT: toEdc(scr) })
    if (n % 9 === 4) { subjects.push({ subj }); INS_PLANTED.screenFail ??= subj; continue }
    randomised++
    const arm = randomised % 2 ? 'INS22' : 'GLAR'
    subjects.push({ subj, arm })
    push('IRT', { SUBJID: subj, RANDNO: String(++randno), RANDDT: d1, RANDARM: arm })
    for (const [vis, day] of [['Week 0', 1], ['Week 4', 29], ['Week 8', 57], ['Week 12', 85]] as [string, number][]) push('SV', { SUBJID: subj, VISIT: vis, VISDAT: toEdc(addDays(d1, day - 1 + (day > 1 ? r.int(-2, 2) : 0))) })
    // daily simulation: fasting glucose falls as the dose rises; episodes now and then
    let dose = 10, start = d1, reason = 'Start of treatment', fpg = 190 + r.int(-20, 30), ep = 0
    const sens = 0.9 + r.next() * 0.5, hypoRisk = arm === 'INS22' ? 0.010 : 0.014
    const last = addDays(d1, 83)
    let pendingCut = false
    for (let day = 1; day <= 84; day++) {
      const date = addDays(d1, day - 1)
      fpg = Math.max(70, fpg - sens * Math.max(0, dose - 8) * 0.06 + r.int(-3, 3) * 0.6)
      if (day % 7 === 1 || day % 7 === 3 || day % 7 === 5) push('SMBG', { SUBJID: subj, RDATE: toYmd(date), RTIME: `0${6 + r.int(0, 2)}${String(r.int(0, 5) * 10).padStart(2, '0')}`, GLUC: String(Math.round(fpg + r.int(-12, 12))), TAG: 'Fasting', EPISODE: '' })
      const forced3 = randomised === 9 && day === 40, forcedHigh = randomised === 14 && day === 45
      if (forced3 || forcedHigh || day > 10 && r.chance(hypoRisk * (dose / 20))) {
        ep++
        const g = forcedHigh ? 74 : 40 + r.int(0, 28), assist = forced3 || g < 45 && r.chance(0.5)
        const tim = `${String(r.pick([3, 11, 16, 22])).padStart(2, '0')}:${String(r.int(0, 59)).padStart(2, '0')}`
        if (forced3) INS_PLANTED.level3NoGlucose = subj
        if (forcedHigh) INS_PLANTED.notClassified = subj
        push('HYPO', { SUBJID: subj, EPISODE: String(ep), HYPODAT: toEdc(date), HYPOTIM: tim, GLUC: forced3 ? '' : String(g), ASSIST: assist ? 'Yes' : 'No', TREAT: assist ? 'Glucagon' : 'Oral carbohydrate' })
        if (!forced3) push('SMBG', { SUBJID: subj, RDATE: toYmd(date), RTIME: tim.replace(':', ''), GLUC: String(g), TAG: 'Event', EPISODE: String(ep) })
        if (g < 54 || assist) pendingCut = true
      }
      // weekly titration on day 8, 15, …
      if (day % 7 === 0 && day < 84) {
        const next = pendingCut ? dose - 2 : fpg > 130 ? dose + 2 : dose
        if (next !== dose) {
          push('DOSE', { SUBJID: subj, STDAT: toEdc(start), ENDAT: toEdc(date), DOSEU: String(dose), CHGRSN: reason })
          if (pendingCut) INS_PLANTED.doseReduced ??= subj
          reason = pendingCut ? 'Reduced after hypoglycaemia' : 'Weekly titration'
          dose = next; start = addDays(date, 1)
        }
        pendingCut = false
      }
    }
    push('DOSE', { SUBJID: subj, STDAT: toEdc(start), ENDAT: toEdc(last), DOSEU: String(dose), CHGRSN: reason })
  }
  cache = { forms, subjects }
  return cache
}

// ---------- reference mapping ----------
const e = (expr: string): Rule => ({ kind: 'expr', expr })
const c = (value: string): Rule => ({ kind: 'const', value })
const cp = (field: string): Rule => ({ kind: 'copy', field })
const ID = (d: string) => ({ STUDYID: c(INS_STUDY.id), DOMAIN: c(d), USUBJID: e(`concat('${INS_STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID') })
const LEVEL = "if(ASSIST = 'Yes', 'LEVEL 3', if(isblank(GLUC), '', if(num(GLUC) < 54, 'LEVEL 2', if(num(GLUC) < 70, 'LEVEL 1', ''))))"
type Ref = { rules: Record<string, Rule>; perm: string[]; source?: string; filter?: string; sort: string[] }
const INS_REF: Record<string, Ref> = {
  DM: {
    perm: ['BRTHDTC', 'ETHNIC', 'DMDTC', 'DMDY'], sort: ['USUBJID'],
    rules: {
      ...ID('DM'), RFSTDTC: e("dtc(subj('DOSE', 'STDAT', 'min'), 'DD-MMM-YYYY')"), RFENDTC: e("dtc(subj('DOSE', 'ENDAT', 'max'), 'DD-MMM-YYYY')"),
      RFXSTDTC: e("dtc(subj('DOSE', 'STDAT', 'min'), 'DD-MMM-YYYY')"), RFXENDTC: e("dtc(subj('DOSE', 'ENDAT', 'max'), 'DD-MMM-YYYY')"),
      RFICDTC: e("dtc(subj('IC', 'ICDAT', 'first'), 'DD-MMM-YYYY')"), RFPENDTC: e("dtc(subj('SV', 'VISDAT', 'max'), 'DD-MMM-YYYY')"),
      DTHDTC: c(''), DTHFL: c(''), SITEID: cp('SITEID'), BRTHDTC: e("dtc(BRTHDAT, 'DD-MMM-YYYY')"), AGE: e("age(BRTHDAT, subj('IC', 'ICDAT', 'first'))"), AGEU: c('YEARS'),
      SEX: { kind: 'recode', field: 'SEX', table: { Female: 'F', Male: 'M' } }, RACE: e('upper(RACE)'), ETHNIC: e('upper(ETHNIC)'),
      ARMCD: e("irt('RANDARM')"), ARM: e("armname(irt('RANDARM'))"), ACTARMCD: e("if(present(subj('DOSE', 'STDAT', 'min')), irt('RANDARM'), '')"), ACTARM: e('armname(ACTARMCD)'),
      ARMNRS: e("if(isblank(irt('RANDARM')), 'SCREEN FAILURE', '')"), ACTARMUD: c(''), COUNTRY: e('country(SITEID)'), DMDTC: e("dtc(DMDAT, 'DD-MMM-YYYY')"), DMDY: e('studyday(DMDTC, RFSTDTC)'),
    },
  },
  EX: {
    source: 'DOSE', perm: ['EXDOSFRQ', 'EXROUTE', 'EXADJ', 'EPOCH', 'EXSTDY', 'EXENDY'], sort: ['USUBJID', 'EXTRT', 'EXSTDTC'],
    rules: {
      ...ID('EX'), EXSEQ: { kind: 'seq' }, EXTRT: e("if(irt('RANDARM') = 'GLAR', 'INSULIN GLARGINE', 'BASALQIN')"), EXDOSE: e('num(DOSEU)'), EXDOSU: c('U'), EXDOSFRM: c('INJECTION, SOLUTION'),
      EXDOSFRQ: c('QD'), EXROUTE: c('SUBCUTANEOUS'), EXADJ: e("if(CHGRSN = 'Weekly titration', 'TITRATION', if(contains(CHGRSN, 'hypoglycaemia'), 'HYPOGLYCAEMIA', ''))"),
      EPOCH: e('epoch(EXSTDTC)'), EXSTDTC: e("dtc(STDAT, 'DD-MMM-YYYY')"), EXENDTC: e("dtc(ENDAT, 'DD-MMM-YYYY')"), EXSTDY: e('studyday(EXSTDTC)'), EXENDY: e('studyday(EXENDTC)'),
    },
  },
  LB: {
    source: 'SMBG', perm: ['LBGRPID', 'LBSPEC', 'LBMETHOD', 'LBFAST', 'EPOCH', 'LBDY'], sort: ['USUBJID', 'LBTESTCD', 'LBDTC'],
    rules: {
      ...ID('LB'), LBSEQ: { kind: 'seq' }, LBGRPID: e("if(present(EPISODE), concat('HYPO-', EPISODE), '')"), LBTESTCD: c('GLUC'), LBTEST: c('Glucose'), LBCAT: c('SELF-MONITORED BLOOD GLUCOSE'),
      LBORRES: cp('GLUC'), LBORRESU: c('mg/dL'), LBORNRLO: c(''), LBORNRHI: c(''), LBSTRESC: e('str(round(num(GLUC) * 0.0555, 1))'), LBSTRESN: e('round(num(GLUC) * 0.0555, 1)'), LBSTRESU: c('mmol/L'),
      LBSTNRLO: c(''), LBSTNRHI: c(''), LBNRIND: c(''), LBSPEC: c('CAPILLARY BLOOD'), LBMETHOD: c('GLUCOSE METER'), LBLOBXFL: c(''), LBFAST: e("if(TAG = 'Fasting', 'Y', '')"),
      VISITNUM: c(''), EPOCH: e('epoch(LBDTC)'), LBDTC: e("dtc(RDATE, 'YYYYMMDD', concat(substr(RTIME, 1, 2), ':', substr(RTIME, 3, 2)))"), LBDY: e('studyday(LBDTC)'),
    },
  },
  CE: {
    source: 'HYPO', perm: ['CEGRPID', 'CEDECOD', 'CECAT', 'CESCAT', 'CEPRESP', 'CEOCCUR', 'EPOCH', 'CESTDTC', 'CESTDY'], sort: ['USUBJID', 'CESTDTC'],
    rules: {
      ...ID('CE'), CESEQ: { kind: 'seq' }, CEGRPID: e("concat('HYPO-', EPISODE)"), CETERM: c('Hypoglycaemia'), CEDECOD: c('Hypoglycaemia'), CECAT: c('HYPOGLYCAEMIC EPISODE'), CESCAT: e(LEVEL),
      CEPRESP: c('Y'), CEOCCUR: c('Y'), EPOCH: e('epoch(CESTDTC)'), CESTDTC: e("dtc(HYPODAT, 'DD-MMM-YYYY', HYPOTIM)"), CESTDY: e('studyday(CESTDTC)'),
    },
  },
}
export const INS_DOMAINS = Object.keys(INS_REF)
export const INS_RELREC: RelDef[] = [{ id: 'HYPO', label: 'Each hypoglycaemic episode (CE) and the meter reading taken during it (LB), by group ID', a: { domain: 'CE', key: 'CEGRPID' }, b: { domain: 'LB', key: 'LBGRPID' }, group: true }]
export function insReferenceSpec(domain: string, ver: Version): DomainSpec {
  const r = INS_REF[domain]; if (!r) throw new Error(`No reference mapping for ${domain} in ${INS_STUDY.id}`)
  const vars = varsOf(domain, ver).filter((m) => (m.core !== 'Perm' || r.perm.includes(m.name) || (ver === '4.0d' && m.name === 'SUBJID')) && r.rules[m.name]).map((m) => m.name)
  return { domain, source: r.source ?? domain, vars, rules: Object.fromEntries(vars.map((v) => [v, r.rules[v]])), sort: r.sort, ...(r.filter ? { filter: r.filter } : {}) }
}
let dmCache: Map<string, OutRow> | null = null
const base = (): StudyData => ({ forms: insRaw().forms, studyId: INS_STUDY.id, visits: INS_VISITS, arms: INS_ARMS, sites: INS_SITES })
export function insData(): StudyData {
  dmCache ??= new Map(build(insReferenceSpec('DM', '3.4'), base()).rows.map((r) => [r.__subj, r]))
  return { ...base(), refDm: dmCache }
}
export const INS_PACK: StudyPack = {
  ...INS_STUDY, domains: INS_DOMAINS, refSpec: insReferenceSpec, data: insData, formInfo: INS_FORM_INFO, rawFields: INS_RAW_FIELDS,
  relrec: INS_RELREC, relNeed: ['CE', 'LB'], facts: INS_FACTS, conventions: INS_CONVENTIONS, arms: INS_ARMS, sites: INS_SITES, visits: INS_VISITS,
}
