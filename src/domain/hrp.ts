// The Ostrevia trial HRP-301 (VERDANT-1): lumiravostat 10 mg or 25 mg or placebo once daily for
// 16 weeks in moderate to severe chronic hand eczema. Its eCRF data were cleaned and locked in the
// CDM Query & Edit-Check Console (mission M20); this pack ships that locked database, so the
// participants mapped here are the console's own. A learner can also bring their own locked
// console project file (Project tab): the pack then works on that file's data. Two vendor files
// come with it: the IRT's unblinded randomisation list (released at database lock) and the
// central laboratory's final transfer. Severity scales: IGA-CHE (0 to 4) and HECSI (0 to 360)
// by the investigator, and the participant's worst itch over the last 24 hours (0 to 10); none
// has CDISC QRS terminology, so their QS test codes are sponsor-defined. Hepatitis B serology
// and HBV DNA belong in MB (microbiology) and are outside this pack's reference mapping.
// Everything is fictional.

import { build, type DomainSpec, type OutRow, type Rule, type StudyData } from './engine'
import { varsOf, type Version } from './standards'
import type { Visit } from './study'
import type { Row } from './seed'
import type { StudyPack } from './studypack'
import { AETRTEM } from './reference'
import locked from '../data/hrp301.json'

export const HRP_STUDY = {
  id: 'HRP-301',
  title: 'VERDANT-1: a randomised, double-blind, placebo-controlled phase 3 study of lumiravostat (Ostrevia) 10 mg and 25 mg once daily for 16 weeks in adults with moderate to severe chronic hand eczema',
  short: 'Ostrevia (lumiravostat) in chronic hand eczema: the locked database from the CDM Console',
  sponsor: 'Halcyon Ridge Pharmaceuticals (fictional)',
  phase: 'Phase 3',
  indication: 'Chronic hand eczema',
  design: 'Randomised 1:1:1 to lumiravostat 10 mg, lumiravostat 25 mg or placebo once daily for 16 weeks, then 4 weeks off treatment; primary endpoint IGA-CHE 0 or 1 with at least a 2-grade improvement at Week 16',
}
export const HRP_SITES = [
  { id: '301', name: 'Lindenhof Dermatologie Studienzentrum (fictional)', country: 'Germany', iso: 'DEU' },
  { id: '302', name: 'Bayview Dermatology Research (fictional)', country: 'United States', iso: 'USA' },
  { id: '303', name: 'Malabar Skin Research Centre (fictional)', country: 'India', iso: 'IND' },
  { id: '304', name: 'Kestrel Clinical Dermatology (fictional)', country: 'Canada', iso: 'CAN' },
]
export const HRP_ARMS = [{ code: 'HRP10', name: 'Lumiravostat 10 mg' }, { code: 'HRP25', name: 'Lumiravostat 25 mg' }, { code: 'PBO', name: 'Placebo' }]
const V = (raw: string, num: number, name: string, day: number, lo: number, hi: number, epoch: Visit['epoch'], vs: string[]): Visit => ({ raw, num, name, day, lo, hi, epoch, vs })
const VS4 = ['SYSBP', 'DIABP', 'PULSE', 'WEIGHT']
export const HRP_VISITS: Visit[] = [
  V('SCR', 1, 'SCREENING', -14, -28, -1, 'SCREENING', VS4), V('D1', 2, 'DAY 1', 1, 1, 1, 'TREATMENT', VS4), V('W2', 3, 'WEEK 2', 15, 12, 18, 'TREATMENT', []),
  V('W4', 4, 'WEEK 4', 29, 26, 32, 'TREATMENT', VS4), V('W8', 5, 'WEEK 8', 57, 53, 61, 'TREATMENT', VS4), V('W12', 6, 'WEEK 12', 85, 81, 89, 'TREATMENT', []),
  V('W16', 7, 'WEEK 16', 113, 109, 117, 'TREATMENT', VS4), V('FU', 8, 'FOLLOW-UP', 141, 134, 148, 'FOLLOW-UP', []),
]
export const HRP_LAB = 'Northgate Central Laboratory (fictional)'
export const HRP_FORM_INFO: Record<string, { name: string; source: string; note: string }> = {
  DM: { name: 'Demographics', source: 'EDC', note: 'One row per participant screened. Year of birth only is collected.' },
  IC: { name: 'Informed consent', source: 'EDC', note: 'One row per participant.' },
  SV: { name: 'Visits', source: 'EDC', note: 'One row per visit; VISIT is the visit code (SCR, D1, W2 … W16, FU, UNS).' },
  IE: { name: 'Eligibility', source: 'EDC', note: 'One row per participant: IEYN, and the first criterion not met (IETESTCD) for screen failures.' },
  MH: { name: 'Medical history', source: 'EDC', note: 'One row per condition, with the console’s coded terms (MHDECOD, MHBODSYS).' },
  VS: { name: 'Vital signs', source: 'EDC', note: 'One row per visit with blood pressure, pulse and weight as columns.' },
  HBV: { name: 'Hepatitis B screening', source: 'EDC', note: 'HBsAg, anti-HBc and HBV DNA at screening, copied from the central laboratory report. Outside this pack’s reference mapping (MB).' },
  LBC: { name: 'Central lab sample', source: 'EDC', note: 'One row per sample: whether it was taken, the accession number, date and time. The results are in CLAB.' },
  HEA: { name: 'Hand eczema assessments', source: 'EDC', note: 'One row per visit: IGA-CHE (0 clear to 4 severe) and HECSI (0 to 360) by the trained assessor, and the participant’s worst itch over the last 24 hours (0 to 10).' },
  EX: { name: 'Study drug', source: 'EDC', note: 'One row per visit from Day 1 to Week 16: whether a bottle was dispensed (EXDISP), its kit, tablets dispensed (35) and returned, and compliance. Dates are on SV.' },
  EOS: { name: 'End of study', source: 'EDC', note: 'One row per participant: status and date.' },
  AE: { name: 'Adverse events', source: 'EDC', note: 'One row per event (INSTANCE is the record number), with the console’s coded dictionary path (AELLT … AESOC with codes).' },
  CM: { name: 'Concomitant medications', source: 'EDC', note: 'One row per medication, with the console’s coded drug (CMDECOD) and class (CMCLAS, CMCLASCD).' },
  DV: { name: 'Protocol deviations', source: 'EDC', note: 'One row per deviation.' },
  IRT: { name: 'Randomisation (IRT, unblinded at lock)', source: 'IRT', note: 'One row per randomised participant: randomisation number, date and arm code. Released to the programmers after database lock.' },
  CLAB: { name: 'Central laboratory (vendor)', source: 'Vendor', note: `${HRP_LAB}, final cumulative transfer: one row per test per sample. ALT and AST in U/L, neutrophils and lymphocytes in 10^9/L, HBV DNA (IU/mL or UNDETECTABLE) for anti-HBc positive participants.` },
}
const F = (pairs: [string, string][]) => pairs.map(([name, label]) => ({ name, label }))
const ROW = [['SUBJID', 'Participant number'], ['VISIT', 'Visit code'], ['INSTANCE', 'Record number']] as [string, string][]
export const HRP_RAW_FIELDS: Record<string, { name: string; label: string }[]> = {
  DM: F([...ROW.slice(0, 1), ['SITEID', 'Site'], ['BRTHYR', 'Year of birth'], ['SEX', 'Sex (CT)'], ['RACE', 'Race (CT)']]),
  IC: F([...ROW.slice(0, 1), ['DSSTDAT', 'Date informed consent signed (ISO 8601)'], ['ICVER', 'Consent form version']]),
  SV: F([...ROW.slice(0, 2), ['VISOCCUR', 'Visit occurred'], ['VISDAT', 'Visit date (ISO 8601)'], ['UNSREAS', 'Reason (unscheduled)']]),
  IE: F([...ROW.slice(0, 1), ['IEYN', 'All criteria met'], ['IETESTCD', 'Criterion not met']]),
  MH: F([...ROW.slice(0, 1), ['INSTANCE', 'Record number'], ['MHTERM', 'Condition'], ['MHDECOD', 'Coded term'], ['MHBODSYS', 'Body system'], ['MHSTDAT', 'Start date'], ['MHONGO', 'Ongoing']]),
  VS: F([...ROW.slice(0, 2), ['VSDAT', 'Date'], ['SYSBP', 'Systolic BP (mmHg)'], ['DIABP', 'Diastolic BP (mmHg)'], ['PULSE', 'Pulse (beats/min)'], ['WEIGHT', 'Weight (kg)']]),
  HBV: F([...ROW.slice(0, 1), ['HBVDAT', 'Sample date'], ['HBSAG', 'HBsAg'], ['HBCAB', 'Anti-HBc'], ['HBVDNA', 'HBV DNA']]),
  LBC: F([...ROW.slice(0, 2), ['LBPERF', 'Sample taken'], ['LBREFID', 'Accession number'], ['LBDAT', 'Collection date'], ['LBTIM', 'Collection time']]),
  HEA: F([...ROW.slice(0, 2), ['HEADAT', 'Assessment date'], ['ASSESSOR', 'Assessor ID'], ['IGACHE', 'IGA-CHE (0–4)'], ['HECSI', 'HECSI total (0–360)'], ['ITCHNRS', 'Worst itch, last 24 h (0–10)']]),
  EX: F([...ROW.slice(0, 2), ['EXDISP', 'Bottle dispensed'], ['EXKIT', 'Kit number'], ['EXDSPQ', 'Tablets dispensed'], ['EXRET', 'Tablets returned'], ['EXCOMPL', 'Compliance (%)']]),
  EOS: F([...ROW.slice(0, 1), ['DSDECOD', 'Status (CT)'], ['EOSDAT', 'Date']]),
  AE: F([...ROW.slice(0, 1), ['INSTANCE', 'Record number'], ['AETERM', 'Verbatim'], ['AEDECOD', 'Preferred term'], ['AESOC', 'System organ class'], ['AESTDAT', 'Start'], ['AEENDAT', 'End'], ['AESEV', 'Severity'], ['AESER', 'Serious'], ['AEREL', 'Relationship'], ['AEACN', 'Action'], ['AEOUT', 'Outcome']]),
  CM: F([...ROW.slice(0, 1), ['INSTANCE', 'Record number'], ['CMTRT', 'Medication'], ['CMDECOD', 'Coded drug'], ['CMCLAS', 'Class'], ['CMINDC', 'Indication'], ['CMDSTXT', 'Dose'], ['CMDOSU', 'Unit'], ['CMROUTE', 'Route'], ['CMSTDAT', 'Start'], ['CMENDAT', 'End'], ['CMONGO', 'Ongoing']]),
  DV: F([...ROW.slice(0, 1), ['DVSTDAT', 'Date'], ['DVTERM', 'Description'], ['DVDECOD', 'Category'], ['DVIMPT', 'Important']]),
  IRT: F([['SUBJID', 'Participant number'], ['RANDNO', 'Randomisation number'], ['RANDDT', 'Randomisation date (ISO 8601)'], ['RANDARM', 'Arm (code)']]),
  CLAB: F([['SUBJID', 'Participant number'], ['VISIT', 'Visit code'], ['ACCSNUM', 'Accession number'], ['COLLDT', 'Collection date'], ['COLLTM', 'Collection time'], ['LBTESTCD', 'Test code'], ['LBORRES', 'Result'], ['LBORRESU', 'Unit'], ['LBORNRLO', 'Reference low'], ['LBORNRHI', 'Reference high']]),
}
export const HRP_FACTS: { what: string; value: string }[] = [
  { what: 'Phase', value: 'Phase 3, double-blind, randomised 1:1:1, placebo-controlled, 16 weeks of treatment and 4 weeks of follow-up' },
  { what: 'Population', value: 'Adults 18 to 75 with chronic hand eczema for at least 6 months, IGA-CHE 3 or 4, inadequately controlled with topical corticosteroids' },
  { what: 'Primary endpoint', value: 'IGA-CHE 0 or 1 with at least a 2-grade improvement from Day 1 at Week 16 (derived in ADaM)' },
  { what: 'Where the data come from', value: 'The CDM Query & Edit-Check Console’s locked HRP-301 database (eCRF and coding), the IRT’s unblinded list and the central laboratory’s final transfer' },
]
export const HRP_CONVENTIONS: { topic: string; rule: string }[] = [
  { topic: 'USUBJID', rule: 'STUDYID, a hyphen, and SUBJID: HRP-301-301-004.' },
  { topic: 'Dates', rule: 'The console stores ISO 8601 dates already: use iso(). VISIT is the visit code; visitnum() and visitname() give VISITNUM and VISIT, and the visit date of a form with no date of its own is on SV (subjwhere).' },
  { topic: 'DM', rule: 'RFSTDTC and RFXSTDTC: the Day 1 visit, when the first tablet is taken at the clinic. RFXENDTC and RFENDTC: the last dose, the day before the Week 16 visit; after early discontinuation, the day before the last visit on treatment. RFPENDTC: the end-of-study date. Only the year of birth is collected: BRTHDTC is the year and AGE is the consent year minus the birth year. ARM from the IRT; screen failures have ARMNRS SCREEN FAILURE.' },
  { topic: 'EX', rule: 'One record per bottle dispensed (EXDISP = Y): EXTRT LUMIRAVOSTAT or PLACEBO from the IRT arm, EXDOSE 10, 25 or 0 mg, EXDOSFRM TABLET, EXDOSFRQ QD, EXROUTE ORAL. EXSTDTC the dispensing visit; EXENDTC the day before the next visit, or the end-of-study date if there was no next visit.' },
  { topic: 'QS', rule: 'One record per scale per visit from HEA. QSCAT IGA-CHE, HECSI or ITCH NRS; QSTESTCD IGACHE01, HECSI01, ITCH01 (sponsor-defined); QSTEST IGA-CHE Score, HECSI Total Score, Worst Itch Past 24 Hours. QSORRES and QSSTRESC the score, QSSTRESN its number. QSEVAL INVESTIGATOR for IGA-CHE and HECSI; QSEVLINT -P1D for itch. QSLOBXFL on Day 1, the last value before the first dose.' },
  { topic: 'LB', rule: 'From the central laboratory file (CLAB), ALT, AST, neutrophils and lymphocytes; HBV DNA rows go to MB, not LB. LBCAT CHEMISTRY or HEMATOLOGY; units as reported are the standard units (U/L, 10^9/L); LBNRIND HIGH or LOW against the laboratory’s range. LBREFID is the accession number; LBDTC the collection date and time.' },
  { topic: 'AE and CM', rule: 'The coded terms come from the console’s coding (AEDECOD and the hierarchy with codes; CMDECOD and CMCLAS). Treatment-emergent: AETRTEM in SUPPAE. AESPID and CMSPID are the console record numbers. Topical medicines recorded as applications have no dose and unit: CMDOSTXT “1 APPLICATION”. Inhalation is RESPIRATORY (INHALATION) in the ROUTE codelist.' },
]

