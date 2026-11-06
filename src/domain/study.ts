// The fictional study GLV-12-301. Everything here is invented for training: the drug, the
// sponsor, the sites and the subjects.

export const STUDY = {
  id: 'GLV-12-301',
  title: 'A randomised, double-blind, placebo-controlled, parallel-group phase 3 study of the efficacy and safety of Glyvantra (GLV-12) 5 mg and 10 mg once daily in adults with type 2 diabetes inadequately controlled on metformin',
  short: 'Glyvantra (GLV-12) in type 2 diabetes',
  sponsor: 'Glyvant Pharmaceuticals (fictional)',
  phase: 'Phase 3',
  indication: 'Type 2 diabetes mellitus',
  drug: 'Glyvantra (GLV-12), oral tablet',
  design: 'Randomised 1:1:1, double-blind, three parallel arms; screening up to 21 days, 26 weeks of treatment, follow-up visit 4 weeks after the last dose',
  planned: 90,
  start: '2026-01-12',
}

export interface Site { id: string; name: string; country: string; iso: string; weightUnit: 'kg' | 'lb'; heightUnit: 'cm' | 'in' }
export const SITES: Site[] = [
  { id: '101', name: 'Lakeshore Diabetes Research Center', country: 'United States', iso: 'USA', weightUnit: 'lb', heightUnit: 'in' },
  { id: '102', name: 'Minato Metabolic Clinic', country: 'Japan', iso: 'JPN', weightUnit: 'kg', heightUnit: 'cm' },
  { id: '103', name: 'Rheinufer Studienzentrum', country: 'Germany', iso: 'DEU', weightUnit: 'kg', heightUnit: 'cm' },
  { id: '104', name: 'Konkan Clinical Research Institute', country: 'India', iso: 'IND', weightUnit: 'kg', heightUnit: 'cm' },
  { id: '105', name: 'Centro de Pesquisa Clínica Serra Azul', country: 'Brazil', iso: 'BRA', weightUnit: 'kg', heightUnit: 'cm' },
]
export const siteOf = (id: string) => SITES.find((s) => s.id === id)

export interface Arm { code: string; name: string; dose: number }
export const ARMS: Arm[] = [
  { code: 'GLV5', name: 'GLV-12 5 mg', dose: 5 },
  { code: 'GLV10', name: 'GLV-12 10 mg', dose: 10 },
  { code: 'PBO', name: 'Placebo', dose: 0 },
]
export const armOf = (code: string) => ARMS.find((a) => a.code === code)

// The schedule: the raw EDC folder name, the SDTM visit number and name (as in TV), the planned
// study day and the window. Study day 1 is the day of the first dose.
export interface Visit { raw: string; num: number; name: string; day: number; lo: number; hi: number; epoch: 'SCREENING' | 'TREATMENT' | 'FOLLOW-UP'; vs: string[] }
const VS_ALL = ['SYSBP', 'DIABP', 'PULSE', 'WEIGHT']
export const VISITS: Visit[] = [
  { raw: 'Screening', num: 1, name: 'SCREENING', day: -14, lo: -21, hi: -1, epoch: 'SCREENING', vs: [...VS_ALL, 'HEIGHT', 'TEMP'] },
  { raw: 'Day 1', num: 2, name: 'DAY 1', day: 1, lo: 1, hi: 1, epoch: 'TREATMENT', vs: [...VS_ALL, 'TEMP'] },
  { raw: 'Week 2', num: 3, name: 'WEEK 2', day: 15, lo: 12, hi: 18, epoch: 'TREATMENT', vs: VS_ALL },
  { raw: 'Week 4', num: 4, name: 'WEEK 4', day: 29, lo: 26, hi: 32, epoch: 'TREATMENT', vs: VS_ALL },
  { raw: 'Week 8', num: 5, name: 'WEEK 8', day: 57, lo: 52, hi: 62, epoch: 'TREATMENT', vs: VS_ALL },
  { raw: 'Week 12', num: 6, name: 'WEEK 12', day: 85, lo: 80, hi: 90, epoch: 'TREATMENT', vs: VS_ALL },
  { raw: 'Week 16', num: 7, name: 'WEEK 16', day: 113, lo: 108, hi: 118, epoch: 'TREATMENT', vs: VS_ALL },
  { raw: 'Week 20', num: 8, name: 'WEEK 20', day: 141, lo: 136, hi: 146, epoch: 'TREATMENT', vs: VS_ALL },
  { raw: 'Week 26', num: 9, name: 'WEEK 26', day: 183, lo: 176, hi: 190, epoch: 'TREATMENT', vs: VS_ALL },
  { raw: 'Follow-up', num: 10, name: 'FOLLOW-UP', day: 211, lo: 204, hi: 218, epoch: 'FOLLOW-UP', vs: VS_ALL },
]
export const visitByRaw = (raw: string) => VISITS.find((v) => v.raw === raw)

