// The third study: ONK-44-302, a randomised, open-label phase 3 study of ONK-44 against
// docetaxel in previously treated advanced non-small cell lung cancer, built for oncology
// mapping. Tumours are assessed by RECIST 1.1 every 6 weeks from randomisation, by the
// investigator (EDC: lesions identified at baseline and new lesions later, each lesion's
// measurement, the sum of diameters and the response) and by an independent review committee
// (IRC, a vendor file of responses). Lesion sizes follow a per-subject response curve; responses
// are worked out by the RECIST 1.1 rules from the measurements, so TU, TR and RS agree, with the
// kind of discrepancies real data has. Prior cancer procedures (PR), deaths (DD and DM) and the
// treatment and follow-up epochs complete the study. Everything is fictional.

import { rng, addDays } from './util'
import { toEdc } from './rawdate'
import { build, type DomainSpec, type OutRow, type Rule, type StudyData } from './engine'
import { varsOf, type Version } from './standards'
import type { RelDef } from './relrec'
import type { Visit } from './study'
import type { Row } from './seed'
import type { StudyPack } from './studypack'
import { SORT } from './reference'

export const ONK_STUDY = {
  id: 'ONK-44-302',
  title: 'A randomised, open-label, phase 3 study of ONK-44 versus docetaxel in adults with advanced non-small cell lung cancer after one prior platinum-based chemotherapy',
  short: 'ONK-44 versus docetaxel in advanced NSCLC',
  sponsor: 'Meridale Oncology (fictional)',
  phase: 'Phase 3',
  indication: 'Advanced non-small cell lung cancer, second line',
  design: 'Randomised 1:1, open-label, two arms: ONK-44 400 mg orally once daily in 21-day cycles, or docetaxel 75 mg/m² intravenously on day 1 of each 21-day cycle, until progression or unacceptable toxicity. Tumours assessed by RECIST 1.1 at screening and every 6 weeks from randomisation, by the investigator and by blinded independent central review',
  planned: 42,
}
export const ONK_IRC = 'Lumen Imaging Core (fictional)'
export const ONK_CUT = '2026-10-31'
export const ONK_SITES = [
  { id: '401', name: 'Regional Cancer Centre, Bengaluru (fictional)', country: 'India', iso: 'IND' },
  { id: '402', name: 'Thoracic Oncology Unit, Leeds (fictional)', country: 'United Kingdom', iso: 'GBR' },
]
export const ONK_ARMS = [
  { code: 'ONK44', name: 'ONK-44 400 mg once daily' },
  { code: 'DOCE', name: 'Docetaxel 75 mg/m2 every 3 weeks' },
]
const wk = (n: number, num: number): Visit => ({ raw: `Week ${n}`, num, name: `WEEK ${n}`, day: n * 7 + 1, lo: n * 7 - 6, hi: n * 7 + 8, epoch: 'TREATMENT', vs: [] })
export const ONK_VISITS: Visit[] = [
  { raw: 'Screening', num: 1, name: 'SCREENING', day: -14, lo: -28, hi: -1, epoch: 'SCREENING', vs: [] },
  { raw: 'Cycle 1 Day 1', num: 2, name: 'CYCLE 1 DAY 1', day: 1, lo: 1, hi: 1, epoch: 'TREATMENT', vs: [] },
  ...[6, 12, 18, 24, 30, 36, 42].map((n, i) => wk(n, i + 3)),
]
export const ONK_FORM_INFO: Record<string, { name: string; source: string; note: string }> = {
  DM: { name: 'Demographics', source: 'EDC', note: 'One row per subject screened.' },
  IC: { name: 'Informed consent', source: 'EDC', note: 'One row per subject.' },
  IRT: { name: 'Randomisation (IRT)', source: 'IRT', note: 'One row per randomised subject: arm code and date. The study is open-label.' },
  EX: { name: 'Study treatment', source: 'EDC', note: 'One row per cycle: ONK-44 is taken daily through the cycle (start and end dates); docetaxel is infused on the cycle’s first day (start date = end date).' },
  LC: { name: 'Last contact', source: 'EDC', note: 'The date each subject was last known alive (or died), as of the data cut-off.' },
  PRP: { name: 'Prior cancer procedures', source: 'EDC', note: 'Surgery, radiotherapy and biopsies for lung cancer before the study. Partial dates are UN or UNK; radiotherapy has a total dose in Gy.' },
  TUI: { name: 'Lesion identification', source: 'EDC', note: 'One row per lesion: target and non-target lesions at screening, new lesions at the visit they appear. LESID is the lesion’s identifier (T01, NT01, NL01).' },
  TRM: { name: 'Lesion assessment', source: 'EDC', note: 'One row per lesion per visit: the diameter in mm (the short axis for a lymph node), “too small to measure”, or the state of a non-target or new lesion. A scan not done has NOTDONE with the reason.' },
  RSP: { name: 'Response (investigator)', source: 'EDC', note: 'One row per assessment visit: the sum of diameters the site calculated and the investigator’s RECIST 1.1 responses (target, non-target, new lesions, overall).' },
  IRC: { name: 'Independent review', source: 'Vendor', note: `From ${ONK_IRC}: the blinded independent central review’s responses per time point, read from the same scans. Response codes as the vendor writes them.` },
  DTH: { name: 'Death', source: 'EDC', note: 'One row per subject who died: the date (partial if not known) and the primary cause as the investigator reported it.' },
}
const F = (pairs: [string, string][]) => pairs.map(([name, label]) => ({ name, label }))
export const ONK_RAW_FIELDS: Record<string, { name: string; label: string }[]> = {
  DM: F([['SUBJID', 'Subject number'], ['SITEID', 'Site'], ['DMDAT', 'Date of collection'], ['BRTHDAT', 'Date of birth'], ['SEX', 'Sex'], ['RACE', 'Race'], ['ETHNIC', 'Ethnicity']]),
  IC: F([['SUBJID', 'Subject number'], ['ICDAT', 'Date informed consent signed']]),
  IRT: F([['SUBJID', 'Subject number'], ['RANDNO', 'Randomisation number'], ['RANDDT', 'Randomisation date (ISO 8601)'], ['RANDARM', 'Arm (code)']]),
  EX: F([['SUBJID', 'Subject number'], ['CYCLE', 'Cycle'], ['EXSTDAT', 'Start date'], ['EXENDAT', 'End date']]),
  LC: F([['SUBJID', 'Subject number'], ['LCDAT', 'Date of last contact']]),
  PRP: F([['SUBJID', 'Subject number'], ['PRSPID', 'Procedure number'], ['PROC', 'Procedure'], ['PRCAT', 'Category'], ['LOC', 'Location'], ['LAT', 'Side'], ['STDAT', 'Start date'], ['ENDAT', 'End date'], ['DOSE', 'Total dose'], ['DOSEU', 'Dose unit']]),
  TUI: F([['SUBJID', 'Subject number'], ['VISIT', 'Visit'], ['ASSDAT', 'Scan date'], ['LESID', 'Lesion ID'], ['LESTYPE', 'Lesion type'], ['LOC', 'Location'], ['LAT', 'Side'], ['NODAL', 'Lymph node (Y/N)'], ['METHOD', 'Method']]),
  TRM: F([['SUBJID', 'Subject number'], ['VISIT', 'Visit'], ['ASSDAT', 'Scan date'], ['LESID', 'Lesion ID'], ['DIAM', 'Diameter or short axis (mm)'], ['TSTM', 'Too small to measure (Y)'], ['LESSTAT', 'State (non-target and new lesions)'], ['NOTDONE', 'Not assessed: reason']]),
  RSP: F([['SUBJID', 'Subject number'], ['VISIT', 'Visit'], ['ASSDAT', 'Scan date'], ['SUMDIAM', 'Sum of diameters (mm)'], ['TRGRESP', 'Target response'], ['NTRGRESP', 'Non-target response'], ['NEWLES', 'New lesions (Y/N)'], ['OVRLRESP', 'Overall response']]),
  IRC: F([['SUBJID', 'Subject number'], ['TIMEPOINT', 'Time point'], ['SCANDATE', 'Scan date (YYYYMMDD)'], ['TARGET', 'Target response'], ['NONTARGET', 'Non-target response'], ['NEWLESION', 'New lesion (Y/N)'], ['OVERALL', 'Overall response'], ['READER', 'Reader']]),
  DTH: F([['SUBJID', 'Subject number'], ['DTHDAT', 'Date of death'], ['DTHCAUSE', 'Primary cause of death']]),
}
export const ONK_FACTS: { what: string; value: string }[] = [
  { what: 'Phase', value: 'Phase 3, randomised 1:1, open-label' },
  { what: 'Population', value: 'Adults with advanced non-small cell lung cancer that progressed after one platinum-based chemotherapy' },
  { what: 'Arms', value: 'ONK-44 400 mg orally once daily (21-day cycles); docetaxel 75 mg/m² IV on day 1 every 21 days' },
  { what: 'Primary endpoint', value: 'Progression-free survival by blinded independent central review (RECIST 1.1)' },
  { what: 'Tumour assessments', value: 'CT (or MRI) at screening, then every 6 weeks from randomisation until progression, including after stopping treatment for another reason' },
  { what: 'RECIST 1.1', value: 'Up to 5 target lesions (2 per organ), measurable at ≥10 mm (lymph nodes ≥15 mm short axis); response from the sum of diameters: PR ≥30% below baseline, PD ≥20% and ≥5 mm above the smallest sum, or a new lesion' },
  { what: 'Data cut-off', value: `${ONK_CUT}; subjects still on study are censored there` },
]
export const ONK_CONVENTIONS: { topic: string; rule: string }[] = [
  { topic: 'USUBJID', rule: 'STUDYID, a hyphen, and SUBJID: ONK-44-302-401-007.' },
  { topic: 'DM reference dates', rule: 'RFSTDTC and RFXSTDTC: first dose date; RFENDTC and RFXENDTC: last dose date (the end of the last ONK-44 cycle, or the last docetaxel infusion); RFPENDTC: the last contact date.' },
  { topic: 'DM death', rule: 'DTHFL = Y and DTHDTC = the date of death from the death form (partial if that is all that is known); both null otherwise.' },
  { topic: 'EPOCH', rule: 'SCREENING before the first dose; TREATMENT from the first dose to 21 days after the last dose (the end of the last cycle); FOLLOW-UP after that, including scans done after treatment stopped for another reason than progression.' },
  { topic: 'TU', rule: 'One record per lesion per assessor: TUTESTCD TUMIDENT, TUORRES and TUSTRESC TARGET, NON-TARGET or NEW; TULNKID the lesion ID (T01, NT01, NL01); TULOC and TULAT from the form, upper case; TUMETHOD CT SCAN or MRI; TUEVAL INVESTIGATOR. VISIT and TUDTC: where and when the lesion was first identified.' },
  { topic: 'TR: lesions', rule: 'One record per lesion per visit: TRLNKID the lesion ID. Target lesions: TRTESTCD LDIAM (SAXIS for a lymph node), result in mm. Too small to measure: TRORRES TOO SMALL TO MEASURE with no TRORRESU, TRSTRESC 5, TRSTRESN 5 and TRSTRESU mm (the RECIST 1.1 default). Non-target and new lesions: TRTESTCD TUMSTATE with PRESENT, ABSENT or UNEQUIVOCAL PROGRESSION. A scan not done: TRSTAT NOT DONE with TRREASND.' },
  { topic: 'TR: sum of diameters', rule: 'One SUMDIAM record per assessment visit from the response form, as the site calculated it, with TRLNKID null.' },
  { topic: 'TR and RS link groups', rule: 'TRLNKGRP and RSLNKGRP: the SDTM visit name of the assessment (WEEK 12), so a response is linked to the measurements it was based on. Screening measurements have no RS record.' },
  { topic: 'RS', rule: 'One record per test per visit per assessor: RSTESTCD TRGRESP, NTRGRESP, NEWLPROG and OVRLRESP (CT ONCRTSCD), RSCAT RECIST 1.1. Investigator responses from the response form (RSEVAL INVESTIGATOR); the independent review’s from the IRC file (RSEVAL INDEPENDENT ASSESSOR, RSNAM the vendor, RSEVALID the reader). Results as CR, PR, SD, PD, NE, NON-CR/NON-PD, Y or N; the vendor’s codes are recoded (Non-CR/Non-PD, Not evaluable). No record when a subject had no non-target lesions.' },
  { topic: 'RS as collected', rule: 'The investigator’s response is submitted as recorded, even where the measurements suggest another; differences with the independent review are expected and are not changed.' },
  { topic: 'RELREC', rule: 'Dataset-level relationships: TU to TR by TULNKID/TRLNKID (ONE to MANY) and TR to RS by TRLNKGRP/RSLNKGRP (MANY to ONE).' },
  { topic: 'PR', rule: 'One record per prior procedure: PRTRT as reported, PRCAT upper case (SURGERY, RADIOTHERAPY, BIOPSY), PRLOC and PRLAT upper case, PRDOSE and PRDOSU (Gy) for radiotherapy, PRSTDTC and PRENDTC partial when the day or month is unknown.' },
  { topic: 'DD', rule: 'One record per death: DDTESTCD PRCDTH, DDTEST Primary Cause of Death, DDORRES the cause as reported, DDSTRESC upper case, DDDTC the date of death.' },
]