// ---------- the data ----------
type LockedFile = { forms: Record<string, Record<string, string>[]>; cl: Record<string, string>[] }
const ARM_OF = (subj: string) => (['HRP10', 'HRP25', 'PBO'])[(Number(subj.slice(4)) + Number(subj.slice(2, 3))) % 3]
// The vendor files that go with a locked database: the IRT's unblinded list and the central lab's final transfer.
export function hrpVendorForms(forms: Record<string, Row[]>): Record<string, Row[]> {
  const irt: Row[] = []
  let n = 5000
  for (const sv of (forms.SV ?? []).filter((r) => r.VISIT === 'D1' && r.VISOCCUR === 'Y').sort((a, b) => a.VISDAT.localeCompare(b.VISDAT) || a.SUBJID.localeCompare(b.SUBJID)))
    irt.push({ __id: `IRT-${sv.SUBJID}`, SUBJID: sv.SUBJID, RANDNO: String(++n), RANDDT: sv.VISDAT, RANDARM: ARM_OF(sv.SUBJID) } as Row)
  const clab = (locked as LockedFile).cl.map((r, i) => ({ __id: `CLAB${i + 1}`, ...r }) as Row)
  return { IRT: irt.sort((a, b) => a.SUBJID.localeCompare(b.SUBJID)), CLAB: clab }
}
const withIds = (forms: Record<string, Record<string, string>[]>): Record<string, Row[]> =>
  Object.fromEntries(Object.entries(forms).map(([f, rows]) => [f, rows.map((r) => ({ __id: `${f}-${r.SUBJID}|${r.VISIT || 'LOG'}|${r.INSTANCE}`, ...r }) as Row)]))