// The sponsor's SDTM conventions for this study (what a real SDTM programmer gets in the
// study's data standards plan or mapping guidelines). The reference mappings follow them.
export const CONVENTIONS: { topic: string; rule: string }[] = [
  { topic: 'USUBJID', rule: 'STUDYID, a hyphen, and SUBJID: for example GLV-12-301-101-004. SUBJID is the subject number as recorded in the EDC (site and number, e.g. 101-004).' },
  { topic: 'RFSTDTC, RFXSTDTC', rule: 'Date and time of the first dose of study drug (EX, Day 1), as ISO 8601 to the minute. Null for subjects never dosed.' },
  { topic: 'RFENDTC, RFXENDTC', rule: 'Date of the last dose of study drug: the latest EX end date. Null for subjects never dosed.' },
  { topic: 'RFICDTC', rule: 'Date informed consent was signed (IC form).' },
  { topic: 'RFPENDTC', rule: 'End of participation: the latest of the last visit date (SV) and the disposition date (DS).' },
  { topic: 'DTHDTC, DTHFL', rule: 'From the disposition form when the reason is Death: DTHDTC is that date and DTHFL is Y. Both are null for subjects who did not die (DTHFL is never N).' },
  { topic: 'AGE, AGEU', rule: 'Age in completed years at informed consent, from the full date of birth. AGEU is YEARS.' },
  { topic: 'ARM, ARMCD', rule: 'Planned arm from the IRT randomisation file. Null for screen failures, with ARMNRS = SCREEN FAILURE.' },
  { topic: 'ACTARM, ACTARMCD', rule: 'Actual arm from the treatment kits dispensed (IRT kit arm). Null for subjects randomised but never dosed, with ARMNRS = ASSIGNED, NOT TREATED. When the kit arm differs from the planned arm, ACTARMCD is the kit arm.' },
  { topic: 'RACE', rule: 'One race recorded: the CT value. More than one race recorded: MULTIPLE, with the individual races in SUPPDM as RACE1, RACE2 (QORIG Collected). Mission S1 scores DM only.' },
  { topic: 'COUNTRY', rule: 'ISO 3166-1 alpha-3 code of the site’s country.' },
  { topic: 'DMDTC', rule: 'Date the demographics form was completed (DMDAT).' },
  { topic: 'VISITNUM, VISIT', rule: 'From the trial visits (TV). An unscheduled visit takes the number of the last scheduled visit before it plus .01, .02 and so on, and VISIT = UNSCHEDULED followed by that number (e.g. UNSCHEDULED 4.01).' },
  { topic: 'EPOCH', rule: 'SCREENING before the first dose; TREATMENT from the first dose to the last dose date; FOLLOW-UP after the last dose date. Subjects never dosed are in SCREENING throughout.' },
  { topic: '--DY', rule: 'Study day relative to RFSTDTC: date minus RFSTDTC plus 1 on or after RFSTDTC, date minus RFSTDTC before it. There is no day 0. Null when either date is partial or missing.' },
  { topic: 'VS results', rule: 'VSORRES and VSORRESU as collected. Standard units: mmHg, beats/min, kg, cm, C. Weight in LB is converted to kg (×0.45359237) and height in inches to cm (×2.54), both rounded to 1 decimal. VSSTRESN is numeric; VSSTRESC is the same value as text.' },
  { topic: 'VSPOS', rule: 'SITTING for blood pressure and pulse (as collected); null for weight, height and temperature.' },
  { topic: 'Vital signs not done', rule: 'When the vital signs form says Not done, submit one record per test planned at that visit with VSSTAT = NOT DONE and VSREASND as recorded; results and units are null.' },
  { topic: 'VSLOBXFL', rule: 'Y on the last non-missing result for each test with VSDTC on or before RFXSTDTC (compared to the minute). Day 1 vital signs are taken before dosing; if a site recorded them after the dose time, they are not the pre-treatment value.' },
  { topic: 'VSSEQ', rule: 'Sorted by USUBJID, VSTESTCD, VISITNUM, VSDTC, then numbered from 1 within each subject.' },
  { topic: 'AE', rule: 'AETERM as reported. AELLT to AESOC and their codes from the coding export; AEBODSYS and AEBDSYCD are the primary system class (AESOC, AESOCCD). AESEV, AEACN and AEOUT as CT values (upper case); AEREL as RELATED or NOT RELATED. AESDTH and AESHOSP as ticked (Y), otherwise null. Dates as collected, partial dates truncated. Sorted by USUBJID, AEDECOD, AESTDTC.' },
  { topic: 'EPOCH (events)', rule: 'From the start date, as for findings. Null when the start date is partial.' },
  { topic: 'SUPPAE', rule: 'AETRTEM (Treatment Emergent Flag, origin Derived): Y when AESTDTC is on or after the first dose date (RFXSTDTC), N when before, no record for subjects never dosed or partial start dates. IDVAR = AESEQ.' },
  { topic: 'CM', rule: 'CMTRT as reported (trade names stay as written); CMDECOD and CMCLAS from the coding export. CMROUTE as CT (ORAL). Partial start dates stay partial. Medications ongoing at the end of the study: CMENRTPT = ONGOING and CMENTPT = END OF STUDY. Sorted by USUBJID, CMTRT, CMSTDTC.' },
  { topic: 'EX', rule: 'One record per kit interval. EXTRT is the treatment actually taken (from the IRT kit arm): GLV-12, or PLACEBO. EXDOSE is the daily dose in mg (5, 10, or 0 for placebo), EXDOSU mg, EXDOSFRM TABLET, EXDOSFRQ QD, EXROUTE ORAL. EXSTDTC with the time of the first dose on the first record. Sorted by USUBJID, EXSTDTC.' },
  { topic: 'DS', rule: 'Three sources. The end-of-study form gives the DISPOSITION EVENT: DSDECOD as CT (upper case), DSTERM the details text, or the CT term when there are none. The consent form gives the PROTOCOL MILESTONE “INFORMED CONSENT OBTAINED” and the IRT file “RANDOMIZED”, both in EPOCH SCREENING. Sorted by USUBJID, DSSTDTC, DSCAT.' },
  { topic: 'LB', rule: 'From the central laboratory transfer. Drop resent duplicates (same accession number and test). LBTESTCD, standard unit, factor and decimals from the lab standards table. LBORRES and range as reported; LBORRESU corrected to the CT unit (the vendor’s mg/dl is mg/dL). Standard results and ranges converted with the table’s factor and rounded to its decimals. A result reported as “<5” keeps “<5” in LBSTRESC with LBSTRESN null. Results not reported: LBSTAT = NOT DONE, LBREASND = SPECIMEN HEMOLYZED. LBNRIND from the vendor flag: H is HIGH, L is LOW, otherwise NORMAL. LBCAT CHEMISTRY. LBSPEC: Whole blood is BLOOD, Serum is SERUM. Sorted by USUBJID, LBTESTCD, VISITNUM, LBDTC.' },
  { topic: 'SV', rule: 'One record per visit that took place. SVSTDTC and SVENDTC are the visit date; VISITDY the planned day (null for unscheduled visits).' },
]

