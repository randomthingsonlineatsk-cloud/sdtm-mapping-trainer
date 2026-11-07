// Raw data for GLV-12-301, generated deterministically: the EDC export (CDASH-named fields, as
// sites entered them) and the IRT randomisation file. The same seed always gives the same data,
// so the reference mappings and the learner's mappings run on identical rows.
//
// Planted, as in real studies: screen failures, a subject randomised but never dosed, a subject
// dispensed the other arm's kits, a death, early withdrawals, a subject lost to follow-up, one
// race recorded as two races, weights in pounds and heights in inches at the US site, Day 1
// vital signs taken after the dose at one subject, vital signs not done at one Day 1 visit,
// unscheduled visits, and a missing screening temperature.

import { toEdc, toYmd } from './rawdate'
import { rng, addDays, type Rng } from './util'
import { SITES, VISITS, ARMS, STUDY } from './study'
import { SMD_10, exactLlt, path } from './dictmed'
import { exactDrug, atcByCode, DRUGS } from './dictdrug'

export type Row = Record<string, string> & { __id: string }
export interface RawData { forms: Record<string, Row[]>; subjects: SubjectTruth[] }
export const LAB_NAME = 'Meridian Central Laboratories (fictional)'
export interface SubjectTruth { subj: string; site: string; fate: Fate; scr: string; d1?: string; arm?: string; kit?: string; doseTime?: string; lastDose?: string; end: string }
export type Fate = 'completed' | 'screen-fail' | 'ae' | 'withdrew' | 'lost' | 'death' | 'not-dosed'

