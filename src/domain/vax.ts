// The vaccine study ALV-3-301 with its diary and serology transfers: the CDISC Vaccines
// therapeutic area user guide's domains. The CDM Console holds this study's eCRF; the
// participants' electronic diary (solicited reactions for 7 days after each dose) and the
// serology laboratory's antibody titres come from vendors. This trainer generates its own
// participants with all three sources, so the reactogenicity and immunogenicity mapping can be
// scored (they are not the CDM Console's participants). Solicited reactions become CE (one record
// per reaction per dose, pre-specified, occurred or not) and FA (each day's severity or diameter);
// daily temperatures go to VS; titres to IS. Grading follows the FDA guidance "Toxicity Grading
// Scale for Healthy Adult and Adolescent Volunteers Enrolled in Preventive Vaccine Clinical Trials"
// (September 2007), as the protocol's choice. Everything is fictional.

import { rng, addDays } from './util'
import { toEdc, toYmd } from './rawdate'
import { build, type DomainSpec, type OutRow, type Rule, type StudyData } from './engine'
import { varsOf, type Version } from './standards'
import type { Visit } from './study'
import type { Row } from './seed'
import type { StudyPack } from './studypack'
import { SORT } from './reference'

export const VAX_STUDY = {
  id: 'ALV-3-301',
  title: 'An observer-blind, randomised, placebo-controlled phase 3 study of the safety, reactogenicity and immunogenicity of two doses of Aurelivax (ALV-3) in healthy adults aged 18 to 64',
  short: 'Aurelivax (ALV-3) vaccine: diary and serology',
  sponsor: 'Aurelis Vaccines (fictional)',
  phase: 'Phase 3',
  indication: 'Healthy adults (prevention)',
  design: 'Observer-blind, randomised 2:1 to Aurelivax or saline placebo, 0.5 mL intramuscularly in the deltoid on Day 1 and Day 29; an electronic diary for 7 days after each dose; serum for neutralising antibodies on Day 1, Day 29 and Day 57',
}
export const VAX_DIARY = 'Clearday eCOA (fictional)'
export const VAX_LAB = 'Aurelis Serology Laboratory (fictional)'
export const VAX_SITES = [
  { id: '201', name: 'Harbourside Vaccine Research Unit (fictional)', country: 'United Kingdom', iso: 'GBR' },
  { id: '202', name: 'Prairie Clinical Trials Center (fictional)', country: 'United States', iso: 'USA' },
]
export const VAX_ARMS = [{ code: 'ALV3', name: 'Aurelivax 0.5 mL, 2 doses 28 days apart' }, { code: 'PBO', name: 'Saline placebo 0.5 mL, 2 doses 28 days apart' }]
const V = (raw: string, num: number, name: string, day: number, lo: number, hi: number): Visit => ({ raw, num, name, day, lo, hi, epoch: day > 57 ? 'FOLLOW-UP' : 'TREATMENT', vs: [] })
export const VAX_VISITS: Visit[] = [
  V('Day 1 (dose 1)', 1, 'DAY 1', 1, 1, 1), V('Day 8 phone contact', 2, 'DAY 8', 8, 8, 10), V('Day 29 (dose 2)', 3, 'DAY 29', 29, 27, 35),
  V('Day 36 phone contact', 4, 'DAY 36', 36, 36, 38), V('Day 57', 5, 'DAY 57', 57, 54, 64), V('Day 181 (end of study)', 6, 'DAY 181', 181, 167, 195),
]
export const SOLICITED: { code: string; term: string; site: boolean; kind: 'grade' | 'diam' | 'temp' }[] = [
  { code: 'PAIN', term: 'Injection site pain', site: true, kind: 'grade' },
  { code: 'REDNESS', term: 'Injection site redness', site: true, kind: 'diam' },
  { code: 'SWELLING', term: 'Injection site swelling', site: true, kind: 'diam' },
  { code: 'FEVER', term: 'Fever', site: false, kind: 'temp' },
  { code: 'HEADACHE', term: 'Headache', site: false, kind: 'grade' },
  { code: 'FATIGUE', term: 'Fatigue', site: false, kind: 'grade' },
  { code: 'MYALGIA', term: 'Myalgia', site: false, kind: 'grade' },
]
const DAYS = [1, 2, 3, 4, 5, 6, 7]
export const VAX_FORM_INFO: Record<string, { name: string; source: string; note: string }> = {
  DM: { name: 'Demographics', source: 'EDC', note: 'One row per participant consented.' },
  IC: { name: 'Informed consent', source: 'EDC', note: 'One row per participant.' },
  IRT: { name: 'Randomisation (IRT)', source: 'IRT', note: 'One row per randomised participant: arm code (unblinded at lock).' },
  VAX: { name: 'Vaccination', source: 'EDC', note: 'One row per dose: dose number, date, time and arm (deltoid) of the injection, by the unblinded administrator.' },
  DIARY: { name: 'E-diary (vendor)', source: 'Vendor', note: `From ${VAX_DIARY}: one row per participant per dose per solicited reaction, with DAY1 to DAY7 for the seven days after the dose (Day 1 is the day of vaccination). Pain, headache, fatigue and myalgia: None, Mild, Moderate or Severe. Redness and swelling: the largest diameter in mm, measured with the ruler supplied. Fever: the highest oral temperature of the day in °C. Blank: the participant did not complete that day.` },
  REACT: { name: 'Reaction continuing after the diary', source: 'EDC', note: 'A solicited reaction still present on Day 7, followed up by the site until it ended: its end date.' },
  IMM: { name: 'Serology (vendor)', source: 'Vendor', note: `From ${VAX_LAB}: neutralising antibody titres in serum, as the reciprocal dilution written 1:640; below the lowest dilution tested, <1:10. A sample with too little serum is QNS. Dates YYYYMMDD.` },
  SV: { name: 'Visits and contacts', source: 'EDC', note: 'One row per visit or phone contact.' },
}
const F = (pairs: [string, string][]) => pairs.map(([name, label]) => ({ name, label }))
export const VAX_RAW_FIELDS: Record<string, { name: string; label: string }[]> = {
  DM: F([['SUBJID', 'Participant number'], ['SITEID', 'Site'], ['DMDAT', 'Date of collection'], ['BRTHDAT', 'Date of birth'], ['SEX', 'Sex'], ['RACE', 'Race'], ['ETHNIC', 'Ethnicity']]),
  IC: F([['SUBJID', 'Participant number'], ['ICDAT', 'Date informed consent signed']]),
  IRT: F([['SUBJID', 'Participant number'], ['RANDNO', 'Randomisation number'], ['RANDDT', 'Randomisation date (ISO 8601)'], ['RANDARM', 'Arm (code)']]),
  VAX: F([['SUBJID', 'Participant number'], ['DOSENUM', 'Dose'], ['VAXDAT', 'Date given'], ['VAXTIM', 'Time given (HH:MM)'], ['LOC', 'Injection site']]),
  DIARY: F([['SUBJID', 'Participant number'], ['DOSENUM', 'Dose'], ['SYMPTOM', 'Solicited reaction'], ...DAYS.map((d) => [`DAY${d}`, `Day ${d} after the dose`] as [string, string])]),
  REACT: F([['SUBJID', 'Participant number'], ['DOSENUM', 'Dose'], ['SYMPTOM', 'Solicited reaction'], ['ENDDAT', 'Date the reaction ended']]),
  IMM: F([['SUBJID', 'Participant number'], ['VISIT', 'Visit'], ['ACCSNUM', 'Accession number'], ['COLLDATE', 'Collection date (YYYYMMDD)'], ['ANALYTE', 'Analyte'], ['RESULT', 'Titre as reported'], ['STATUS', 'Sample status']]),
  SV: F([['SUBJID', 'Participant number'], ['VISIT', 'Visit or contact'], ['VISDAT', 'Date']]),
}
export const VAX_FACTS: { what: string; value: string }[] = [
  { what: 'Phase', value: 'Phase 3, observer-blind, randomised 2:1, placebo-controlled' },
  { what: 'Population', value: 'Healthy adults aged 18 to 64; no fever on the day of vaccination' },
  { what: 'Vaccination', value: 'Aurelivax or saline placebo, 0.5 mL intramuscularly in the deltoid, on Day 1 and Day 29' },
  { what: 'Solicited reactions', value: 'For 7 days after each dose (the day of vaccination is Day 1) in an e-diary: injection site pain, redness and swelling; fever, headache, fatigue and myalgia' },
  { what: 'Grading (FDA 2007 scale)', value: 'Redness and swelling: 25 to 50 mm mild, 51 to 100 mm moderate, over 100 mm severe; under 25 mm is not counted. Fever: 38.0 to 38.4 °C mild, 38.5 to 38.9 moderate, 39.0 and above severe. Other reactions as graded by the participant' },
  { what: 'Immunogenicity', value: `Neutralising antibody titres in serum on Day 1 (before the dose), Day 29 (before dose 2) and Day 57, by ${VAX_LAB}; lowest dilution 1:10` },
]
export const VAX_CONVENTIONS: { topic: string; rule: string }[] = [
  { topic: 'USUBJID', rule: 'STUDYID, a hyphen, and SUBJID: ALV-3-301-201-007.' },
  { topic: 'EX', rule: 'One record per dose: EXTRT AURELIVAX or PLACEBO from the IRT arm; EXDOSE 0.5, EXDOSU mL, EXDOSFRM INJECTION, SUSPENSION, EXROUTE INTRAMUSCULAR, EXLOC DELTOID MUSCLE and EXLAT LEFT or RIGHT; EXSTDTC = EXENDTC the date and time given; VISITNUM and VISIT of the dosing visit.' },
  { topic: 'CE', rule: 'One record per solicited reaction per dose, for every participant who received the dose: CETERM the reaction (Injection site pain …), CECAT REACTOGENICITY, CESCAT ADMINISTRATION SITE or SYSTEMIC, CEPRESP Y, CEOCCUR Y if it occurred on any diary day and N if not; CESTAT NOT DONE (CEOCCUR null) if no diary day was completed. Injection site reactions: CELOC DELTOID MUSCLE and CELAT the arm of that dose.' },
  { topic: 'CE: occurred and severity', rule: 'Occurred: pain, headache, fatigue or myalgia Mild or worse; redness or swelling 25 mm or more; fever 38.0 °C or more. CESEV the worst grade over the 7 days (MILD, MODERATE, SEVERE), null if it did not occur.' },
  { topic: 'CE: timing', rule: 'CETPTREF DOSE 1 or DOSE 2 and CERFTDTC that dose’s date and time; CESTDTC and CEENDTC the first and last diary day it occurred (the dose date plus the day number minus 1), or the end date on the continuing-reaction form when it went on after Day 7; null if it did not occur. EPOCH from the dose.' },
  { topic: 'FA', rule: 'One record per diary day per local and systemic reaction (fever’s temperatures go to VS): FATESTCD SEV with FAORRES the participant’s grade (FASTRESC upper case) for pain, headache, fatigue and myalgia; FATESTCD LDIAM with FAORRES the diameter and FAORRESU mm for redness and swelling. FAOBJ the CETERM it is about, FACAT REACTOGENICITY. A day not completed: FASTAT NOT DONE, FAREASND DIARY NOT COMPLETED.' },
  { topic: 'FA and VS timing', rule: 'FATPT / VSTPT DAY 1 to DAY 7, FATPTNUM / VSTPTNUM 1 to 7, FATPTREF / VSTPTREF DOSE 1 or DOSE 2, FARFTDTC / VSRFTDTC the dose date and time, FADTC / VSDTC the diary date (the dose date plus the day number minus 1); VISITNUM and VISIT of the dosing visit.' },
  { topic: 'VS', rule: 'Diary temperatures: VSTESTCD TEMP, VSORRES as entered, VSORRESU C, VSLOC ORAL CAVITY, VSSTRESN the number; VSLOBXFL null (diary temperatures are taken after the dose, so none is a baseline); a day not completed: VSSTAT NOT DONE, VSREASND DIARY NOT COMPLETED.' },
  { topic: 'IS', rule: 'One record per sample: ISTESTCD NABTITER, ISTEST Neutralizing Antibody Titer (sponsor-defined test code), ISCAT SEROLOGY, ISBDAGNT ALV-3 ANTIGEN, ISSPEC SERUM, ISNAM the laboratory. ISORRES as reported (1:640, <1:10); ISSTRESC the reciprocal (640, <10), ISSTRESN numeric results only; ISORRESU and ISSTRESU titer; ISLLOQ 10. QNS: ISSTAT NOT DONE, ISREASND QUANTITY NOT SUFFICIENT. ISLOBXFL on the Day 1 sample.' },
]

