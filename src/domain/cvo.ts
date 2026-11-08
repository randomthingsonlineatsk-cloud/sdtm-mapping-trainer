// The cardiovascular study CRD-31-401: ECGs read by a central cardiac core laboratory and
// cardiovascular events adjudicated by an independent clinical events committee (CEC). ECGs are
// taken in triplicate (three 10-second tracings a minute apart) before the dose and 2 hours after
// it; the core lab reads each tracing (heart rate, PR, QRS, QT, QTcF by Fridericia, and an
// overall interpretation) and the sponsor adds the mean of each triplicate as a derived record
// (EGDRVFL Y), the value analyses use. Sites report each suspected cardiovascular event on its
// own eCRF page (CE); the CEC's decision about it (is it an endpoint event, and which) arrives as
// a vendor file and is a finding about that event (FA, FAEVAL the committee). The adjudication
// test codes are sponsor-defined. Everything is fictional.

import { rng, addDays } from './util'
import { toEdc, toYmd } from './rawdate'
import { build, type DomainSpec, type OutRow, type Rule, type StudyData } from './engine'
import { varsOf, type Version } from './standards'
import type { Visit } from './study'
import type { Row } from './seed'
import type { StudyPack } from './studypack'

export const CVO_STUDY = {
  id: 'CRD-31-401',
  title: 'A randomised, double-blind, placebo-controlled phase 3 study of Cardelvo (CRD-31) 20 mg once daily in adults with established atherosclerotic cardiovascular disease: ECG safety and adjudicated cardiovascular events',
  short: 'Cardelvo (CRD-31): central ECGs and adjudicated cardiovascular events',
  sponsor: 'Halvern Cardiovascular (fictional)',
  phase: 'Phase 3',
  indication: 'Atherosclerotic cardiovascular disease',
  design: 'Double-blind, randomised 1:1 to Cardelvo 20 mg or placebo once daily for 48 weeks; triplicate 12-lead ECGs before and 2 hours after the dose on Day 1, Week 12 and Week 48, read centrally; suspected cardiovascular events adjudicated by an independent clinical events committee',
}
export const CVO_CORELAB = 'Northgate Cardiac Core Laboratory (fictional)'
export const CVO_CEC = 'ADJUDICATION COMMITTEE'
export const CVO_SITES = [
  { id: '401', name: 'Riverside Heart Institute (fictional)', country: 'Canada', iso: 'CAN' },
  { id: '402', name: 'Hospital Cardiologico Levante (fictional)', country: 'Spain', iso: 'ESP' },
  { id: '403', name: 'Vistula Cardiology Clinic (fictional)', country: 'Poland', iso: 'POL' },
]
export const CVO_ARMS = [{ code: 'CRD20', name: 'Cardelvo 20 mg once daily' }, { code: 'PBO', name: 'Placebo once daily' }]
const V = (raw: string, num: number, name: string, day: number, lo: number, hi: number): Visit => ({ raw, num, name, day, lo, hi, epoch: day < 1 ? 'SCREENING' : 'TREATMENT', vs: [] })
export const CVO_VISITS: Visit[] = [V('Screening', 1, 'SCREENING', -14, -28, -1), V('Day 1', 2, 'DAY 1', 1, 1, 1), V('Week 12', 3, 'WEEK 12', 85, 78, 92), V('Week 24', 4, 'WEEK 24', 169, 162, 176), V('Week 48', 5, 'WEEK 48', 337, 330, 344)]
export const CVO_FORM_INFO: Record<string, { name: string; source: string; note: string }> = {
  DM: { name: 'Demographics', source: 'EDC', note: 'One row per participant screened.' },
  IC: { name: 'Informed consent', source: 'EDC', note: 'One row per participant.' },
  IRT: { name: 'Randomisation (IRT)', source: 'IRT', note: 'One row per randomised participant: the arm code (unblinded at lock).' },
  EXPO: { name: 'Study drug', source: 'EDC', note: 'One row per participant: first and last dose dates and the dose time on ECG days.' },
  ECG: { name: 'ECG core laboratory (vendor)', source: 'Vendor', note: `From ${CVO_CORELAB}: one row per tracing, with the visit, the time point (Pre-dose or 2h post-dose), the replicate (1 to 3), date and time, heart rate (bpm), PR, QRS, QT and QTcF (ms) and the cardiologist’s interpretation (Normal, Abnormal - not clinically significant, Abnormal - clinically significant). A tracing the lab could not read: the intervals blank and a comment.` },
  CVEV: { name: 'Suspected cardiovascular event', source: 'EDC', note: 'One row per event the site suspected: the event ID, what the investigator called it, the start date, whether it was fatal, and the date the documents were sent to the committee.' },
  CEC: { name: 'Adjudication (vendor)', source: 'Vendor', note: 'From the clinical events committee: one row per event adjudicated: the event ID, whether it is an endpoint event (Yes/No), the adjudicated category, and the date of the decision.' },
  SV: { name: 'Visits', source: 'EDC', note: 'One row per visit.' },
}
const F = (pairs: [string, string][]) => pairs.map(([name, label]) => ({ name, label }))
export const CVO_RAW_FIELDS: Record<string, { name: string; label: string }[]> = {
  DM: F([['SUBJID', 'Participant number'], ['SITEID', 'Site'], ['DMDAT', 'Date of collection'], ['BRTHDAT', 'Date of birth'], ['SEX', 'Sex'], ['RACE', 'Race'], ['ETHNIC', 'Ethnicity']]),
  IC: F([['SUBJID', 'Participant number'], ['ICDAT', 'Date informed consent signed']]),
  IRT: F([['SUBJID', 'Participant number'], ['RANDNO', 'Randomisation number'], ['RANDDT', 'Randomisation date (ISO 8601)'], ['RANDARM', 'Arm (code)']]),
  EXPO: F([['SUBJID', 'Participant number'], ['FIRSTDAT', 'First dose date'], ['LASTDAT', 'Last dose date'], ['DOSETIM1', 'Day 1 dose time (HH:MM)']]),
  ECG: F([['SUBJID', 'Participant number'], ['VISIT', 'Visit'], ['TPT', 'Time point'], ['REP', 'Replicate'], ['ECGDATE', 'Date (YYYYMMDD)'], ['ECGTIME', 'Time (HH:MM)'], ['HR', 'Heart rate (bpm)'], ['PR', 'PR (ms)'], ['QRS', 'QRS (ms)'], ['QT', 'QT (ms)'], ['QTCF', 'QTcF (ms)'], ['INTERP', 'Interpretation'], ['COMMENT', 'Comment']]),
  CVEV: F([['SUBJID', 'Participant number'], ['EVENTID', 'Event ID'], ['EVTERM', 'Event as reported'], ['EVSTDAT', 'Start date'], ['FATAL', 'Fatal'], ['SENTDAT', 'Sent to committee']]),
  CEC: F([['SUBJID', 'Participant number'], ['EVENTID', 'Event ID'], ['ENDPOINT', 'Endpoint event'], ['ADJCAT', 'Adjudicated category'], ['ADJDAT', 'Decision date (YYYYMMDD)']]),
  SV: F([['SUBJID', 'Participant number'], ['VISIT', 'Visit'], ['VISDAT', 'Date']]),
}
export const CVO_FACTS: { what: string; value: string }[] = [
  { what: 'Phase', value: 'Phase 3, double-blind, randomised 1:1, placebo-controlled, 48 weeks' },
  { what: 'ECGs', value: `Triplicate 12-lead ECGs, supine after 10 minutes’ rest, before the dose and 2 hours after it on Day 1, Week 12 and Week 48; read by ${CVO_CORELAB}; QTcF = QT / RR^(1/3)` },
  { what: 'Cardiovascular events', value: 'Suspected myocardial infarction, stroke, cardiovascular death, hospitalisation for unstable angina and coronary revascularisation are sent to the committee, which decides whether each is a primary endpoint event (cardiovascular death, myocardial infarction or stroke)' },
]
export const CVO_CONVENTIONS: { topic: string; rule: string }[] = [
  { topic: 'USUBJID', rule: 'STUDYID, a hyphen, and SUBJID: CRD-31-401-402-011.' },
  { topic: 'EG: tests', rule: 'One record per test per tracing: EGHRMN (beats/min), PRAG, QRSAG, QTAG and QTCFAG (msec), and INTP with EGSTRESC NORMAL, ABNORMAL or the full text upper case. EGMETHOD 12 LEAD STANDARD, EGPOS SUPINE, EGNAM the core lab, EGEVAL CENTRAL READER (not for the derived means).' },
  { topic: 'EG: timing and replicates', rule: 'EGTPT PRE-DOSE (EGTPTNUM 1) or 2 H POST-DOSE (2), EGTPTREF the visit’s dose. EGGRPID groups the triplicate: the visit number, the time point number (2-1 is the Day 1 pre-dose triplicate). EGSPID the replicate number. EGDTC the tracing’s date and time.' },
  { topic: 'EG: derived means', rule: 'For each numeric test, a derived record per triplicate with the mean of the tracings read (1 decimal): EGDRVFL Y, the same EGGRPID, EGTPT and visit, EGDTC the first tracing’s time, EGSPID null, EGORRES null. EGLOBXFL on the derived pre-dose Day 1 means only.' },
  { topic: 'EG: unreadable tracing', rule: 'EGSTAT NOT DONE with the lab’s comment in EGREASND, for each test; the mean uses the other two tracings.' },
  { topic: 'DM: death', rule: 'DTHFL Y and DTHDTC the start date of a fatal event; RFPENDTC the date of death for a participant who died, else the last visit.' },
  { topic: 'CE', rule: 'One record per suspected event: CETERM as reported, CECAT SUSPECTED CARDIOVASCULAR EVENT, CESTDTC the start date, CELNKID the event ID. CEPRESP and CEOCCUR null: the page records events that happened, it does not ask about each kind.' },
  { topic: 'FA', rule: 'The committee’s decision, two records per event: FATESTCD CECENDPT (sponsor-defined, added to the extensible FATESTCD codelist and listed in define.xml: Endpoint Event per CEC) with FAORRES Y or N, and CECCAT (sponsor-defined: CEC Adjudicated Category) with the category upper case. FAOBJ the CETERM it is about, FALNKID the event ID, FACAT CEC ADJUDICATION, FAEVAL ADJUDICATION COMMITTEE (the CT term), FADTC the decision date. An event not yet adjudicated has no FA records.' },
]

