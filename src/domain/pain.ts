// The pain study PNR-18-203: chronic low back pain, with the outcome measured every day in an
// electronic diary. Participants rate their average and their worst pain over the last 24 hours on
// a 0 to 10 numeric rating scale (QS, with the recall period in QSEVLINT) and record how many
// rescue paracetamol tablets they took (CM, one record per day they took any). A 7-day baseline
// diary week comes before randomisation. A day the participant does not complete leaves no
// record: the diary creates none, so there is nothing to map, and weekly means belong to the
// analysis datasets, not to SDTM. The rating items are sponsor-defined (not a licensed
// instrument). Everything is fictional; paracetamol is named as the rescue medicine only.

import { rng, addDays } from './util'
import { toEdc } from './rawdate'
import { build, type DomainSpec, type OutRow, type Rule, type StudyData } from './engine'
import { varsOf, type Version } from './standards'
import type { Visit } from './study'
import type { Row } from './seed'
import type { StudyPack } from './studypack'

export const PAIN_STUDY = {
  id: 'PNR-18-203',
  title: 'A randomised, double-blind, placebo-controlled phase 2 study of Dorsavin (PNR-18) 50 mg twice daily for 12 weeks in adults with chronic low back pain',
  short: 'Dorsavin (PNR-18) in chronic low back pain: daily pain diary and rescue medicine',
  sponsor: 'Meadowlane Pharma (fictional)',
  phase: 'Phase 2',
  indication: 'Chronic low back pain',
  design: 'A 7-day baseline diary week at the end of screening, then randomisation 1:1 to Dorsavin 50 mg or placebo twice daily for 12 weeks; pain and rescue paracetamol recorded every evening in an electronic diary',
}
export const PAIN_DIARY = 'Evenfield ePRO (fictional)'
export const PAIN_SITES = [
  { id: '601', name: 'Northshore Spine and Pain Clinic (fictional)', country: 'Australia', iso: 'AUS' },
  { id: '602', name: 'Centre Dorsal de Lyon-Est (fictional)', country: 'France', iso: 'FRA' },
]
export const PAIN_ARMS = [{ code: 'PNR50', name: 'Dorsavin 50 mg twice daily' }, { code: 'PBO', name: 'Placebo twice daily' }]
const V = (raw: string, num: number, name: string, day: number, lo: number, hi: number): Visit => ({ raw, num, name, day, lo, hi, epoch: day < 1 ? 'SCREENING' : 'TREATMENT', vs: [] })
export const PAIN_VISITS: Visit[] = [V('Screening', 1, 'SCREENING', -7, -14, -1), V('Week 0', 2, 'WEEK 0', 1, 1, 1), V('Week 4', 3, 'WEEK 4', 29, 26, 32), V('Week 8', 4, 'WEEK 8', 57, 54, 60), V('Week 12', 5, 'WEEK 12', 85, 82, 88)]
export const PAIN_FORM_INFO: Record<string, { name: string; source: string; note: string }> = {
  DM: { name: 'Demographics', source: 'EDC', note: 'One row per participant screened.' },
  IC: { name: 'Informed consent', source: 'EDC', note: 'One row per participant.' },
  IRT: { name: 'Randomisation (IRT)', source: 'IRT', note: 'One row per randomised participant: the arm code (unblinded at lock).' },
  DISP: { name: 'Study drug dispensing', source: 'EDC', note: 'One row per bottle dispensed (every 4 weeks): the first and last dose taken from it.' },
  DIARY: { name: 'Daily pain diary (vendor)', source: 'Vendor', note: `From ${PAIN_DIARY}: one row per evening entry, with the date and time it was completed, average and worst pain over the last 24 hours (0 = no pain to 10 = worst pain imaginable), and the number of rescue paracetamol 500 mg tablets taken that day. The diary opens at 18:00 and closes at midnight; a day missed has no row.` },
  SV: { name: 'Visits', source: 'EDC', note: 'One row per visit.' },
}
const F = (pairs: [string, string][]) => pairs.map(([name, label]) => ({ name, label }))
export const PAIN_RAW_FIELDS: Record<string, { name: string; label: string }[]> = {
  DM: F([['SUBJID', 'Participant number'], ['SITEID', 'Site'], ['DMDAT', 'Date of collection'], ['BRTHDAT', 'Date of birth'], ['SEX', 'Sex'], ['RACE', 'Race'], ['ETHNIC', 'Ethnicity']]),
  IC: F([['SUBJID', 'Participant number'], ['ICDAT', 'Date informed consent signed']]),
  IRT: F([['SUBJID', 'Participant number'], ['RANDNO', 'Randomisation number'], ['RANDDT', 'Randomisation date (ISO 8601)'], ['RANDARM', 'Arm (code)']]),
  DISP: F([['SUBJID', 'Participant number'], ['BOTTLE', 'Bottle number'], ['FIRSTDAT', 'First dose from the bottle'], ['FIRSTTIM', 'Time of the first dose (first bottle, taken at the clinic)'], ['LASTDAT', 'Last dose from the bottle']]),
  DIARY: F([['SUBJID', 'Participant number'], ['ENTRYDTM', 'Completed (ISO 8601)'], ['AVGPAIN', 'Average pain, last 24 h (0–10)'], ['WORSTPAIN', 'Worst pain, last 24 h (0–10)'], ['RESCUE', 'Rescue tablets taken today']]),
  SV: F([['SUBJID', 'Participant number'], ['VISIT', 'Visit'], ['VISDAT', 'Date']]),
}
export const PAIN_FACTS: { what: string; value: string }[] = [
  { what: 'Phase', value: 'Phase 2, double-blind, randomised 1:1, placebo-controlled, 12 weeks after a 7-day baseline diary week' },
  { what: 'Population', value: 'Adults with low back pain for at least 3 months and a mean average pain of 5 or more over the baseline week' },
  { what: 'Primary outcome', value: 'Change from baseline to Week 12 in the weekly mean of the daily average pain ratings (derived in ADaM)' },
  { what: 'Rescue medicine', value: 'Paracetamol 500 mg tablets, up to 8 a day (4 g), recorded each evening in the diary' },
]
export const PAIN_CONVENTIONS: { topic: string; rule: string }[] = [
  { topic: 'USUBJID', rule: 'STUDYID, a hyphen, and SUBJID: PNR-18-203-601-007.' },
  { topic: 'QS', rule: 'One record per item per diary entry: QSCAT DAILY PAIN DIARY; QSTESTCD PAIN01 (Average Pain Intensity in Past 24 Hours) and PAIN02 (Worst Pain Intensity in Past 24 Hours), sponsor-defined. QSORRES as entered, QSSTRESC and QSSTRESN the same number. QSEVLINT -P1D (the last 24 hours). QSDTC the date and time the entry was completed. No VISITNUM: the diary is completed at home.' },
  { topic: 'QS: baseline and missed days', rule: 'The baseline diary week is part of screening (EPOCH SCREENING); screen failures’ entries are submitted too. QSLOBXFL on each item’s last entry before the first dose. A missed day has no record; no weekly means in SDTM (they are analysis values).' },
  { topic: 'CM', rule: 'One record per day rescue paracetamol was taken: CMTRT PARACETAMOL, CMCAT RESCUE MEDICATION, CMINDC LOW BACK PAIN, CMDOSE 500, CMDOSU mg, CMDOSTOT the tablets × 500, CMDOSFRQ null, CMROUTE ORAL, CMSTDTC and CMENDTC the diary date. No record for 0 tablets. A day above the protocol’s 4 g limit is kept as reported.' },
  { topic: 'DM and EX: the first dose', rule: 'The first dose is taken at the clinic and its time recorded: RFSTDTC, RFXSTDTC and the first EXSTDTC carry it, so the Day 1 evening diary entry comes after the first dose.' },
  { topic: 'EX', rule: 'One record per bottle: EXTRT DORSAVIN or PLACEBO, EXDOSE 50 (0 for placebo), EXDOSU mg, EXDOSFRM TABLET, EXDOSFRQ BID, EXROUTE ORAL, EXSTDTC and EXENDTC the first and last dose from the bottle.' },
]

