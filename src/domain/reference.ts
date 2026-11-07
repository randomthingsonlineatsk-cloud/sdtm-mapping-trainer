// The hidden reference mappings for GLV-12-301, written to the study's SDTM conventions
// (study.ts). Missions compare the learner's datasets with these, record by record. They are
// also how the study functions get the reference DM (reference dates for study day and epoch).

import { build, type DomainSpec, type OutRow, type StudyData, type Rule, type Part, type SuppQual } from './engine'
import { varsOf, customVars, registerReferenceCustom, type Version, type CustomDomain } from './standards'
import type { RelDef } from './relrec'
import { raw, type Transfer } from './seed'
import { STUDY } from './study'

const e = (expr: string): Rule => ({ kind: 'expr', expr })
const c = (value: string): Rule => ({ kind: 'const', value })
const cp = (field: string): Rule => ({ kind: 'copy', field })
const FIRST_DOSE = "dtc(subj('EX', 'EXSTDAT', 'min'), 'DD-MMM-YYYY', subj('EX', 'EXSTTIM', 'first'))"
const LAST_DOSE = "dtc(subj('EX', 'EXENDAT', 'max'), 'DD-MMM-YYYY')"

const DM_RULES: Record<string, Rule> = {
  STUDYID: c(STUDY.id), DOMAIN: c('DM'), USUBJID: e(`concat('${STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID'),
  RFSTDTC: e(FIRST_DOSE), RFENDTC: e(LAST_DOSE), RFXSTDTC: e(FIRST_DOSE), RFXENDTC: e(LAST_DOSE),
  RFICDTC: e("dtc(subj('IC', 'DSSTDAT', 'first'), 'DD-MMM-YYYY')"), RFPENDTC: e("max(dtc(subj('SV', 'VISDAT', 'max'), 'DD-MMM-YYYY'), dtc(subj('DS', 'DSSTDAT', 'max'), 'DD-MMM-YYYY'))"),
  DTHDTC: e("dtc(subjwhere('DS', 'DSSTDAT', 'DSDECOD', 'Death', 'first'), 'DD-MMM-YYYY')"), DTHFL: e("if(present(DTHDTC), 'Y', '')"),
  SITEID: cp('SITEID'), BRTHDTC: e("dtc(BRTHDAT, 'DD-MMM-YYYY')"), AGE: e("age(BRTHDAT, subj('IC', 'DSSTDAT', 'first'))"), AGEU: c('YEARS'),
  SEX: { kind: 'recode', field: 'SEX', table: { Female: 'F', Male: 'M' } },
  RACE: e("if(contains(RACE, ';'), 'MULTIPLE', upper(RACE))"), ETHNIC: e('upper(ETHNIC)'),
  ARMCD: e("irt('RANDARM')"), ARM: e("armname(irt('RANDARM'))"), ACTARMCD: e("irt('KITARM')"), ACTARM: e("armname(irt('KITARM'))"),
  ARMNRS: e("if(isblank(irt('RANDARM')), 'SCREEN FAILURE', if(isblank(irt('KITARM')), 'ASSIGNED, NOT TREATED', ''))"), ACTARMUD: c(''),
  COUNTRY: e('country(SITEID)'), DMDTC: e("dtc(DMDAT, 'DD-MMM-YYYY')"), DMDY: e('studyday(DMDTC, RFSTDTC)'),
}
const VS_RULES: Record<string, Rule> = {
  STUDYID: c(STUDY.id), DOMAIN: c('VS'), USUBJID: e(`concat('${STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID'), VSSEQ: { kind: 'seq' },
  VSTESTCD: cp('__TESTCD'), VSTEST: e("ctdecode('VSTESTCD', __TESTCD)"),
  VSPOS: e("if(__TESTCD in ('SYSBP', 'DIABP', 'PULSE') and present(VSPOS), upper(VSPOS), '')"),
  VSORRES: cp('__RESULT'), VSORRESU: e("if(present(__RESULT), if(__UNIT = 'lb', 'LB', __UNIT), '')"),
  VSSTRESC: e('str(convert(__RESULT, VSORRESU, stdunit(__TESTCD), 1))'), VSSTRESN: e('num(VSSTRESC)'),
  VSSTRESU: e("if(present(__RESULT), stdunit(__TESTCD), '')"),
  VSSTAT: e("if(VSPERF = 'N', 'NOT DONE', '')"), VSREASND: cp('VSREASND'),
  VSLOBXFL: { kind: 'lobxfl', result: 'VSSTRESC', dtc: 'VSDTC', by: 'VSTESTCD' },
  VISITNUM: e('visitnum(VISIT, VSDAT)'), VISIT: e('visitname(VISIT, VSDAT)'), EPOCH: e('epoch(VSDTC)'),
  VSDTC: e("dtc(VSDAT, 'DD-MMM-YYYY', VSTIM)"), VSDY: e('studyday(VSDTC)'),
}
const VS_TRANSPOSE = {
  tests: [
    { code: 'SYSBP', field: 'SYSBP', unit: 'mmHg' }, { code: 'DIABP', field: 'DIABP', unit: 'mmHg' }, { code: 'PULSE', field: 'PULSE', unit: 'beats/min' },
    { code: 'WEIGHT', field: 'WEIGHT', unitField: 'WEIGHTU' }, { code: 'HEIGHT', field: 'HEIGHT', unitField: 'HEIGHTU' }, { code: 'TEMP', field: 'TEMP', unit: 'C' },
  ],
  drop: "isblank(__RESULT) and not (VSPERF = 'N' and planned(__TESTCD))",
}
const AE_RULES: Record<string, Rule> = {
  STUDYID: c(STUDY.id), DOMAIN: c('AE'), USUBJID: e(`concat('${STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID'), AESEQ: { kind: 'seq' }, AESPID: cp('AESPID'),
  AETERM: cp('AETERM'), AELLT: cp('AELLT'), AELLTCD: cp('AELLTCD'), AEDECOD: cp('AEDECOD'), AEPTCD: cp('AEPTCD'), AEHLT: cp('AEHLT'), AEHLTCD: cp('AEHLTCD'),
  AEHLGT: cp('AEHLGT'), AEHLGTCD: cp('AEHLGTCD'), AEBODSYS: cp('AESOC'), AEBDSYCD: cp('AESOCCD'), AESOC: cp('AESOC'), AESOCCD: cp('AESOCCD'),
  AESEV: e('upper(AESEV)'), AESER: cp('AESER'), AEACN: e('upper(AEACN)'), AEREL: e('upper(AEREL)'), AEOUT: e('upper(AEOUT)'), AESDTH: cp('AESDTH'), AESHOSP: cp('AESHOSP'),
  EPOCH: e('epoch(AESTDTC)'), AESTDTC: e("dtc(AESTDAT, 'DD-MMM-YYYY')"), AEENDTC: e("dtc(AEENDAT, 'DD-MMM-YYYY')"), AESTDY: e('studyday(AESTDTC)'), AEENDY: e('studyday(AEENDTC)'),
}
// More than one race recorded: RACE = MULTIPLE in DM and each collected race in SUPPDM (NSDM in
// the v4.0 draft) as RACE1, RACE2, with IDVAR and IDVARVAL null because DM has one record per subject.
export const RACEQ: SuppQual[] = [1, 2].map((n) => ({ qnam: `RACE${n}`, qlabel: `Race ${n}`, qorig: 'Collected' as const, expr: `if(contains(RACE, ';'), upper(part(RACE, ';', ${n})), '')` }))
export const AETRTEM: SuppQual = { qnam: 'AETRTEM', qlabel: 'Treatment Emergent Flag', qorig: 'Derived', expr: "if(isblank(dm('RFXSTDTC')) or isblank(studyday(AESTDTC, dm('RFXSTDTC'))), '', if(studyday(AESTDTC, dm('RFXSTDTC')) >= 1, 'Y', 'N'))" }
const CM_RULES: Record<string, Rule> = {
  STUDYID: c(STUDY.id), DOMAIN: c('CM'), USUBJID: e(`concat('${STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID'), CMSEQ: { kind: 'seq' }, CMSPID: cp('CMSPID'),
  CMTRT: cp('CMTRT'), CMDECOD: cp('CMDECOD'), CMINDC: cp('CMINDC'), CMCLAS: cp('CMCLAS'), CMDOSE: e('num(CMDOSE)'), CMDOSU: cp('CMDOSU'), CMDOSFRQ: cp('CMDOSFRQ'), CMROUTE: e('upper(CMROUTE)'),
  EPOCH: e('epoch(CMSTDTC)'), CMSTDTC: e("dtc(CMSTDAT, 'DD-MMM-YYYY')"), CMENDTC: e("dtc(CMENDAT, 'DD-MMM-YYYY')"), CMSTDY: e('studyday(CMSTDTC)'), CMENDY: e('studyday(CMENDTC)'),
  CMENRTPT: e("if(CMONGO = 'Y', 'ONGOING', '')"), CMENTPT: e("if(CMONGO = 'Y', 'END OF STUDY', '')"),
}
const EX_RULES: Record<string, Rule> = {
  STUDYID: c(STUDY.id), DOMAIN: c('EX'), USUBJID: e(`concat('${STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID'), EXSEQ: { kind: 'seq' },
  EXTRT: e("if(irt('KITARM') = 'PBO', 'PLACEBO', 'GLV-12')"), EXDOSE: e("if(irt('KITARM') = 'GLV10', 10, if(irt('KITARM') = 'GLV5', 5, 0))"),
  EXDOSU: c('mg'), EXDOSFRM: c('TABLET'), EXDOSFRQ: c('QD'), EXROUTE: c('ORAL'),
  EPOCH: e('epoch(EXSTDTC)'), EXSTDTC: e("dtc(EXSTDAT, 'DD-MMM-YYYY', EXSTTIM)"), EXENDTC: e("dtc(EXENDAT, 'DD-MMM-YYYY')"), EXSTDY: e('studyday(EXSTDTC)'), EXENDY: e('studyday(EXENDTC)'),
}
const IE_RULES: Record<string, Rule> = {
  STUDYID: c(STUDY.id), DOMAIN: c('IE'), USUBJID: e(`concat('${STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID'), IESEQ: { kind: 'seq' },
  IETESTCD: cp('IETESTCD'), IETEST: e("ti(IETESTCD, 'text')"), IECAT: e('upper(IECAT)'),
  IEORRES: e("if(upper(IECAT) = 'INCLUSION', 'N', 'Y')"), IESTRESC: e('IEORRES'),
  VISITNUM: e('visitnum(VISIT, IEDAT)'), VISIT: e('visitname(VISIT, IEDAT)'), EPOCH: e('epoch(IEDTC)'), IEDTC: e("dtc(IEDAT, 'DD-MMM-YYYY')"), IEDY: e('studyday(IEDTC)'),
}
const MH_RULES: Record<string, Rule> = {
  STUDYID: c(STUDY.id), DOMAIN: c('MH'), USUBJID: e(`concat('${STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID'), MHSEQ: { kind: 'seq' }, MHSPID: cp('MHSPID'),
  MHTERM: cp('MHTERM'), MHDECOD: cp('MHDECOD'), MHCAT: e('upper(MHCAT)'), MHBODSYS: cp('MHBODSYS'),
  MHSTDTC: e("dtc(MHSTDAT, 'DD-MMM-YYYY')"), MHENDTC: e("dtc(MHENDAT, 'DD-MMM-YYYY')"),
  MHENRTPT: e("if(MHONGO = 'Y', 'ONGOING', '')"), MHENTPT: e("if(MHONGO = 'Y', 'SCREENING', '')"),
}
// EC is the treatment as collected: blinded, in tablets, from the dosing form. EX is the
// treatment actually given, known from the IRT kit arm once the study is unblinded.
const EC_RULES: Record<string, Rule> = {
  STUDYID: c(STUDY.id), DOMAIN: c('EC'), USUBJID: e(`concat('${STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID'), ECSEQ: { kind: 'seq' },
  ECTRT: c('GLV-12 OR PLACEBO'), ECDOSE: e('num(EXTABS)'), ECDOSU: c('TABLET'), ECDOSFRM: c('TABLET'), ECDOSFRQ: c('QD'), ECROUTE: c('ORAL'), ECREFID: cp('EXKIT'),
  EPOCH: e('epoch(ECSTDTC)'), ECSTDTC: e("dtc(EXSTDAT, 'DD-MMM-YYYY', EXSTTIM)"), ECENDTC: e("dtc(EXENDAT, 'DD-MMM-YYYY')"), ECSTDY: e('studyday(ECSTDTC)'), ECENDY: e('studyday(ECENDTC)'),
}
const DV_RULES: Record<string, Rule> = {
  STUDYID: c(STUDY.id), DOMAIN: c('DV'), USUBJID: e(`concat('${STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID'), DVSEQ: { kind: 'seq' }, DVREFID: cp('DEVID'),
  DVTERM: cp('DEVTERM'), DVCAT: e('upper(DEVCAT)'), DVSCAT: e("if(IMPORTANT = 'Yes', 'IMPORTANT', 'NOT IMPORTANT')"),
  EPOCH: e('epoch(DVSTDTC)'), DVSTDTC: e("dtc(DEVDATE, 'DD/MM/YYYY')"), DVSTDY: e('studyday(DVSTDTC)'),
}
// Comments over 200 characters continue in COVAL1 (SDTMIG CO assumption), split between words.
const CO_RULES: Record<string, Rule> = {
  STUDYID: c(STUDY.id), DOMAIN: c('CO'), RDOMAIN: cp('FORM'), USUBJID: e(`concat('${STUDY.id}-', SUBJID)`), COSEQ: { kind: 'seq' },
  COREF: e('visitname(VISIT, CODAT)'), COVAL: e('wrap(COMMENT, 200, 1)'), COVAL1: e('wrap(COMMENT, 200, 2)'), CODTC: e("dtc(CODAT, 'DD-MMM-YYYY')"), CODY: e('studyday(CODTC)'),
}
const DS_COMMON: Record<string, Rule> = { STUDYID: c(STUDY.id), DOMAIN: c('DS'), USUBJID: e(`concat('${STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID'), DSSEQ: { kind: 'seq' }, DSSTDY: e('studyday(DSSTDTC)') }
const DS_RULES: Record<string, Rule> = { ...DS_COMMON, DSTERM: e('coalesce(DSTERM, upper(DSDECOD))'), DSDECOD: e('upper(DSDECOD)'), DSCAT: c('DISPOSITION EVENT'), EPOCH: e('epoch(DSSTDTC)'), DSSTDTC: e("dtc(DSSTDAT, 'DD-MMM-YYYY')") }
const DS_IC: Record<string, Rule> = { ...DS_COMMON, DSTERM: c('INFORMED CONSENT OBTAINED'), DSDECOD: c('INFORMED CONSENT OBTAINED'), DSCAT: c('PROTOCOL MILESTONE'), EPOCH: c('SCREENING'), DSSTDTC: e("dtc(DSSTDAT, 'DD-MMM-YYYY')") }
const DS_IRT: Record<string, Rule> = { ...DS_COMMON, DSTERM: c('RANDOMIZED'), DSDECOD: c('RANDOMIZED'), DSCAT: c('PROTOCOL MILESTONE'), EPOCH: c('SCREENING'), DSSTDTC: cp('RANDDT') }
const SI = (x: string) => `round(num(${x}) * lab(TESTCODE, 'factor', UNITS), lab(TESTCODE, 'decimals'))`
const LB_RULES: Record<string, Rule> = {
  STUDYID: c(STUDY.id), DOMAIN: c('LB'), USUBJID: e(`concat('${STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID'), LBSEQ: { kind: 'seq' }, LBREFID: cp('ACCSNUM'),
  LBTESTCD: e("lab(TESTCODE, 'testcd')"), LBTEST: e("ctdecode('LBTESTCD', LBTESTCD)"), LBCAT: c('CHEMISTRY'),
  LBORRES: cp('RESULT'), LBORRESU: e("if(present(RESULT), replace(UNITS, 'mg/dl', 'mg/dL'), '')"), LBORNRLO: cp('REFLOW'), LBORNRHI: cp('REFHIGH'),
  LBSTRESC: e(`if(isblank(RESULT), '', if(substr(RESULT, 1, 1) = '<', RESULT, str(${SI('RESULT')})))`), LBSTRESN: e('num(LBSTRESC)'),
  LBSTRESU: e("if(present(RESULT), lab(TESTCODE, 'stdunit'), '')"), LBSTNRLO: e(SI('REFLOW')), LBSTNRHI: e(SI('REFHIGH')),
  LBNRIND: e("if(isblank(RESULT), '', if(FLAG = 'H', 'HIGH', if(FLAG = 'L', 'LOW', 'NORMAL')))"),
  LBSTAT: e("if(isblank(RESULT), 'NOT DONE', '')"), LBREASND: e("if(isblank(RESULT), 'SPECIMEN HEMOLYZED', '')"),
  LBNAM: cp('LABNAME'), LBSPEC: e("lab(TESTCODE, 'spec')"), LBLOBXFL: { kind: 'lobxfl', result: 'LBSTRESC', dtc: 'LBDTC', by: 'LBTESTCD' }, LBFAST: cp('FASTING'),
  VISITNUM: e('visitnum(VISIT, COLLDATE)'), VISIT: e('visitname(VISIT, COLLDATE)'), EPOCH: e('epoch(LBDTC)'), LBDTC: e("dtc(COLLDATE, 'YYYYMMDD', COLLTIME)"), LBDY: e('studyday(LBDTC)'),
  LBTPT: e('upper(TIMEPOINT)'), LBTPTNUM: e("if(TIMEPOINT = 'Pre-dose', 1, if(present(TIMEPOINT), 2, ''))"),
  LBELTM: e("if(TIMEPOINT = 'Pre-dose', '-PT30M', if(present(TIMEPOINT), 'PT2H', ''))"), LBTPTREF: e("if(present(TIMEPOINT), 'WEEK 12 DOSE', '')"),
}
const SV_RULES: Record<string, Rule> = {
  STUDYID: c(STUDY.id), DOMAIN: c('SV'), USUBJID: e(`concat('${STUDY.id}-', SUBJID)`), VISITNUM: e('visitnum(VISIT, VISDAT)'), VISIT: e('visitname(VISIT, VISDAT)'), VISITDY: e('visitdy(VISIT)'),
  EPOCH: e('epoch(SVSTDTC)'), SVSTDTC: e("dtc(VISDAT, 'DD-MMM-YYYY')"), SVENDTC: e("dtc(VISDAT, 'DD-MMM-YYYY')"), SVSTDY: e('studyday(SVSTDTC)'), SVENDY: e('studyday(SVENDTC)'),
}
export const SORT: Record<string, string[]> = {
  DM: ['USUBJID'], VS: ['USUBJID', 'VSTESTCD', 'VISITNUM', 'VSDTC'], AE: ['USUBJID', 'AEDECOD', 'AESTDTC'], CM: ['USUBJID', 'CMTRT', 'CMSTDTC'],
  EX: ['USUBJID', 'EXSTDTC'], DS: ['USUBJID', 'DSSTDTC', 'DSCAT'], LB: ['USUBJID', 'LBTESTCD', 'VISITNUM', 'LBDTC'], SV: ['USUBJID', 'VISITNUM'],
  IE: ['USUBJID', 'IETESTCD'], MH: ['USUBJID', 'MHCAT', 'MHTERM', 'MHSTDTC'], EC: ['USUBJID', 'ECSTDTC'], DV: ['USUBJID', 'DVSTDTC', 'DVREFID'], CO: ['USUBJID', 'CODTC', 'RDOMAIN'], XE: ['USUBJID', 'XESTDTC', 'XETRT'],
}

// Which IG variables each reference includes: every Required and Expected variable, plus the
// permissible ones the study collects or derives.
// The sponsor-defined domain for diabetes education sessions.
export const REF_CUSTOM: CustomDomain = { code: 'XE', name: 'Diabetes Education', cls: 'Interventions', structure: 'One record per education session per subject', reason: 'Education sessions are not procedures performed on the subject (PR), meals (ML) or medications (CM, EX); no published domain holds them.', vars: customVars('XE', 'Interventions') }
const XE_RULES: Record<string, Rule> = {
  STUDYID: c(STUDY.id), DOMAIN: c('XE'), USUBJID: e(`concat('${STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID'), XESEQ: { kind: 'seq' },
  XETRT: e('upper(TOPIC)'), XECAT: c('DIABETES EDUCATION'), XESCAT: e('upper(FORMAT)'), XEDUR: e("concat('PT', DURMIN, 'M')"),
  VISITNUM: e('visitnum(VISIT, EDUDAT)'), VISIT: e('visitname(VISIT, EDUDAT)'), EPOCH: e('epoch(XESTDTC)'), XESTDTC: e("dtc(EDUDAT, 'DD-MMM-YYYY')"), XESTDY: e('studyday(XESTDTC)'),
}
registerReferenceCustom(REF_CUSTOM)
const REF: Record<string, { rules: Record<string, Rule>; perm: string[]; transpose?: DomainSpec['transpose']; filter?: string; source?: string; parts?: Part[]; supp?: SuppQual[] }> = {
  DM: { rules: DM_RULES, perm: ['BRTHDTC', 'ETHNIC', 'DMDTC', 'DMDY'], supp: RACEQ },
  VS: { rules: VS_RULES, perm: ['VSPOS', 'VSSTAT', 'VSREASND', 'VISIT', 'EPOCH', 'VSDY', 'SUBJID'], transpose: VS_TRANSPOSE },
  AE: { rules: AE_RULES, perm: ['AESPID', 'AESEV', 'AEOUT', 'AESDTH', 'AESHOSP', 'EPOCH', 'AESTDY', 'AEENDY', 'SUBJID'], supp: [AETRTEM] },
  CM: { rules: CM_RULES, perm: ['CMSPID', 'CMDECOD', 'CMINDC', 'CMCLAS', 'CMDOSE', 'CMDOSU', 'CMDOSFRQ', 'CMROUTE', 'EPOCH', 'CMSTDTC', 'CMENDTC', 'CMSTDY', 'CMENDY', 'CMENRTPT', 'CMENTPT', 'SUBJID'] },
  EX: { rules: EX_RULES, perm: ['EXDOSFRQ', 'EXROUTE', 'EPOCH', 'EXSTDY', 'EXENDY', 'SUBJID'] },
  DS: { rules: DS_RULES, perm: ['EPOCH', 'DSSTDY', 'SUBJID'], parts: [{ source: 'IC', rules: DS_IC }, { source: 'IRT', rules: DS_IRT }] },
  LB: { rules: LB_RULES, perm: ['LBREFID', 'LBSTAT', 'LBREASND', 'LBNAM', 'LBSPEC', 'LBFAST', 'VISIT', 'EPOCH', 'LBDY', 'LBTPT', 'LBTPTNUM', 'LBELTM', 'LBTPTREF', 'SUBJID'], source: 'LBC', filter: 'not isdup(ACCSNUM, TESTCODE)' },
  SV: { rules: SV_RULES, perm: ['VISIT', 'VISITDY', 'EPOCH', 'SVSTDY', 'SVENDY'] },
  IE: { rules: IE_RULES, perm: ['VISITNUM', 'VISIT', 'EPOCH', 'IEDTC', 'IEDY', 'SUBJID'], filter: "IEYN = 'N'" },
  MH: { rules: MH_RULES, perm: ['MHSPID', 'MHDECOD', 'MHCAT', 'MHBODSYS', 'MHSTDTC', 'MHENDTC', 'MHENRTPT', 'MHENTPT', 'SUBJID'] },
  EC: { rules: EC_RULES, perm: ['ECDOSFRQ', 'ECROUTE', 'ECREFID', 'EPOCH', 'ECSTDY', 'ECENDY', 'SUBJID'], source: 'EX' },
  DV: { rules: DV_RULES, perm: ['DVREFID', 'DVCAT', 'DVSCAT', 'EPOCH', 'DVSTDTC', 'DVSTDY', 'SUBJID'], source: 'DVL' },
  CO: { rules: CO_RULES, perm: ['RDOMAIN', 'COREF', 'COVAL1', 'CODTC', 'CODY'] },
  XE: { rules: XE_RULES, perm: ['XECAT', 'XESCAT', 'XEDUR', 'VISITNUM', 'VISIT', 'EPOCH', 'XESTDY', 'SUBJID'], source: 'EDU' },
}
export const REF_DOMAINS = Object.keys(REF)
// Relationships: the medication given for an adverse event (CMAENO is the AE number), and the
// lab result behind an abnormal-lab adverse event (AELBACC is the sample's accession number).
export const REF_RELREC: RelDef[] = [
  { id: 'AECM', label: 'Adverse event and the medication given for it', a: { domain: 'AE', key: 'AESPID' }, b: { domain: 'CM', key: 'CMAENO' } },
  { id: 'AELB', label: 'Abnormal-lab adverse event and the ALT result behind it', a: { domain: 'AE', key: 'AELBACC' }, b: { domain: 'LB', key: 'LBREFID', filter: "LBTESTCD = 'ALT'" } },
]
// The raw form a domain is mapped from when it is not the form of the same name.
export const DEFAULT_SOURCE: Record<string, string> = { LB: 'LBC', EC: 'EX', DV: 'DVL', XE: 'EDU' }
export function referenceSpec(domain: string, ver: Version): DomainSpec {
  const r = REF[domain]; if (!r) throw new Error(`No reference mapping for ${domain}`)
  const vars = varsOf(domain, ver).filter((m) => (m.core !== 'Perm' || r.perm.includes(m.name)) && r.rules[m.name]).map((m) => m.name)
  const pick = (rules: Record<string, Rule>) => Object.fromEntries(vars.filter((v) => rules[v]).map((v) => [v, rules[v]]))
  return {
    domain, source: r.source ?? domain, vars, rules: pick(r.rules), sort: SORT[domain],
    ...(r.transpose ? { transpose: r.transpose } : {}), ...(r.filter ? { filter: r.filter } : {}),
    ...(r.parts ? { parts: r.parts.map((p) => ({ ...p, rules: pick(p.rules) })) } : {}), ...(r.supp ? { supp: r.supp } : {}),
  }
}

const dmCaches: Partial<Record<Transfer, Map<string, OutRow>>> = {}
export function refDm(t: Transfer = 1): Map<string, OutRow> {
  if (dmCaches[t]) return dmCaches[t]!
  const b = build(referenceSpec('DM', '3.4'), { forms: raw(t).forms, studyId: STUDY.id })
  return (dmCaches[t] = new Map(b.rows.map((r) => [r.__subj, r])))
}
export const studyData = (t: Transfer = 1): StudyData => ({ forms: raw(t).forms, studyId: STUDY.id, refDm: refDm(t) })
