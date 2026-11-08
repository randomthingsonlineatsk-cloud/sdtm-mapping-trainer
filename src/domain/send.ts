// The nonclinical study ZEN-T-0428: a 4-week oral gavage repeat-dose toxicity study in rats with
// a 2-week recovery period, mapped to SEND (SENDIG v3.1.1) rather than the SDTMIG. The raw data
// are the test facility's exports: the animal list, the protocol's group and set table, dosing,
// body weights, detailed clinical observations, organ weights at necropsy and the pathologist's
// microscopic findings. Real practice followed here: the control group's EXTRT is the test
// article with dose 0 and the vehicle in EXTRTV; every examined tissue has a record, including
// UNREMARKABLE ones; full histopathology for the control and high dose groups and the animal that
// died early, the target organ (liver) for the other groups. Everything is fictional.

import { rng, addDays } from './util'
import { build, type DomainSpec, type OutRow, type Rule, type StudyData } from './engine'
import { varsOf, type Version } from './standards'
import type { Row } from './seed'
import type { StudyPack } from './studypack'

export const SEND_STUDY = {
  id: 'ZEN-T-0428',
  title: 'ZEN-55: a 4-week oral gavage toxicity study in Sprague-Dawley rats with a 2-week recovery period',
  short: 'ZEN-55 4-week rat toxicity study (SEND)',
  sponsor: 'Zenara Biosciences (fictional)',
  phase: 'Nonclinical (GLP toxicology)',
  indication: 'Repeat-dose toxicity, IND-enabling',
  design: 'Four groups of 10 male and 10 female rats dosed once daily by oral gavage for 28 days with vehicle (0.5% methylcellulose) or ZEN-55 at 10, 30 or 100 mg/kg/day; 5 more rats of each sex in the control and high dose groups kept for a 2-week recovery period; necropsy on Day 29 (main) or Day 43 (recovery)',
}
export const SEND_FACILITY = 'Hollowbrook Preclinical Services (fictional)'
export const SEND_VEHICLE = '0.5% METHYLCELLULOSE'
const FIRST = '2026-05-04'
export interface SetDef { setcd: string; set: string; armcd: string; spgrpcd: string; grplbl: string; dose: number; recovery: boolean; m: number; f: number }
export const SEND_SETS: SetDef[] = [
  { setcd: '1', set: 'Vehicle control', armcd: '1', spgrpcd: '1', grplbl: 'Control', dose: 0, recovery: false, m: 10, f: 10 },
  { setcd: '1R', set: 'Vehicle control, recovery', armcd: '1R', spgrpcd: '1', grplbl: 'Control', dose: 0, recovery: true, m: 5, f: 5 },
  { setcd: '2', set: 'ZEN-55 10 mg/kg/day', armcd: '2', spgrpcd: '2', grplbl: 'Low dose', dose: 10, recovery: false, m: 10, f: 10 },
  { setcd: '3', set: 'ZEN-55 30 mg/kg/day', armcd: '3', spgrpcd: '3', grplbl: 'Mid dose', dose: 30, recovery: false, m: 10, f: 10 },
  { setcd: '4', set: 'ZEN-55 100 mg/kg/day', armcd: '4', spgrpcd: '4', grplbl: 'High dose', dose: 100, recovery: false, m: 10, f: 10 },
  { setcd: '4R', set: 'ZEN-55 100 mg/kg/day, recovery', armcd: '4R', spgrpcd: '4', grplbl: 'High dose', dose: 100, recovery: true, m: 5, f: 5 },
]
export const SEND_ARMS = SEND_SETS.map((s) => ({ code: s.armcd, name: s.set }))
export const SEND_SITES = [{ id: 'HPS', name: SEND_FACILITY, country: 'United Kingdom', iso: 'GBR' }]
export const SEND_FORM_INFO: Record<string, { name: string; source: string; note: string }> = {
  PLAN: { name: 'Study plan summary', source: 'Protocol', note: 'The study plan’s key facts as the study director approved them: one row per trial summary parameter with its code, name and value (the codes of the SEND trial summary codelist).' },
  SETS: { name: 'Protocol groups and sets', source: 'Protocol', note: 'One row per set (a group of animals treated and scheduled alike): code, description, group, dose and planned numbers of each sex.' },
  ANIMAL: { name: 'Animal list', source: 'Test facility', note: 'One row per animal: number, sex, set, date of birth, species, strain and supplier details. Animal numbers: the group, then 0xx for males and 5xx for females (1xx and 6xx in recovery sets).' },
  DOSE: { name: 'Dosing', source: 'Test facility', note: 'One row per animal: first and last dose dates, the dose level and volume, the formulation lot.' },
  BWT: { name: 'Body weights', source: 'Test facility', note: 'One row per weighing: planned day, date, weight in g, the type of weighing and any comment. Terminal weights are taken after an overnight fast.' },
  CLO: { name: 'Detailed clinical observations', source: 'Test facility', note: 'One row per observation per animal per examination: “Normal” or the sign seen, with where and how severe. Weekly examinations, and unscheduled ones when an animal is unwell.' },
  OWT: { name: 'Organ weights', source: 'Test facility', note: 'One row per organ weighed at necropsy: weight in g and the facility’s ratios to the terminal body weight and to the brain (%). Not taken for animals that died before the scheduled necropsy.' },
  HISTO: { name: 'Microscopic findings', source: 'Pathologist', note: 'One row per finding per tissue examined, in the pathologist’s words with the severity grade; “No visible lesions” when the tissue is normal; a status when a tissue could not be examined.' },
}
const F = (pairs: [string, string][]) => pairs.map(([name, label]) => ({ name, label }))
export const SEND_RAW_FIELDS: Record<string, { name: string; label: string }[]> = {
  PLAN: F([['PARMCD', 'Parameter code'], ['PARM', 'Parameter'], ['VALUE', 'Value']]),
  SETS: F([['SETCD', 'Set code'], ['SETDESC', 'Set description'], ['ARMCD', 'Arm code'], ['SPGRPCD', 'Group'], ['GRPLBL', 'Group label'], ['TRTDOS', 'Dose level'], ['TRTDOSU', 'Dose unit'], ['SEXPOP', 'Sexes'], ['PLANMSUB', 'Planned males'], ['PLANFSUB', 'Planned females'], ['TCNTRL', 'Control type']]),
  ANIMAL: F([['SUBJID', 'Animal number'], ['SEX', 'Sex'], ['SETCD', 'Set'], ['DOB', 'Date of birth'], ['SPECIES', 'Species'], ['STRAIN', 'Strain'], ['SUPPLIER', 'Supplier details'], ['FATE', 'Fate'], ['NECDATE', 'Necropsy date']]),
  DOSE: F([['SUBJID', 'Animal number'], ['FIRSTDOSE', 'First dose date'], ['LASTDOSE', 'Last dose date'], ['DOSELVL', 'Dose (mg/kg/day)'], ['DOSEVOL', 'Dose volume (mL/kg)'], ['LOT', 'Formulation lot']]),
  BWT: F([['SUBJID', 'Animal number'], ['DAY', 'Planned day'], ['BWDATE', 'Date'], ['WEIGHT', 'Weight (g)'], ['BWTYPE', 'Type of weighing'], ['COMMENT', 'Comment']]),
  CLO: F([['SUBJID', 'Animal number'], ['DAY', 'Planned day'], ['OBSDATE', 'Date'], ['SCHED', 'Scheduled examination'], ['OBS', 'Observation'], ['LOCATION', 'Location'], ['SEVERITY', 'Severity']]),
  OWT: F([['SUBJID', 'Animal number'], ['NECDATE', 'Necropsy date'], ['ORGAN', 'Organ'], ['WEIGHT', 'Weight (g)'], ['RATIO_BW', 'Organ to body weight (%)'], ['RATIO_BR', 'Organ to brain weight (%)']]),
  HISTO: F([['SUBJID', 'Animal number'], ['NECDATE', 'Necropsy date'], ['TISSUE', 'Tissue'], ['FINDING', 'Finding'], ['MODIFIER', 'Modifier'], ['GRADE', 'Severity grade'], ['DISTRIB', 'Distribution'], ['STATUS', 'Status']]),
}
export const SEND_FACTS: { what: string; value: string }[] = [
  { what: 'Standard', value: 'SEND, SENDIG v3.1.1 (required by FDA for nonclinical studies of this kind); the datasets go in eCTD module 4 with define.xml and the nonclinical reviewer’s guide (nSDRG)' },
  { what: 'Test system', value: 'Sprague-Dawley rats, about 7 weeks old at the first dose; 100 animals in 6 sets' },
  { what: 'Dosing', value: `Once daily by oral gavage, Days 1 to 28, 10 mL/kg; vehicle ${SEND_VEHICLE.toLowerCase()}` },
  { what: 'Body weights', value: 'Day 1 before dosing, then Days 8, 15, 22 and 28 (and 36 and 42 in recovery); a fasted terminal weight at necropsy' },
  { what: 'Clinical observations', value: 'Detailed examination weekly on the days of weighing; unscheduled examinations when an animal is unwell' },
  { what: 'Pathology', value: 'Organ weights (brain, heart, kidneys, liver, spleen) at the scheduled necropsy; histopathology of liver, kidney, heart, spleen and stomach for the control and high dose groups and early deaths, liver for the rest' },
]
export const SEND_CONVENTIONS: { topic: string; rule: string }[] = [
  { topic: 'USUBJID', rule: 'STUDYID, a hyphen, and the animal number: ZEN-T-0428-4007. SUBJID the animal number.' },
  { topic: 'DM', rule: 'RFSTDTC and RFXSTDTC the first dose date; RFXENDTC the last dose; RFENDTC the necropsy date. SPECIES RAT, STRAIN SPRAGUE-DAWLEY, SBSTRAIN the supplier details. AGE in weeks at the first dose (AGEU WEEKS). ARMCD and SETCD from the animal’s set, ARM its description.' },
  { topic: 'TS', rule: 'One record per parameter from the study plan summary: TSPARMCD, TSPARM and TSVAL as approved; TSSEQ numbered within each parameter. STSTDTC (the study start date: the study director’s approval of the plan) must be there: the FDA gateway rejects a SEND package without it. Dates ISO 8601.' },
  { topic: 'TX', rule: 'One record per parameter per set from the protocol table: ARMCD, SPGRPCD, GRPLBL, TRTDOS, TRTDOSU, SEXPOP, PLANMSUB, PLANFSUB, and TCNTRL VEHICLE CONTROL for the control sets only. SET the set description; TXPARM the parameter’s name; TXSEQ numbered across the whole dataset.' },
  { topic: 'EX', rule: 'One record per animal for the constant dosing interval: EXTRT ZEN-55 for every animal (the control group too, with EXDOSE 0), EXDOSE the dose level in mg/kg, EXDOSFRM SUSPENSION, EXDOSFRQ QD, EXROUTE ORAL GAVAGE, EXTRTV the vehicle, EXVAMT the dose volume in mL/kg, EXLOT the formulation lot, EXSTDTC and EXENDTC the first and last dose.' },
  { topic: 'BW', rule: 'BWTESTCD BW, or TERMBW for the fasted terminal weight (BWFAST Y). BWORRES as weighed in g. BWBLFL on the Day 1 weight. BWNOMDY the planned day and BWNOMLBL “Day n”. An unscheduled weighing: BWUSCHFL Y. A weighing not done: BWSTAT NOT DONE with the reason. A weight the study director excluded stays, with BWEXCLFL Y and BWREASEX.' },
  { topic: 'CL', rule: 'One record per sign per examination: CLTESTCD CS, CLTEST Clinical Signs, CLCAT CLINICAL SIGNS. CLORRES as recorded, CLSTRESC upper case (NORMAL for a normal animal), CLLOC and CLSEV upper case. Unscheduled examinations: CLUSCHFL Y and no nominal day.' },
  { topic: 'OM', rule: 'OMTESTCD WEIGHT (g), OWBW (organ to body weight, %) and OWBR (organ to brain weight, %; none for the brain itself). OMSPEC the organ in CT (LIVER, KIDNEY…). OMDTC the necropsy date, OMNOMDY the scheduled necropsy day.' },
  { topic: 'MI', rule: 'One record per finding per tissue examined: MITESTCD MIEXAM, MISPEC the tissue, MIORRES the finding with its modifier as the pathologist wrote it, MISTRESC the finding’s CT term (UNREMARKABLE for no visible lesions), MISEV the grade in upper case, MIDISTR the distribution. A tissue not examined: MISTAT NOT DONE with the reason. MIDTC the necropsy date.' },
]

