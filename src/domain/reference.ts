// The hidden reference mappings for GLV-12-301, written to the study's SDTM conventions
// (study.ts). Missions compare the learner's datasets with these, record by record. They are
// also how the study functions get the reference DM (reference dates for study day and epoch).

import { build, type DomainSpec, type OutRow, type StudyData, type Rule, type Part, type SuppQual } from './engine'
import { varsOf, type Version } from './standards'
import { raw } from './seed'
import { STUDY } from './study'

const e = (expr: string): Rule => ({ kind: 'expr', expr })
const c = (value: string): Rule => ({ kind: 'const', value })
const cp = (field: string): Rule => ({ kind: 'copy', field })
const FIRST_DOSE = "iso(subj('EX', 'EXSTDAT', 'min'), subj('EX', 'EXSTTIM', 'first'))"
const LAST_DOSE = "subj('EX', 'EXENDAT', 'max')"

const DM_RULES: Record<string, Rule> = {
  STUDYID: c(STUDY.id), DOMAIN: c('DM'), USUBJID: e(`concat('${STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID'),
  RFSTDTC: e(FIRST_DOSE), RFENDTC: e(LAST_DOSE), RFXSTDTC: e(FIRST_DOSE), RFXENDTC: e(LAST_DOSE),
  RFICDTC: e("subj('IC', 'DSSTDAT', 'first')"), RFPENDTC: e("max(subj('SV', 'VISDAT', 'max'), subj('DS', 'DSSTDAT', 'max'))"),
  DTHDTC: e("subjwhere('DS', 'DSSTDAT', 'DSDECOD', 'Death', 'first')"), DTHFL: e("if(present(DTHDTC), 'Y', '')"),
  SITEID: cp('SITEID'), BRTHDTC: cp('BRTHDAT'), AGE: e("age(BRTHDAT, subj('IC', 'DSSTDAT', 'first'))"), AGEU: c('YEARS'),
  SEX: { kind: 'recode', field: 'SEX', table: { Female: 'F', Male: 'M' } },
  RACE: e("if(contains(RACE, ';'), 'MULTIPLE', upper(RACE))"), ETHNIC: e('upper(ETHNIC)'),
  ARMCD: e("irt('RANDARM')"), ARM: e("armname(irt('RANDARM'))"), ACTARMCD: e("irt('KITARM')"), ACTARM: e("armname(irt('KITARM'))"),
  ARMNRS: e("if(isblank(irt('RANDARM')), 'SCREEN FAILURE', if(isblank(irt('KITARM')), 'ASSIGNED, NOT TREATED', ''))"), ACTARMUD: c(''),
  COUNTRY: e('country(SITEID)'), DMDTC: e('iso(DMDAT)'), DMDY: e('studyday(DMDTC, RFSTDTC)'),
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
  VSDTC: e('iso(VSDAT, VSTIM)'), VSDY: e('studyday(VSDTC)'),
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
  EPOCH: e('epoch(AESTDTC)'), AESTDTC: cp('AESTDAT'), AEENDTC: cp('AEENDAT'), AESTDY: e('studyday(AESTDTC)'), AEENDY: e('studyday(AEENDTC)'),
}
export const AETRTEM: SuppQual = { qnam: 'AETRTEM', qlabel: 'Treatment Emergent Flag', qorig: 'Derived', expr: "if(isblank(dm('RFXSTDTC')) or isblank(studyday(AESTDTC, dm('RFXSTDTC'))), '', if(studyday(AESTDTC, dm('RFXSTDTC')) >= 1, 'Y', 'N'))" }
const CM_RULES: Record<string, Rule> = {
  STUDYID: c(STUDY.id), DOMAIN: c('CM'), USUBJID: e(`concat('${STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID'), CMSEQ: { kind: 'seq' }, CMSPID: cp('CMSPID'),
  CMTRT: cp('CMTRT'), CMDECOD: cp('CMDECOD'), CMINDC: cp('CMINDC'), CMCLAS: cp('CMCLAS'), CMDOSE: e('num(CMDOSE)'), CMDOSU: cp('CMDOSU'), CMDOSFRQ: cp('CMDOSFRQ'), CMROUTE: e('upper(CMROUTE)'),
  EPOCH: e('epoch(CMSTDTC)'), CMSTDTC: cp('CMSTDAT'), CMENDTC: cp('CMENDAT'), CMSTDY: e('studyday(CMSTDTC)'), CMENDY: e('studyday(CMENDTC)'),
  CMENRTPT: e("if(CMONGO = 'Y', 'ONGOING', '')"), CMENTPT: e("if(CMONGO = 'Y', 'END OF STUDY', '')"),
}
const EX_RULES: Record<string, Rule> = {
  STUDYID: c(STUDY.id), DOMAIN: c('EX'), USUBJID: e(`concat('${STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID'), EXSEQ: { kind: 'seq' },
  EXTRT: e("if(irt('KITARM') = 'PBO', 'PLACEBO', 'GLV-12')"), EXDOSE: e("if(irt('KITARM') = 'GLV10', 10, if(irt('KITARM') = 'GLV5', 5, 0))"),
  EXDOSU: c('mg'), EXDOSFRM: c('TABLET'), EXDOSFRQ: c('QD'), EXROUTE: c('ORAL'),
  EPOCH: e('epoch(EXSTDTC)'), EXSTDTC: e('iso(EXSTDAT, EXSTTIM)'), EXENDTC: cp('EXENDAT'), EXSTDY: e('studyday(EXSTDTC)'), EXENDY: e('studyday(EXENDTC)'),
}
const DS_COMMON: Record<string, Rule> = { STUDYID: c(STUDY.id), DOMAIN: c('DS'), USUBJID: e(`concat('${STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID'), DSSEQ: { kind: 'seq' }, DSSTDY: e('studyday(DSSTDTC)') }
const DS_RULES: Record<string, Rule> = { ...DS_COMMON, DSTERM: e('coalesce(DSTERM, upper(DSDECOD))'), DSDECOD: e('upper(DSDECOD)'), DSCAT: c('DISPOSITION EVENT'), EPOCH: e('epoch(DSSTDTC)'), DSSTDTC: cp('DSSTDAT') }
const DS_IC: Record<string, Rule> = { ...DS_COMMON, DSTERM: c('INFORMED CONSENT OBTAINED'), DSDECOD: c('INFORMED CONSENT OBTAINED'), DSCAT: c('PROTOCOL MILESTONE'), EPOCH: c('SCREENING'), DSSTDTC: cp('DSSTDAT') }
const DS_IRT: Record<string, Rule> = { ...DS_COMMON, DSTERM: c('RANDOMIZED'), DSDECOD: c('RANDOMIZED'), DSCAT: c('PROTOCOL MILESTONE'), EPOCH: c('SCREENING'), DSSTDTC: cp('RANDDT') }
const SI = (x: string) => `round(num(${x}) * lab(TESTCODE, 'factor'), lab(TESTCODE, 'decimals'))`
const LB_RULES: Record<string, Rule> = {
  STUDYID: c(STUDY.id), DOMAIN: c('LB'), USUBJID: e(`concat('${STUDY.id}-', SUBJID)`), SUBJID: cp('SUBJID'), LBSEQ: { kind: 'seq' }, LBREFID: cp('ACCSNUM'),
  LBTESTCD: e("lab(TESTCODE, 'testcd')"), LBTEST: e("ctdecode('LBTESTCD', LBTESTCD)"), LBCAT: c('CHEMISTRY'),
  LBORRES: cp('RESULT'), LBORRESU: e("if(present(RESULT), replace(UNITS, 'mg/dl', 'mg/dL'), '')"), LBORNRLO: cp('REFLOW'), LBORNRHI: cp('REFHIGH'),
  LBSTRESC: e(`if(isblank(RESULT), '', if(substr(RESULT, 1, 1) = '<', RESULT, str(${SI('RESULT')})))`), LBSTRESN: e('num(LBSTRESC)'),
  LBSTRESU: e("if(present(RESULT), lab(TESTCODE, 'stdunit'), '')"), LBSTNRLO: e(SI('REFLOW')), LBSTNRHI: e(SI('REFHIGH')),
  LBNRIND: e("if(isblank(RESULT), '', if(FLAG = 'H', 'HIGH', if(FLAG = 'L', 'LOW', 'NORMAL')))"),
  LBSTAT: e("if(isblank(RESULT), 'NOT DONE', '')"), LBREASND: e("if(isblank(RESULT), 'SPECIMEN HEMOLYZED', '')"),
  LBNAM: cp('LABNAME'), LBSPEC: e("lab(TESTCODE, 'spec')"), LBLOBXFL: { kind: 'lobxfl', result: 'LBSTRESC', dtc: 'LBDTC', by: 'LBTESTCD' }, LBFAST: cp('FASTING'),
  VISITNUM: e('visitnum(VISIT, COLLDATE)'), VISIT: e('visitname(VISIT, COLLDATE)'), EPOCH: e('epoch(LBDTC)'), LBDTC: e('iso(COLLDATE, COLLTIME)'), LBDY: e('studyday(LBDTC)'),
}
const SV_RULES: Record<string, Rule> = {
  STUDYID: c(STUDY.id), DOMAIN: c('SV'), USUBJID: e(`concat('${STUDY.id}-', SUBJID)`), VISITNUM: e('visitnum(VISIT, VISDAT)'), VISIT: e('visitname(VISIT, VISDAT)'), VISITDY: e('visitdy(VISIT)'),
  EPOCH: e('epoch(SVSTDTC)'), SVSTDTC: e('iso(VISDAT)'), SVENDTC: e('iso(VISDAT)'), SVSTDY: e('studyday(SVSTDTC)'), SVENDY: e('studyday(SVENDTC)'),
}
export const SORT: Record<string, string[]> = {
  DM: ['USUBJID'], VS: ['USUBJID', 'VSTESTCD', 'VISITNUM', 'VSDTC'], AE: ['USUBJID', 'AEDECOD', 'AESTDTC'], CM: ['USUBJID', 'CMTRT', 'CMSTDTC'],
  EX: ['USUBJID', 'EXSTDTC'], DS: ['USUBJID', 'DSSTDTC', 'DSCAT'], LB: ['USUBJID', 'LBTESTCD', 'VISITNUM', 'LBDTC'], SV: ['USUBJID', 'VISITNUM'],
}

// Which IG variables each reference includes: every Required and Expected variable, plus the
// permissible ones the study collects or derives.
const REF: Record<string, { rules: Record<string, Rule>; perm: string[]; transpose?: DomainSpec['transpose']; filter?: string; source?: string; parts?: Part[]; supp?: SuppQual[] }> = {
  DM: { rules: DM_RULES, perm: ['BRTHDTC', 'ETHNIC', 'DMDTC', 'DMDY'] },
  VS: { rules: VS_RULES, perm: ['VSPOS', 'VSSTAT', 'VSREASND', 'VISIT', 'EPOCH', 'VSDY', 'SUBJID'], transpose: VS_TRANSPOSE },
  AE: { rules: AE_RULES, perm: ['AESPID', 'AESEV', 'AEOUT', 'AESDTH', 'AESHOSP', 'EPOCH', 'AESTDY', 'AEENDY', 'SUBJID'], supp: [AETRTEM] },
  CM: { rules: CM_RULES, perm: ['CMSPID', 'CMDECOD', 'CMINDC', 'CMCLAS', 'CMDOSE', 'CMDOSU', 'CMDOSFRQ', 'CMROUTE', 'EPOCH', 'CMSTDTC', 'CMENDTC', 'CMSTDY', 'CMENDY', 'CMENRTPT', 'CMENTPT', 'SUBJID'] },
  EX: { rules: EX_RULES, perm: ['EXDOSFRQ', 'EXROUTE', 'EPOCH', 'EXSTDY', 'EXENDY', 'SUBJID'] },
  DS: { rules: DS_RULES, perm: ['EPOCH', 'DSSTDY', 'SUBJID'], parts: [{ source: 'IC', rules: DS_IC }, { source: 'IRT', rules: DS_IRT }] },
  LB: { rules: LB_RULES, perm: ['LBREFID', 'LBSTAT', 'LBREASND', 'LBNAM', 'LBSPEC', 'LBFAST', 'VISIT', 'EPOCH', 'LBDY', 'SUBJID'], source: 'LBC', filter: 'not isdup(ACCSNUM, TESTCODE)' },
  SV: { rules: SV_RULES, perm: ['VISIT', 'VISITDY', 'EPOCH', 'SVSTDY', 'SVENDY'] },
}
export const REF_DOMAINS = Object.keys(REF)
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

let dmCache: Map<string, OutRow> | null = null
export function refDm(): Map<string, OutRow> {
  if (dmCache) return dmCache
  const b = build(referenceSpec('DM', '3.4'), { forms: raw().forms, studyId: STUDY.id })
  return (dmCache = new Map(b.rows.map((r) => [r.__subj, r])))
}
export const studyData = (): StudyData => ({ forms: raw().forms, studyId: STUDY.id, refDm: refDm() })