let shipped: Record<string, Row[]> | null = null
export const hrpShippedForms = () => (shipped ??= withIds((locked as LockedFile).forms))

// ---------- reference mapping ----------
const e = (expr: string): Rule => ({ kind: 'expr', expr })
const c = (value: string): Rule => ({ kind: 'const', value })
const cp = (field: string): Rule => ({ kind: 'copy', field })
const ID = (d: string) => ({ STUDYID: c(HRP_STUDY.id), DOMAIN: c(d), USUBJID: e(`concat('${HRP_STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID') })
const SVDATE = (visit: string) => `subjwhere('SV', 'VISDAT', 'VISIT', ${visit}, 'first')`
const LASTDOSE = `adddays(coalesce(${SVDATE("'W16'")}, ${SVDATE("'W12'")}, ${SVDATE("'W8'")}, ${SVDATE("'W4'")}, ${SVDATE("'W2'")}), -1)`
const NEXT = "if(VISIT = 'D1', 'W4', if(VISIT = 'W4', 'W8', if(VISIT = 'W8', 'W12', 'W16')))"
type Ref = { rules: Record<string, Rule>; perm: string[]; source?: string; filter?: string; sort: string[]; transpose?: DomainSpec['transpose']; supp?: DomainSpec['supp'] }
const HRP_REF: Record<string, Ref> = {
  DM: {
    perm: ['BRTHDTC', 'DMDTC', 'DMDY'], sort: ['USUBJID'],
    rules: {
      ...ID('DM'), RFSTDTC: e(`iso(${SVDATE("'D1'")})`), RFENDTC: e(`if(present(${SVDATE("'D1'")}), iso(${LASTDOSE}), '')`),
      RFXSTDTC: e(`iso(${SVDATE("'D1'")})`), RFXENDTC: e(`if(present(${SVDATE("'D1'")}), iso(${LASTDOSE}), '')`),
      RFICDTC: e("iso(subj('IC', 'DSSTDAT', 'first'))"), RFPENDTC: e("iso(subj('EOS', 'EOSDAT', 'first'))"),
      DTHDTC: c(''), DTHFL: c(''), SITEID: cp('SITEID'), BRTHDTC: cp('BRTHYR'), AGE: e("num(substr(subj('IC', 'DSSTDAT', 'first'), 1, 4)) - num(BRTHYR)"), AGEU: c('YEARS'),
      SEX: cp('SEX'), RACE: cp('RACE'),
      ARMCD: e("irt('RANDARM')"), ARM: e("armname(irt('RANDARM'))"), ACTARMCD: e(`if(present(${SVDATE("'D1'")}), irt('RANDARM'), '')`), ACTARM: e('armname(ACTARMCD)'),
      ARMNRS: e("if(isblank(irt('RANDARM')), 'SCREEN FAILURE', '')"), ACTARMUD: c(''), COUNTRY: e('country(SITEID)'), DMDTC: e(`iso(${SVDATE("'SCR'")})`), DMDY: e('studyday(DMDTC, RFSTDTC)'),
    },
  },
  AE: {
    perm: ['AESPID', 'AESEV', 'AEOUT', 'AESDTH', 'AESHOSP', 'EPOCH', 'AESTDY', 'AEENDY'], sort: ['USUBJID', 'AESTDTC', 'AETERM'], supp: [AETRTEM],
    rules: {
      ...ID('AE'), AESEQ: { kind: 'seq' }, AESPID: cp('INSTANCE'), AETERM: cp('AETERM'), AELLT: cp('AELLT'), AELLTCD: cp('AELLTCD'), AEDECOD: cp('AEDECOD'), AEPTCD: cp('AEPTCD'),
      AEHLT: cp('AEHLT'), AEHLTCD: cp('AEHLTCD'), AEHLGT: cp('AEHLGT'), AEHLGTCD: cp('AEHLGTCD'), AEBODSYS: cp('AESOC'), AEBDSYCD: cp('AESOCCD'), AESOC: cp('AESOC'), AESOCCD: cp('AESOCCD'),
      AESEV: cp('AESEV'), AESER: cp('AESER'), AEACN: cp('AEACN'), AEREL: cp('AEREL'), AEOUT: cp('AEOUT'), AESDTH: e("if(AESER = 'Y', AESDTH, '')"), AESHOSP: e("if(AESER = 'Y', AESHOSP, '')"),
      EPOCH: e('epoch(AESTDTC)'), AESTDTC: e('iso(AESTDAT)'), AEENDTC: e('iso(AEENDAT)'), AESTDY: e('studyday(AESTDTC)'), AEENDY: e('studyday(AEENDTC)'),
    },
  },
  CM: {
    perm: ['CMSPID', 'CMDECOD', 'CMINDC', 'CMCLAS', 'CMCLASCD', 'CMDOSE', 'CMDOSTXT', 'CMDOSU', 'CMROUTE', 'EPOCH', 'CMSTDTC', 'CMENDTC', 'CMSTDY', 'CMENDY', 'CMENRTPT', 'CMENTPT'], sort: ['USUBJID', 'CMSTDTC', 'CMTRT'],
    rules: {
      ...ID('CM'), CMSEQ: { kind: 'seq' }, CMSPID: cp('INSTANCE'), CMTRT: cp('CMTRT'), CMDECOD: cp('CMDECOD'), CMINDC: cp('CMINDC'), CMCLAS: cp('CMCLAS'), CMCLASCD: cp('CMCLASCD'),
      CMDOSE: e("if(CMDOSU = 'APPLICATION', '', num(CMDSTXT))"), CMDOSU: e("if(CMDOSU = 'APPLICATION', '', CMDOSU)"), CMDOSTXT: e("if(CMDOSU = 'APPLICATION', concat(CMDSTXT, ' APPLICATION'), '')"),
      CMROUTE: { kind: 'recode', field: 'CMROUTE', table: { ORAL: 'ORAL', TOPICAL: 'TOPICAL', INHALATION: 'RESPIRATORY (INHALATION)', INTRAVENOUS: 'INTRAVENOUS', SUBCUTANEOUS: 'SUBCUTANEOUS' } }, EPOCH: e('epoch(CMSTDTC)'), CMSTDTC: e('iso(CMSTDAT)'), CMENDTC: e('iso(CMENDAT)'),
      CMSTDY: e('studyday(CMSTDTC)'), CMENDY: e('studyday(CMENDTC)'), CMENRTPT: e("if(CMONGO = 'Y', 'ONGOING', '')"), CMENTPT: e("if(CMONGO = 'Y', 'END OF STUDY', '')"),
    },
  },
  MH: {
    perm: ['MHSPID', 'MHDECOD', 'MHBODSYS', 'MHSTDTC', 'MHENRTPT', 'MHENTPT'], sort: ['USUBJID', 'MHSTDTC', 'MHTERM'],
    rules: {
      ...ID('MH'), MHSEQ: { kind: 'seq' }, MHSPID: cp('INSTANCE'), MHTERM: cp('MHTERM'), MHDECOD: cp('MHDECOD'), MHBODSYS: cp('MHBODSYS'), MHSTDTC: e('iso(MHSTDAT)'),
      MHENRTPT: e("if(MHONGO = 'Y', 'ONGOING', '')"), MHENTPT: e(`if(MHONGO = 'Y', iso(${SVDATE("'SCR'")}), '')`),
    },
  },
  EX: {
    source: 'EX', filter: "EXDISP = 'Y'", perm: ['EXDOSFRQ', 'EXROUTE', 'EPOCH', 'EXSTDY', 'EXENDY'], sort: ['USUBJID', 'EXTRT', 'EXSTDTC'],
    rules: {
      ...ID('EX'), EXSEQ: { kind: 'seq' }, EXTRT: e("if(irt('RANDARM') = 'PBO', 'PLACEBO', 'LUMIRAVOSTAT')"), EXDOSE: e("if(irt('RANDARM') = 'PBO', 0, if(irt('RANDARM') = 'HRP10', 10, 25))"),
      EXDOSU: c('mg'), EXDOSFRM: c('TABLET'), EXDOSFRQ: c('QD'), EXROUTE: c('ORAL'), EPOCH: e('epoch(EXSTDTC)'),
      EXSTDTC: e(`iso(${SVDATE('VISIT')})`), EXENDTC: e(`iso(coalesce(adddays(${SVDATE(NEXT)}, -1), subj('EOS', 'EOSDAT', 'first')))`),
      EXSTDY: e('studyday(EXSTDTC)'), EXENDY: e('studyday(EXENDTC)'),
    },
  },
  VS: {
    perm: ['VISIT', 'EPOCH', 'VSDY'], sort: ['USUBJID', 'VSTESTCD', 'VISITNUM'],
    transpose: { tests: [{ code: 'SYSBP', field: 'SYSBP', unit: 'mmHg' }, { code: 'DIABP', field: 'DIABP', unit: 'mmHg' }, { code: 'PULSE', field: 'PULSE', unit: 'beats/min' }, { code: 'WEIGHT', field: 'WEIGHT', unit: 'kg' }], drop: 'isblank(__RESULT)' },
    rules: {
      ...ID('VS'), VSSEQ: { kind: 'seq' }, VSTESTCD: cp('__TESTCD'), VSTEST: e("ctdecode('VSTESTCD', __TESTCD)"), VSORRES: cp('__RESULT'), VSORRESU: cp('__UNIT'),
      VSSTRESC: e('str(num(__RESULT))'), VSSTRESN: e('num(__RESULT)'), VSSTRESU: cp('__UNIT'), VSLOBXFL: { kind: 'lobxfl', result: 'VSSTRESC', dtc: 'VSDTC', by: 'VSTESTCD' },
      VISITNUM: e('visitnum(VISIT, VSDAT)'), VISIT: e('visitname(VISIT, VSDAT)'), EPOCH: e('epoch(VSDTC)'), VSDTC: e('iso(VSDAT)'), VSDY: e('studyday(VSDTC)'),
    },
  },
  LB: {
    source: 'CLAB', filter: "LBTESTCD != 'HBVDNA'", perm: ['LBREFID', 'LBNAM', 'VISIT', 'EPOCH', 'LBDY'], sort: ['USUBJID', 'LBTESTCD', 'LBDTC'],
    rules: {
      ...ID('LB'), LBSEQ: { kind: 'seq' }, LBREFID: cp('ACCSNUM'), LBTESTCD: cp('LBTESTCD'), LBTEST: e("ctdecode('LBTESTCD', LBTESTCD)"), LBCAT: e("if(LBTESTCD in ('NEUT', 'LYMPH'), 'HEMATOLOGY', 'CHEMISTRY')"),
      LBORRES: cp('LBORRES'), LBORRESU: cp('LBORRESU'), LBORNRLO: cp('LBORNRLO'), LBORNRHI: cp('LBORNRHI'),
      LBSTRESC: e('str(num(LBORRES))'), LBSTRESN: e('num(LBORRES)'), LBSTRESU: cp('LBORRESU'), LBSTNRLO: e('num(LBORNRLO)'), LBSTNRHI: e('num(LBORNRHI)'),
      LBNRIND: e("if(num(LBORRES) > num(LBORNRHI), 'HIGH', if(num(LBORRES) < num(LBORNRLO), 'LOW', 'NORMAL'))"), LBNAM: c(HRP_LAB),
      LBLOBXFL: { kind: 'lobxfl', result: 'LBSTRESC', dtc: 'LBDTC', by: 'LBTESTCD' },
      VISITNUM: e('visitnum(VISIT, COLLDT)'), VISIT: e('visitname(VISIT, COLLDT)'), EPOCH: e('epoch(LBDTC)'), LBDTC: e('iso(COLLDT, COLLTM)'), LBDY: e('studyday(LBDTC)'),
    },
  },
  QS: {
    source: 'HEA', perm: ['QSEVAL', 'QSEVLINT', 'VISIT', 'EPOCH', 'QSDY'], sort: ['USUBJID', 'QSCAT', 'QSTESTCD', 'VISITNUM'],
    transpose: { tests: [{ code: 'IGACHE01', field: 'IGACHE' }, { code: 'HECSI01', field: 'HECSI' }, { code: 'ITCH01', field: 'ITCHNRS' }], drop: 'isblank(__RESULT)' },
    rules: {
      ...ID('QS'), QSSEQ: { kind: 'seq' }, QSTESTCD: cp('__TESTCD'),
      QSTEST: e("if(__TESTCD = 'IGACHE01', 'IGA-CHE Score', if(__TESTCD = 'HECSI01', 'HECSI Total Score', 'Worst Itch Past 24 Hours'))"),
      QSCAT: e("if(__TESTCD = 'IGACHE01', 'IGA-CHE', if(__TESTCD = 'HECSI01', 'HECSI', 'ITCH NRS'))"),
      QSORRES: cp('__RESULT'), QSSTRESC: cp('__RESULT'), QSSTRESN: e('num(__RESULT)'), QSLOBXFL: { kind: 'lobxfl', result: 'QSSTRESC', dtc: 'QSDTC', by: 'QSTESTCD' },
      QSEVAL: e("if(__TESTCD = 'ITCH01', '', 'INVESTIGATOR')"), QSEVLINT: e("if(__TESTCD = 'ITCH01', '-P1D', '')"),
      VISITNUM: e('visitnum(VISIT, HEADAT)'), VISIT: e('visitname(VISIT, HEADAT)'), EPOCH: e('epoch(QSDTC)'), QSDTC: e('iso(HEADAT)'), QSDY: e('studyday(QSDTC)'),
    },
  },
}
export const HRP_DOMAINS = Object.keys(HRP_REF)
export function hrpReferenceSpec(domain: string, ver: Version): DomainSpec {
  const r = HRP_REF[domain]; if (!r) throw new Error(`No reference mapping for ${domain} in ${HRP_STUDY.id}`)
  const vars = varsOf(domain, ver).filter((m) => (m.core !== 'Perm' || r.perm.includes(m.name) || (ver === '4.0d' && m.name === 'SUBJID')) && r.rules[m.name]).map((m) => m.name)
  return { domain, source: r.source ?? domain, vars, rules: Object.fromEntries(vars.map((v) => [v, r.rules[v]])), sort: r.sort, ...(r.filter ? { filter: r.filter } : {}), ...(r.transpose ? { transpose: r.transpose } : {}), ...(r.supp ? { supp: r.supp } : {}) }
}
// The data: the shipped locked database, or the learner's own locked console file.
const dmCache = new WeakMap<Record<string, Row[]>, Map<string, OutRow>>()
export function hrpDataFrom(eforms: Record<string, Row[]>): StudyData {
  const base: StudyData = { forms: { ...eforms, ...hrpVendorForms(eforms) }, studyId: HRP_STUDY.id, visits: HRP_VISITS, arms: HRP_ARMS, sites: HRP_SITES }
  let dm = dmCache.get(eforms)
  if (!dm) { dm = new Map(build(hrpReferenceSpec('DM', '3.4'), base).rows.map((r) => [r.__subj, r])); dmCache.set(eforms, dm) }
  return { ...base, refDm: dm }
}
export const hrpData = () => hrpDataFrom(hrpShippedForms())
export const HRP_PACK: StudyPack = {
  ...HRP_STUDY, domains: HRP_DOMAINS, refSpec: hrpReferenceSpec, data: hrpData, dataFrom: hrpDataFrom, formInfo: HRP_FORM_INFO, rawFields: HRP_RAW_FIELDS,
  relrec: [], relNeed: [], facts: HRP_FACTS, conventions: HRP_CONVENTIONS, arms: HRP_ARMS, sites: HRP_SITES, visits: HRP_VISITS,
}