// The study plan summary, as the trial summary parameters (the SEND codelist's codes).
export const SEND_PLAN: [string, string, string][] = [
  ['STSTDTC', 'Study Start Date', '2026-04-14'], ['STITLE', 'Study Title', SEND_STUDY.title], ['SSTYP', 'Study Type', 'REPEAT DOSE TOXICITY'], ['SDESIGN', 'Study Design', 'PARALLEL'],
  ['SPECIES', 'Species', 'RAT'], ['STRAIN', 'Strain/Substrain', 'SPRAGUE-DAWLEY'], ['ROUTE', 'Route of Administration', 'ORAL GAVAGE'], ['TRT', 'Investigational Therapy or Treatment', 'ZEN-55'],
  ['TRTV', 'Treatment Vehicle', SEND_VEHICLE], ['DOSDUR', 'Dosing Duration', 'P4W'], ['SEXPOP', 'Sex of Participants', 'BOTH'], ['GLPFL', 'GLP Flag', 'Y'], ['GLPTYP', 'Good Laboratory Practice Type', 'FDA'],
  ['TSTFNAM', 'Test Facility Name', SEND_FACILITY], ['STDIR', 'Study Director', 'Dr A. Fenwick (fictional)'], ['SPONSOR', 'Sponsoring Organization', SEND_STUDY.sponsor],
  ['EXPSTDTC', 'Experimental Start Date', '2026-05-04'], ['EXPENDTC', 'Experimental End Date', '2026-06-15'], ['SNDIGVER', 'SEND Implementation Guide Version', 'SENDIG 3.1.1'], ['SNDCTVER', 'SEND Controlled Terminology Version', 'CDISC SEND Terminology, 2026-09 release'],
]

