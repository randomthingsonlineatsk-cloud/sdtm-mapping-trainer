// The hidden reference mappings for GLV-12-301, written to the study's SDTM conventions
// (study.ts). Missions compare the learner's datasets with these, record by record. They are
// also how the study functions get the reference DM (reference dates for study day and epoch).

import { build, type DomainSpec, type OutRow, type StudyData, type Rule } from './engine'
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
export const SORT: Record<string, string[]> = { DM: ['USUBJID'], VS: ['USUBJID', 'VSTESTCD', 'VISITNUM', 'VSDTC'] }

// Which IG variables the reference includes: every Required and Expected variable, plus the
// permissible ones the study collects.
const PERM_USED: Record<string, string[]> = { DM: ['BRTHDTC', 'ETHNIC', 'DMDTC', 'DMDY'], VS: ['VSPOS', 'VSSTAT', 'VSREASND', 'VISIT', 'EPOCH', 'VSDY', 'SUBJID'] }
export function referenceSpec(domain: 'DM' | 'VS', ver: Version): DomainSpec {
  const rules = domain === 'DM' ? DM_RULES : VS_RULES
  const vars = varsOf(domain, ver).filter((m) => (m.core !== 'Perm' || PERM_USED[domain].includes(m.name)) && rules[m.name]).map((m) => m.name)
  return { domain, source: domain, vars, rules: Object.fromEntries(vars.map((v) => [v, rules[v]])), sort: SORT[domain], ...(domain === 'VS' ? { transpose: VS_TRANSPOSE } : {}) }
}

let dmCache: Map<string, OutRow> | null = null
export function refDm(): Map<string, OutRow> {
  if (dmCache) return dmCache
  const b = build(referenceSpec('DM', '3.4'), { forms: raw().forms, studyId: STUDY.id })
  return (dmCache = new Map(b.rows.map((r) => [r.__subj, r])))
}
export const studyData = (): StudyData => ({ forms: raw().forms, studyId: STUDY.id, refDm: refDm() })
