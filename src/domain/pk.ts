// The second study: PKX-07-101, a first-in-human single and multiple ascending dose study in
// healthy volunteers, built for pharmacokinetics mapping. Its raw data come from four places: the
// EDC (demographics, consent, visit dates and a dosing log with exact dose times), the IRT
// (cohort and randomised treatment), the bioanalytical laboratory (one row per plasma sample and
// assay run: nominal day and time, actual collection date and time, result, LLOQ) and the PK
// scientist's non-compartmental analysis output (one row per parameter per profile). The
// concentrations follow a one-compartment oral model with between-subject variability, and the
// parameters are calculated from the reported concentrations and actual sampling times, so PC and
// PP agree. Everything is fictional.

import { rng, addDays } from './util'
import { toEdc, toYmd } from './rawdate'
import { build, type DomainSpec, type OutRow, type Rule, type StudyData } from './engine'
import { varsOf, type Version } from './standards'
import type { RelDef } from './relrec'
import type { Visit } from './study'
import type { Row } from './seed'
import { SORT } from './reference'
import type { StudyPack } from './studypack'

export const PK_STUDY = {
  id: 'PKX-07-101',
  title: 'A randomised, double-blind, placebo-controlled, single and multiple ascending dose study of the safety, tolerability and pharmacokinetics of PKX-07 in healthy adult volunteers',
  short: 'PKX-07 single and multiple ascending doses in healthy volunteers',
  sponsor: 'Altamira Therapeutics (fictional)',
  phase: 'Phase 1',
  indication: 'Healthy volunteers (first in human)',
  drug: 'PKX-07, oral capsule',
  design: 'Part A: three single ascending dose cohorts (10, 30 and 100 mg); Part B: two multiple ascending dose cohorts (30 and 100 mg once daily for 7 days). Each cohort of 8 is randomised 6:2 to PKX-07 or placebo, dosed in the morning after an overnight fast, with serial plasma samples for pharmacokinetics',
  planned: 40,
}
export const PK_LAB = 'Kestrel Bioanalytical Services (fictional)'
export const PK_SITES = [{ id: '201', name: 'Clinical Pharmacology Unit, Pune (fictional)', country: 'India', iso: 'IND' }]
export const PK_ARMS = [
  { code: 'SAD10', name: 'PKX-07 10 mg single dose', dose: 10, part: 'A', cohort: 1 },
  { code: 'SAD30', name: 'PKX-07 30 mg single dose', dose: 30, part: 'A', cohort: 2 },
  { code: 'SAD100', name: 'PKX-07 100 mg single dose', dose: 100, part: 'A', cohort: 3 },
  { code: 'MAD30', name: 'PKX-07 30 mg once daily for 7 days', dose: 30, part: 'B', cohort: 4 },
  { code: 'MAD100', name: 'PKX-07 100 mg once daily for 7 days', dose: 100, part: 'B', cohort: 5 },
  { code: 'PBOSAD', name: 'Placebo single dose', dose: 0, part: 'A', cohort: 0 },
  { code: 'PBOMAD', name: 'Placebo once daily for 7 days', dose: 0, part: 'B', cohort: 0 },
]
const day = (n: number, num: number, epoch: Visit['epoch'] = 'TREATMENT'): Visit => ({ raw: `Day ${n}`, num, name: `DAY ${n}`, day: n, lo: n, hi: n, epoch, vs: [] })
export const PK_VISITS: Visit[] = [
  { raw: 'Screening', num: 1, name: 'SCREENING', day: -28, lo: -28, hi: -2, epoch: 'SCREENING', vs: [] },
  { raw: 'Day -1', num: 2, name: 'DAY -1', day: -1, lo: -1, hi: -1, epoch: 'SCREENING', vs: [] },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => day(n, n + 2)),
  { raw: 'Follow-up', num: 12, name: 'FOLLOW-UP', day: 14, lo: 7, hi: 16, epoch: 'FOLLOW-UP', vs: [] },
]
// Nominal sampling times (hours after the reference dose) of each profile.
export const PK_SCHEDULE = {
  SAD: [-0.25, 0.5, 1, 2, 4, 8, 12, 24, 48],
  MAD1: [-0.25, 0.5, 1, 2, 4, 8, 12, 24],
  TROUGH: [-0.25],
  MAD7: [-0.25, 0.5, 1, 2, 4, 8, 12, 24, 48],
}
export const PK_LLOQ = 1
export const PK_FORM_INFO: Record<string, { name: string; source: 'EDC' | 'IRT' | 'Vendor'; note: string }> = {
  DM: { name: 'Demographics', source: 'EDC', note: 'One row per subject screened. SEX, RACE and ETHNIC are EDC labels.' },
  IC: { name: 'Informed consent', source: 'EDC', note: 'One row per subject.' },
  SV: { name: 'Visit dates', source: 'EDC', note: 'One row per visit attended. Part A subjects are discharged on Day 3 and return on Day 8; Part B on Day 9, returning on Day 14.' },
  EX: { name: 'Dosing log', source: 'EDC', note: 'One row per dose: the date and the exact clock time (24-hour HH:MM) the capsule was swallowed, recorded by the unit staff. Blinded: no treatment or dose on the form.' },
  IRT: { name: 'Randomisation (IRT)', source: 'IRT', note: 'One row per randomised subject: cohort, randomisation number and the arm code (unblinded at database lock).' },
  PCL: { name: 'Bioanalytical results', source: 'Vendor', note: `From ${PK_LAB}: one row per plasma sample and assay run. NOMDAY is the day of the dose the sample is timed from, NOMHR the nominal hours after that dose (−0.25 for pre-dose); VISIT is the day the sample was drawn. Dates YYYYMMDD, times HHMM. Results below the LLOQ are “BLQ”. A sample analysed again has a row per run; FINAL = Y marks the reportable one.` },
  PKP: { name: 'PK parameters (NCA)', source: 'Vendor', note: 'From the PK scientist’s non-compartmental analysis of the final concentrations with actual sampling times: one row per parameter per subject and profile (PROFDAY), active subjects only. Units as the NCA software writes them (hr, hr*ng/mL). A parameter that could not be calculated has no VALUE and a COMMENT.' },
}
const F = (pairs: [string, string][]) => pairs.map(([name, label]) => ({ name, label }))
export const PK_RAW_FIELDS: Record<string, { name: string; label: string }[]> = {
  DM: F([['SUBJID', 'Subject number'], ['SITEID', 'Site'], ['DMDAT', 'Date of collection'], ['BRTHDAT', 'Date of birth'], ['SEX', 'Sex'], ['RACE', 'Race'], ['ETHNIC', 'Ethnicity']]),
  IC: F([['SUBJID', 'Subject number'], ['ICDAT', 'Date informed consent signed']]),
  SV: F([['SUBJID', 'Subject number'], ['VISIT', 'Visit'], ['VISDAT', 'Visit date']]),
  EX: F([['SUBJID', 'Subject number'], ['VISIT', 'Visit (dosing day)'], ['EXDAT', 'Dose date'], ['EXTIM', 'Dose time (24-hour HH:MM)'], ['KITNO', 'Kit number']]),
  IRT: F([['SUBJID', 'Subject number'], ['RANDNO', 'Randomisation number'], ['RANDDT', 'Randomisation date (ISO 8601)'], ['COHORT', 'Cohort'], ['RANDARM', 'Randomised arm (code)'], ['KITARM', 'Arm of kits dispensed (code)']]),
  PCL: F([['SUBJID', 'Subject number'], ['ACCSNUM', 'Sample accession number'], ['ANALYTE', 'Analyte'], ['MATRIX', 'Matrix'], ['VISIT', 'Visit the sample was drawn'], ['NOMDAY', 'Day of the reference dose'], ['TPTLBL', 'Time point label (lab)'], ['NOMHR', 'Nominal hours after the reference dose'], ['COLLDATE', 'Collection date (YYYYMMDD)'], ['COLLTIME', 'Collection time (HHMM)'], ['RESULT', 'Concentration as reported'], ['UNITS', 'Units'], ['LLOQ', 'Lower limit of quantitation'], ['RUNID', 'Assay run'], ['FINAL', 'Reportable result (Y/N)'], ['SAMPCOND', 'Sample condition on receipt'], ['COMMENT', 'Lab comment']]),
  PKP: F([['SUBJID', 'Subject number'], ['ANALYTE', 'Analyte'], ['MATRIX', 'Matrix'], ['PROFDAY', 'Day of the dose the profile follows'], ['PARAM', 'Parameter (NCA software name)'], ['VALUE', 'Value'], ['UNIT', 'Unit (NCA software)'], ['COMMENT', 'Comment']]),
}