// ---------- generation ----------
export const SEND_PLANTED: { earlyDeath?: string; bwMissed?: string; bwExcluded?: string; tissueMissing?: string; recoveredLiver?: string } = {}
const GRADES = ['Minimal', 'Mild', 'Moderate', 'Marked']
const ORGANS: [string, number, number][] = [['Brain', 2.0, 1.8], ['Heart', 1.15, 0.85], ['Kidney', 2.6, 1.7], ['Liver', 11.5, 7.6], ['Spleen', 0.75, 0.55]]
let cache: { forms: Record<string, Row[]>; subjects: { subj: string; arm?: string }[] } | null = null
export function sendRaw() {
  if (cache) return cache
  const r = rng(428)
  const forms: Record<string, Row[]> = { PLAN: [], SETS: [], ANIMAL: [], DOSE: [], BWT: [], CLO: [], OWT: [], HISTO: [] }
  let id = 0
  const push = (form: string, row: Record<string, string>) => forms[form].push({ __id: `${form}${++id}`, ...row } as Row)
  const subjects: { subj: string; arm?: string }[] = []
  for (const [cd, nm, val] of SEND_PLAN) push('PLAN', { PARMCD: cd, PARM: nm, VALUE: val })
  for (const s of SEND_SETS) push('SETS', { SETCD: s.setcd, SETDESC: s.set, ARMCD: s.armcd, SPGRPCD: s.spgrpcd, GRPLBL: s.grplbl, TRTDOS: String(s.dose), TRTDOSU: 'mg/kg/day', SEXPOP: 'BOTH', PLANMSUB: String(s.m), PLANFSUB: String(s.f), TCNTRL: s.dose === 0 ? 'Vehicle control' : '' })
  for (const s of SEND_SETS) for (const sex of ['M', 'F'] as const) for (let i = 1; i <= (sex === 'M' ? s.m : s.f); i++) {
    const g = Number(s.spgrpcd)
    const subj = `${g}${sex === 'M' ? (s.recovery ? 1 : 0) : s.recovery ? 6 : 5}${String(i).padStart(2, '0')}`
    subjects.push({ subj, arm: s.armcd })
    const died = !SEND_PLANTED.earlyDeath && g === 4 && sex === 'M' && !s.recovery && i === 7
    const lastDay = died ? 17 : 28, necDay = died ? 18 : s.recovery ? 43 : 29
    if (died) SEND_PLANTED.earlyDeath = subj
    const nec = addDays(FIRST, necDay - 1)
    push('ANIMAL', { SUBJID: subj, SEX: sex === 'M' ? 'Male' : 'Female', SETCD: s.setcd, DOB: addDays(FIRST, -(50 + r.int(0, 4))), SPECIES: 'Rat', STRAIN: 'Sprague-Dawley', SUPPLIER: 'Outbred SD, barrier colony B (fictional supplier)', FATE: died ? 'Euthanised in extremis' : s.recovery ? 'Recovery necropsy' : 'Terminal necropsy', NECDATE: nec })
    push('DOSE', { SUBJID: subj, FIRSTDOSE: FIRST, LASTDOSE: addDays(FIRST, lastDay - 1), DOSELVL: String(s.dose), DOSEVOL: '10', LOT: s.dose === 0 ? 'VEH-2604-11' : 'ZN55-F2604-03' })
    // body weights: males start about 250 g and gain about 6 g/day, females 180 g and 3 g/day;
    // the high dose slows the gain, which recovers after dosing stops
    const w0 = sex === 'M' ? 245 + r.int(-15, 15) : 178 + r.int(-10, 10), gain = (sex === 'M' ? 6 : 3) * (g === 4 ? 0.82 : g === 3 ? 0.95 : 1)
    const wt = (day: number) => +(w0 + gain * Math.min(day - 1, 28) + (day > 29 ? (sex === 'M' ? 5.5 : 2.6) * (day - 29) : 0) + r.int(-4, 4)).toFixed(1)
    const days = [1, 8, 15, 22, 28, ...(s.recovery ? [36, 42] : [])].filter((d) => !died || d < 18)
    for (const d of days) {
      const missed = !SEND_PLANTED.bwMissed && g === 2 && sex === 'F' && i === 3 && d === 15
      const excluded = !SEND_PLANTED.bwExcluded && g === 3 && sex === 'M' && i === 5 && d === 22
      if (missed) SEND_PLANTED.bwMissed = subj
      if (excluded) SEND_PLANTED.bwExcluded = subj
      push('BWT', { SUBJID: subj, DAY: String(d), BWDATE: addDays(FIRST, d - 1), WEIGHT: missed ? '' : String(excluded ? wt(d) + 38 : wt(d)), BWTYPE: 'Scheduled', COMMENT: missed ? 'Not weighed: balance failed its daily check' : excluded ? 'Excluded by the study director: weighed with the feeder attached' : '' })
    }
    if (died) push('BWT', { SUBJID: subj, DAY: '', BWDATE: nec, WEIGHT: String(+(wt(18) - 31).toFixed(1)), BWTYPE: 'Unscheduled', COMMENT: 'Weighed before euthanasia' })
    else push('BWT', { SUBJID: subj, DAY: String(necDay), BWDATE: nec, WEIGHT: String(+(wt(necDay) * 0.93).toFixed(1)), BWTYPE: 'Terminal (fasted)', COMMENT: '' })
    // detailed clinical observations on the weighing days
    for (const d of days) {
      const signs: [string, string, string][] = []
      if (g === 4 && d >= 8 && r.chance(0.45)) signs.push(['Salivation', '', ''])
      if (g === 4 && d >= 15 && r.chance(0.15)) signs.push(['Piloerection', '', 'Slight'])
      if (r.chance(0.03)) signs.push(['Alopecia', 'Forelimb, left', ''])
      if (!signs.length) signs.push(['Normal', '', ''])
      for (const [o, loc, sev] of signs) push('CLO', { SUBJID: subj, DAY: String(d), OBSDATE: addDays(FIRST, d - 1), SCHED: 'Yes', OBS: o, LOCATION: loc, SEVERITY: sev })
    }
    if (died) for (const [d, o, sev] of [[17, 'Hunched posture', 'Moderate'], [17, 'Decreased activity', 'Moderate'], [18, 'Hunched posture', 'Marked'], [18, 'Decreased activity', 'Marked'], [18, 'Cold to touch', '']] as [number, string, string][])
      push('CLO', { SUBJID: subj, DAY: '', OBSDATE: addDays(FIRST, d - 1), SCHED: 'No', OBS: o, LOCATION: '', SEVERITY: sev })
    // organ weights at the scheduled necropsy only
    if (!died) {
      const tb = +(wt(necDay) * 0.93), brain = +((sex === 'M' ? 2.0 : 1.85) + r.int(-8, 8) / 100).toFixed(2)
      for (const [organ, m, f] of ORGANS) {
        const liverUp = organ === 'Liver' ? (g === 4 ? (s.recovery ? 1.04 : 1.22) : g === 3 ? 1.09 : 1) : 1
        const w = organ === 'Brain' ? brain : +((sex === 'M' ? m : f) * liverUp * (tb / (sex === 'M' ? 390 : 240)) * (1 + r.int(-8, 8) / 100)).toFixed(organ === 'Liver' ? 2 : 3)
        push('OWT', { SUBJID: subj, NECDATE: nec, ORGAN: organ, WEIGHT: String(w), RATIO_BW: (w / tb * 100).toFixed(4), RATIO_BR: organ === 'Brain' ? '' : (w / brain * 100).toFixed(2) })
      }
    }
    // histopathology
    const full = g === 1 && !s.recovery || g === 4 && !s.recovery || died
    const tissues = full ? ['Liver', 'Kidney', 'Heart', 'Spleen', 'Stomach'] : ['Liver']
    for (const t of tissues) {
      const row = (finding: string, modifier = '', grade = '', distrib = '', status = '') => push('HISTO', { SUBJID: subj, NECDATE: nec, TISSUE: t, FINDING: finding, MODIFIER: modifier, GRADE: grade, DISTRIB: distrib, STATUS: status })
      if (t === 'Spleen' && !SEND_PLANTED.tissueMissing && g === 1 && sex === 'F' && i === 4) { SEND_PLANTED.tissueMissing = subj; row('', '', '', '', 'Not examined: tissue missing'); continue }
      if (t === 'Liver') {
        const p = g === 4 ? (s.recovery ? 0.4 : 0.95) : g === 3 ? 0.6 : 0
        if (r.chance(p)) {
          const gr = g === 4 && !s.recovery ? r.int(1, 2) : 0
          if (g === 4 && s.recovery) SEND_PLANTED.recoveredLiver ??= subj
          row('Hypertrophy, hepatocellular', 'centrilobular', GRADES[gr], 'Diffuse'); continue
        }
        if (died) { row('Necrosis', 'centrilobular, single cell', 'Mild', 'Multifocal'); continue }
      }
      if (t === 'Kidney' && r.chance(0.2)) { row('Infiltrate, mononuclear cell', 'interstitial', 'Minimal', 'Focal'); continue }
      row('No visible lesions')
    }
  }
  cache = { forms, subjects }
  return cache
}