// ---------- generation ----------
export const VAX_PLANTED: { continuing?: string; diaryGap?: string; smallRedness?: string; qns?: string } = {}
const pad = (n: number) => String(n).padStart(3, '0')
const GRADES = ['None', 'Mild', 'Moderate', 'Severe']
let cache: { forms: Record<string, Row[]>; subjects: { subj: string; arm?: string }[] } | null = null
export function vaxRaw() {
  if (cache) return cache
  const r = rng(3301)
  const forms: Record<string, Row[]> = { DM: [], IC: [], IRT: [], VAX: [], DIARY: [], REACT: [], IMM: [], SV: [] }
  let id = 0, accs = 880100, randno = 5000
  const push = (form: string, row: Record<string, string>) => forms[form].push({ __id: `${form}${++id}`, ...row } as Row)
  const subjects: { subj: string; arm?: string }[] = []
  let n = 0, randomised = 0
  while (randomised < 60) {
    n++
    const site = n % 2 ? '201' : '202'
    const subj = `${site}-${pad(n)}`
    const d1 = addDays('2026-03-02', Math.floor(randomised * 0.8))
    push('DM', { SUBJID: subj, SITEID: site, DMDAT: toEdc(d1), BRTHDAT: toEdc(addDays(d1, -Math.round((18 + r.next() * 46) * 365.25))), SEX: r.chance(0.5) ? 'Female' : 'Male', RACE: r.pick(['White', 'White', 'Asian', 'Black or African American']), ETHNIC: r.chance(0.12) ? 'Hispanic or Latino' : 'Not Hispanic or Latino' })
    push('IC', { SUBJID: subj, ICDAT: toEdc(d1) })
    push('SV', { SUBJID: subj, VISIT: 'Day 1 (dose 1)', VISDAT: toEdc(d1) })
    if (n % 21 === 5) { subjects.push({ subj }); continue } // fever on Day 1: not vaccinated
    randomised++
    const arm = randomised % 3 === 0 ? 'PBO' : 'ALV3'
    subjects.push({ subj, arm })
    push('IRT', { SUBJID: subj, RANDNO: String(++randno), RANDDT: d1, RANDARM: arm })
    const active = arm === 'ALV3'
    const d29 = addDays(d1, 28 + r.int(-1, 3)), d57 = addDays(d29, 28 + r.int(-1, 4))
    const titre1 = r.chance(0.85) ? 0 : 20 * 2 ** r.int(0, 2)
    for (const [dose, date] of [[1, d1], [2, d29]] as [number, string][]) {
      const time = `${String(9 + r.int(0, 6)).padStart(2, '0')}:${String(r.int(0, 59)).padStart(2, '0')}`
      const lat = r.chance(0.8) ? 'Left' : 'Right'
      push('VAX', { SUBJID: subj, DOSENUM: String(dose), VAXDAT: toEdc(date), VAXTIM: time, LOC: `${lat} deltoid` })
      if (dose === 2) push('SV', { SUBJID: subj, VISIT: 'Day 29 (dose 2)', VISDAT: toEdc(date) })
      push('SV', { SUBJID: subj, VISIT: dose === 1 ? 'Day 8 phone contact' : 'Day 36 phone contact', VISDAT: toEdc(addDays(date, 7 + r.int(0, 2))) })
      const gap = !VAX_PLANTED.diaryGap && dose === 2 && randomised === 17
      if (gap) VAX_PLANTED.diaryGap = subj
      for (const s of SOLICITED) {
        const p = active ? (s.site ? 0.6 : 0.35) * (dose === 2 ? 1.25 : 1) : (s.site ? 0.15 : 0.2)
        const occurs = r.chance(Math.min(0.9, p)), peak = occurs ? r.int(1, 3) : 0, dur = occurs ? r.int(1, 4) : 0, start = r.int(1, 2)
        const days: string[] = DAYS.map((d) => {
          if (gap && d >= 5) return ''
          const on = occurs && d >= start && d < start + dur
          const g = on ? Math.max(1, peak - (d - start > 1 ? 1 : 0)) : 0
          if (s.kind === 'grade') return GRADES[g]
          if (s.kind === 'diam') return String(on ? [0, 25 + r.int(0, 25), 51 + r.int(0, 49), 101 + r.int(0, 30)][g] : 0)
          return (on ? [36.8, 38 + r.int(0, 4) / 10, 38.5 + r.int(0, 4) / 10, 39 + r.int(0, 5) / 10][g] : 36.2 + r.int(0, 8) / 10).toFixed(1)
        })
        if (s.code === 'REDNESS' && !VAX_PLANTED.smallRedness && !occurs && active && dose === 1) { days[0] = '20'; VAX_PLANTED.smallRedness = subj }
        const continuing = !VAX_PLANTED.continuing && s.code === 'PAIN' && occurs && active && dose === 1 && randomised > 5
        if (continuing) { days[5] = 'Mild'; days[6] = 'Mild'; for (let d = start; d < 6; d++) if (days[d - 1] === 'None') days[d - 1] = 'Mild'; VAX_PLANTED.continuing = subj; push('REACT', { SUBJID: subj, DOSENUM: '1', SYMPTOM: 'PAIN', ENDDAT: toEdc(addDays(date, 9)) }) }
        push('DIARY', { SUBJID: subj, DOSENUM: String(dose), SYMPTOM: s.code, ...Object.fromEntries(DAYS.map((d) => [`DAY${d}`, days[d - 1]])) })
      }
    }
    push('SV', { SUBJID: subj, VISIT: 'Day 57', VISDAT: toEdc(d57) })
    push('SV', { SUBJID: subj, VISIT: 'Day 181 (end of study)', VISDAT: toEdc(addDays(d1, 180 + r.int(-5, 8))) })
    const titres = [titre1, active ? 40 * 2 ** r.int(1, 4) : titre1, active ? 160 * 2 ** r.int(1, 4) : titre1 * (r.chance(0.2) ? 2 : 1)]
    ;([['Day 1 (dose 1)', d1], ['Day 29 (dose 2)', d29], ['Day 57', d57]] as [string, string][]).forEach(([visit, date], i) => {
      const qns = !VAX_PLANTED.qns && i === 2 && randomised === 33
      if (qns) VAX_PLANTED.qns = subj
      push('IMM', { SUBJID: subj, VISIT: visit, ACCSNUM: `S${++accs}`, COLLDATE: toYmd(date), ANALYTE: 'ALV-3 neutralising antibody', RESULT: qns ? '' : titres[i] < 10 ? '<1:10' : `1:${titres[i]}`, STATUS: qns ? 'QNS' : '' })
    })
  }
  cache = { forms, subjects }
  return cache
}