// ---------- generation ----------
export const CVO_PLANTED: { unreadable?: string; notEndpoint?: string; pending?: string; prolonged?: string; death?: string } = {}
const pad = (n: number) => String(n).padStart(3, '0')
const SUSPECTED: [string, string, string][] = [['Chest pain, admitted, troponin raised', 'Yes', 'Myocardial infarction'], ['Acute anterior STEMI', 'Yes', 'Myocardial infarction'], ['Sudden weakness left arm and face', 'Yes', 'Ischaemic stroke'], ['Transient speech difficulty, resolved in 1 hour', 'No', 'Transient ischaemic attack'], ['Unstable angina, hospitalised', 'No', 'Unstable angina'], ['Elective PCI to the LAD', 'No', 'Coronary revascularisation'], ['Found dead at home', 'Yes', 'Cardiovascular death']]
let cache: { forms: Record<string, Row[]>; subjects: { subj: string; arm?: string }[] } | null = null
export function cvoRaw() {
  if (cache) return cache
  const r = rng(31401)
  const forms: Record<string, Row[]> = { DM: [], IC: [], IRT: [], EXPO: [], ECG: [], CVEV: [], CEC: [], SV: [] }
  let id = 0
  const push = (form: string, row: Record<string, string>) => forms[form].push({ __id: `${form}${++id}`, ...row } as Row)
  const subjects: { subj: string; arm?: string }[] = []
  let n = 0, randomised = 0, randno = 9000, evno = 0
  while (randomised < 36) {
    n++
    const site = CVO_SITES[n % 3].id, subj = `${site}-${pad(n)}`
    const scr = addDays('2025-09-01', n * 3), d1 = addDays(scr, 14 + r.int(0, 6))
    push('DM', { SUBJID: subj, SITEID: site, DMDAT: toEdc(scr), BRTHDAT: toEdc(addDays(scr, -Math.round((50 + r.next() * 28) * 365.25))), SEX: r.chance(0.7) ? 'Male' : 'Female', RACE: r.pick(['White', 'White', 'White', 'Black or African American', 'Asian']), ETHNIC: site === '402' ? r.pick(['Hispanic or Latino', 'Not Hispanic or Latino']) : 'Not Hispanic or Latino' })
    push('IC', { SUBJID: subj, ICDAT: toEdc(scr) })
    push('SV', { SUBJID: subj, VISIT: 'Screening', VISDAT: toEdc(scr) })
    if (n % 10 === 6) { subjects.push({ subj }); continue }
    randomised++
    const arm = randomised % 2 ? 'CRD20' : 'PBO'
    subjects.push({ subj, arm })
    push('IRT', { SUBJID: subj, RANDNO: String(++randno), RANDDT: d1, RANDARM: arm })
    // a suspected event for some participants; a cardiovascular death ends the participant's study
    const hasEvent = randomised % 5 === 2 || randomised === 11
    const ev = hasEvent ? SUSPECTED[evno % SUSPECTED.length] : null
    const evday = 40 + r.int(0, 250), evdate = addDays(d1, evday - 1), death = ev?.[2] === 'Cardiovascular death'
    const last = death ? addDays(evdate, -1) : addDays(d1, 335 + r.int(0, 4)), dosetime = `0${8 + r.int(0, 1)}:${String(r.int(0, 5) * 10).padStart(2, '0')}`
    push('EXPO', { SUBJID: subj, FIRSTDAT: toEdc(d1), LASTDAT: toEdc(last), DOSETIM1: dosetime })
    const hr0 = 62 + r.int(-8, 10), qtc0 = 405 + r.int(-15, 20), pr0 = 160 + r.int(-20, 30), qrs0 = 92 + r.int(-8, 12)
    for (const [vis, day] of [['Day 1', 1], ['Week 12', 85], ['Week 24', 169], ['Week 48', 337]] as [string, number][]) {
      if (death && day >= evday - 3) break
      const date = day === 1 ? d1 : addDays(d1, day - 1 + r.int(-3, 3))
      push('SV', { SUBJID: subj, VISIT: vis, VISDAT: toEdc(date) })
      if (vis === 'Week 24') continue
      for (const [tpt, hrs] of [['Pre-dose', -0.5], ['2h post-dose', 2]] as [string, number][]) for (let rep = 1; rep <= 3; rep++) {
        const mins = 8 * 60 + 30 + Math.round(hrs * 60) + (rep - 1) * 2 + r.int(0, 1), tm = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
        const effect = arm === 'CRD20' && tpt === '2h post-dose' && day > 1 ? 6 : arm === 'CRD20' && tpt === '2h post-dose' ? 4 : 0
        const prolonged = arm === 'CRD20' && vis === 'Week 12' && tpt === '2h post-dose' && randomised === 11
        const hr = hr0 + r.int(-3, 3), qtcf = qtc0 + effect + r.int(-4, 4) + (prolonged ? 64 : 0), rr = 60 / hr
        const qt = Math.round(qtcf * Math.cbrt(rr))
        const bad = vis === 'Week 12' && tpt === 'Pre-dose' && rep === 2 && randomised === 7
        if (bad) CVO_PLANTED.unreadable = subj
        if (prolonged) CVO_PLANTED.prolonged = subj
        push('ECG', { SUBJID: subj, VISIT: vis, TPT: tpt, REP: String(rep), ECGDATE: toYmd(date), ECGTIME: tm, HR: bad ? '' : String(hr), PR: bad ? '' : String(pr0 + r.int(-6, 6)), QRS: bad ? '' : String(qrs0 + r.int(-4, 4)), QT: bad ? '' : String(qt), QTCF: bad ? '' : String(qtcf), INTERP: bad ? '' : prolonged ? 'Abnormal - clinically significant' : r.chance(0.12) ? 'Abnormal - not clinically significant' : 'Normal', COMMENT: bad ? 'Excessive baseline wander, not readable' : '' })
      }
    }
    if (ev) {
      evno++
      const [term, endpoint, cat] = ev, evid = `CV-${String(evno).padStart(3, '0')}`
      push('CVEV', { SUBJID: subj, EVENTID: evid, EVTERM: term, EVSTDAT: toEdc(evdate), FATAL: death ? 'Yes' : 'No', SENTDAT: toEdc(addDays(evdate, 21)) })
      if (evno === 6) CVO_PLANTED.pending = subj
      else push('CEC', { SUBJID: subj, EVENTID: evid, ENDPOINT: endpoint, ADJCAT: cat, ADJDAT: toYmd(addDays(evdate, 60)) })
      if (endpoint === 'No') CVO_PLANTED.notEndpoint ??= subj
      if (death) CVO_PLANTED.death = subj
    }
  }
  cache = { forms, subjects }
  return cache
}