export const PK_FACTS: { what: string; value: string }[] = [
  { what: 'Phase', value: 'Phase 1, first in human' },
  { what: 'Population', value: 'Healthy men and women aged 18 to 55 years' },
  { what: 'Design', value: 'Randomised, double-blind, placebo-controlled, sequential ascending-dose cohorts; 6 active and 2 placebo per cohort' },
  { what: 'Part A (SAD)', value: '10, 30 and 100 mg single oral doses on Day 1; residence Day −1 to Day 3; follow-up Day 8' },
  { what: 'Part B (MAD)', value: '30 and 100 mg once daily on Days 1 to 7; residence Day −1 to Day 9; follow-up Day 14' },
  { what: 'PK sampling, Part A', value: 'Pre-dose (within 15 minutes before the dose), 0.5, 1, 2, 4, 8, 12, 24 and 48 h after the dose' },
  { what: 'PK sampling, Part B', value: 'Day 1: pre-dose to 24 h (the 24 h sample is drawn on Day 2 before that day’s dose); pre-dose troughs on Days 3 to 6; Day 7: pre-dose to 48 h' },
  { what: 'Analyte and assay', value: `PKX-07 in plasma by a validated LC-MS/MS method at ${PK_LAB}; LLOQ ${PK_LLOQ.toFixed(2)} ng/mL` },
  { what: 'PK parameters', value: 'Part A: Cmax, Tmax, AUClast, AUCinf, t½. Part B Day 1: Cmax, Tmax, AUCtau; Day 7: Cmax, Tmax, AUCtau, t½. Calculated by non-compartmental analysis with actual sampling times' },
]
export const PK_CONVENTIONS: { topic: string; rule: string }[] = [
  { topic: 'USUBJID', rule: 'STUDYID, a hyphen, and SUBJID: PKX-07-101-201-004.' },
  { topic: 'RFSTDTC, RFXSTDTC', rule: 'Date and time of the first dose (EX, Day 1). RFENDTC and RFXENDTC: date and time of the last dose. Null for screen failures.' },
  { topic: 'RFPENDTC', rule: 'The latest visit date (SV).' },
  { topic: 'ARM, ACTARM', rule: 'From the IRT codes, described as in the arms table. Screen failures: ARMCD and ACTARMCD null, ARMNRS = SCREEN FAILURE.' },
  { topic: 'EX', rule: 'One record per dose. EXTRT = PKX-07 or PLACEBO from the IRT kit arm; EXDOSE the cohort’s dose in mg (0 for placebo), EXDOSU mg, EXDOSFRM CAPSULE, EXROUTE ORAL; EXDOSFRQ ONCE in Part A and QD in Part B. EXSTDTC = EXENDTC = the dose date and time.' },
  { topic: 'PC: test and specimen', rule: 'PCTESTCD PKX07, PCTEST PKX-07, PCSPEC PLASMA, PCNAM the laboratory. Only the reportable run (FINAL = Y) is submitted; PCREFID is the accession number.' },
  { topic: 'PC: results', rule: 'PCORRES and PCSTRESC as reported: a number, or BLQ below the LLOQ. PCSTRESN numeric results only (null for BLQ). PCORRESU and PCSTRESU ng/mL whenever a result is reported. PCLLOQ the LLOQ in ng/mL on every record.' },
  { topic: 'PC: samples not analysed', rule: 'No result: PCSTAT = NOT DONE and PCREASND the lab comment in upper case; the record is kept.' },
  { topic: 'PC: specimen condition', rule: 'PCSPCCND = HEMOLYZED when the lab received a haemolysed sample (CT SPECCOND); the result is still reported.' },
  { topic: 'PC: timing', rule: 'VISIT and VISITNUM: the day the sample was drawn. PCTPTREF = DAY n DOSE for the dose the sample is timed from (NOMDAY); PCRFTDTC that dose’s date and time from the dosing log. PCTPT = PRE-DOSE or “n H POST-DOSE” (0.5 H POST-DOSE); PCTPTNUM the nominal hours (−0.25 for pre-dose); PCELTM the nominal hours as an ISO 8601 duration (−PT15M, PT30M, PT24H). PCDTC the actual collection date and time.' },
  { topic: 'PC: groups', rule: 'PCGRPID = DAY1 or DAY7 for the samples of a full profile (NOMDAY 1 or 7); null for the Part B troughs on Days 3 to 6.' },
  { topic: 'PP', rule: 'PPTESTCD from the NCA name (Cmax CMAX, Tmax TMAX, AUClast AUCLST, AUCinf AUCIFO, AUCtau AUCTAU, t1/2 LAMZHL) and PPTEST its CT name; PPCAT the analyte (PKX-07); PPSPEC PLASMA; units in CT PKUNIT (hr becomes h, hr*ng/mL becomes h*ng/mL); PPSTRESC, PPSTRESN and PPSTRESU as the original. PPGRPID = DAY and PROFDAY (DAY1, DAY7); PPTPTREF = DAY n DOSE; PPRFTDTC that dose’s date and time.' },
  { topic: 'PP: not calculated', rule: 'No value: PPSTAT = NOT DONE, PPREASND the comment in upper case, units null.' },
  { topic: 'RELREC', rule: 'Each subject’s PP records of a profile are related to the PC records of the same profile through the group IDs: one RELREC record with IDVAR = PPGRPID and one with IDVAR = PCGRPID, sharing a RELID.' },
]