// ---------- reference mapping ----------
const e = (expr: string): Rule => ({ kind: 'expr', expr })
const c = (value: string): Rule => ({ kind: 'const', value })
const cp = (field: string): Rule => ({ kind: 'copy', field })
const ID = (d: string) => ({ STUDYID: c(VAX_STUDY.id), DOMAIN: c(d), USUBJID: e(`concat('${VAX_STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID') })
const DOSE_DATE = "subjwhere('VAX', 'VAXDAT', 'DOSENUM', DOSENUM, 'first')"
const DOSE_DTC = `dtc(${DOSE_DATE}, 'DD-MMM-YYYY', subjwhere('VAX', 'VAXTIM', 'DOSENUM', DOSENUM, 'first'))`
const DOSE_VISIT = "if(DOSENUM = '1', 'Day 1 (dose 1)', 'Day 29 (dose 2)')"
const TERM = `if(SYMPTOM = 'PAIN', 'Injection site pain', if(SYMPTOM = 'REDNESS', 'Injection site redness', if(SYMPTOM = 'SWELLING', 'Injection site swelling', if(SYMPTOM = 'FEVER', 'Fever', if(SYMPTOM = 'HEADACHE', 'Headache', if(SYMPTOM = 'FATIGUE', 'Fatigue', 'Myalgia'))))))`
// The grade (0 to 3) of one diary day, by the protocol's scale.
const grade = (f: string) => `if(isblank(${f}), '', if(SYMPTOM in ('REDNESS', 'SWELLING'), if(num(${f}) > 100, 3, if(num(${f}) > 50, 2, if(num(${f}) >= 25, 1, 0))), if(SYMPTOM = 'FEVER', if(num(${f}) >= 39, 3, if(num(${f}) >= 38.5, 2, if(num(${f}) >= 38, 1, 0))), if(${f} = 'Severe', 3, if(${f} = 'Moderate', 2, if(${f} = 'Mild', 1, 0))))))`
const WORST = `max(${DAYS.map((d) => grade(`DAY${d}`)).join(', ')})`
const ALLBLANK = DAYS.map((d) => `isblank(DAY${d})`).join(' and ')
const FIRST = DAYS.slice().reverse().reduce((acc, d) => `if(${grade(`DAY${d}`)} >= 1, ${d}, ${acc})`, "''")
const LAST = DAYS.reduce((acc, d) => `if(${grade(`DAY${d}`)} >= 1, ${d}, ${acc})`, "''")
const CONT_END = "subjwhere('REACT', 'ENDDAT', 'SYMPTOM', SYMPTOM, 'first')"
const DAILY = (prefix: string) => ({ tests: DAYS.map((d) => ({ code: `D${d}`, field: `DAY${d}` })), drop: '' }) as DomainSpec['transpose'] & { _p?: string }
const TIMING = (p: string) => ({
  [`${p}TPT`]: e("concat('DAY ', substr(__TESTCD, 2, 1))"), [`${p}TPTNUM`]: e('num(substr(__TESTCD, 2, 1))'),
  [`${p}TPTREF`]: e("concat('DOSE ', DOSENUM)"), [`${p}RFTDTC`]: e(DOSE_DTC),
  [`${p}DTC`]: e(`adddays(dtc(${DOSE_DATE}, 'DD-MMM-YYYY'), num(substr(__TESTCD, 2, 1)) - 1)`), [`${p}DY`]: e(`studyday(${p}DTC)`),
  VISITNUM: e(`visitnum(${DOSE_VISIT}, '')`), VISIT: e(`visitname(${DOSE_VISIT}, '')`), EPOCH: e(`epoch(${p}DTC)`),
})
type Ref = { rules: Record<string, Rule>; perm: string[]; source?: string; filter?: string; transpose?: DomainSpec['transpose'] }
const VAX_REF: Record<string, Ref> = {
  DM: {
    perm: ['BRTHDTC', 'ETHNIC', 'DMDTC', 'DMDY'],
    rules: {
      ...ID('DM'),
      RFSTDTC: e("dtc(subjwhere('VAX', 'VAXDAT', 'DOSENUM', '1', 'first'), 'DD-MMM-YYYY', subjwhere('VAX', 'VAXTIM', 'DOSENUM', '1', 'first'))"),
      RFENDTC: e("dtc(subj('VAX', 'VAXDAT', 'max'), 'DD-MMM-YYYY', subj('VAX', 'VAXTIM', 'last'))"),
      RFXSTDTC: e("dtc(subjwhere('VAX', 'VAXDAT', 'DOSENUM', '1', 'first'), 'DD-MMM-YYYY', subjwhere('VAX', 'VAXTIM', 'DOSENUM', '1', 'first'))"),
      RFXENDTC: e("dtc(subj('VAX', 'VAXDAT', 'max'), 'DD-MMM-YYYY', subj('VAX', 'VAXTIM', 'last'))"),
      RFICDTC: e("dtc(subj('IC', 'ICDAT', 'first'), 'DD-MMM-YYYY')"), RFPENDTC: e("dtc(subj('SV', 'VISDAT', 'max'), 'DD-MMM-YYYY')"),
      DTHDTC: c(''), DTHFL: c(''), SITEID: cp('SITEID'), BRTHDTC: e("dtc(BRTHDAT, 'DD-MMM-YYYY')"), AGE: e("age(BRTHDAT, subj('IC', 'ICDAT', 'first'))"), AGEU: c('YEARS'),
      SEX: { kind: 'recode', field: 'SEX', table: { Female: 'F', Male: 'M' } }, RACE: e('upper(RACE)'), ETHNIC: e('upper(ETHNIC)'),
      ARMCD: e("irt('RANDARM')"), ARM: e("armname(irt('RANDARM'))"), ACTARMCD: e("if(present(subj('VAX', 'VAXDAT', 'min')), irt('RANDARM'), '')"), ACTARM: e('armname(ACTARMCD)'),
      ARMNRS: e("if(isblank(irt('RANDARM')), 'SCREEN FAILURE', '')"), ACTARMUD: c(''), COUNTRY: e('country(SITEID)'), DMDTC: e("dtc(DMDAT, 'DD-MMM-YYYY')"), DMDY: e('studyday(DMDTC, RFSTDTC)'),
    },
  },
  EX: {
    source: 'VAX', perm: ['EXDOSFRQ', 'EXROUTE', 'EXLOC', 'EXLAT', 'VISITNUM', 'VISIT', 'EPOCH', 'EXSTDY', 'EXENDY'],
    rules: {
      ...ID('EX'), EXSEQ: { kind: 'seq' }, EXTRT: e("if(irt('RANDARM') = 'PBO', 'PLACEBO', 'AURELIVAX')"), EXDOSE: c('0.5'), EXDOSU: c('mL'), EXDOSFRM: c('INJECTION, SUSPENSION'),
      EXDOSFRQ: c('ONCE'), EXROUTE: c('INTRAMUSCULAR'), EXLOC: c('DELTOID MUSCLE'), EXLAT: e("upper(part(LOC, ' ', 1))"),
      VISITNUM: e(`visitnum(${DOSE_VISIT}, VAXDAT)`), VISIT: e(`visitname(${DOSE_VISIT}, VAXDAT)`), EPOCH: e('epoch(EXSTDTC)'),
      EXSTDTC: e("dtc(VAXDAT, 'DD-MMM-YYYY', VAXTIM)"), EXENDTC: e("dtc(VAXDAT, 'DD-MMM-YYYY', VAXTIM)"), EXSTDY: e('studyday(EXSTDTC)'), EXENDY: e('studyday(EXENDTC)'),
    },
  },
  CE: {
    source: 'DIARY', perm: ['CECAT', 'CESCAT', 'CEPRESP', 'CEOCCUR', 'CESTAT', 'CEREASND', 'CELOC', 'CELAT', 'CESEV', 'EPOCH', 'CESTDTC', 'CEENDTC', 'CESTDY', 'CEENDY', 'CETPTREF', 'CERFTDTC'],
    rules: {
      ...ID('CE'), CESEQ: { kind: 'seq' }, CETERM: e(TERM), CECAT: c('REACTOGENICITY'), CESCAT: e("if(SYMPTOM in ('PAIN', 'REDNESS', 'SWELLING'), 'ADMINISTRATION SITE', 'SYSTEMIC')"),
      CEPRESP: c('Y'), CEOCCUR: e(`if(${ALLBLANK}, '', if(${WORST} >= 1, 'Y', 'N'))`), CESTAT: e(`if(${ALLBLANK}, 'NOT DONE', '')`), CEREASND: e(`if(${ALLBLANK}, 'DIARY NOT COMPLETED', '')`),
      CELOC: e("if(SYMPTOM in ('PAIN', 'REDNESS', 'SWELLING'), 'DELTOID MUSCLE', '')"), CELAT: e("if(SYMPTOM in ('PAIN', 'REDNESS', 'SWELLING'), upper(part(subjwhere('VAX', 'LOC', 'DOSENUM', DOSENUM, 'first'), ' ', 1)), '')"),
      CESEV: e(`if(${WORST} = 3, 'SEVERE', if(${WORST} = 2, 'MODERATE', if(${WORST} = 1, 'MILD', '')))`),
      EPOCH: e('epoch(CERFTDTC)'),
      CESTDTC: e(`if(present(${FIRST}), adddays(dtc(${DOSE_DATE}, 'DD-MMM-YYYY'), ${FIRST} - 1), '')`),
      CEENDTC: e(`if(isblank(${LAST}), '', if(subjwhere('REACT', 'DOSENUM', 'SYMPTOM', SYMPTOM, 'first') = DOSENUM and present(${CONT_END}), dtc(${CONT_END}, 'DD-MMM-YYYY'), adddays(dtc(${DOSE_DATE}, 'DD-MMM-YYYY'), ${LAST} - 1)))`),
      CESTDY: e('studyday(CESTDTC)'), CEENDY: e('studyday(CEENDTC)'), CETPTREF: e("concat('DOSE ', DOSENUM)"), CERFTDTC: e(DOSE_DTC),
    },
  },
  FA: {
    source: 'DIARY', filter: "SYMPTOM <> 'FEVER'", transpose: DAILY('FA'),
    perm: ['FACAT', 'FASTRESN', 'FASTAT', 'FAREASND', 'FAORRESU', 'FASTRESU', 'VISIT', 'EPOCH', 'FADTC', 'FADY', 'FATPT', 'FATPTNUM', 'FATPTREF', 'FARFTDTC'],
    rules: {
      ...ID('FA'), FASEQ: { kind: 'seq' }, FATESTCD: e("if(SYMPTOM in ('REDNESS', 'SWELLING'), 'LDIAM', 'SEV')"), FATEST: e("ctdecode('FATESTCD', FATESTCD)"), FAOBJ: e(TERM), FACAT: c('REACTOGENICITY'),
      FAORRES: cp('__RESULT'), FAORRESU: e("if(FATESTCD = 'LDIAM' and present(__RESULT), 'mm', '')"), FASTRESC: e('upper(__RESULT)'), FASTRESN: e("if(FATESTCD = 'LDIAM', num(__RESULT), '')"), FASTRESU: e('FAORRESU'),
      FASTAT: e("if(isblank(__RESULT), 'NOT DONE', '')"), FAREASND: e("if(isblank(__RESULT), 'DIARY NOT COMPLETED', '')"), ...TIMING('FA'),
    },
  },
  VS: {
    source: 'DIARY', filter: "SYMPTOM = 'FEVER'", transpose: DAILY('VS'),
    perm: ['VSSTAT', 'VSREASND', 'VSLOC', 'VISIT', 'EPOCH', 'VSDY', 'VSTPT', 'VSTPTNUM', 'VSTPTREF', 'VSRFTDTC'],
    rules: {
      ...ID('VS'), VSSEQ: { kind: 'seq' }, VSTESTCD: c('TEMP'), VSTEST: c('Temperature'), VSORRES: cp('__RESULT'), VSORRESU: e("if(present(__RESULT), 'C', '')"),
      VSSTRESC: cp('__RESULT'), VSSTRESN: e('num(__RESULT)'), VSSTRESU: e('VSORRESU'), VSSTAT: e("if(isblank(__RESULT), 'NOT DONE', '')"), VSREASND: e("if(isblank(__RESULT), 'DIARY NOT COMPLETED', '')"),
      VSLOC: c('ORAL CAVITY'), VSLOBXFL: c(''), ...TIMING('VS'),
    },
  },
  IS: {
    source: 'IMM', perm: ['ISCAT', 'ISBDAGNT', 'ISSTAT', 'ISREASND', 'ISNAM', 'ISSPEC', 'ISLLOQ', 'ISLOBXFL', 'VISIT', 'EPOCH', 'ISDY', 'ISREFID'],
    rules: {
      ...ID('IS'), ISSEQ: { kind: 'seq' }, ISREFID: cp('ACCSNUM'), ISTESTCD: c('NABTITER'), ISTEST: c('Neutralizing Antibody Titer'), ISCAT: c('SEROLOGY'), ISBDAGNT: c('ALV-3 ANTIGEN'),
      ISORRES: cp('RESULT'), ISORRESU: e("if(present(RESULT), 'titer', '')"), ISSTRESC: e("replace(RESULT, '1:', '')"), ISSTRESN: e("if(substr(RESULT, 1, 1) = '<' or isblank(RESULT), '', num(replace(RESULT, '1:', '')))"),
      ISSTRESU: e('ISORRESU'), ISSTAT: e("if(STATUS = 'QNS', 'NOT DONE', '')"), ISREASND: e("if(STATUS = 'QNS', 'QUANTITY NOT SUFFICIENT', '')"),
      ISNAM: c(VAX_LAB), ISSPEC: c('SERUM'), ISLLOQ: c('10'), ISLOBXFL: { kind: 'lobxfl', result: 'ISSTRESC', dtc: 'ISDTC', by: 'ISTESTCD' },
      VISITNUM: e('visitnum(VISIT, COLLDATE)'), VISIT: e('visitname(VISIT, COLLDATE)'), EPOCH: e('epoch(ISDTC)'), ISDTC: e("dtc(COLLDATE, 'YYYYMMDD')"), ISDY: e('studyday(ISDTC)'),
    },
  },
}
export const VAX_DOMAINS = Object.keys(VAX_REF)
export function vaxReferenceSpec(domain: string, ver: Version): DomainSpec {
  const r = VAX_REF[domain]; if (!r) throw new Error(`No reference mapping for ${domain} in ${VAX_STUDY.id}`)
  const vars = varsOf(domain, ver).filter((m) => (m.core !== 'Perm' || r.perm.includes(m.name) || (ver !== '3.4' && m.name === 'SUBJID')) && r.rules[m.name]).map((m) => m.name)
  return { domain, source: r.source ?? domain, vars, rules: Object.fromEntries(vars.map((v) => [v, r.rules[v]])), sort: SORT[domain] ?? ['USUBJID'], ...(r.filter ? { filter: r.filter } : {}), ...(r.transpose ? { transpose: r.transpose } : {}) }
}
let dmCache: Map<string, OutRow> | null = null
const base = (): StudyData => ({ forms: vaxRaw().forms, studyId: VAX_STUDY.id, visits: VAX_VISITS, arms: VAX_ARMS, sites: VAX_SITES })
export function vaxData(): StudyData {
  dmCache ??= new Map(build(vaxReferenceSpec('DM', '3.4'), base()).rows.map((r) => [r.__subj, r]))
  return { ...base(), refDm: dmCache }
}
export const VAX_PACK: StudyPack = {
  ...VAX_STUDY, domains: VAX_DOMAINS, refSpec: vaxReferenceSpec, data: vaxData, formInfo: VAX_FORM_INFO, rawFields: VAX_RAW_FIELDS,
  relrec: [], relNeed: [], facts: VAX_FACTS, conventions: VAX_CONVENTIONS, arms: VAX_ARMS, sites: VAX_SITES, visits: VAX_VISITS,
}