// ---------- reference mapping ----------
const e = (expr: string): Rule => ({ kind: 'expr', expr })
const c = (value: string): Rule => ({ kind: 'const', value })
const cp = (field: string): Rule => ({ kind: 'copy', field })
const ID = (d: string) => ({ STUDYID: c(CVO_STUDY.id), DOMAIN: c(d), USUBJID: e(`concat('${CVO_STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID') })
const TESTS: [string, string, string][] = [['EGHRMN', 'HR', 'beats/min'], ['PRAG', 'PR', 'msec'], ['QRSAG', 'QRS', 'msec'], ['QTAG', 'QT', 'msec'], ['QTCFAG', 'QTCF', 'msec']]
const UNIT = `if(__TESTCD = 'INTP', '', if(__TESTCD = 'EGHRMN', 'beats/min', 'msec'))`
const TPTNUM = "if(TPT = 'Pre-dose', 1, 2)"
const GRP = `concat(visitnum(VISIT, ECGDATE), '-', ${TPTNUM})`
// The mean of the tracings read in this row's triplicate, for the test in this record.
const MEAN = (field: string) => `round(num(subjwhere2('ECG', '${field}', 'VISIT', VISIT, 'TPT', TPT, 'mean')), 1)`
type Ref = { rules: Record<string, Rule>; perm: string[]; source?: string; filter?: string; sort: string[]; transpose?: DomainSpec['transpose']; parts?: DomainSpec['parts'] }
const COMMON_EG = {
  EGTEST: e("ctdecode('EGTESTCD', EGTESTCD)"), EGCAT: c(''), EGPOS: c('SUPINE'), EGMETHOD: c('12 LEAD STANDARD'), EGNAM: c(CVO_CORELAB),
  VISITNUM: e('visitnum(VISIT, ECGDATE)'), VISIT: e('visitname(VISIT, ECGDATE)'), EPOCH: e('epoch(EGDTC)'), EGDY: e('studyday(EGDTC)'),
  EGTPT: e("if(TPT = 'Pre-dose', 'PRE-DOSE', '2 H POST-DOSE')"), EGTPTNUM: e(TPTNUM), EGTPTREF: e("concat(upper(VISIT), ' DOSE')"), EGGRPID: e(GRP),
}
const CVO_REF: Record<string, Ref> = {
  DM: {
    perm: ['BRTHDTC', 'ETHNIC', 'DMDTC', 'DMDY'], sort: ['USUBJID'],
    rules: {
      ...ID('DM'), RFSTDTC: e("dtc(subj('EXPO', 'FIRSTDAT', 'first'), 'DD-MMM-YYYY', subj('EXPO', 'DOSETIM1', 'first'))"), RFENDTC: e("dtc(subj('EXPO', 'LASTDAT', 'first'), 'DD-MMM-YYYY')"),
      RFXSTDTC: e("dtc(subj('EXPO', 'FIRSTDAT', 'first'), 'DD-MMM-YYYY', subj('EXPO', 'DOSETIM1', 'first'))"), RFXENDTC: e("dtc(subj('EXPO', 'LASTDAT', 'first'), 'DD-MMM-YYYY')"),
      RFICDTC: e("dtc(subj('IC', 'ICDAT', 'first'), 'DD-MMM-YYYY')"), RFPENDTC: e("coalesce(dtc(subjwhere('CVEV', 'EVSTDAT', 'FATAL', 'Yes', 'first'), 'DD-MMM-YYYY'), dtc(subj('SV', 'VISDAT', 'max'), 'DD-MMM-YYYY'))"),
      DTHDTC: e("dtc(subjwhere('CVEV', 'EVSTDAT', 'FATAL', 'Yes', 'first'), 'DD-MMM-YYYY')"),
      DTHFL: e("if(present(DTHDTC), 'Y', '')"), SITEID: cp('SITEID'), BRTHDTC: e("dtc(BRTHDAT, 'DD-MMM-YYYY')"), AGE: e("age(BRTHDAT, subj('IC', 'ICDAT', 'first'))"), AGEU: c('YEARS'),
      SEX: { kind: 'recode', field: 'SEX', table: { Female: 'F', Male: 'M' } }, RACE: e('upper(RACE)'), ETHNIC: e('upper(ETHNIC)'),
      ARMCD: e("irt('RANDARM')"), ARM: e("armname(irt('RANDARM'))"), ACTARMCD: e("if(present(subj('EXPO', 'FIRSTDAT', 'first')), irt('RANDARM'), '')"), ACTARM: e('armname(ACTARMCD)'),
      ARMNRS: e("if(isblank(irt('RANDARM')), 'SCREEN FAILURE', '')"), ACTARMUD: c(''), COUNTRY: e('country(SITEID)'), DMDTC: e("dtc(DMDAT, 'DD-MMM-YYYY')"), DMDY: e('studyday(DMDTC, RFSTDTC)'),
    },
  },
  EG: {
    source: 'ECG', perm: ['EGGRPID', 'EGSPID', 'EGPOS', 'EGSTRESN', 'EGSTRESU', 'EGORRESU', 'EGSTAT', 'EGREASND', 'EGNAM', 'EGMETHOD', 'EGEVAL', 'EGDRVFL', 'VISIT', 'EPOCH', 'EGDY', 'EGTPT', 'EGTPTNUM', 'EGTPTREF'],
    sort: ['USUBJID', 'EGTESTCD', 'VISITNUM', 'EGTPTNUM', 'EGDTC', 'EGDRVFL'],
    transpose: { tests: [...TESTS.map(([code, field]) => ({ code, field })), { code: 'INTP', field: 'INTERP' }], drop: '' },
    rules: {
      ...ID('EG'), EGSEQ: { kind: 'seq' }, ...COMMON_EG, EGSPID: cp('REP'), EGTESTCD: cp('__TESTCD'),
      EGORRES: cp('__RESULT'), EGORRESU: e(`if(isblank(__RESULT), '', ${UNIT})`), EGSTRESC: e("if(__TESTCD = 'INTP', upper(__RESULT), __RESULT)"), EGSTRESN: e("if(__TESTCD = 'INTP', '', num(__RESULT))"), EGSTRESU: e('EGORRESU'),
      EGSTAT: e("if(isblank(__RESULT), 'NOT DONE', '')"), EGREASND: e("if(isblank(__RESULT), upper(COMMENT), '')"), EGLOBXFL: c(''), EGEVAL: c('CENTRAL READER'), EGDRVFL: c(''),
      EGDTC: e("dtc(ECGDATE, 'YYYYMMDD', ECGTIME)"),
    },
    // the derived mean of each triplicate, built from the first tracing's row
    parts: [{
      source: 'ECG', filter: "REP = '1'", transpose: { tests: TESTS.map(([code, field]) => ({ code, field })), drop: '' },
      rules: {
        ...ID('EG'), EGSEQ: { kind: 'seq' }, ...COMMON_EG, EGSPID: c(''), EGTESTCD: cp('__TESTCD'), EGORRES: c(''), EGORRESU: c(''),
        EGSTRESC: e(`str(${TESTS.reduce((acc, [code, field]) => `if(__TESTCD = '${code}', ${MEAN(field)}, ${acc})`, "''")})`), EGSTRESN: e('num(EGSTRESC)'), EGSTRESU: e(UNIT),
        EGSTAT: c(''), EGREASND: c(''), EGLOBXFL: e("if(VISIT = 'Day 1' and TPT = 'Pre-dose', 'Y', '')"), EGEVAL: c(''), EGDRVFL: c('Y'), EGDTC: e("dtc(ECGDATE, 'YYYYMMDD', ECGTIME)"),
      },
    }],
  },
  CE: {
    source: 'CVEV', perm: ['CELNKID', 'CECAT', 'EPOCH', 'CESTDTC', 'CESTDY'], sort: ['USUBJID', 'CESTDTC'],
    rules: { ...ID('CE'), CESEQ: { kind: 'seq' }, CELNKID: cp('EVENTID'), CETERM: cp('EVTERM'), CECAT: c('SUSPECTED CARDIOVASCULAR EVENT'), EPOCH: e('epoch(CESTDTC)'), CESTDTC: e("dtc(EVSTDAT, 'DD-MMM-YYYY')"), CESTDY: e('studyday(CESTDTC)') },
  },
  FA: {
    source: 'CEC', perm: ['FALNKID', 'FACAT', 'FAEVAL', 'EPOCH', 'FADTC', 'FADY'], sort: ['USUBJID', 'FALNKID', 'FATESTCD'],
    transpose: { tests: [{ code: 'CECENDPT', field: 'ENDPOINT' }, { code: 'CECCAT', field: 'ADJCAT' }], drop: '' },
    rules: {
      ...ID('FA'), FASEQ: { kind: 'seq' }, FALNKID: cp('EVENTID'), FATESTCD: cp('__TESTCD'), FATEST: e("if(__TESTCD = 'CECENDPT', 'Endpoint Event per CEC', 'CEC Adjudicated Category')"),
      FAOBJ: e("subjwhere('CVEV', 'EVTERM', 'EVENTID', EVENTID, 'first')"), FACAT: c('CEC ADJUDICATION'),
      FAORRES: e("if(__TESTCD = 'CECENDPT', if(__RESULT = 'Yes', 'Y', 'N'), __RESULT)"), FASTRESC: e('upper(FAORRES)'), FAEVAL: c(CVO_CEC),
      VISITNUM: c(''), EPOCH: e('epoch(FADTC)'), FADTC: e("dtc(ADJDAT, 'YYYYMMDD')"), FADY: e('studyday(FADTC)'),
    },
  },
}
export const CVO_DOMAINS = Object.keys(CVO_REF)
export function cvoReferenceSpec(domain: string, ver: Version): DomainSpec {
  const r = CVO_REF[domain]; if (!r) throw new Error(`No reference mapping for ${domain} in ${CVO_STUDY.id}`)
  const keep = (m: { core: string; name: string }) => m.core !== 'Perm' || r.perm.includes(m.name) || (ver === '4.0d' && m.name === 'SUBJID')
  const vars = varsOf(domain, ver).filter((m) => keep(m) && r.rules[m.name]).map((m) => m.name)
  const parts = r.parts?.map((p) => ({ ...p, rules: Object.fromEntries(vars.filter((v) => p.rules[v]).map((v) => [v, p.rules[v]])) }))
  return { domain, source: r.source ?? domain, vars, rules: Object.fromEntries(vars.map((v) => [v, r.rules[v]])), sort: r.sort, ...(r.filter ? { filter: r.filter } : {}), ...(r.transpose ? { transpose: r.transpose } : {}), ...(parts ? { parts } : {}) }
}
let dmCache: Map<string, OutRow> | null = null
const base = (): StudyData => ({ forms: cvoRaw().forms, studyId: CVO_STUDY.id, visits: CVO_VISITS, arms: CVO_ARMS, sites: CVO_SITES })
export function cvoData(): StudyData {
  dmCache ??= new Map(build(cvoReferenceSpec('DM', '3.4'), base()).rows.map((r) => [r.__subj, r]))
  return { ...base(), refDm: dmCache }
}
export const CVO_PACK: StudyPack = {
  ...CVO_STUDY, domains: CVO_DOMAINS, refSpec: cvoReferenceSpec, data: cvoData, formInfo: CVO_FORM_INFO, rawFields: CVO_RAW_FIELDS,
  relrec: [], relNeed: [], facts: CVO_FACTS, conventions: CVO_CONVENTIONS, arms: CVO_ARMS, sites: CVO_SITES, visits: CVO_VISITS,
}