// ---------- generation ----------
export const PAIN_PLANTED: { overLimit?: string; missedDays?: string; screenFail?: string } = {}
const pad = (n: number) => String(n).padStart(3, '0')
let cache: { forms: Record<string, Row[]>; subjects: { subj: string; arm?: string }[] } | null = null
export function painRaw() {
  if (cache) return cache
  const r = rng(18203)
  const forms: Record<string, Row[]> = { DM: [], IC: [], IRT: [], DISP: [], DIARY: [], SV: [] }
  let id = 0
  const push = (form: string, row: Record<string, string>) => forms[form].push({ __id: `${form}${++id}`, ...row } as Row)
  const subjects: { subj: string; arm?: string }[] = []
  let n = 0, randomised = 0, randno = 4400
  while (randomised < 30) {
    n++
    const site = n % 2 ? '601' : '602', subj = `${site}-${pad(n)}`
    const scr = addDays('2026-01-12', n * 2), d1 = addDays(scr, 8)
    push('DM', { SUBJID: subj, SITEID: site, DMDAT: toEdc(scr), BRTHDAT: toEdc(addDays(scr, -Math.round((28 + r.next() * 40) * 365.25))), SEX: r.chance(0.55) ? 'Female' : 'Male', RACE: r.pick(['White', 'White', 'Asian', 'Black or African American']), ETHNIC: 'Not Hispanic or Latino' })
    push('IC', { SUBJID: subj, ICDAT: toEdc(scr) })
    push('SV', { SUBJID: subj, VISIT: 'Screening', VISDAT: toEdc(scr) })
    const base = 5 + r.int(-1, 3)
    const arm = (randomised + 1) % 2 ? 'PNR50' : 'PBO', fail = base < 5
    const diaryDay = (date: string, studyDay: number) => {
      if (r.chance(0.06) || (randomised === 8 && studyDay >= 30 && studyDay <= 33)) { if (randomised === 8) PAIN_PLANTED.missedDays = subj; return }
      const drop = studyDay > 0 ? (arm === 'PNR50' ? 2.2 : 1.1) * Math.min(1, studyDay / 42) : 0
      const avg = Math.max(0, Math.min(10, Math.round(base - drop + r.int(-1, 1))))
      const worst = Math.min(10, avg + r.int(1, 2))
      let resc = avg >= 7 ? r.int(2, 6) : avg >= 5 && r.chance(0.4) ? r.int(1, 3) : 0
      if (randomised === 21 && studyDay === 15) { resc = 10; PAIN_PLANTED.overLimit = subj }
      push('DIARY', { SUBJID: subj, ENTRYDTM: `${date}T${String(18 + r.int(0, 4)).padStart(2, '0')}:${String(r.int(0, 59)).padStart(2, '0')}`, AVGPAIN: String(avg), WORSTPAIN: String(worst), RESCUE: String(resc) })
    }
    for (let k = -7; k <= -1; k++) diaryDay(addDays(d1, k), k)
    if (fail) { subjects.push({ subj }); PAIN_PLANTED.screenFail ??= subj; continue }
    randomised++
    subjects.push({ subj, arm })
    push('IRT', { SUBJID: subj, RANDNO: String(++randno), RANDDT: d1, RANDARM: arm })
    for (let b = 0; b < 3; b++) push('DISP', { SUBJID: subj, BOTTLE: `B${String(randno).slice(-3)}${b + 1}`, FIRSTDAT: toEdc(addDays(d1, b * 28)), FIRSTTIM: b === 0 ? `${String(9 + r.int(0, 2)).padStart(2, '0')}:${String(r.int(0, 59)).padStart(2, '0')}` : '', LASTDAT: toEdc(addDays(d1, b * 28 + 27)) })
    for (const [vis, day] of [['Week 0', 1], ['Week 4', 29], ['Week 8', 57], ['Week 12', 85]] as [string, number][]) push('SV', { SUBJID: subj, VISIT: vis, VISDAT: toEdc(addDays(d1, day - 1)) })
    for (let day = 1; day <= 84; day++) diaryDay(addDays(d1, day - 1), day)
  }
  cache = { forms, subjects }
  return cache
}

