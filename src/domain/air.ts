// The fourth study: AIR-09-202, a phase 2 dose-ranging study of an inhaled drug in moderate
// asthma, built for respiratory findings (RE), questionnaires (QS) and inhaled exposure (EX).
// Spirometry comes from a central over-read vendor: three manoeuvres per session and a BEST row
// with the reportable values (the largest FEV1 and the largest FVC), with reversibility testing
// before and after a bronchodilator at screening. Symptoms come from a fictional 5-item
// questionnaire on the eCRF (real instruments are copyrighted), with a derived total. The drug is
// a dry-powder inhaler taken twice daily. Everything is fictional.

import { rng, addDays } from './util'
import { toEdc, toYmd } from './rawdate'
import { build, type DomainSpec, type OutRow, type Rule, type StudyData } from './engine'
import { varsOf, type Version } from './standards'
import type { Visit } from './study'
import type { Row } from './seed'
import type { StudyPack } from './studypack'
import { SORT } from './reference'

export const AIR_STUDY = {
  id: 'AIR-09-202',
  title: 'A randomised, double-blind, placebo-controlled, dose-ranging phase 2 study of inhaled AIR-09 for 12 weeks in adults with moderate asthma',
  short: 'Inhaled AIR-09 in moderate asthma',
  sponsor: 'Northwind Respiratory (fictional)',
  phase: 'Phase 2',
  indication: 'Moderate persistent asthma',
  design: 'Randomised 1:1:1, double-blind: AIR-09 100 µg or 200 µg, or placebo, one inhalation from a dry-powder inhaler twice daily for 12 weeks, on top of the subject’s usual reliever. Spirometry by a central over-read vendor; symptoms on a 5-item questionnaire at each visit',
}
export const AIR_VENDOR = 'Breathwise Spirometry Services (fictional)'
export const AIR_SITES = [
  { id: '501', name: 'Chest Clinic, Kolkata (fictional)', country: 'India', iso: 'IND' },
  { id: '502', name: 'Lungenzentrum Halle (fictional)', country: 'Germany', iso: 'DEU' },
]
export const AIR_ARMS = [
  { code: 'AIR100', name: 'AIR-09 100 ug twice daily', dose: 100 },
  { code: 'AIR200', name: 'AIR-09 200 ug twice daily', dose: 200 },
  { code: 'PBO', name: 'Placebo twice daily', dose: 0 },
]
const V = (raw: string, num: number, name: string, day: number, epoch: Visit['epoch'] = 'TREATMENT'): Visit => ({ raw, num, name, day, lo: day - 3, hi: day + 3, epoch, vs: [] })
export const AIR_VISITS: Visit[] = [
  { raw: 'Screening', num: 1, name: 'SCREENING', day: -14, lo: -28, hi: -1, epoch: 'SCREENING', vs: [] },
  V('Day 1', 2, 'DAY 1', 1), V('Week 2', 3, 'WEEK 2', 15), V('Week 4', 4, 'WEEK 4', 29), V('Week 8', 5, 'WEEK 8', 57), V('Week 12', 6, 'WEEK 12', 85),
  V('Follow-up', 7, 'FOLLOW-UP', 99, 'FOLLOW-UP'),
]
export const ASDS_ITEMS = [
  ['ASDS01', 'ASDS1-Daytime Wheeze'], ['ASDS02', 'ASDS1-Night-time Waking'], ['ASDS03', 'ASDS1-Breathless on Exertion'], ['ASDS04', 'ASDS1-Chest Tightness'], ['ASDS05', 'ASDS1-Reliever Use'],
] as const
const ANSWERS = ['None', 'Mild', 'Moderate', 'Severe', 'Very severe']
export const AIR_FORM_INFO: Record<string, { name: string; source: string; note: string }> = {
  DM: { name: 'Demographics', source: 'EDC', note: 'One row per subject screened.' },
  IC: { name: 'Informed consent', source: 'EDC', note: 'One row per subject.' },
  IRT: { name: 'Randomisation (IRT)', source: 'IRT', note: 'One row per randomised subject: arm code (unblinded at lock) and date.' },
  INH: { name: 'Inhaler dispensing', source: 'EDC', note: 'One row per inhaler dispensed: the dates the subject used it (first and last dose) and the kit number. Dosing is twice daily; the form is blinded.' },
  SPI: { name: 'Spirometry (vendor)', source: 'Vendor', note: `From ${AIR_VENDOR}: one row per manoeuvre (TRIAL 1 to 3) and one BEST row per session with the reportable values (largest FEV1, largest FVC, their ratio and FEV1 as % of predicted). TIMING is PRE-BD or POST-BD at screening (reversibility) and PRE-DOSE afterwards. Dates YYYYMMDD, times HHMM. A session with no acceptable manoeuvre has an empty BEST row with a comment.` },
  ASD: { name: 'Airway Symptom Diary Score', source: 'EDC', note: 'The fictional 5-item questionnaire, completed at the clinic visit about the past week: each item None, Mild, Moderate, Severe or Very severe (scored 0 to 4).' },
  SV: { name: 'Visit dates', source: 'EDC', note: 'One row per visit attended.' },
}
const F = (pairs: [string, string][]) => pairs.map(([name, label]) => ({ name, label }))
export const AIR_RAW_FIELDS: Record<string, { name: string; label: string }[]> = {
  DM: F([['SUBJID', 'Subject number'], ['SITEID', 'Site'], ['DMDAT', 'Date of collection'], ['BRTHDAT', 'Date of birth'], ['SEX', 'Sex'], ['RACE', 'Race'], ['ETHNIC', 'Ethnicity']]),
  IC: F([['SUBJID', 'Subject number'], ['ICDAT', 'Date informed consent signed']]),
  IRT: F([['SUBJID', 'Subject number'], ['RANDNO', 'Randomisation number'], ['RANDDT', 'Randomisation date (ISO 8601)'], ['RANDARM', 'Arm (code)']]),
  INH: F([['SUBJID', 'Subject number'], ['VISIT', 'Visit dispensed'], ['KITNO', 'Kit number'], ['STDAT', 'First dose from this inhaler'], ['ENDAT', 'Last dose from this inhaler']]),
  SPI: F([['SUBJID', 'Subject number'], ['VISIT', 'Visit'], ['TESTDATE', 'Test date (YYYYMMDD)'], ['TESTTIME', 'Test time (HHMM)'], ['TIMING', 'Timing (PRE-BD, POST-BD, PRE-DOSE)'], ['TRIAL', 'Manoeuvre (1 to 3, or BEST)'], ['FEV1', 'FEV1 (L)'], ['FVC', 'FVC (L)'], ['RATIO', 'FEV1/FVC (%)'], ['PCTPRED', 'FEV1 % predicted'], ['GRADE', 'Session quality grade (A to F)'], ['COMMENT', 'Comment']]),
  ASD: F([['SUBJID', 'Subject number'], ['VISIT', 'Visit'], ['ASDDAT', 'Date completed'], ...ASDS_ITEMS.map(([c, t], i) => [`ITEM${i + 1}`, `${t.split('-')[1]} (item ${i + 1})`] as [string, string])]),
  SV: F([['SUBJID', 'Subject number'], ['VISIT', 'Visit'], ['VISDAT', 'Visit date']]),
}
export const AIR_FACTS: { what: string; value: string }[] = [
  { what: 'Phase', value: 'Phase 2, randomised 1:1:1, double-blind, placebo-controlled, 12 weeks' },
  { what: 'Population', value: 'Adults with moderate asthma: pre-bronchodilator FEV1 40 to 85% of predicted, and reversibility of at least 12% and 200 mL after a bronchodilator at screening' },
  { what: 'Treatment', value: 'One inhalation of AIR-09 100 µg, 200 µg or placebo from a dry-powder inhaler, morning and evening' },
  { what: 'Primary endpoint', value: 'Change from baseline in trough (pre-dose) FEV1 at Week 12' },
  { what: 'Spirometry', value: `ATS/ERS standards; at least 3 manoeuvres per session, over-read centrally by ${AIR_VENDOR}, which reports the largest FEV1 and largest FVC from acceptable manoeuvres` },
  { what: 'Symptoms', value: 'Airway Symptom Diary Score: a fictional 5-item questionnaire (0 to 4 per item; total 0 to 20, only when all 5 are answered)' },
]
export const AIR_CONVENTIONS: { topic: string; rule: string }[] = [
  { topic: 'USUBJID', rule: 'STUDYID, a hyphen, and SUBJID: AIR-09-202-501-004.' },
  { topic: 'DM reference dates', rule: 'RFSTDTC and RFXSTDTC: the first dose (first inhaler’s start date); RFENDTC and RFXENDTC: the last dose; RFPENDTC: the latest visit.' },
  { topic: 'RE: which rows', rule: 'Only the vendor’s BEST row of each session (TRIAL = BEST): the reportable values. Single manoeuvres are not submitted.' },
  { topic: 'RE: tests', rule: 'One record per test per session: RETESTCD FEV1 and FVC (L), FEV1FVC (%), and FEV1PP for FEV1 as % of predicted (a sponsor-defined code: check the current RE test codelist before using it in a real study). RECAT SPIROMETRY, RENAM the vendor.' },
  { topic: 'RE: timing', rule: 'RETPT PRE-BRONCHODILATOR or POST-BRONCHODILATOR at screening, PRE-DOSE afterwards; RETPTNUM 1 (pre) or 2 (post). REDTC the test date and time. RELOBXFL on the last pre-dose value before the first dose.' },
  { topic: 'RE: no acceptable manoeuvre', rule: 'An empty BEST row: RESTAT NOT DONE and REREASND the comment in upper case; the records are kept.' },
  { topic: 'QS', rule: 'One record per item per visit: QSCAT AIRWAY SYMPTOM DIARY SCORE (a fictional instrument), QSTESTCD ASDS01 to ASDS05, QSTEST as in the item list; QSORRES the answer as collected, QSSTRESC and QSSTRESN its score 0 to 4. An unanswered item has no record.' },
  { topic: 'QS: total', rule: 'A derived total ASDSTOT (QSTEST ASDS1-Total Score) when all five items are answered: QSORRES null, QSSTRESC and QSSTRESN the sum, QSDRVFL Y. QSLOBXFL on each item’s and the total’s last value on or before the first dose.' },
  { topic: 'EX', rule: 'One record per inhaler: EXTRT AIR-09 or PLACEBO from the IRT arm; EXDOSE 100 or 200 (0 for placebo), EXDOSU ug, EXDOSFRM POWDER, METERED, EXDOSFRQ BID, EXROUTE RESPIRATORY (INHALATION); EXSTDTC and EXENDTC the first and last dose from that inhaler.' },
]