export const FORM_INFO: Record<string, { name: string; source: 'EDC' | 'IRT' | 'Vendor'; note: string }> = {
  DM: { name: 'Demographics', source: 'EDC', note: 'One row per subject. SEX, RACE and ETHNIC are exported as their EDC labels, not CT values.' },
  IC: { name: 'Informed consent', source: 'EDC', note: 'One row per subject.' },
  SV: { name: 'Visit dates', source: 'EDC', note: 'One row per visit that took place, including unscheduled visits.' },
  VS: { name: 'Vital signs', source: 'EDC', note: 'One row per visit, one column per test (wide). Units for weight and height are collected; other units are fixed on the CRF: mmHg, beats/min, °C.' },
  EX: { name: 'Study drug administration', source: 'EDC', note: 'One row per kit-dispensing interval, one tablet a day. EXSTTIM is recorded only for the first dose.' },
  DS: { name: 'End of study (disposition)', source: 'EDC', note: 'One row per subject, including screen failures. DSDECOD is the EDC label.' },
  AE: { name: 'Adverse events', source: 'EDC', note: 'One row per event. The coding columns (lowest-level term to system class, with codes) come from the coding team’s export, coded with the Study Medical Dictionary (fictional, MedDRA-shaped).' },
  CM: { name: 'Prior and concomitant medications', source: 'EDC', note: 'One row per medication. CMDECOD and the class come from the coding export (Study Drug Dictionary, fictional, WHODrug-shaped). Dates are exported as DD-MMM-YYYY; an unknown day or month is exported as UN or UNK (UN-MAR-2019, UN-UNK-2019).' },
  LBC: { name: 'Central laboratory transfer', source: 'Vendor', note: 'External file from the central laboratory, one row per test result, with the vendor’s own test names and units. Dates are YYYYMMDD and times HHMM. Resent results appear twice.' },
  IRT: { name: 'IRT randomisation file', source: 'IRT', note: 'External file from the randomisation system: planned arm (RANDARM) and the arm of the kits actually dispensed (KITARM). Screen failures are not in it. Dates are ISO 8601.' },
}
const RAW_FIELD_PAIRS: Record<string, [string, string][]> = {
  DM: [['SUBJID', 'Subject number'], ['SITEID', 'Site'], ['DMDAT', 'Date of collection'], ['BRTHDAT', 'Date of birth'], ['SEX', 'Sex'], ['RACE', 'Race (all that apply, separated by “; ”)'], ['ETHNIC', 'Ethnicity']],
  IC: [['SUBJID', 'Subject number'], ['SITEID', 'Site'], ['VISIT', 'Visit (folder)'], ['DSSTDAT', 'Date informed consent signed'], ['ICVER', 'Consent form version']],
  SV: [['SUBJID', 'Subject number'], ['SITEID', 'Site'], ['VISIT', 'Visit (folder)'], ['VISDAT', 'Visit date']],
  VS: [['SUBJID', 'Subject number'], ['SITEID', 'Site'], ['VISIT', 'Visit (folder)'], ['VSPERF', 'Were vital signs measured? (Y/N)'], ['VSREASND', 'Reason not done'], ['VSDAT', 'Date of measurements'], ['VSTIM', 'Time of measurements'], ['VSPOS', 'Position for blood pressure and pulse'], ['SYSBP', 'Systolic blood pressure (mmHg)'], ['DIABP', 'Diastolic blood pressure (mmHg)'], ['PULSE', 'Pulse (beats/min)'], ['WEIGHT', 'Weight'], ['WEIGHTU', 'Weight unit'], ['HEIGHT', 'Height'], ['HEIGHTU', 'Height unit'], ['TEMP', 'Oral temperature (°C)']],
  EX: [['SUBJID', 'Subject number'], ['SITEID', 'Site'], ['VISIT', 'Visit kit dispensed'], ['EXKIT', 'Kit number'], ['EXSTDAT', 'Start date'], ['EXSTTIM', 'Time of first dose (Day 1 only)'], ['EXENDAT', 'End date'], ['EXTABS', 'Tablets per day']],
  DS: [['SUBJID', 'Subject number'], ['SITEID', 'Site'], ['DSDECOD', 'Status at end of study'], ['DSTERM', 'Details'], ['DSSTDAT', 'Date of completion or discontinuation']],
  AE: [['SUBJID', 'Subject number'], ['SITEID', 'Site'], ['AESPID', 'AE number'], ['AETERM', 'Adverse event'], ['AESTDAT', 'Start date'], ['AEENDAT', 'End date'], ['AEONGO', 'Ongoing'], ['AESEV', 'Severity'], ['AESER', 'Serious'], ['AEREL', 'Related to study drug'], ['AEACN', 'Action taken'], ['AEOUT', 'Outcome'], ['AESDTH', 'Resulted in death'], ['AESHOSP', 'Hospitalisation'], ['AELLT', 'Coded: lowest-level term'], ['AELLTCD', 'LLT code'], ['AEDECOD', 'Coded: preferred term'], ['AEPTCD', 'PT code'], ['AEHLT', 'Coded: cluster (HLT)'], ['AEHLTCD', 'HLT code'], ['AEHLGT', 'Coded: group (HLGT)'], ['AEHLGTCD', 'HLGT code'], ['AESOC', 'Coded: system class (SOC)'], ['AESOCCD', 'SOC code']],
  CM: [['SUBJID', 'Subject number'], ['SITEID', 'Site'], ['CMSPID', 'Medication number'], ['CMTRT', 'Medication'], ['CMINDC', 'Indication'], ['CMDOSE', 'Dose'], ['CMDOSU', 'Unit'], ['CMDOSFRQ', 'Frequency'], ['CMROUTE', 'Route'], ['CMSTDAT', 'Start date'], ['CMENDAT', 'End date'], ['CMONGO', 'Ongoing'], ['CMDECOD', 'Coded: standard name'], ['CMDRN', 'Coded: drug record number'], ['CMCLAS', 'Coded: class (level 4)'], ['CMCLASCD', 'Class code']],
  LBC: [['SUBJID', 'Subject number'], ['VISIT', 'Visit'], ['ACCSNUM', 'Accession number'], ['COLLDATE', 'Collection date'], ['COLLTIME', 'Collection time'], ['TESTCODE', 'Vendor test code'], ['TESTNAME', 'Vendor test name'], ['RESULT', 'Result'], ['UNITS', 'Units'], ['REFLOW', 'Reference range low'], ['REFHIGH', 'Reference range high'], ['FLAG', 'Abnormal flag'], ['SPECIMEN', 'Specimen'], ['FASTING', 'Fasting'], ['COMMENT', 'Lab comment'], ['LABNAME', 'Laboratory']],
  IRT: [['SUBJID', 'Subject number'], ['RANDNO', 'Randomisation number'], ['RANDDT', 'Randomisation date'], ['RANDARM', 'Randomised arm (code)'], ['KITARM', 'Arm of kits dispensed (code)']],
}
export const RAW_FIELDS: Record<string, { name: string; label: string }[]> = Object.fromEntries(Object.entries(RAW_FIELD_PAIRS).map(([k, v]) => [k, v.map(([name, label]) => ({ name, label }))]))