// ---------- generation ----------
export interface PkSubject { subj: string; arm?: string; d1?: string; screen: string; doses: { day: number; at: string }[]; ka: number; ke: number; v: number }
export const PK_PLANTED: { missing?: string; reassay?: string; haemolysed?: string; lateTrough?: string; notCalculated?: string } = {}
const pad = (n: number) => String(n).padStart(2, '0')
const addMin = (dt: string, m: number) => new Date(Date.parse(`${dt}:00Z`) + m * 60000).toISOString().slice(0, 16)
const hrsBetween = (a: string, b: string) => (Date.parse(`${b}:00Z`) - Date.parse(`${a}:00Z`)) / 3600000
export const sig3 = (x: number) => String(Number(x.toPrecision(3)))

let cache: { forms: Record<string, Row[]>; subjects: PkSubject[] } | null = null
export function pkRaw() {
  if (cache) return cache
  const r = rng(70101)
  const forms: Record<string, Row[]> = { DM: [], IC: [], SV: [], EX: [], IRT: [], PCL: [], PKP: [] }
  let id = 0
  const push = (form: string, row: Record<string, string>) => forms[form].push({ __id: `${form}${++id}`, ...row } as Row)
  const subjects: PkSubject[] = []
  const COHORT_D1 = ['2026-04-06', '2026-04-20', '2026-05-04', '2026-05-11', '2026-05-25']
  const failAt = new Set([3, 11, 19, 26, 34, 41])
  let n = 0, randomised = 0
  while (randomised < 40) {
    n++
    const subj = `201-${String(n).padStart(3, '0')}`
    const cohort = Math.floor(randomised / 8)
    const d1 = COHORT_D1[cohort]
    const screen = addDays(d1, -r.int(8, 24))
    const sex = r.chance(0.55) ? 'Male' : 'Female'
    const race = r.pick(['Asian', 'Asian', 'Asian', 'White', 'Black or African American'])
    const birth = addDays(screen, -Math.round((18 + r.next() * 37) * 365.25))
    push('DM', { SUBJID: subj, SITEID: '201', DMDAT: toEdc(screen), BRTHDAT: toEdc(birth), SEX: sex, RACE: race, ETHNIC: 'Not Hispanic or Latino' })
    push('IC', { SUBJID: subj, ICDAT: toEdc(screen) })
    push('SV', { SUBJID: subj, VISIT: 'Screening', VISDAT: toEdc(screen) })
    const ka = 1.2 * Math.exp(r.normal(0, 0.25)), ke = (Math.LN2 / 6.5) * Math.exp(r.normal(0, 0.2)), v = 60 * Math.exp(r.normal(0, 0.25))
    if (failAt.has(n)) { subjects.push({ subj, screen, doses: [], ka, ke, v }); continue }
    const k = randomised % 8
    randomised++
    subjects.push({ subj, screen, doses: [], ka, ke, v, d1, arm: `${cohort}:${k}` })
  }
  // Two placebo places per cohort, drawn once the cohort is complete.
  for (let c = 0; c < 5; c++) {
    const inC = subjects.filter((s) => s.arm?.startsWith(`${c}:`))
    const pbo = new Set<number>(); while (pbo.size < 2) pbo.add(r.int(0, 7))
    const active = PK_ARMS.find((a) => a.cohort === c + 1)!
    inC.forEach((s, i) => { s.arm = pbo.has(i) ? (active.part === 'A' ? 'PBOSAD' : 'PBOMAD') : active.code })
  }
  let randno = 1000
  for (const s of subjects.filter((x) => x.arm)) {
    const arm = PK_ARMS.find((a) => a.code === s.arm)!
    const part = arm.part
    const cohort = part === 'A' ? COHORT_D1.indexOf(s.d1!) + 1 : COHORT_D1.indexOf(s.d1!) + 1
    push('IRT', { SUBJID: s.subj, RANDNO: String(++randno), RANDDT: addDays(s.d1!, -1), COHORT: String(cohort), RANDARM: s.arm!, KITARM: s.arm! })
    const idx = subjects.filter((x) => x.d1 === s.d1).indexOf(s)
    const base = `${s.d1}T${pad(7 + Math.floor((idx * 12) / 60))}:${pad((idx * 12) % 60)}`
    const ndose = part === 'A' ? 1 : 7
    for (let d = 1; d <= ndose; d++) {
      const at = addMin(`${addDays(s.d1!, d - 1)}${base.slice(10)}`, r.int(-4, 4))
      s.doses.push({ day: d, at })
      push('EX', { SUBJID: s.subj, VISIT: `Day ${d}`, EXDAT: toEdc(at.slice(0, 10)), EXTIM: at.slice(11, 16), KITNO: `K${String(randno * 10 + d).slice(-5)}` })
    }
    const visits = part === 'A' ? [-1, 1, 2, 3] : [-1, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    for (const d of visits) push('SV', { SUBJID: s.subj, VISIT: `Day ${d}`, VISDAT: toEdc(addDays(s.d1!, d < 0 ? d : d - 1)) })
    push('SV', { SUBJID: s.subj, VISIT: 'Follow-up', VISDAT: toEdc(addDays(s.d1!, part === 'A' ? 7 + r.int(0, 1) : 13 + r.int(0, 1))) })
  }
  // Plasma samples and their concentrations.
  const actives = subjects.filter((s) => s.arm && !s.arm.startsWith('PBO'))
  const mad100 = actives.filter((s) => s.arm === 'MAD100'), sad30 = actives.filter((s) => s.arm === 'SAD30'), mad30 = actives.filter((s) => s.arm === 'MAD30')
  PK_PLANTED.missing = mad100[1]?.subj; PK_PLANTED.reassay = sad30[2]?.subj; PK_PLANTED.haemolysed = mad30[0]?.subj
  PK_PLANTED.lateTrough = mad30[3]?.subj; PK_PLANTED.notCalculated = actives.find((s) => s.arm === 'SAD10')?.subj
  let accs = 503100
  const conc = (s: PkSubject, at: string) => {
    const dose = PK_ARMS.find((a) => a.code === s.arm)!.dose
    let c = 0
    for (const d of s.doses) { const t = hrsBetween(d.at, at); if (t > 0) c += ((dose * s.ka) / (s.v * (s.ka - s.ke))) * (Math.exp(-s.ke * t) - Math.exp(-s.ka * t)) * 1000 }
    return c
  }
  const profiles: { s: PkSubject; nomday: number; points: { nom: number; at: string; result: string }[] }[] = []
  for (const s of subjects.filter((x) => x.arm)) {
    const part = PK_ARMS.find((a) => a.code === s.arm)!.part
    const sets: [number, number[]][] = part === 'A' ? [[1, PK_SCHEDULE.SAD]] : [[1, PK_SCHEDULE.MAD1], [3, PK_SCHEDULE.TROUGH], [4, PK_SCHEDULE.TROUGH], [5, PK_SCHEDULE.TROUGH], [6, PK_SCHEDULE.TROUGH], [7, PK_SCHEDULE.MAD7]]
    for (const [nomday, times] of sets) {
      const dose = s.doses.find((d) => d.day === nomday)!
      const prof = { s, nomday, points: [] as { nom: number; at: string; result: string }[] }
      for (const nom of times) {
        let at = nom < 0 ? addMin(dose.at, -r.int(6, 25)) : addMin(dose.at, nom * 60 + (nom >= 24 ? r.int(-20, 10) : r.int(-2, 5)))
        if (nom === 24 && part === 'B' && nomday === 1) at = addMin(s.doses[1].at, -r.int(5, 20)) // drawn before the Day 2 dose
        if (nom < 0 && s.subj === PK_PLANTED.lateTrough && nomday === 5) at = addMin(dose.at, 6) // drawn 6 minutes after the dose
        const c = s.arm!.startsWith('PBO') ? 0 : conc(s, at) * (1 + r.normal(0, 0.08))
        const visitDay = nomday + Math.floor(hrsBetween(`${dose.at.slice(0, 10)}T00:00`, at) / 24)
        const missing = s.subj === PK_PLANTED.missing && nomday === 7 && nom === 8
        const result = missing ? '' : c < PK_LLOQ ? 'BLQ' : sig3(c)
        const row = {
          SUBJID: s.subj, ACCSNUM: `KB${++accs}`, ANALYTE: 'PKX-07', MATRIX: 'Plasma', VISIT: `Day ${visitDay}`, NOMDAY: String(nomday),
          TPTLBL: nom < 0 ? 'PREDOSE' : `${nom}HR`, NOMHR: String(nom), COLLDATE: missing ? '' : toYmd(at), COLLTIME: missing ? '' : at.slice(11, 16).replace(':', ''),
          RESULT: result, UNITS: 'ng/mL', LLOQ: PK_LLOQ.toFixed(2), RUNID: `R${pad(Math.floor(accs / 40) % 90 + 1)}`, FINAL: 'Y',
          SAMPCOND: s.subj === PK_PLANTED.haemolysed && nomday === 1 && nom === 2 ? 'HAEMOLYSED' : '', COMMENT: missing ? 'Sample not received' : '',
        }
        if (s.subj === PK_PLANTED.reassay && nom === 4) {
          // The first run failed its quality-control samples; the sample was analysed again.
          push('PCL', { ...row, RESULT: sig3(c * 1.31), RUNID: 'R07', FINAL: 'N', COMMENT: 'Run rejected: QC failure; sample reassayed' })
          push('PCL', { ...row, RUNID: 'R09', COMMENT: 'Reassay result' })
        } else push('PCL', row)
        if (!missing) prof.points.push({ nom, at, result })
      }
      profiles.push(prof)
    }
  }
  // Non-compartmental analysis of the reportable concentrations, with actual times.
  for (const pr of profiles) {
    const s = pr.s
    if (s.arm!.startsWith('PBO') || pr.points.length < 3) continue
    const part = PK_ARMS.find((a) => a.code === s.arm)!.part
    const dose = s.doses.find((d) => d.day === pr.nomday)!
    const pts = pr.points.map((p) => ({ t: Math.max(0, hrsBetween(dose.at, p.at)), c: p.result === 'BLQ' ? 0 : Number(p.result) }))
    if (pts[0].t > 0) pts.unshift({ t: 0, c: part === 'A' ? 0 : pts[0].c })
    const cmax = Math.max(...pts.map((p) => p.c)), tmax = pts.find((p) => p.c === cmax)!.t
    const auc = (upto: number) => {
      let a = 0
      for (let i = 1; i < pts.length && pts[i].t <= upto + 1e-9; i++) {
        const p = pts[i - 1], q = pts[i], dt = q.t - p.t
        a += q.c < p.c && q.c > 0 && p.c > 0 ? (dt * (p.c - q.c)) / Math.log(p.c / q.c) : (dt * (p.c + q.c)) / 2
      }
      return a
    }
    const lastQ = [...pts].reverse().find((p) => p.c > 0)!
    const term = pts.filter((p) => p.t > tmax && p.c > 0).slice(-3)
    let lz = NaN
    if (term.length === 3) {
      const xs = term.map((p) => p.t), ys = term.map((p) => Math.log(p.c)), mx = xs.reduce((a, b) => a + b) / 3, my = ys.reduce((a, b) => a + b) / 3
      const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0)
      if (slope < 0) lz = -slope
    }
    const nc = s.subj === PK_PLANTED.notCalculated || !Number.isFinite(lz)
    const out: [string, number | null, string][] = [['Cmax', cmax, 'ng/mL'], ['Tmax', tmax, 'hr']]
    if (part === 'A') out.push(['AUClast', auc(lastQ.t), 'hr*ng/mL'], ['AUCinf', nc ? null : auc(lastQ.t) + lastQ.c / lz, 'hr*ng/mL'], ['t1/2', nc ? null : Math.LN2 / lz, 'hr'])
    else { out.push(['AUCtau', auc(24.5), 'hr*ng/mL']); if (pr.nomday === 7) out.push(['t1/2', Number.isFinite(lz) ? Math.LN2 / lz : null, 'hr']) }
    for (const [param, val, unit] of out) {
      push('PKP', { SUBJID: s.subj, ANALYTE: 'PKX-07', MATRIX: 'Plasma', PROFDAY: String(pr.nomday), PARAM: param, VALUE: val === null ? '' : param === 'Tmax' ? val.toFixed(2) : sig3(val), UNIT: unit, COMMENT: val === null ? 'Not calculated: adjusted R-squared of the terminal phase below 0.80' : '' })
    }
  }
  cache = { forms, subjects }
  return cache
}