// ---------- reference mapping ----------
const e = (expr: string): Rule => ({ kind: 'expr', expr })
const c = (value: string): Rule => ({ kind: 'const', value })
const cp = (field: string): Rule => ({ kind: 'copy', field })
const ID = (d: string) => ({ STUDYID: c(SEND_STUDY.id), DOMAIN: c(d), USUBJID: e(`concat('${SEND_STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID') })
const ISO = (f: string) => `dtc(${f}, 'ISO 8601')`
type Ref = { rules: Record<string, Rule>; source: string; filter?: string; transpose?: DomainSpec['transpose']; sort: string[] }
const SEND_REF: Record<string, Ref> = {
  DM: {
    source: 'ANIMAL', sort: ['USUBJID'],
    rules: {
      ...ID('DM'), RFSTDTC: e(ISO("subj('DOSE', 'FIRSTDOSE', 'first')")), RFENDTC: e(ISO('NECDATE')), RFXSTDTC: e(ISO("subj('DOSE', 'FIRSTDOSE', 'first')")), RFXENDTC: e(ISO("subj('DOSE', 'LASTDOSE', 'first')")),
      SITEID: c('HPS'), BRTHDTC: e(ISO('DOB')), AGE: e("floor(days(dtc(DOB, 'ISO 8601'), RFSTDTC) / 7)"), AGEU: c('WEEKS'),
      SEX: { kind: 'recode', field: 'SEX', table: { Male: 'M', Female: 'F' } }, SPECIES: e('upper(SPECIES)'), STRAIN: e('upper(STRAIN)'), SBSTRAIN: cp('SUPPLIER'),
      ARMCD: cp('SETCD'), ARM: e('armname(SETCD)'), SETCD: cp('SETCD'),
    },
  },
  TS: {
    source: 'PLAN', sort: ['TSPARMCD', 'TSSEQ'],
    rules: { STUDYID: c(SEND_STUDY.id), DOMAIN: c('TS'), TSSEQ: e('1'), TSPARMCD: cp('PARMCD'), TSPARM: cp('PARM'), TSVAL: cp('VALUE') },
  },
  TX: {
    source: 'SETS', sort: ['SETCD', 'TXSEQ'],
    transpose: { tests: ['ARMCD', 'SPGRPCD', 'GRPLBL', 'TRTDOS', 'TRTDOSU', 'SEXPOP', 'PLANMSUB', 'PLANFSUB', 'TCNTRL'].map((k) => ({ code: k, field: k })), drop: 'isblank(__RESULT)' },
    rules: {
      STUDYID: c(SEND_STUDY.id), DOMAIN: c('TX'), SETCD: cp('SETCD'), SET: cp('SETDESC'), TXSEQ: { kind: 'seq' }, TXPARMCD: cp('__TESTCD'), TXPARM: e("ctdecode('TXPARMCD', __TESTCD)"),
      TXVAL: e("if(__TESTCD = 'TCNTRL', upper(__RESULT), __RESULT)"),
    },
  },
  EX: {
    source: 'DOSE', sort: ['USUBJID', 'EXTRT', 'EXSTDTC'],
    rules: {
      ...ID('EX'), EXSEQ: { kind: 'seq' }, EXTRT: c('ZEN-55'), EXDOSE: e('num(DOSELVL)'), EXDOSU: c('mg/kg'), EXDOSFRM: c('SUSPENSION'), EXDOSFRQ: c('QD'), EXROUTE: c('ORAL GAVAGE'),
      EXLOT: cp('LOT'), EXTRTV: c(SEND_VEHICLE), EXVAMT: e('num(DOSEVOL)'), EXVAMTU: c('mL/kg'),
      EXSTDTC: e(ISO('FIRSTDOSE')), EXENDTC: e(ISO('LASTDOSE')), EXSTDY: e('studyday(EXSTDTC)'), EXENDY: e('studyday(EXENDTC)'),
    },
  },
  BW: {
    source: 'BWT', sort: ['USUBJID', 'BWTESTCD', 'BWDTC', 'BWUSCHFL'],
    rules: {
      ...ID('BW'), BWSEQ: { kind: 'seq' }, BWTESTCD: e("if(BWTYPE = 'Terminal (fasted)', 'TERMBW', 'BW')"), BWTEST: e("ctdecode('BWTESTCD', BWTESTCD)"),
      BWORRES: cp('WEIGHT'), BWORRESU: e("if(present(WEIGHT), 'g', '')"), BWSTRESC: cp('WEIGHT'), BWSTRESN: e('num(WEIGHT)'), BWSTRESU: e('BWORRESU'),
      BWSTAT: e("if(isblank(WEIGHT), 'NOT DONE', '')"), BWREASND: e("if(isblank(WEIGHT), upper(COMMENT), '')"), BWBLFL: e("if(DAY = '1', 'Y', '')"),
      BWFAST: e("if(BWTYPE = 'Terminal (fasted)', 'Y', '')"), BWEXCLFL: e("if(contains(COMMENT, 'Excluded'), 'Y', '')"), BWREASEX: e("if(contains(COMMENT, 'Excluded'), upper(part(COMMENT, ':', 2)), '')"),
      BWUSCHFL: e("if(BWTYPE = 'Unscheduled', 'Y', '')"), BWDTC: e(ISO('BWDATE')), BWDY: e('studyday(BWDTC)'), BWNOMDY: e('num(DAY)'), BWNOMLBL: e("if(present(DAY), concat('Day ', DAY), '')"),
    },
  },
  CL: {
    source: 'CLO', sort: ['USUBJID', 'CLDTC', 'CLSTRESC'],
    rules: {
      ...ID('CL'), CLSEQ: { kind: 'seq' }, CLTESTCD: c('CS'), CLTEST: c('Clinical Signs'), CLCAT: c('CLINICAL SIGNS'), CLORRES: cp('OBS'), CLSTRESC: e('upper(OBS)'),
      CLLOC: e('upper(LOCATION)'), CLSEV: e('upper(SEVERITY)'), CLUSCHFL: e("if(SCHED = 'No', 'Y', '')"), CLDTC: e(ISO('OBSDATE')), CLDY: e('studyday(CLDTC)'),
      CLNOMDY: e('num(DAY)'), CLNOMLBL: e("if(present(DAY), concat('Day ', DAY), '')"),
    },
  },
  OM: {
    source: 'OWT', sort: ['USUBJID', 'OMSPEC', 'OMTESTCD'],
    transpose: { tests: [{ code: 'WEIGHT', field: 'WEIGHT' }, { code: 'OWBW', field: 'RATIO_BW' }, { code: 'OWBR', field: 'RATIO_BR' }], drop: 'isblank(__RESULT)' },
    rules: {
      ...ID('OM'), OMSEQ: { kind: 'seq' }, OMTESTCD: cp('__TESTCD'), OMTEST: e("ctdecode('OMTESTCD', __TESTCD)"), OMORRES: cp('__RESULT'), OMORRESU: e("if(__TESTCD = 'WEIGHT', 'g', '%')"),
      OMSTRESC: cp('__RESULT'), OMSTRESN: e('num(__RESULT)'), OMSTRESU: e('OMORRESU'), OMSPEC: e('upper(ORGAN)'), OMDTC: e(ISO('NECDATE')), OMDY: e('studyday(OMDTC)'), OMNOMDY: e('studyday(OMDTC)'),
    },
  },
  MI: {
    source: 'HISTO', sort: ['USUBJID', 'MISPEC', 'MISTRESC'],
    rules: {
      ...ID('MI'), MISEQ: { kind: 'seq' }, MITESTCD: c('MIEXAM'), MITEST: c('Microscopic Examination'),
      MIORRES: e("if(isblank(MODIFIER), FINDING, concat(FINDING, ', ', MODIFIER))"),
      MISTRESC: e("if(isblank(FINDING), '', if(FINDING = 'No visible lesions', 'UNREMARKABLE', upper(FINDING)))"),
      MICHRON: c(''), MIDISTR: e('upper(DISTRIB)'), MISTAT: e("if(present(STATUS), 'NOT DONE', '')"), MIREASND: e("if(present(STATUS), upper(part(STATUS, ':', 2)), '')"),
      MISPEC: e('upper(TISSUE)'), MISPCCND: c(''), MISPCUFL: c(''), MISEV: e('upper(GRADE)'), MIDTC: e(ISO('NECDATE')), MIDY: e('studyday(MIDTC)'),
    },
  },
}
export const SEND_DOMAINS = Object.keys(SEND_REF)
export function sendReferenceSpec(domain: string, ver: Version): DomainSpec {
  const r = SEND_REF[domain]; if (!r) throw new Error(`No reference mapping for ${domain} in ${SEND_STUDY.id}`)
  const vars = varsOf(domain, ver === 'send' ? ver : 'send').filter((m) => r.rules[m.name]).map((m) => m.name)
  return { domain, source: r.source, vars, rules: Object.fromEntries(vars.map((v) => [v, r.rules[v]])), sort: r.sort, ...(r.filter ? { filter: r.filter } : {}), ...(r.transpose ? { transpose: r.transpose } : {}) }
}
let dmCache: Map<string, OutRow> | null = null
const base = (): StudyData => ({ forms: sendRaw().forms, studyId: SEND_STUDY.id, arms: SEND_ARMS, sites: SEND_SITES })
export function sendData(): StudyData {
  dmCache ??= new Map(build(sendReferenceSpec('DM', 'send'), base()).rows.map((r) => [r.__subj, r]))
  return { ...base(), refDm: dmCache }
}
export const SEND_PACK: StudyPack = {
  ...SEND_STUDY, domains: SEND_DOMAINS, refSpec: sendReferenceSpec, data: sendData, formInfo: SEND_FORM_INFO, rawFields: SEND_RAW_FIELDS,
  relrec: [], relNeed: [], facts: SEND_FACTS, conventions: SEND_CONVENTIONS, arms: SEND_ARMS, sites: SEND_SITES, visits: [], standard: 'send',
}