// The planted subjects (fixed so the missions can describe them).
export const PLANTED = {
  notDosed: '103-007', wrongKit: '102-009', death: '105-006', afterDoseVitals: '104-005', day1NotDone: '102-004',
  multiRace: '101-010', missingTemp: '105-002', unscheduled: ['101-003', '104-011'],
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0')
const hhmm = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`
const round1 = (x: number) => Math.round(x * 10) / 10

function race(r: Rng, iso: string): string {
  const pick = (xs: [string, number][]) => { let u = r.next(); for (const [v, w] of xs) { if ((u -= w) < 0) return v } return xs[0][0] }
  if (iso === 'JPN' || iso === 'IND') return 'Asian'
  if (iso === 'DEU') return pick([['White', 0.92], ['Black or African American', 0.04], ['Asian', 0.04]])
  if (iso === 'BRA') return pick([['White', 0.55], ['Black or African American', 0.3], ['American Indian or Alaska Native', 0.05], ['Asian', 0.1]])
  return pick([['White', 0.6], ['Black or African American', 0.25], ['Asian', 0.1], ['Native Hawaiian or Other Pacific Islander', 0.05]])
}

export function generate(seed = 1230301): RawData {
  const r = rng(seed)
  const forms: Record<string, Row[]> = { DM: [], IC: [], SV: [], VS: [], EX: [], DS: [], AE: [], CM: [], IRT: [] }
  const subjects: SubjectTruth[] = []
  const id = (form: string) => `${form}-${String(forms[form].length + 1).padStart(4, '0')}`
  const add = (form: string, row: Record<string, string>) => { forms[form].push({ __id: id(form), ...row }) }
  let randNo = 1000
  SITES.forEach((site, si) => {
    for (let n = 1; n <= 18; n++) {
      const subj = `${site.id}-${pad(n, 3)}`
      const scr = addDays(STUDY.start, si * 3 + (n - 1) * 6 + r.int(0, 3))
      const sf = subj !== '103-007' && (n === 4 && si % 2 === 0 || n === 13 || (n === 17 && si === 1))
      let fate: Fate = sf ? 'screen-fail' : 'completed'
      if (subj === '103-007') fate = 'not-dosed'
      else if (subj === '105-006') fate = 'death'
      else if (!sf && ['101-008', '104-014', '105-015'].includes(subj)) fate = 'ae'
      else if (!sf && ['102-012', '103-016'].includes(subj)) fate = 'withdrew'
      else if (!sf && subj === '104-009') fate = 'lost'
      const female = r.chance(0.46)
      const age = r.int(34, 74)
      const birth = addDays(scr, -Math.round(age * 365.25) - r.int(0, 360))
      const ic = addDays(scr, -r.int(0, 2))
      const rc = subj === PLANTED.multiRace ? 'White; Asian' : race(r, site.iso)
      const eth = site.iso === 'BRA' ? (r.chance(0.6) ? 'Hispanic or Latino' : 'Not Hispanic or Latino') : site.iso === 'USA' ? (r.chance(0.2) ? 'Hispanic or Latino' : r.chance(0.05) ? 'Not reported' : 'Not Hispanic or Latino') : 'Not Hispanic or Latino'
      add('DM', { SUBJID: subj, SITEID: site.id, DMDAT: scr, BRTHDAT: birth, SEX: female ? 'Female' : 'Male', RACE: rc, ETHNIC: eth })
      add('IC', { SUBJID: subj, SITEID: site.id, VISIT: 'Screening', DSSTDAT: ic, ICVER: scr < '2026-03-01' ? 'v1.0' : 'v1.1' })
      // Baseline physiology for this subject.
      const sys0 = r.int(124, 158), dia0 = r.int(72, 96), pul0 = r.int(62, 88)
      const kg0 = round1(female ? r.normal(78, 12) : r.normal(92, 14)), cm0 = Math.round(female ? r.normal(161, 7) : r.normal(175, 7))
      const vsRow = (visit: string, date: string, time: number, tests: string[], drift: number) => {
        const row: Record<string, string> = { SUBJID: subj, SITEID: site.id, VISIT: visit, VSPERF: 'Y', VSREASND: '', VSDAT: date, VSTIM: hhmm(time), VSPOS: 'Sitting', SYSBP: '', DIABP: '', PULSE: '', WEIGHT: '', WEIGHTU: '', HEIGHT: '', HEIGHTU: '', TEMP: '' }
        if (tests.includes('SYSBP')) row.SYSBP = String(Math.round(sys0 - drift * 6 + r.normal(0, 5)))
        if (tests.includes('DIABP')) row.DIABP = String(Math.round(dia0 - drift * 3 + r.normal(0, 3)))
        if (tests.includes('PULSE')) row.PULSE = String(Math.round(pul0 + r.normal(0, 4)))
        if (tests.includes('WEIGHT')) { const kg = kg0 - drift * 1.8 + r.normal(0, 0.6); row.WEIGHTU = site.weightUnit; row.WEIGHT = site.weightUnit === 'lb' ? String(round1(kg / 0.45359237)) : String(round1(kg)) }
        if (tests.includes('HEIGHT')) { row.HEIGHTU = site.heightUnit; row.HEIGHT = site.heightUnit === 'in' ? String(round1(cm0 / 2.54)) : String(cm0) }
        if (tests.includes('TEMP')) row.TEMP = String(round1(36.6 + r.normal(0, 0.25)))
        add('VS', row)
      }
      const scrTime = r.int(8 * 60, 11 * 60)
      add('SV', { SUBJID: subj, SITEID: site.id, VISIT: 'Screening', VISDAT: scr })
      vsRow('Screening', scr, scrTime, VISITS[0].vs.filter((t) => !(t === 'TEMP' && subj === PLANTED.missingTemp)), 0)
      if (fate === 'screen-fail') {
        const end = addDays(scr, r.int(5, 14))
        add('DS', { SUBJID: subj, SITEID: site.id, DSDECOD: 'Screen failure', DSTERM: r.pick(['HbA1c above the inclusion limit', 'eGFR below the inclusion limit', 'Did not meet inclusion criterion 3 (metformin dose stable for 12 weeks)']), DSSTDAT: end })
        add('CM', { SUBJID: subj, SITEID: site.id, CMSPID: '1', CMTRT: 'Metformin', CMINDC: 'Type 2 diabetes', CMDOSE: '1000', CMDOSU: 'mg', CMDOSFRQ: 'BID', CMROUTE: 'Oral', CMSTDAT: addDays(scr, -r.int(400, 2400)), CMENDAT: '', CMONGO: 'Y' })
        subjects.push({ subj, site: site.id, fate, scr, end })
        continue
      }
      const d1 = addDays(scr, r.int(8, 20))
      const planned = ARMS[(n + si) % 3].code
      const kit = subj === PLANTED.wrongKit ? (planned === 'GLV5' ? 'GLV10' : 'GLV5') : planned
      add('IRT', { SUBJID: subj, RANDNO: String(++randNo), RANDDT: d1, RANDARM: planned, KITARM: fate === 'not-dosed' ? '' : kit })
      add('CM', { SUBJID: subj, SITEID: site.id, CMSPID: '1', CMTRT: 'Metformin', CMINDC: 'Type 2 diabetes', CMDOSE: '1000', CMDOSU: 'mg', CMDOSFRQ: 'BID', CMROUTE: 'Oral', CMSTDAT: addDays(scr, -r.int(400, 2400)), CMENDAT: '', CMONGO: 'Y' })
      const doseMin = r.int(9 * 60, 11 * 60)
      // How far through the schedule this subject gets.
      const stopDay = fate === 'completed' ? 999 : fate === 'not-dosed' ? 1 : fate === 'death' ? 97 : fate === 'lost' ? 70 : r.int(30, 150)
      const effect = planned === 'PBO' ? 0.3 : planned === 'GLV5' ? 1 : 1.4
      let lastDose = '', lastVisit = scr
      for (const v of VISITS.slice(1)) {
        if (v.day > stopDay + 0 && v.num > 2) break
        if (fate === 'lost' && v.day > 57) break
        if (fate === 'death' && v.day > 85) break
        if (v.raw === 'Follow-up' && fate !== 'completed') break
        const date = v.num === 2 ? d1 : addDays(d1, v.day - 1 + r.int(-2, 2))
        lastVisit = date
        add('SV', { SUBJID: subj, SITEID: site.id, VISIT: v.raw, VISDAT: date })
        const drift = v.num === 2 ? 0 : Math.min(1, v.day / 90) * effect
        if (v.num === 2 && subj === PLANTED.day1NotDone) {
          add('VS', { SUBJID: subj, SITEID: site.id, VISIT: 'Day 1', VSPERF: 'N', VSREASND: 'Blood pressure monitor out of order', VSDAT: '', VSTIM: '', VSPOS: '', SYSBP: '', DIABP: '', PULSE: '', WEIGHT: '', WEIGHTU: '', HEIGHT: '', HEIGHTU: '', TEMP: '' })
        } else {
          const t = v.num === 2 ? (subj === PLANTED.afterDoseVitals ? doseMin + 25 : doseMin - r.int(20, 50)) : r.int(8 * 60, 12 * 60)
          vsRow(v.raw, date, t, v.vs, drift)
        }
        if (PLANTED.unscheduled.includes(subj) && (v.raw === 'Week 4' || (subj === '104-011' && v.raw === 'Week 8'))) {
          const reps = subj === '104-011' && v.raw === 'Week 8' ? 2 : 1
          for (let k = 1; k <= reps; k++) {
            const ud = addDays(date, 3 * k + 1)
            add('SV', { SUBJID: subj, SITEID: site.id, VISIT: 'Unscheduled', VISDAT: ud })
            vsRow('Unscheduled', ud, r.int(9 * 60, 15 * 60), ['SYSBP', 'DIABP', 'PULSE'], drift)
          }
        }
        if (fate === 'not-dosed') break
      }
      let end = lastVisit
      if (fate !== 'not-dosed') {
        // Kits: Day 1 to Week 4, Week 4 to Week 12, Week 12 to Week 20, Week 20 to Week 26.
        const svDates = forms.SV.filter((x) => x.SUBJID === subj).reduce<Record<string, string>>((m, x) => (x.VISIT !== 'Unscheduled' ? { ...m, [x.VISIT]: x.VISDAT } : m), {})
        const legs: [string, string][] = [['Day 1', 'Week 4'], ['Week 4', 'Week 12'], ['Week 12', 'Week 20'], ['Week 20', 'Week 26']]
        legs.forEach(([from, to], i) => {
          const s = svDates[from]; if (!s) return
          let e = svDates[to] ? addDays(svDates[to], -1) : ''
          if (!svDates[to]) e = fate === 'death' ? addDays(d1, 95) : fate === 'completed' ? '' : addDays(s, r.int(5, 20))
          if (to === 'Week 26' && svDates[to]) e = svDates[to]
          if (!e) return
          add('EX', { SUBJID: subj, SITEID: site.id, VISIT: from, EXKIT: `K${kit === 'PBO' ? 3 : kit === 'GLV5' ? 1 : 2}${pad(si + 1)}${pad(n)}${i + 1}`, EXSTDAT: s, EXSTTIM: i === 0 ? hhmm(doseMin) : '', EXENDAT: e, EXTABS: '1' })
          lastDose = e
        })
        if (fate === 'completed') end = svDates['Follow-up'] ?? lastVisit
        else if (fate === 'death') end = addDays(d1, 96)
        else if (fate === 'lost') end = addDays(lastVisit, 45)
        else end = addDays(lastDose, r.int(1, 6))
        if (end < lastVisit) end = lastVisit
      } else end = d1
      const ds: Record<Fate, [string, string]> = {
        completed: ['Completed', 'Completed the study as planned'], 'screen-fail': ['Screen failure', ''],
        ae: ['Adverse event', 'Discontinued because of an adverse event'], withdrew: ['Withdrawal by subject', r.pick(['Moving to another city', 'Withdrew consent: personal reasons'])],
        lost: ['Lost to follow-up', 'Three phone calls and a registered letter without reply'], death: ['Death', 'Died of acute myocardial infarction'],
        'not-dosed': ['Withdrawal by subject', 'Withdrew consent on Day 1 after randomisation, before the first dose'],
      }
      add('DS', { SUBJID: subj, SITEID: site.id, DSDECOD: ds[fate][0], DSTERM: ds[fate][1], DSSTDAT: end })
      if (fate === 'death') add('AE', { SUBJID: subj, SITEID: site.id, AESPID: '1', AETERM: 'Acute myocardial infarction', AESTDAT: end, AEENDAT: end, AEONGO: 'N', AESEV: 'Severe', AESER: 'Y', AEREL: 'Not related', AEACN: 'Drug withdrawn', AEOUT: 'Fatal', AESDTH: 'Y', AESHOSP: 'Y' })
      if (fate !== 'not-dosed') {
        const k = r.int(0, 3)
        for (let a = 1; a <= k; a++) {
          const st = addDays(d1, r.int(2, 150)); if (st > end) continue
          const term = r.pick(['Headache', 'Nasopharyngitis', 'Diarrhoea', 'Nausea', 'Dizziness', 'Back pain', 'Fatigue', 'ALT increased'])
          const ongoing = r.chance(0.15)
          add('AE', { SUBJID: subj, SITEID: site.id, AESPID: String(a + (fate === 'death' ? 1 : 0)), AETERM: term, AESTDAT: st, AEENDAT: ongoing ? '' : addDays(st, r.int(1, 14)), AEONGO: ongoing ? 'Y' : 'N', AESEV: r.pick(['Mild', 'Mild', 'Moderate']), AESER: 'N', AEREL: r.pick(['Not related', 'Related']), AEACN: fate === 'ae' && a === k ? 'Drug withdrawn' : 'Dose not changed', AEOUT: ongoing ? 'Not recovered/not resolved' : 'Recovered/resolved' })
        }
      }
      subjects.push({ subj, site: site.id, fate, scr, d1, arm: planned, kit: fate === 'not-dosed' ? undefined : kit, doseTime: fate === 'not-dosed' ? undefined : `${d1}T${hhmm(doseMin)}`, lastDose: lastDose || undefined, end })
    }
  })
  phase2(forms, subjects, seed)
  exportFormats(forms)
  return { forms, subjects }
}

let cache: RawData | null = null
export const raw = () => (cache ??= generate())

// The data are generated with ISO dates, then written out the way each source system exports
// them: the EDC as DD-MMM-YYYY with UN/UNK for unknown parts, the central laboratory as YYYYMMDD
// with HHMM times, the IRT as ISO 8601.
function exportFormats(forms: Record<string, Row[]>) {
  for (const f of ['DM', 'IC', 'SV', 'VS', 'EX', 'DS', 'AE', 'CM']) for (const r of forms[f] ?? []) for (const k of Object.keys(r)) if (/DAT$/.test(k) && r[k]) r[k] = toEdc(r[k])
  for (const r of forms.LBC ?? []) { r.COLLDATE = toYmd(r.COLLDATE); r.COLLTIME = r.COLLTIME.replace(':', '') }
}

// ---------- Phase 2 additions (a separate random stream, so the Phase 1 data are unchanged) ----------
const LAB_TESTS = [
  { code: 'A1C', name: 'Hemoglobin A1c', sdtm: 'HBA1C', unit: '%', lo: 4.0, hi: 5.6, spec: 'Whole blood', mean: 8.4, sd: 0.7, dec: 1, drop: 0.9 },
  { code: 'FPG', name: 'Glucose, fasting', sdtm: 'GLUC', unit: 'mg/dL', lo: 70, hi: 99, spec: 'Serum', mean: 172, sd: 25, dec: 0, drop: 30 },
  { code: 'CREA', name: 'Creatinine', sdtm: 'CREAT', unit: 'mg/dL', lo: 0.6, hi: 1.2, spec: 'Serum', mean: 0.95, sd: 0.18, dec: 2, drop: 0 },
  { code: 'ALT', name: 'ALT (SGPT)', sdtm: 'ALT', unit: 'U/L', lo: 7, hi: 56, spec: 'Serum', mean: 26, sd: 9, dec: 0, drop: 0 },
  { code: 'AST', name: 'AST (SGOT)', sdtm: 'AST', unit: 'U/L', lo: 10, hi: 40, spec: 'Serum', mean: 24, sd: 7, dec: 0, drop: 0 },
  { code: 'CHOL', name: 'Cholesterol, total', sdtm: 'CHOL', unit: 'mg/dL', lo: 0, hi: 200, spec: 'Serum', mean: 195, sd: 32, dec: 0, drop: 4 },
]
export const LAB_VISITS = ['Screening', 'Week 4', 'Week 12', 'Week 26']
export const PLANTED_LAB = { hemolysed: '103-005', belowLloq: '105-010', unitTypo: '104', duplicates: ['101-006', '102-003', '105-004'] }

function phase2(forms: Record<string, Row[]>, subjects: SubjectTruth[], seed: number) {
  const r = rng(seed + 7)
  // Adverse events: coding columns from the coding export.
  for (const ae of forms.AE) {
    const verbatim = ae.AETERM === 'Acute myocardial infarction' ? 'Myocardial infarction' : ae.AETERM
    const llt = exactLlt(SMD_10, verbatim)
    if (!llt) continue
    const p = path(SMD_10, llt.code)
    const at = (lv: string) => p.find((t) => t.level === lv)
    Object.assign(ae, { AESDTH: ae.AESDTH ?? '', AESHOSP: ae.AESHOSP ?? '', AELLT: llt.name, AELLTCD: llt.code, AEDECOD: at('PT')!.name, AEPTCD: at('PT')!.code, AEHLT: at('HLT')!.name, AEHLTCD: at('HLT')!.code, AEHLGT: at('HLGT')!.name, AEHLGTCD: at('HLGT')!.code, AESOC: at('SOC')!.name, AESOCCD: at('SOC')!.code })
  }
  // One adverse event with a start date known only to the month.
  const partialAe = forms.AE.find((x) => x.SUBJID === '102-006' || x.SUBJID === '104-003')
  if (partialAe) partialAe.AESTDAT = partialAe.AESTDAT.slice(0, 7)
  // Medications: trade names, partial dates, coding columns, and treatment of some AEs.
  const code = (row: Row) => {
    const d = exactDrug(row.CMTRT) ?? DRUGS.find((x) => x.name.toLowerCase() === row.CMTRT.toLowerCase())
    if (!d) return
    const generic = DRUGS.find((x) => x.drn === d.drn && x.generic)!
    const cls = atcByCode.get(d.atc[0])
    Object.assign(row, { CMDECOD: generic.name, CMDRN: d.id, CMCLAS: cls?.name ?? '', CMCLASCD: d.atc[0] })
  }
  for (const cm of forms.CM) {
    if (r.chance(0.2)) cm.CMTRT = r.pick(['Glucofen', 'Metforal'])
    const u = r.next()
    if (u < 0.15) cm.CMSTDAT = cm.CMSTDAT.slice(0, 4)
    else if (u < 0.4) cm.CMSTDAT = cm.CMSTDAT.slice(0, 7)
    code(cm)
  }
  for (const ae of forms.AE.filter((x) => ['Headache', 'Back pain'].includes(x.AETERM))) {
    if (!r.chance(0.6)) continue
    const n = forms.CM.filter((x) => x.SUBJID === ae.SUBJID).length + 1
    const drug = r.pick(['Paracetamol', 'Ibuprofen', 'Pyrexol'])
    const st = /^\d{4}-\d{2}-\d{2}$/.test(ae.AESTDAT) ? ae.AESTDAT : ''
    if (!st) continue
    const row = { __id: `CM-${String(forms.CM.length + 1).padStart(4, '0')}`, SUBJID: ae.SUBJID, SITEID: ae.SITEID, CMSPID: String(n), CMTRT: drug, CMINDC: ae.AETERM, CMDOSE: drug === 'Ibuprofen' ? '400' : '500', CMDOSU: 'mg', CMDOSFRQ: drug === 'Ibuprofen' ? 'TID' : 'PRN', CMROUTE: 'Oral', CMSTDAT: st, CMENDAT: ae.AEENDAT || '', CMONGO: ae.AEENDAT ? 'N' : 'Y' } as Row
    code(row); forms.CM.push(row)
  }
  forms.CM.sort((a, b) => a.SUBJID.localeCompare(b.SUBJID) || Number(a.CMSPID) - Number(b.CMSPID))
  forms.CM.forEach((x, i) => { x.__id = `CM-${String(i + 1).padStart(4, '0')}` })
  // Central laboratory transfer.
  const lab: Row[] = []
  let acc = 50000
  for (const s of subjects) {
    const sv = forms.SV.filter((x) => x.SUBJID === s.subj && LAB_VISITS.includes(x.VISIT))
    const base = Object.fromEntries(LAB_TESTS.map((t) => [t.code, t.mean + r.normal(0, t.sd)]))
    for (const v of sv) {
      const wk = LAB_VISITS.indexOf(v.VISIT)
      const effect = !s.arm || s.arm === 'PBO' || wk === 0 ? 0.15 : s.arm === 'GLV5' ? 0.8 : 1
      const time = `${String(r.int(7, 10)).padStart(2, '0')}:${String(r.int(0, 59)).padStart(2, '0')}`
      const accession = `ML${++acc}`
      for (const t of LAB_TESTS) {
        let val = base[t.code] - t.drop * effect * Math.min(1, wk / 2) + r.normal(0, t.sd * 0.25)
        val = Math.max(t.code === 'ALT' ? 3 : 0.1, val)
        let result = val.toFixed(t.dec)
        let comment = ''
        if (s.subj === PLANTED_LAB.hemolysed && v.VISIT === 'Week 4' && (t.code === 'AST' || t.code === 'ALT')) { result = ''; comment = 'Specimen hemolyzed - not reported' }
        if (s.subj === PLANTED_LAB.belowLloq && v.VISIT === 'Week 12' && t.code === 'ALT') result = '<5'
        const num = Number(result)
        const flag = result === '' ? '' : result.startsWith('<') ? 'L' : num < t.lo ? 'L' : num > t.hi ? 'H' : ''
        const units = s.site === PLANTED_LAB.unitTypo && t.unit === 'mg/dL' && v.VISIT === 'Week 12' ? 'mg/dl' : t.unit
        lab.push({ __id: '', SUBJID: s.subj, VISIT: v.VISIT, ACCSNUM: accession, COLLDATE: v.VISDAT, COLLTIME: time, TESTCODE: t.code, TESTNAME: t.name, RESULT: result, UNITS: units, REFLOW: String(t.lo), REFHIGH: String(t.hi), FLAG: flag, SPECIMEN: t.spec, FASTING: t.code === 'FPG' ? 'Y' : '', COMMENT: comment, LABNAME: LAB_NAME } as Row)
      }
    }
  }
  // Results resent in a later transfer: exact duplicates.
  for (const subj of PLANTED_LAB.duplicates) {
    const first = lab.filter((x) => x.SUBJID === subj && x.VISIT === 'Week 4').slice(0, 3)
    lab.push(...first.map((x) => ({ ...x })))
  }
  lab.forEach((x, i) => { x.__id = `LBC-${String(i + 1).padStart(5, '0')}` })
  forms.LBC = lab
}