// ---------- reference mapping ----------
const e = (expr: string): Rule => ({ kind: 'expr', expr })
const c = (value: string): Rule => ({ kind: 'const', value })
const cp = (field: string): Rule => ({ kind: 'copy', field })
const ID = (d: string) => ({ STUDYID: c(PK_STUDY.id), DOMAIN: c(d), USUBJID: e(`concat('${PK_STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID') })
const DOSE_DT = (dayExpr: string) => `dtc(subjwhere('EX', 'EXDAT', 'VISIT', concat('Day ', ${dayExpr}), 'first'), 'DD-MMM-YYYY', subjwhere('EX', 'EXTIM', 'VISIT', concat('Day ', ${dayExpr}), 'first'))`
const PK_REF: Record<string, { rules: Record<string, Rule>; perm: string[]; source?: string; filter?: string }> = {
  DM: {
    perm: ['BRTHDTC', 'ETHNIC', 'DMDTC', 'DMDY'],
    rules: {
      ...ID('DM'),
      RFSTDTC: e(DOSE_DT("'1'")), RFENDTC: e("dtc(subj('EX', 'EXDAT', 'max'), 'DD-MMM-YYYY', subj('EX', 'EXTIM', 'last'))"),
      RFXSTDTC: e(DOSE_DT("'1'")), RFXENDTC: e("dtc(subj('EX', 'EXDAT', 'max'), 'DD-MMM-YYYY', subj('EX', 'EXTIM', 'last'))"),
      RFICDTC: e("dtc(subj('IC', 'ICDAT', 'first'), 'DD-MMM-YYYY')"), RFPENDTC: e("dtc(subj('SV', 'VISDAT', 'max'), 'DD-MMM-YYYY')"),
      SITEID: cp('SITEID'), BRTHDTC: e("dtc(BRTHDAT, 'DD-MMM-YYYY')"), AGE: e("age(BRTHDAT, subj('IC', 'ICDAT', 'first'))"), AGEU: c('YEARS'),
      SEX: { kind: 'recode', field: 'SEX', table: { Female: 'F', Male: 'M' } }, RACE: e('upper(RACE)'), ETHNIC: e('upper(ETHNIC)'),
      ARMCD: e("irt('RANDARM')"), ARM: e("armname(irt('RANDARM'))"), ACTARMCD: e("irt('KITARM')"), ACTARM: e("armname(irt('KITARM'))"),
      ARMNRS: e("if(isblank(irt('RANDARM')), 'SCREEN FAILURE', '')"), ACTARMUD: c(''),
      DTHDTC: c(''), DTHFL: c(''), COUNTRY: e('country(SITEID)'), DMDTC: e("dtc(DMDAT, 'DD-MMM-YYYY')"), DMDY: e('studyday(DMDTC, RFSTDTC)'),
    },
  },
  EX: {
    perm: ['EXDOSFRQ', 'EXROUTE', 'VISITNUM', 'VISIT', 'EPOCH', 'EXSTDY', 'EXENDY'],
    rules: {
      ...ID('EX'), EXSEQ: { kind: 'seq' },
      EXTRT: e("if(irt('KITARM') in ('PBOSAD', 'PBOMAD'), 'PLACEBO', 'PKX-07')"),
      EXDOSE: e("if(irt('KITARM') = 'SAD10', 10, if(irt('KITARM') in ('SAD30', 'MAD30'), 30, if(irt('KITARM') in ('SAD100', 'MAD100'), 100, 0)))"),
      EXDOSU: c('mg'), EXDOSFRM: c('CAPSULE'), EXDOSFRQ: e("if(irt('KITARM') in ('SAD10', 'SAD30', 'SAD100', 'PBOSAD'), 'ONCE', 'QD')"), EXROUTE: c('ORAL'),
      VISITNUM: e('visitnum(VISIT, EXDAT)'), VISIT: e('visitname(VISIT, EXDAT)'), EPOCH: e('epoch(EXSTDTC)'),
      EXSTDTC: e("dtc(EXDAT, 'DD-MMM-YYYY', EXTIM)"), EXENDTC: e("dtc(EXDAT, 'DD-MMM-YYYY', EXTIM)"), EXSTDY: e('studyday(EXSTDTC)'), EXENDY: e('studyday(EXENDTC)'),
    },
  },
  PC: {
    source: 'PCL', filter: "FINAL = 'Y'",
    perm: ['PCGRPID', 'PCREFID', 'PCSTAT', 'PCREASND', 'PCSPCCND', 'VISIT', 'PCDY', 'PCTPT', 'PCTPTNUM', 'PCELTM', 'PCTPTREF', 'PCRFTDTC'],
    rules: {
      ...ID('PC'), PCSEQ: { kind: 'seq' }, PCGRPID: e("if(NOMDAY in ('1', '7'), concat('DAY', NOMDAY), '')"), PCREFID: cp('ACCSNUM'),
      PCTESTCD: c('PKX07'), PCTEST: c('PKX-07'),
      PCORRES: cp('RESULT'), PCORRESU: e("if(present(RESULT), UNITS, '')"), PCSTRESC: cp('RESULT'), PCSTRESN: e("if(RESULT = 'BLQ', '', num(RESULT))"), PCSTRESU: e("if(present(RESULT), 'ng/mL', '')"),
      PCSTAT: e("if(isblank(RESULT), 'NOT DONE', '')"), PCREASND: e("if(isblank(RESULT), upper(COMMENT), '')"),
      PCNAM: c(PK_LAB), PCSPEC: e('upper(MATRIX)'), PCSPCCND: e("if(SAMPCOND = 'HAEMOLYSED', 'HEMOLYZED', '')"), PCLLOQ: e('num(LLOQ)'),
      VISITNUM: e('visitnum(VISIT, COLLDATE)'), VISIT: e('visitname(VISIT, COLLDATE)'),
      PCDTC: e("dtc(COLLDATE, 'YYYYMMDD', COLLTIME)"), PCDY: e('studyday(PCDTC)'),
      PCTPT: e("if(TPTLBL = 'PREDOSE', 'PRE-DOSE', concat(NOMHR, ' H POST-DOSE'))"), PCTPTNUM: e('num(NOMHR)'), PCELTM: e('isodur(NOMHR)'),
      PCTPTREF: e("concat('DAY ', NOMDAY, ' DOSE')"), PCRFTDTC: e(DOSE_DT('NOMDAY')),
    },
  },
  PP: {
    source: 'PKP',
    perm: ['PPGRPID', 'PPSTAT', 'PPREASND', 'PPTPTREF'],
    rules: {
      ...ID('PP'), PPSEQ: { kind: 'seq' }, PPGRPID: e("concat('DAY', PROFDAY)"),
      PPTESTCD: { kind: 'recode', field: 'PARAM', table: { Cmax: 'CMAX', Tmax: 'TMAX', AUClast: 'AUCLST', AUCinf: 'AUCIFO', AUCtau: 'AUCTAU', 't1/2': 'LAMZHL' } },
      PPTEST: e("ctdecode('PKPARMCD', PPTESTCD)"), PPCAT: e('upper(ANALYTE)'),
      PPORRES: cp('VALUE'), PPORRESU: e("if(isblank(VALUE), '', if(UNIT = 'hr', 'h', if(UNIT = 'hr*ng/mL', 'h*ng/mL', UNIT)))"),
      PPSTRESC: cp('VALUE'), PPSTRESN: e('num(VALUE)'), PPSTRESU: e('PPORRESU'),
      PPSTAT: e("if(isblank(VALUE), 'NOT DONE', '')"), PPREASND: e("if(isblank(VALUE), upper(COMMENT), '')"), PPSPEC: e('upper(MATRIX)'),
      PPTPTREF: e("concat('DAY ', PROFDAY, ' DOSE')"), PPRFTDTC: e(DOSE_DT('PROFDAY')),
    },
  },
}
export const PK_DOMAINS = Object.keys(PK_REF)
export const PK_RELREC: RelDef[] = [
  { id: 'PKPC', label: 'PK parameters of a profile and the concentrations they were calculated from', a: { domain: 'PP', key: 'PPGRPID' }, b: { domain: 'PC', key: 'PCGRPID' }, group: true },
]
export function pkReferenceSpec(domain: string, ver: Version): DomainSpec {
  const r = PK_REF[domain]; if (!r) throw new Error(`No reference mapping for ${domain} in ${PK_STUDY.id}`)
  const vars = varsOf(domain, ver).filter((m) => (m.core !== 'Perm' || r.perm.includes(m.name) || (ver === '4.0d' && m.name === 'SUBJID')) && r.rules[m.name]).map((m) => m.name)
  return { domain, source: r.source ?? domain, vars, rules: Object.fromEntries(vars.map((v) => [v, r.rules[v]])), sort: SORT[domain] ?? ['USUBJID'], ...(r.filter ? { filter: r.filter } : {}) }
}
let dmCache: Map<string, OutRow> | null = null
const base = (): StudyData => ({ forms: pkRaw().forms, studyId: PK_STUDY.id, visits: PK_VISITS, arms: PK_ARMS, sites: PK_SITES })
export function pkData(): StudyData {
  dmCache ??= new Map(build(pkReferenceSpec('DM', '3.4'), base()).rows.map((r) => [r.__subj, r]))
  return { ...base(), refDm: dmCache }
}

export const PK_PACK: StudyPack = {
  ...PK_STUDY, domains: PK_DOMAINS, refSpec: pkReferenceSpec, data: pkData, formInfo: PK_FORM_INFO, rawFields: PK_RAW_FIELDS,
  relrec: PK_RELREC, relNeed: ['PC', 'PP'], facts: PK_FACTS, conventions: PK_CONVENTIONS, arms: PK_ARMS, sites: PK_SITES, visits: PK_VISITS,
}