// The study's laboratory standards table: vendor code to SDTM test code, standard unit and
// conversion (what the central laboratory data transfer agreement and the sponsor's lab
// standards say).
export const LAB_STANDARDS: { vendor: string; testcd: string; stdunit: string; factor: number; decimals: number; spec: string }[] = [
  { vendor: 'A1C', testcd: 'HBA1C', stdunit: '%', factor: 1, decimals: 1, spec: 'BLOOD' },
  { vendor: 'FPG', testcd: 'GLUC', stdunit: 'mmol/L', factor: 0.0555, decimals: 1, spec: 'SERUM' },
  { vendor: 'CREA', testcd: 'CREAT', stdunit: 'umol/L', factor: 88.42, decimals: 0, spec: 'SERUM' },
  { vendor: 'ALT', testcd: 'ALT', stdunit: 'U/L', factor: 1, decimals: 0, spec: 'SERUM' },
  { vendor: 'AST', testcd: 'AST', stdunit: 'U/L', factor: 1, decimals: 0, spec: 'SERUM' },
  { vendor: 'CHOL', testcd: 'CHOL', stdunit: 'mmol/L', factor: 0.02586, decimals: 2, spec: 'SERUM' },
]

// Eligibility criteria (for TI), and the protocol facts behind TS.
export const CRITERIA: { code: string; cat: 'INCLUSION' | 'EXCLUSION'; text: string }[] = [
  { code: 'IN01', cat: 'INCLUSION', text: 'Adults aged 18 to 75 years with type 2 diabetes for at least 6 months' },
  { code: 'IN02', cat: 'INCLUSION', text: 'HbA1c 7.0% to 10.5% at screening' },
  { code: 'IN03', cat: 'INCLUSION', text: 'Stable metformin of at least 1500 mg a day for 12 weeks' },
  { code: 'EX01', cat: 'EXCLUSION', text: 'eGFR below 45 mL/min/1.73 m2' },
  { code: 'EX02', cat: 'EXCLUSION', text: 'Any other glucose-lowering drug in the last 12 weeks' },
  { code: 'EX03', cat: 'EXCLUSION', text: 'History of diabetic ketoacidosis' },
]
export const PROTOCOL_FACTS: { what: string; value: string }[] = [
  { what: 'Phase', value: 'Phase 3, interventional' },
  { what: 'Trial type', value: 'Efficacy and safety' },
  { what: 'Blinding and control', value: 'Double-blind, placebo-controlled, randomised' },
  { what: 'Intent', value: 'Treatment' },
  { what: 'Added on to existing treatment', value: 'Yes: added on to metformin' },
  { what: 'Arms', value: '3: GLV-12 5 mg, GLV-12 10 mg, placebo' },
  { what: 'Planned subjects', value: '90 randomised (30 per arm)' },
  { what: 'Age and sex', value: '18 to 75 years, both sexes; patients, not healthy volunteers' },
  { what: 'Elements', value: 'Screening (up to 21 days, from informed consent to the first dose); treatment 26 weeks (from the first dose); follow-up 4 weeks (from the day after the last dose)' },
  { what: 'Trial length per subject', value: 'Up to 33 weeks' },
  { what: 'Countries', value: 'United States, Japan, Germany, India, Brazil' },
  { what: 'Investigational treatment', value: 'GLV-12, oral tablet, once daily; comparator: placebo' },
  { what: 'Sponsor', value: 'Glyvant Pharmaceuticals (fictional)' },
  { what: 'Study start date (FDA definition)', value: 'The earliest date of informed consent of any subject (TS SSTDTC); study end date is the last subject’s last contact (SENDTC)' },
]