// ---------- generation ----------
export const ONK_PLANTED: { sumError?: string; investigatorPR?: string; scanNotDone?: string; partialDeath?: string; followUpScans?: string; tooSmall?: string } = {}
interface Lesion { id: string; type: 'Target' | 'Non-target' | 'New'; loc: string; lat: string; nodal: boolean; base: number; visit?: string }
const LOCS: [string, string, boolean, number, number][] = [['Lung', 'Right', false, 15, 48], ['Lung', 'Left', false, 12, 40], ['Liver', '', false, 12, 42], ['Lymph node', 'Right', true, 15, 32], ['Adrenal gland', 'Left', false, 11, 30]]
const pad = (n: number, w = 3) => String(n).padStart(w, '0')
let cache: { forms: Record<string, Row[]>; subjects: { subj: string; arm?: string }[] } | null = null
type Resp = 'CR' | 'PR' | 'SD' | 'PD' | 'NE'
export function recistTarget(sum: number, base: number, nadir: number, allGone: boolean): Resp {
  if (allGone) return 'CR'
  if (sum >= nadir * 1.2 && sum - nadir >= 5) return 'PD'
  if (sum <= base * 0.7) return 'PR'
  return 'SD'
}
export function recistOverall(t: Resp | '', nt: string, newl: boolean): Resp {
  if (newl || t === 'PD' || nt === 'PD') return 'PD'
  if (t === 'NE') return 'NE'
  if (t === 'CR') return nt === 'CR' || nt === '' ? 'CR' : 'PR'
  return t === 'PR' ? 'PR' : 'SD'
}
export function onkRaw() {
  if (cache) return cache
  const r = rng(44302)
  const forms: Record<string, Row[]> = { DM: [], IC: [], IRT: [], EX: [], LC: [], PRP: [], TUI: [], TRM: [], RSP: [], IRC: [], DTH: [] }
  let id = 0
  const push = (form: string, row: Record<string, string>) => forms[form].push({ __id: `${form}${++id}`, ...row } as Row)
  const subjects: { subj: string; arm?: string }[] = []
  const fails = new Set([4, 13, 22, 29, 37, 45])
  let randomised = 0, n = 0, randno = 7000
  const ircCode: Record<string, string> = { CR: 'CR', PR: 'PR', SD: 'SD', PD: 'PD', NE: 'Not evaluable', 'NON-CR/NON-PD': 'Non-CR/Non-PD' }
  const dtcEdc = (iso: string) => toEdc(iso)
  while (randomised < 42) {
    n++
    const site = n % 3 === 0 ? '402' : '401'
    const subj = `${site}-${pad(n)}`
    const rand = addDays('2026-01-05', Math.floor(randomised * 3.4) + r.int(0, 2))
    const screen = addDays(rand, -r.int(7, 24))
    const sex = r.chance(0.6) ? 'Male' : 'Female'
    const race = site === '401' ? 'Asian' : r.pick(['White', 'White', 'Black or African American', 'Asian'])
    push('DM', { SUBJID: subj, SITEID: site, DMDAT: dtcEdc(screen), BRTHDAT: dtcEdc(addDays(screen, -Math.round((45 + r.next() * 33) * 365.25))), SEX: sex, RACE: race, ETHNIC: 'Not Hispanic or Latino' })
    push('IC', { SUBJID: subj, ICDAT: dtcEdc(screen) })
    // Prior procedures (screened subjects all have some history).
    const prs: [string, string, string, string, string, string][] = [['Diagnostic bronchoscopic biopsy', 'Biopsy', 'Lung', r.pick(['Right', 'Left']), '', '']]
    if (r.chance(0.35)) prs.push(['Lobectomy', 'Surgery', 'Lung', prs[0][3], '', ''])
    if (r.chance(0.4)) prs.push(['Thoracic radiotherapy', 'Radiotherapy', 'Lung', prs[0][3], r.pick(['50', '60', '66']), 'Gy'])
    prs.forEach(([proc, cat, loc, lat, dose, du], i) => {
      const st = addDays(screen, -r.int(120, 700)), partial = r.chance(0.25)
      push('PRP', { SUBJID: subj, PRSPID: String(i + 1), PROC: proc, PRCAT: cat, LOC: loc, LAT: lat, STDAT: partial ? `UN-${dtcEdc(st).slice(3)}` : dtcEdc(st), ENDAT: cat === 'Radiotherapy' ? dtcEdc(addDays(st, 42)) : '', DOSE: dose, DOSEU: du })
    })
    if (fails.has(n)) { subjects.push({ subj }); push('LC', { SUBJID: subj, LCDAT: dtcEdc(screen) }); continue }
    randomised++
    const arm = randomised % 2 === (r.chance(0.5) ? 0 : 1) ? 'ONK44' : 'DOCE'
    subjects.push({ subj, arm })
    push('IRT', { SUBJID: subj, RANDNO: String(++randno), RANDDT: rand, RANDARM: arm })
    // Lesions at baseline.
    const lesions: Lesion[] = []
    const nt = r.int(2, 4), used = new Set<number>()
    for (let i = 0; i < nt; i++) { let k = r.int(0, LOCS.length - 1); while (used.has(k)) k = (k + 1) % LOCS.length; used.add(k); const [loc, lat, nodal, lo, hi] = LOCS[k]; lesions.push({ id: `T0${i + 1}`, type: 'Target', loc, lat, nodal, base: r.int(lo, hi) }) }
    const nnt = r.int(0, 2)
    for (let i = 0; i < nnt; i++) { const [loc, lat] = r.pick([['Pleura', 'Right'], ['Bone', ''], ['Lymph node', 'Left'], ['Lung', 'Left']] as const); lesions.push({ id: `NT0${i + 1}`, type: 'Non-target', loc, lat, nodal: loc === 'Lymph node', base: 0 }) }
    // Response curve: fraction of baseline at week w.
    const deep = arm === 'ONK44' ? (r.chance(0.55) ? 0.35 + r.next() * 0.5 : r.next() * 0.3) : (r.chance(0.25) ? 0.3 + r.next() * 0.25 : r.next() * 0.25)
    const tNadir = r.int(6, 24), regrow = arm === 'ONK44' ? 0.006 + r.next() * 0.02 : 0.01 + r.next() * 0.03
    const frac = (w: number) => (w <= tNadir ? 1 - deep * (w / tNadir) : (1 - deep) * Math.exp(regrow * (w - tNadir)))
    const toxStop = r.chance(0.12) ? r.int(9, 20) : 99 // weeks; stopped for toxicity
    const scanDay = (w: number) => (w === 0 ? addDays(rand, -r.int(2, 6)) : addDays(rand, w * 7 + r.int(-3, 4)))
    const doses: { st: string; en: string }[] = []
    // Assessments.
    let base = 0, nadir = Infinity, pd = false, lastScan = '', pdDay = ''
    let ircNadir = Infinity, ircBase = 0
    for (const w of [0, 6, 12, 18, 24, 30, 36, 42]) {
      const day = scanDay(w)
      if (day > ONK_CUT || pd) break
      const visit = w === 0 ? 'Screening' : `Week ${w}`
      const notDone = w === 18 && !ONK_PLANTED.scanNotDone && randomised > 10
      if (notDone) {
        ONK_PLANTED.scanNotDone = subj
        for (const l of lesions) push('TRM', { SUBJID: subj, VISIT: visit, ASSDAT: '', LESID: l.id, DIAM: '', TSTM: '', LESSTAT: '', NOTDONE: 'Scanner unavailable; scan not done in window' })
        push('RSP', { SUBJID: subj, VISIT: visit, ASSDAT: '', SUMDIAM: '', TRGRESP: 'NE', NTRGRESP: lesions.some((l) => l.type === 'Non-target') ? 'NE' : '', NEWLES: '', OVRLRESP: 'NE' })
        push('IRC', { SUBJID: subj, TIMEPOINT: visit, SCANDATE: '', TARGET: ircCode.NE, NONTARGET: lesions.some((l) => l.type === 'Non-target') ? ircCode.NE : '', NEWLESION: '', OVERALL: ircCode.NE, READER: 'READER 2' })
        continue
      }
      lastScan = day
      if (w === 0) for (const l of lesions) push('TUI', { SUBJID: subj, VISIT: visit, ASSDAT: dtcEdc(day), LESID: l.id, LESTYPE: l.type, LOC: l.loc, LAT: l.lat, NODAL: l.nodal ? 'Y' : 'N', METHOD: r.chance(0.9) ? 'CT scan' : 'MRI' })
      const f = Math.max(0, frac(w))
      let sum = 0, irc = 0, allGone = true
      const sizes: Record<string, string> = {}
      for (const l of lesions.filter((x) => x.type === 'Target')) {
        let size = Math.round(l.base * f * (1 + r.normal(0, 0.04)))
        if (w === 0) size = l.base
        if (!l.nodal && f < 0.12) size = 0
        const tstm = !l.nodal && size > 0 && size < 5
        if (tstm && !ONK_PLANTED.tooSmall) ONK_PLANTED.tooSmall = subj
        const counted = tstm ? 5 : size
        sum += counted
        irc += Math.max(0, Math.round(counted * (1 + r.normal(0, 0.07))))
        if ((l.nodal && size >= 10) || (!l.nodal && size > 0)) allGone = false
        sizes[l.id] = tstm ? 'TSTM' : String(size)
      }
      const anyNtGone = f < 0.25
      const ntProg = w > 0 && f > 1.35 && r.chance(0.3)
      const newLes = w > 0 && (f > 1.15 || (w >= 18 && r.chance(0.04))) && r.chance(0.55)
      for (const l of lesions) {
        if (l.type === 'Target') push('TRM', { SUBJID: subj, VISIT: visit, ASSDAT: dtcEdc(day), LESID: l.id, DIAM: sizes[l.id] === 'TSTM' ? '' : sizes[l.id], TSTM: sizes[l.id] === 'TSTM' ? 'Y' : '', LESSTAT: '', NOTDONE: '' })
        else push('TRM', { SUBJID: subj, VISIT: visit, ASSDAT: dtcEdc(day), LESID: l.id, DIAM: '', TSTM: '', LESSTAT: ntProg ? 'Unequivocal progression' : anyNtGone ? 'Absent' : 'Present', NOTDONE: '' })
      }
      if (newLes) {
        const nl: Lesion = { id: 'NL01', type: 'New', loc: r.pick(['Liver', 'Bone', 'Brain', 'Adrenal gland']), lat: '', nodal: false, base: 0, visit }
        push('TUI', { SUBJID: subj, VISIT: visit, ASSDAT: dtcEdc(day), LESID: nl.id, LESTYPE: 'New', LOC: nl.loc, LAT: '', NODAL: 'N', METHOD: 'CT scan' })
        push('TRM', { SUBJID: subj, VISIT: visit, ASSDAT: dtcEdc(day), LESID: nl.id, DIAM: '', TSTM: '', LESSTAT: 'Present', NOTDONE: '' })
      }
      if (w === 0) { base = sum; nadir = sum; ircBase = irc; ircNadir = irc; continue }
      const hasNt = lesions.some((l) => l.type === 'Non-target')
      const ntResp = !hasNt ? '' : ntProg ? 'PD' : anyNtGone ? 'CR' : 'NON-CR/NON-PD'
      let tResp: Resp = recistTarget(sum, base, nadir, allGone)
      let reported = sum
      if (!ONK_PLANTED.sumError && w === 12 && randomised % 7 === 3) { reported = sum + 10; ONK_PLANTED.sumError = subj } // the site's arithmetic slip
      if (!ONK_PLANTED.investigatorPR && tResp === 'SD' && sum <= base * 0.76 && sum > base * 0.7) { tResp = 'PR'; ONK_PLANTED.investigatorPR = subj } // investigator called PR at a 25-29% decrease
      const ov = recistOverall(tResp, ntResp, newLes)
      push('RSP', { SUBJID: subj, VISIT: visit, ASSDAT: dtcEdc(day), SUMDIAM: String(reported), TRGRESP: tResp, NTRGRESP: ntResp, NEWLES: newLes ? 'Y' : 'N', OVRLRESP: ov })
      const iT = recistTarget(irc, ircBase, ircNadir, allGone)
      const iOv = recistOverall(iT, ntResp, newLes)
      push('IRC', { SUBJID: subj, TIMEPOINT: visit, SCANDATE: day.replace(/-/g, ''), TARGET: ircCode[iT], NONTARGET: ntResp ? ircCode[ntResp] : '', NEWLESION: newLes ? 'Y' : 'N', OVERALL: ircCode[iOv], READER: r.chance(0.5) ? 'READER 1' : 'READER 2' })
      ircNadir = Math.min(ircNadir, irc)
      nadir = Math.min(nadir, sum)
      if (ov === 'PD') { pd = true; pdDay = day }
      if (w >= toxStop && !ONK_PLANTED.followUpScans) ONK_PLANTED.followUpScans = subj
    }
    // Treatment: cycles from randomisation until progression, toxicity or the cut-off.
    const stopDay = pd ? pdDay : toxStop < 99 ? addDays(rand, toxStop * 7) : ONK_CUT
    for (let c = 0; ; c++) {
      const st = addDays(rand, 1 + c * 21)
      if (st > stopDay || st > ONK_CUT) break
      const en = arm === 'ONK44' ? [addDays(st, 20), stopDay, ONK_CUT].sort()[0] : st
      doses.push({ st, en })
      push('EX', { SUBJID: subj, CYCLE: String(c + 1), EXSTDAT: dtcEdc(st), EXENDAT: dtcEdc(en) })
    }
    // Deaths: most after progression.
    const dies = pd ? r.chance(0.45) : r.chance(0.05)
    let last = [lastScan, doses.at(-1)?.en ?? rand].sort().at(-1)!
    if (dies) {
      const dd = addDays(last, r.int(20, 90))
      if (dd <= ONK_CUT) {
        const partial = !ONK_PLANTED.partialDeath && pd
        if (partial) ONK_PLANTED.partialDeath = subj
        push('DTH', { SUBJID: subj, DTHDAT: partial ? `UN-${dtcEdc(dd).slice(3)}` : dtcEdc(dd), DTHCAUSE: r.pick(['Disease progression', 'Disease progression', 'Disease progression', 'Pneumonia', 'Pulmonary embolism']) })
        last = partial ? last : dd
      }
    } else last = [last, addDays(ONK_CUT, -r.int(0, 20))].sort().at(-1)!
    push('LC', { SUBJID: subj, LCDAT: dtcEdc(last) })
  }
  cache = { forms, subjects }
  return cache
}