// ---------- generation ----------
export const AIR_PLANTED: { noAcceptable?: string; missingItem?: string; reversibilityFail?: string } = {}
const pad = (n: number) => String(n).padStart(3, '0')
const hhmm = (h: number, m: number) => `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}`
let cache: { forms: Record<string, Row[]>; subjects: { subj: string; arm?: string }[] } | null = null
export function airRaw() {
  if (cache) return cache
  const r = rng(9202)
  const forms: Record<string, Row[]> = { DM: [], IC: [], IRT: [], INH: [], SPI: [], ASD: [], SV: [] }
  let id = 0
  const push = (form: string, row: Record<string, string>) => forms[form].push({ __id: `${form}${++id}`, ...row } as Row)
  const subjects: { subj: string; arm?: string }[] = []
  let n = 0, randomised = 0, randno = 3000
  const f2 = (x: number) => x.toFixed(2)
  const session = (subj: string, visit: string, date: string, time: [number, number], timing: string, fev: number, fvc: number, pred: number, bad = false) => {
    const trials = [0, 1, 2].map(() => ({ fev: fev * (1 - Math.abs(r.normal(0, 0.03))), fvc: fvc * (1 - Math.abs(r.normal(0, 0.03))) }))
    trials[r.int(0, 2)].fev = fev; trials[r.int(0, 2)].fvc = fvc
    const grade = bad ? 'F' : r.pick(['A', 'A', 'A', 'B', 'B', 'C'])
    trials.forEach((t, i) => push('SPI', { SUBJID: subj, VISIT: visit, TESTDATE: toYmd(date), TESTTIME: hhmm(time[0], time[1] + i * 2), TIMING: timing, TRIAL: String(i + 1), FEV1: f2(t.fev), FVC: f2(t.fvc), RATIO: String(Math.round((t.fev / t.fvc) * 100)), PCTPRED: String(Math.round((t.fev / pred) * 100)), GRADE: grade, COMMENT: '' }))
    const bf = Math.max(...trials.map((t) => t.fev)), bv = Math.max(...trials.map((t) => t.fvc))
    push('SPI', bad
      ? { SUBJID: subj, VISIT: visit, TESTDATE: toYmd(date), TESTTIME: hhmm(time[0], time[1] + 6), TIMING: timing, TRIAL: 'BEST', FEV1: '', FVC: '', RATIO: '', PCTPRED: '', GRADE: grade, COMMENT: 'No acceptable manoeuvres' }
      : { SUBJID: subj, VISIT: visit, TESTDATE: toYmd(date), TESTTIME: hhmm(time[0], time[1] + 6), TIMING: timing, TRIAL: 'BEST', FEV1: f2(bf), FVC: f2(bv), RATIO: String(Math.round((bf / bv) * 100)), PCTPRED: String(Math.round((bf / pred) * 100)), GRADE: grade, COMMENT: '' })
    return bf
  }
  while (randomised < 45) {
    n++
    const site = n % 2 ? '501' : '502'
    const subj = `${site}-${pad(n)}`
    const d1 = addDays('2026-02-02', Math.floor(randomised * 2.1) + r.int(0, 1))
    const screen = addDays(d1, -r.int(10, 18))
    const sex = r.chance(0.55) ? 'Female' : 'Male'
    const age = 22 + r.next() * 40, height = sex === 'Male' ? 172 : 160
    const pred = (sex === 'Male' ? 0.043 * height - 0.029 * age - 2.49 : 0.0395 * height - 0.025 * age - 2.6)
    push('DM', { SUBJID: subj, SITEID: site, DMDAT: toEdc(screen), BRTHDAT: toEdc(addDays(screen, -Math.round(age * 365.25))), SEX: sex, RACE: site === '501' ? 'Asian' : r.pick(['White', 'White', 'Black or African American']), ETHNIC: 'Not Hispanic or Latino' })
    push('IC', { SUBJID: subj, ICDAT: toEdc(screen) })
    push('SV', { SUBJID: subj, VISIT: 'Screening', VISDAT: toEdc(screen) })
    const base = pred * (0.55 + r.next() * 0.25), fvcRatio = 0.62 + r.next() * 0.1
    const fails = n % 7 === 3
    const rev = fails ? 1.04 + r.next() * 0.05 : 1.13 + r.next() * 0.12
    session(subj, 'Screening', screen, [8, 10], 'PRE-BD', base, base / fvcRatio, pred)
    session(subj, 'Screening', screen, [8, 40], 'POST-BD', base * rev, (base * rev) / (fvcRatio + 0.03), pred)
    if (fails) { subjects.push({ subj }); AIR_PLANTED.reversibilityFail ??= subj; continue }
    randomised++
    const arm = AIR_ARMS[(randomised + r.int(0, 2)) % 3].code
    subjects.push({ subj, arm })
    push('IRT', { SUBJID: subj, RANDNO: String(++randno), RANDDT: d1, RANDARM: arm })
    const eff = { AIR100: 0.14, AIR200: 0.22, PBO: 0.03 }[arm]! * (0.6 + r.next() * 0.8)
    const visits: [string, number][] = [['Day 1', 1], ['Week 2', 15], ['Week 4', 29], ['Week 8', 57], ['Week 12', 85]]
    let lastDose = d1
    for (const [vis, day] of visits) {
      const date = addDays(d1, day - 1 + (day > 1 ? r.int(-2, 2) : 0))
      push('SV', { SUBJID: subj, VISIT: vis, VISDAT: toEdc(date) })
      const wk = (day - 1) / 7, gain = eff * Math.min(1, wk / 4)
      const bad = !AIR_PLANTED.noAcceptable && vis === 'Week 8' && randomised === 12
      if (bad) AIR_PLANTED.noAcceptable = subj
      session(subj, vis, date, [7, 30 + r.int(0, 20)], 'PRE-DOSE', base + gain + r.normal(0, 0.1), (base + gain) / fvcRatio + r.normal(0, 0.1), pred, bad)
      // Symptoms: better as FEV1 improves.
      const sev = Math.max(0, 2.2 - gain * 6 + r.normal(0, 0.6))
      const items = [0, 1, 2, 3, 4].map(() => Math.max(0, Math.min(4, Math.round(sev + r.normal(0, 0.7)))))
      const miss = !AIR_PLANTED.missingItem && vis === 'Week 4' && randomised === 20
      if (miss) AIR_PLANTED.missingItem = subj
      push('ASD', { SUBJID: subj, VISIT: vis, ASDDAT: toEdc(date), ...Object.fromEntries(items.map((x, i) => [`ITEM${i + 1}`, miss && i === 2 ? '' : ANSWERS[x]])) })
      if (vis !== 'Day 1') {
        const prev = visits[visits.findIndex(([v]) => v === vis) - 1][0]
        push('INH', { SUBJID: subj, VISIT: prev, KITNO: `I${r.int(10000, 99999)}`, STDAT: toEdc(lastDose), ENDAT: toEdc(addDays(date, -1)) })
        lastDose = date
      }
    }
    push('INH', { SUBJID: subj, VISIT: 'Week 12', KITNO: `I${r.int(10000, 99999)}`, STDAT: toEdc(lastDose), ENDAT: toEdc(lastDose) })
    push('SV', { SUBJID: subj, VISIT: 'Follow-up', VISDAT: toEdc(addDays(lastDose, 14 + r.int(-1, 2))) })
  }
  cache = { forms, subjects }
  return cache
}