// ---------- reference mapping ----------
const e = (expr: string): Rule => ({ kind: 'expr', expr })
const c = (value: string): Rule => ({ kind: 'const', value })
const cp = (field: string): Rule => ({ kind: 'copy', field })
const ID = (d: string) => ({ STUDYID: c(PAIN_STUDY.id), DOMAIN: c(d), USUBJID: e(`concat('${PAIN_STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID') })
type Ref = { rules: Record<string, Rule>; perm: string[]; source?: string; filter?: string; sort: string[]; transpose?: DomainSpec['transpose'] }
const PAIN_REF: Record<string, Ref> = {
  DM: {
    perm: ['BRTHDTC', 'ETHNIC', 'DMDTC', 'DMDY'], sort: ['USUBJID'],
    rules: {
      ...ID('DM'), RFSTDTC: e("dtc(subj('DISP', 'FIRSTDAT', 'min'), 'DD-MMM-YYYY', subj('DISP', 'FIRSTTIM', 'first'))"), RFENDTC: e("dtc(subj('DISP', 'LASTDAT', 'max'), 'DD-MMM-YYYY')"),
      RFXSTDTC: e("dtc(subj('DISP', 'FIRSTDAT', 'min'), 'DD-MMM-YYYY', subj('DISP', 'FIRSTTIM', 'first'))"), RFXENDTC: e("dtc(subj('DISP', 'LASTDAT', 'max'), 'DD-MMM-YYYY')"),
      RFICDTC: e("dtc(subj('IC', 'ICDAT', 'first'), 'DD-MMM-YYYY')"), RFPENDTC: e("dtc(subj('SV', 'VISDAT', 'max'), 'DD-MMM-YYYY')"),
      DTHDTC: c(''), DTHFL: c(''), SITEID: cp('SITEID'), BRTHDTC: e("dtc(BRTHDAT, 'DD-MMM-YYYY')"), AGE: e("age(BRTHDAT, subj('IC', 'ICDAT', 'first'))"), AGEU: c('YEARS'),
      SEX: { kind: 'recode', field: 'SEX', table: { Female: 'F', Male: 'M' } }, RACE: e('upper(RACE)'), ETHNIC: e('upper(ETHNIC)'),
      ARMCD: e("irt('RANDARM')"), ARM: e("armname(irt('RANDARM'))"), ACTARMCD: e("if(present(subj('DISP', 'FIRSTDAT', 'min')), irt('RANDARM'), '')"), ACTARM: e('armname(ACTARMCD)'),
      ARMNRS: e("if(isblank(irt('RANDARM')), 'SCREEN FAILURE', '')"), ACTARMUD: c(''), COUNTRY: e('country(SITEID)'), DMDTC: e("dtc(DMDAT, 'DD-MMM-YYYY')"), DMDY: e('studyday(DMDTC, RFSTDTC)'),
    },
  },
  QS: {
    source: 'DIARY', perm: ['QSEVLINT', 'EPOCH', 'QSDY'], sort: ['USUBJID', 'QSCAT', 'QSTESTCD', 'QSDTC'],
    transpose: { tests: [{ code: 'PAIN01', field: 'AVGPAIN' }, { code: 'PAIN02', field: 'WORSTPAIN' }], drop: '' },
    rules: {
      ...ID('QS'), QSSEQ: { kind: 'seq' }, QSTESTCD: cp('__TESTCD'), QSTEST: e("if(__TESTCD = 'PAIN01', 'Average Pain Intensity in Past 24 Hours', 'Worst Pain Intensity in Past 24 Hours')"), QSCAT: c('DAILY PAIN DIARY'),
      QSORRES: cp('__RESULT'), QSSTRESC: cp('__RESULT'), QSSTRESN: e('num(__RESULT)'), QSLOBXFL: { kind: 'lobxfl', result: 'QSSTRESC', dtc: 'QSDTC', by: 'QSTESTCD' },
      VISITNUM: c(''), EPOCH: e('epoch(QSDTC)'), QSDTC: e("dtc(ENTRYDTM, 'ISO 8601')"), QSDY: e('studyday(QSDTC)'), QSEVLINT: c('-P1D'),
    },
  },
  CM: {
    source: 'DIARY', filter: "num(RESCUE) > 0", perm: ['CMCAT', 'CMINDC', 'CMDOSE', 'CMDOSU', 'CMDOSTOT', 'CMROUTE', 'EPOCH', 'CMSTDTC', 'CMENDTC', 'CMSTDY', 'CMENDY'], sort: ['USUBJID', 'CMSTDTC'],
    rules: {
      ...ID('CM'), CMSEQ: { kind: 'seq' }, CMTRT: c('PARACETAMOL'), CMCAT: c('RESCUE MEDICATION'), CMINDC: c('LOW BACK PAIN'), CMDOSE: c('500'), CMDOSU: c('mg'), CMDOSTOT: e('num(RESCUE) * 500'),
      CMROUTE: c('ORAL'), EPOCH: e('epoch(CMSTDTC)'), CMSTDTC: e("substr(ENTRYDTM, 1, 10)"), CMENDTC: e("substr(ENTRYDTM, 1, 10)"), CMSTDY: e('studyday(CMSTDTC)'), CMENDY: e('studyday(CMENDTC)'),
    },
  },
  EX: {
    source: 'DISP', perm: ['EXDOSFRQ', 'EXROUTE', 'EPOCH', 'EXSTDY', 'EXENDY'], sort: ['USUBJID', 'EXTRT', 'EXSTDTC'],
    rules: {
      ...ID('EX'), EXSEQ: { kind: 'seq' }, EXTRT: e("if(irt('RANDARM') = 'PBO', 'PLACEBO', 'DORSAVIN')"), EXDOSE: e("if(irt('RANDARM') = 'PBO', 0, 50)"), EXDOSU: c('mg'), EXDOSFRM: c('TABLET'),
      EXDOSFRQ: c('BID'), EXROUTE: c('ORAL'), EPOCH: e('epoch(EXSTDTC)'), EXSTDTC: e("dtc(FIRSTDAT, 'DD-MMM-YYYY', FIRSTTIM)"), EXENDTC: e("dtc(LASTDAT, 'DD-MMM-YYYY')"), EXSTDY: e('studyday(EXSTDTC)'), EXENDY: e('studyday(EXENDTC)'),
    },
  },
}
export const PAIN_DOMAINS = Object.keys(PAIN_REF)
export function painReferenceSpec(domain: string, ver: Version): DomainSpec {
  const r = PAIN_REF[domain]; if (!r) throw new Error(`No reference mapping for ${domain} in ${PAIN_STUDY.id}`)
  const vars = varsOf(domain, ver).filter((m) => (m.core !== 'Perm' || r.perm.includes(m.name) || (ver === '4.0d' && m.name === 'SUBJID')) && r.rules[m.name]).map((m) => m.name)
  return { domain, source: r.source ?? domain, vars, rules: Object.fromEntries(vars.map((v) => [v, r.rules[v]])), sort: r.sort, ...(r.filter ? { filter: r.filter } : {}), ...(r.transpose ? { transpose: r.transpose } : {}) }
}
let dmCache: Map<string, OutRow> | null = null
const base = (): StudyData => ({ forms: painRaw().forms, studyId: PAIN_STUDY.id, visits: PAIN_VISITS, arms: PAIN_ARMS, sites: PAIN_SITES })
export function painData(): StudyData {
  dmCache ??= new Map(build(painReferenceSpec('DM', '3.4'), base()).rows.map((r) => [r.__subj, r]))
  return { ...base(), refDm: dmCache }
}
export const PAIN_PACK: StudyPack = {
  ...PAIN_STUDY, domains: PAIN_DOMAINS, refSpec: painReferenceSpec, data: painData, formInfo: PAIN_FORM_INFO, rawFields: PAIN_RAW_FIELDS,
  relrec: [], relNeed: [], facts: PAIN_FACTS, conventions: PAIN_CONVENTIONS, arms: PAIN_ARMS, sites: PAIN_SITES, visits: PAIN_VISITS,
}