// ---------- reference mapping ----------
const e = (expr: string): Rule => ({ kind: 'expr', expr })
const c = (value: string): Rule => ({ kind: 'const', value })
const cp = (field: string): Rule => ({ kind: 'copy', field })
const ID = (d: string) => ({ STUDYID: c(ONK_STUDY.id), DOMAIN: c(d), USUBJID: e(`concat('${ONK_STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID') })
const VIS = (dt: string) => ({ VISITNUM: e(`visitnum(VISIT, ${dt})`), VISIT: e(`visitname(VISIT, ${dt})`) })
const TR_LESION: Record<string, Rule> = {
  ...ID('TR'), TRSEQ: { kind: 'seq' }, TRLNKID: cp('LESID'), TRLNKGRP: e('visitname(VISIT, ASSDAT)'),
  TRTESTCD: e("if(subjwhere('TUI', 'LESTYPE', 'LESID', LESID, 'first') = 'Target', if(subjwhere('TUI', 'NODAL', 'LESID', LESID, 'first') = 'Y', 'SAXIS', 'LDIAM'), 'TUMSTATE')"),
  TRTEST: e("ctdecode('TRTESTCD', TRTESTCD)"),
  TRORRES: e("if(present(NOTDONE), '', if(TSTM = 'Y', 'TOO SMALL TO MEASURE', if(present(DIAM), DIAM, upper(LESSTAT))))"),
  TRORRESU: e("if(TRTESTCD in ('LDIAM', 'SAXIS') and present(DIAM), 'mm', '')"),
  TRSTRESC: e("if(TSTM = 'Y', '5', TRORRES)"), TRSTRESN: e("if(TRTESTCD in ('LDIAM', 'SAXIS'), num(TRSTRESC), '')"), TRSTRESU: e("if(TRTESTCD in ('LDIAM', 'SAXIS') and present(TRSTRESC), 'mm', '')"),
  TRSTAT: e("if(present(NOTDONE), 'NOT DONE', '')"), TRREASND: e("if(present(NOTDONE), upper(NOTDONE), '')"),
  TRMETHOD: e("upper(subjwhere('TUI', 'METHOD', 'LESID', LESID, 'first'))"), TREVAL: c('INVESTIGATOR'),
  ...VIS('ASSDAT'), EPOCH: e('epoch(TRDTC)'), TRDTC: e("dtc(ASSDAT, 'DD-MMM-YYYY')"), TRDY: e('studyday(TRDTC)'),
}
const TR_SUM: Record<string, Rule> = {
  ...ID('TR'), TRSEQ: { kind: 'seq' }, TRLNKID: c(''), TRLNKGRP: e('visitname(VISIT, ASSDAT)'),
  TRTESTCD: c('SUMDIAM'), TRTEST: e("ctdecode('TRTESTCD', 'SUMDIAM')"),
  TRORRES: cp('SUMDIAM'), TRORRESU: e("if(present(SUMDIAM), 'mm', '')"), TRSTRESC: cp('SUMDIAM'), TRSTRESN: e('num(SUMDIAM)'), TRSTRESU: e('TRORRESU'),
  TRSTAT: e("if(isblank(SUMDIAM), 'NOT DONE', '')"), TRREASND: e("if(isblank(SUMDIAM), 'SCAN NOT DONE', '')"),
  TRMETHOD: e("upper(subjwhere('TUI', 'METHOD', 'VISIT', 'Screening', 'first'))"), TREVAL: c('INVESTIGATOR'),
  ...VIS('ASSDAT'), EPOCH: e('epoch(TRDTC)'), TRDTC: e("dtc(ASSDAT, 'DD-MMM-YYYY')"), TRDY: e('studyday(TRDTC)'),
}
const RS_TESTS = (fields: [string, string][]) => ({ tests: fields.map(([code, field]) => ({ code, field })), drop: 'isblank(__RESULT)' })
const RS_INV: Record<string, Rule> = {
  ...ID('RS'), RSSEQ: { kind: 'seq' }, RSLNKGRP: e('visitname(VISIT, ASSDAT)'),
  RSTESTCD: cp('__TESTCD'), RSTEST: e("ctdecode('ONCRTSCD', __TESTCD)"), RSCAT: c('RECIST 1.1'),
  RSORRES: cp('__RESULT'), RSSTRESC: cp('__RESULT'), RSEVAL: c('INVESTIGATOR'), RSNAM: c(''), RSEVALID: c(''),
  ...VIS('ASSDAT'), EPOCH: e('epoch(RSDTC)'), RSDTC: e("dtc(ASSDAT, 'DD-MMM-YYYY')"), RSDY: e('studyday(RSDTC)'),
}
const RS_IRC: Record<string, Rule> = {
  ...ID('RS'), RSSEQ: { kind: 'seq' }, RSLNKGRP: c(''),
  RSTESTCD: cp('__TESTCD'), RSTEST: e("ctdecode('ONCRTSCD', __TESTCD)"), RSCAT: c('RECIST 1.1'),
  RSORRES: cp('__RESULT'), RSSTRESC: e("if(__RESULT = 'Non-CR/Non-PD', 'NON-CR/NON-PD', if(__RESULT = 'Not evaluable', 'NE', upper(__RESULT)))"),
  RSEVAL: c('INDEPENDENT ASSESSOR'), RSNAM: c(ONK_IRC), RSEVALID: cp('READER'),
  VISITNUM: e('visitnum(TIMEPOINT, SCANDATE)'), VISIT: e('visitname(TIMEPOINT, SCANDATE)'), EPOCH: e('epoch(RSDTC)'), RSDTC: e("dtc(SCANDATE, 'YYYYMMDD')"), RSDY: e('studyday(RSDTC)'),
}
const ONK_REF: Record<string, { rules: Record<string, Rule>; perm: string[]; source?: string; filter?: string; transpose?: DomainSpec['transpose']; parts?: { source: string; rules: Record<string, Rule>; filter?: string; transpose?: DomainSpec['transpose'] }[] }> = {
  DM: {
    perm: ['BRTHDTC', 'ETHNIC', 'DMDTC', 'DMDY'],
    rules: {
      ...ID('DM'),
      RFSTDTC: e("dtc(subj('EX', 'EXSTDAT', 'min'), 'DD-MMM-YYYY')"), RFENDTC: e("dtc(subj('EX', 'EXENDAT', 'max'), 'DD-MMM-YYYY')"),
      RFXSTDTC: e("dtc(subj('EX', 'EXSTDAT', 'min'), 'DD-MMM-YYYY')"), RFXENDTC: e("dtc(subj('EX', 'EXENDAT', 'max'), 'DD-MMM-YYYY')"),
      RFICDTC: e("dtc(subj('IC', 'ICDAT', 'first'), 'DD-MMM-YYYY')"), RFPENDTC: e("dtc(subj('LC', 'LCDAT', 'first'), 'DD-MMM-YYYY')"),
      DTHDTC: e("dtc(subj('DTH', 'DTHDAT', 'first'), 'DD-MMM-YYYY')"), DTHFL: e("if(present(subj('DTH', 'DTHDAT', 'first')), 'Y', '')"),
      SITEID: cp('SITEID'), BRTHDTC: e("dtc(BRTHDAT, 'DD-MMM-YYYY')"), AGE: e("age(BRTHDAT, subj('IC', 'ICDAT', 'first'))"), AGEU: c('YEARS'),
      SEX: { kind: 'recode', field: 'SEX', table: { Female: 'F', Male: 'M' } }, RACE: e('upper(RACE)'), ETHNIC: e('upper(ETHNIC)'),
      ARMCD: e("irt('RANDARM')"), ARM: e("armname(irt('RANDARM'))"), ACTARMCD: e("if(present(subj('EX', 'EXSTDAT', 'min')), irt('RANDARM'), '')"), ACTARM: e('armname(ACTARMCD)'),
      ARMNRS: e("if(isblank(irt('RANDARM')), 'SCREEN FAILURE', '')"), ACTARMUD: c(''),
      COUNTRY: e('country(SITEID)'), DMDTC: e("dtc(DMDAT, 'DD-MMM-YYYY')"), DMDY: e('studyday(DMDTC, RFSTDTC)'),
    },
  },
  TU: {
    source: 'TUI', perm: ['TULNKID', 'TULAT', 'TUEVAL', 'VISIT', 'EPOCH', 'TUDY'],
    rules: {
      ...ID('TU'), TUSEQ: { kind: 'seq' }, TULNKID: cp('LESID'), TUTESTCD: c('TUMIDENT'), TUTEST: c('Tumor Identification'),
      TUORRES: e('upper(LESTYPE)'), TUSTRESC: e('upper(LESTYPE)'), TULOC: e('upper(LOC)'), TULAT: e('upper(LAT)'), TUMETHOD: e('upper(METHOD)'), TUEVAL: c('INVESTIGATOR'),
      ...VIS('ASSDAT'), EPOCH: e('epoch(TUDTC)'), TUDTC: e("dtc(ASSDAT, 'DD-MMM-YYYY')"), TUDY: e('studyday(TUDTC)'),
    },
  },
  TR: {
    source: 'TRM', perm: ['TRLNKGRP', 'TRSTAT', 'TRREASND', 'TREVAL', 'VISIT', 'EPOCH', 'TRDY'],
    rules: TR_LESION, parts: [{ source: 'RSP', rules: TR_SUM }],
  },
  RS: {
    source: 'RSP', perm: ['RSLNKGRP', 'RSNAM', 'RSEVALID', 'VISIT', 'EPOCH', 'RSDY'],
    rules: RS_INV, transpose: RS_TESTS([['TRGRESP', 'TRGRESP'], ['NTRGRESP', 'NTRGRESP'], ['NEWLPROG', 'NEWLES'], ['OVRLRESP', 'OVRLRESP']]),
    parts: [{ source: 'IRC', rules: RS_IRC, transpose: RS_TESTS([['TRGRESP', 'TARGET'], ['NTRGRESP', 'NONTARGET'], ['NEWLPROG', 'NEWLESION'], ['OVRLRESP', 'OVERALL']]) }],
  },
  PR: {
    source: 'PRP', perm: ['PRSPID', 'PRCAT', 'PRLOC', 'PRLAT', 'PRDOSE', 'PRDOSU', 'PRENDTC', 'PRSTDY', 'PRENDY'],
    rules: {
      ...ID('PR'), PRSEQ: { kind: 'seq' }, PRSPID: cp('PRSPID'), PRTRT: cp('PROC'), PRCAT: e('upper(PRCAT)'), PRLOC: e('upper(LOC)'), PRLAT: e('upper(LAT)'),
      PRDOSE: e('num(DOSE)'), PRDOSU: cp('DOSEU'), PRSTDTC: e("dtc(STDAT, 'DD-MMM-YYYY')"), PRENDTC: e("dtc(ENDAT, 'DD-MMM-YYYY')"), PRSTDY: e('studyday(PRSTDTC)'), PRENDY: e('studyday(PRENDTC)'),
    },
  },
  DD: {
    source: 'DTH', perm: ['DDDTC', 'DDDY'],
    rules: { ...ID('DD'), DDSEQ: { kind: 'seq' }, DDTESTCD: c('PRCDTH'), DDTEST: c('Primary Cause of Death'), DDORRES: cp('DTHCAUSE'), DDSTRESC: e('upper(DTHCAUSE)'), DDDTC: e("dtc(DTHDAT, 'DD-MMM-YYYY')"), DDDY: e('studyday(DDDTC)') },
  },
}
export const ONK_DOMAINS = Object.keys(ONK_REF)
export const ONK_RELREC: RelDef[] = [
  { id: 'TUTR', label: 'Lesions (TU) and their assessments (TR), by lesion ID', a: { domain: 'TU', key: 'TULNKID' }, b: { domain: 'TR', key: 'TRLNKID' }, dataset: { a: 'ONE', b: 'MANY' } },
  { id: 'TRRS', label: 'Assessments (TR) and the response based on them (RS), by visit', a: { domain: 'TR', key: 'TRLNKGRP' }, b: { domain: 'RS', key: 'RSLNKGRP' }, dataset: { a: 'MANY', b: 'ONE' } },
]
export function onkReferenceSpec(domain: string, ver: Version): DomainSpec {
  const r = ONK_REF[domain]; if (!r) throw new Error(`No reference mapping for ${domain} in ${ONK_STUDY.id}`)
  const vars = varsOf(domain, ver).filter((m) => (m.core !== 'Perm' || r.perm.includes(m.name) || (ver !== '3.4' && m.name === 'SUBJID')) && r.rules[m.name]).map((m) => m.name)
  const pick = (rules: Record<string, Rule>) => Object.fromEntries(vars.filter((v) => rules[v]).map((v) => [v, rules[v]]))
  return {
    domain, source: r.source ?? domain, vars, rules: pick(r.rules), sort: SORT[domain] ?? ['USUBJID'],
    ...(r.filter ? { filter: r.filter } : {}), ...(r.transpose ? { transpose: r.transpose } : {}),
    ...(r.parts ? { parts: r.parts.map((p) => ({ ...p, rules: pick(p.rules) })) } : {}),
  }
}
let dmCache: Map<string, OutRow> | null = null
const base = (): StudyData => ({ forms: onkRaw().forms, studyId: ONK_STUDY.id, visits: ONK_VISITS, arms: ONK_ARMS, sites: ONK_SITES, epochTail: 21 })
export function onkData(): StudyData {
  dmCache ??= new Map(build(onkReferenceSpec('DM', '3.4'), base()).rows.map((r) => [r.__subj, r]))
  return { ...base(), refDm: dmCache }
}
export const ONK_PACK: StudyPack = {
  ...ONK_STUDY, domains: ONK_DOMAINS, refSpec: onkReferenceSpec, data: onkData, formInfo: ONK_FORM_INFO, rawFields: ONK_RAW_FIELDS,
  relrec: ONK_RELREC, relNeed: ['TU', 'TR', 'RS'], facts: ONK_FACTS, conventions: ONK_CONVENTIONS, arms: ONK_ARMS, sites: ONK_SITES, visits: ONK_VISITS,
}