// ---------- reference mapping ----------
const e = (expr: string): Rule => ({ kind: 'expr', expr })
const c = (value: string): Rule => ({ kind: 'const', value })
const cp = (field: string): Rule => ({ kind: 'copy', field })
const ID = (d: string) => ({ STUDYID: c(AIR_STUDY.id), DOMAIN: c(d), USUBJID: e(`concat('${AIR_STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID') })
const score = (f: string) => `if(${f} = 'None', 0, if(${f} = 'Mild', 1, if(${f} = 'Moderate', 2, if(${f} = 'Severe', 3, if(${f} = 'Very severe', 4, '')))))`
type Ref = { rules: Record<string, Rule>; perm: string[]; source?: string; filter?: string; transpose?: DomainSpec['transpose']; parts?: { source: string; rules: Record<string, Rule>; filter?: string; transpose?: DomainSpec['transpose'] }[] }
const QS_COMMON = { ...ID('QS'), QSSEQ: { kind: 'seq' } as Rule, QSCAT: c('AIRWAY SYMPTOM DIARY SCORE'), VISITNUM: e('visitnum(VISIT, ASDDAT)'), VISIT: e('visitname(VISIT, ASDDAT)'), EPOCH: e('epoch(QSDTC)'), QSDTC: e("dtc(ASDDAT, 'DD-MMM-YYYY')"), QSDY: e('studyday(QSDTC)') }
const AIR_REF: Record<string, Ref> = {
  DM: {
    perm: ['BRTHDTC', 'ETHNIC', 'DMDTC', 'DMDY'],
    rules: {
      ...ID('DM'),
      RFSTDTC: e("dtc(subj('INH', 'STDAT', 'min'), 'DD-MMM-YYYY')"), RFENDTC: e("dtc(subj('INH', 'ENDAT', 'max'), 'DD-MMM-YYYY')"),
      RFXSTDTC: e("dtc(subj('INH', 'STDAT', 'min'), 'DD-MMM-YYYY')"), RFXENDTC: e("dtc(subj('INH', 'ENDAT', 'max'), 'DD-MMM-YYYY')"),
      RFICDTC: e("dtc(subj('IC', 'ICDAT', 'first'), 'DD-MMM-YYYY')"), RFPENDTC: e("dtc(subj('SV', 'VISDAT', 'max'), 'DD-MMM-YYYY')"),
      DTHDTC: c(''), DTHFL: c(''), SITEID: cp('SITEID'), BRTHDTC: e("dtc(BRTHDAT, 'DD-MMM-YYYY')"), AGE: e("age(BRTHDAT, subj('IC', 'ICDAT', 'first'))"), AGEU: c('YEARS'),
      SEX: { kind: 'recode', field: 'SEX', table: { Female: 'F', Male: 'M' } }, RACE: e('upper(RACE)'), ETHNIC: e('upper(ETHNIC)'),
      ARMCD: e("irt('RANDARM')"), ARM: e("armname(irt('RANDARM'))"), ACTARMCD: e("if(present(subj('INH', 'STDAT', 'min')), irt('RANDARM'), '')"), ACTARM: e('armname(ACTARMCD)'),
      ARMNRS: e("if(isblank(irt('RANDARM')), 'SCREEN FAILURE', '')"), ACTARMUD: c(''), COUNTRY: e('country(SITEID)'), DMDTC: e("dtc(DMDAT, 'DD-MMM-YYYY')"), DMDY: e('studyday(DMDTC, RFSTDTC)'),
    },
  },
  RE: {
    source: 'SPI', filter: "TRIAL = 'BEST'", perm: ['RECAT', 'RESTAT', 'REREASND', 'RENAM', 'RELOBXFL', 'VISIT', 'EPOCH', 'REDY', 'RETPT', 'RETPTNUM'],
    transpose: { tests: [{ code: 'FEV1', field: 'FEV1' }, { code: 'FVC', field: 'FVC' }, { code: 'FEV1FVC', field: 'RATIO' }, { code: 'FEV1PP', field: 'PCTPRED' }], drop: '' },
    rules: {
      ...ID('RE'), RESEQ: { kind: 'seq' }, RETESTCD: cp('__TESTCD'), RETEST: e("ctdecode('RETESTCD', __TESTCD)"), RECAT: c('SPIROMETRY'),
      REORRES: cp('__RESULT'), REORRESU: e("if(isblank(__RESULT), '', if(__TESTCD in ('FEV1', 'FVC'), 'L', '%'))"),
      RESTRESC: cp('__RESULT'), RESTRESN: e('num(__RESULT)'), RESTRESU: e('REORRESU'),
      RESTAT: e("if(isblank(__RESULT), 'NOT DONE', '')"), REREASND: e("if(isblank(__RESULT), upper(COMMENT), '')"), RENAM: c(AIR_VENDOR),
      RELOBXFL: { kind: 'lobxfl', result: 'RESTRESC', dtc: 'REDTC', by: 'RETESTCD' },
      VISITNUM: e('visitnum(VISIT, TESTDATE)'), VISIT: e('visitname(VISIT, TESTDATE)'), EPOCH: e('epoch(REDTC)'),
      REDTC: e("dtc(TESTDATE, 'YYYYMMDD', TESTTIME)"), REDY: e('studyday(REDTC)'),
      RETPT: e("if(TIMING = 'PRE-BD', 'PRE-BRONCHODILATOR', if(TIMING = 'POST-BD', 'POST-BRONCHODILATOR', 'PRE-DOSE'))"), RETPTNUM: e("if(TIMING = 'POST-BD', 2, 1)"),
    },
  },
  QS: {
    source: 'ASD', perm: ['QSDRVFL', 'VISIT', 'EPOCH', 'QSDY'],
    transpose: { tests: ASDS_ITEMS.map(([code], i) => ({ code, field: `ITEM${i + 1}` })), drop: 'isblank(__RESULT)' },
    rules: { ...QS_COMMON, QSLOBXFL: { kind: 'lobxfl', result: 'QSSTRESC', dtc: 'QSDTC', by: 'QSTESTCD' }, QSTESTCD: cp('__TESTCD'), QSTEST: e("ctdecode('ASDSTC', __TESTCD)"), QSORRES: cp('__RESULT'), QSSTRESC: e(`str(${score('__RESULT')})`), QSSTRESN: e(score('__RESULT')), QSDRVFL: c('') },
    parts: [{
      source: 'ASD', filter: 'present(ITEM1) and present(ITEM2) and present(ITEM3) and present(ITEM4) and present(ITEM5)',
      rules: { ...QS_COMMON, QSLOBXFL: { kind: 'lobxfl', result: 'QSSTRESC', dtc: 'QSDTC', by: 'QSTESTCD' }, QSTESTCD: c('ASDSTOT'), QSTEST: c('ASDS1-Total Score'), QSORRES: c(''), QSSTRESC: e(`str(${[1, 2, 3, 4, 5].map((i) => score(`ITEM${i}`)).join(' + ')})`), QSSTRESN: e([1, 2, 3, 4, 5].map((i) => score(`ITEM${i}`)).join(' + ')), QSDRVFL: c('Y') },
    }],
  },
  EX: {
    source: 'INH', perm: ['EXDOSFRQ', 'EXROUTE', 'EPOCH', 'EXSTDY', 'EXENDY'],
    rules: {
      ...ID('EX'), EXSEQ: { kind: 'seq' }, EXTRT: e("if(irt('RANDARM') = 'PBO', 'PLACEBO', 'AIR-09')"),
      EXDOSE: e("if(irt('RANDARM') = 'AIR100', 100, if(irt('RANDARM') = 'AIR200', 200, 0))"), EXDOSU: c('ug'), EXDOSFRM: c('POWDER, METERED'), EXDOSFRQ: c('BID'), EXROUTE: c('RESPIRATORY (INHALATION)'),
      EPOCH: e('epoch(EXSTDTC)'), EXSTDTC: e("dtc(STDAT, 'DD-MMM-YYYY')"), EXENDTC: e("dtc(ENDAT, 'DD-MMM-YYYY')"), EXSTDY: e('studyday(EXSTDTC)'), EXENDY: e('studyday(EXENDTC)'),
    },
  },
}
export const AIR_DOMAINS = Object.keys(AIR_REF)
export function airReferenceSpec(domain: string, ver: Version): DomainSpec {
  const r = AIR_REF[domain]; if (!r) throw new Error(`No reference mapping for ${domain} in ${AIR_STUDY.id}`)
  const vars = varsOf(domain, ver).filter((m) => (m.core !== 'Perm' || r.perm.includes(m.name) || (ver !== '3.4' && m.name === 'SUBJID')) && r.rules[m.name]).map((m) => m.name)
  const pick = (rules: Record<string, Rule>) => Object.fromEntries(vars.filter((v) => rules[v]).map((v) => [v, rules[v]]))
  return {
    domain, source: r.source ?? domain, vars, rules: pick(r.rules), sort: SORT[domain] ?? ['USUBJID'],
    ...(r.filter ? { filter: r.filter } : {}), ...(r.transpose ? { transpose: r.transpose } : {}),
    ...(r.parts ? { parts: r.parts.map((p) => ({ ...p, rules: pick(p.rules) })) } : {}),
  }
}
let dmCache: Map<string, OutRow> | null = null
const base = (): StudyData => ({ forms: airRaw().forms, studyId: AIR_STUDY.id, visits: AIR_VISITS, arms: AIR_ARMS, sites: AIR_SITES })
export function airData(): StudyData {
  dmCache ??= new Map(build(airReferenceSpec('DM', '3.4'), base()).rows.map((r) => [r.__subj, r]))
  return { ...base(), refDm: dmCache }
}
export const AIR_PACK: StudyPack = {
  ...AIR_STUDY, domains: AIR_DOMAINS, refSpec: airReferenceSpec, data: airData, formInfo: AIR_FORM_INFO, rawFields: AIR_RAW_FIELDS,
  relrec: [], relNeed: [], facts: AIR_FACTS, conventions: AIR_CONVENTIONS, arms: AIR_ARMS, sites: AIR_SITES, visits: AIR_VISITS,
}
