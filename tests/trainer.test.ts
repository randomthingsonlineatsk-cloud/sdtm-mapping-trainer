import { describe, expect, test } from 'vitest'
import { build, studyDay, cmpDtc, type DomainSpec } from '../src/domain/engine'
import { referenceSpec, studyData } from '../src/domain/reference'
import { createProject } from '../src/domain/project'
import { evaluateMission, finishMission, startMission } from '../src/domain/missions'
import { check, isIso8601 } from '../src/domain/conformance'
import { varsOf, CT } from '../src/domain/standards'
import { raw, PLANTED } from '../src/domain/seed'
import { TOPICS } from '../src/domain/learn'
import { importCdmProject } from '../src/domain/cdmImport'
import { exportFile, importFile } from '../src/domain/store'

const ref = (d: 'DM' | 'VS', v: '3.4' | '4.0d' = '3.4') => build(referenceSpec(d, v), studyData())
const rowOf = (d: ReturnType<typeof ref>, subj: string) => d.rows.find((r) => r.__subj === subj)!

describe('raw data', () => {
  test('90 screened, 9 screen failures, every planted case present', () => {
    const r = raw()
    expect(r.subjects).toHaveLength(90)
    expect(r.subjects.filter((s) => s.fate === 'screen-fail')).toHaveLength(9)
    expect(r.forms.IRT).toHaveLength(81)
    expect(r.forms.IRT.find((x) => x.SUBJID === PLANTED.wrongKit)!.KITARM).not.toBe(r.forms.IRT.find((x) => x.SUBJID === PLANTED.wrongKit)!.RANDARM)
    expect(r.forms.VS.filter((x) => x.SITEID === '101').every((x) => !x.WEIGHT || x.WEIGHTU === 'lb')).toBe(true)
  })
})

describe('engine and reference DM', () => {
  const dm = ref('DM')
  test('DM edge cases follow the conventions', () => {
    expect(dm.rows).toHaveLength(90)
    expect(rowOf(dm, '101-004')).toMatchObject({ ARMCD: '', ACTARMCD: '', ARMNRS: 'SCREEN FAILURE', RFSTDTC: '' })
    expect(rowOf(dm, PLANTED.notDosed)).toMatchObject({ ARMCD: 'GLV5', ACTARMCD: '', ARMNRS: 'ASSIGNED, NOT TREATED' })
    expect(rowOf(dm, PLANTED.wrongKit)).toMatchObject({ ARMCD: 'GLV10', ACTARMCD: 'GLV5', ARMNRS: '' })
    expect(rowOf(dm, PLANTED.death)).toMatchObject({ DTHFL: 'Y', DTHDTC: rowOf(dm, PLANTED.death).RFPENDTC })
    expect(rowOf(dm, PLANTED.multiRace).RACE).toBe('MULTIPLE')
    expect(rowOf(dm, '101-003').RFSTDTC).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(dm.rows.every((r) => r.DTHFL === '' || r.DTHFL === 'Y')).toBe(true)
  })
  test('study day has no day 0; ISO comparisons to the minute', () => {
    expect(studyDay('2026-02-06', '2026-02-07T10:35')).toBe(-1)
    expect(studyDay('2026-02-07', '2026-02-07T10:35')).toBe(1)
    expect(studyDay('2026-03', '2026-02-07')).toBe('')
    expect(cmpDtc('2026-03-02T11:23', '2026-03-02T10:58')).toBe(1)
    expect(cmpDtc('2026-03-02', '2026-03-02T10:58')).toBe(0)
  })
})

describe('reference VS', () => {
  const vs = ref('VS')
  const recs = (subj: string, test: string) => vs.rows.filter((r) => r.__subj === subj && r.VSTESTCD === test)
  test('pounds become kilograms; inches become centimetres', () => {
    const w = recs('101-003', 'WEIGHT')[0]
    expect(w.VSORRESU).toBe('LB'); expect(w.VSSTRESU).toBe('kg')
    expect(Number(w.VSSTRESN)).toBeCloseTo(Math.round(Number(w.VSORRES) * 0.45359237 * 10) / 10, 5)
    expect(recs('101-003', 'HEIGHT')[0].VSSTRESU).toBe('cm')
  })
  test('baseline flag: vitals after the dose and not-done vitals stay on screening', () => {
    for (const s of [PLANTED.afterDoseVitals, PLANTED.day1NotDone]) {
      const flagged = recs(s, 'SYSBP').filter((r) => r.VSLOBXFL === 'Y')
      expect(flagged).toHaveLength(1); expect(flagged[0].VISIT).toBe('SCREENING')
    }
    expect(recs('101-003', 'SYSBP').find((r) => r.VSLOBXFL === 'Y')!.VISIT).toBe('DAY 1')
  })
  test('not done: one record per planned test, no results', () => {
    const nd = vs.rows.filter((r) => r.__subj === PLANTED.day1NotDone && r.VSSTAT === 'NOT DONE')
    expect(nd.map((r) => r.VSTESTCD).sort()).toEqual(['DIABP', 'PULSE', 'SYSBP', 'TEMP', 'WEIGHT'])
    expect(nd.every((r) => r.VSORRES === '' && r.VSREASND !== '')).toBe(true)
  })
  test('unscheduled visits and a missing temperature', () => {
    expect(recs('104-011', 'SYSBP').map((r) => r.VISITNUM).filter((n) => n.includes('.'))).toEqual(['4.01', '5.01', '5.02'])
    expect(recs(PLANTED.missingTemp, 'TEMP').some((r) => r.VISIT === 'SCREENING')).toBe(false)
  })
  test('epoch: Day 1 pre-dose vitals are SCREENING', () => {
    expect(recs('101-003', 'SYSBP').find((r) => r.VISIT === 'DAY 1')!.EPOCH).toBe('SCREENING')
    expect(recs(PLANTED.afterDoseVitals, 'SYSBP').find((r) => r.VISIT === 'DAY 1')!.EPOCH).toBe('TREATMENT')
  })
})

describe('missions and checks', () => {
  test('the reference scores 100 in both standards, with no findings', () => {
    for (const v of ['3.4', '4.0d'] as const) for (const [id, d] of [['S1', 'DM'], ['S2', 'VS']] as const) {
      const p = createProject('u', 'c', v); p.specs[d] = referenceSpec(d, v)
      const r = evaluateMission(p, id)
      expect(r.score, `${v} ${id}`).toBe(100); expect(r.passed).toBe(true); expect(r.domains[0].findings).toHaveLength(0)
    }
  })
  test('a partial DM loses credit, and the arm rule is enforced', () => {
    const p = createProject()
    const s = referenceSpec('DM', '3.4')
    s.rules.ARMNRS = { kind: 'const', value: '' }
    s.rules.SEX = { kind: 'copy', field: 'SEX' } // labels, not CT
    p.specs.DM = s
    startMission(p, 'S1'); const run = finishMission(p, 'S1')
    expect(run.score).toBeLessThan(100)
    expect(run.perVar!.find((x) => x.v === 'SEX')!.credit).toBe(0)
    const f = check(build(s, studyData()), '3.4')
    expect(f.some((x) => x.rule === 'TRN-012')).toBe(true)
    expect(f.some((x) => x.rule === 'TRN-004' && x.variable === 'SEX')).toBe(true)
  })
  test('a VS without required variables is blocked', () => {
    const p = createProject(); const s: DomainSpec = { ...referenceSpec('VS', '3.4') }
    s.vars = s.vars.filter((v) => v !== 'VSTEST'); p.specs.VS = s
    const r = evaluateMission(p, 'S2')
    expect(r.passed).toBe(false); expect(r.domains[0].findings.some((x) => x.rule === 'TRN-001')).toBe(true)
  })
  test('ISO 8601 checker', () => {
    expect(['2026', '2026-03', '2026-03-10', '2026-03-10T09:00', '2026-03-10T09:00:15'].every(isIso8601)).toBe(true)
    expect(['2026-3-10', '2026-03-UN', '10/03/2026', '2026-03-10T9:00', '2026-13'].some(isIso8601)).toBe(false)
  })
})

describe('standards, learn, files', () => {
  test('v4.0 draft: SUBJID in VS, no VSBLFL, CRACE and CETHNIC in DM', () => {
    expect(varsOf('VS', '3.4').some((v) => v.name === 'VSBLFL')).toBe(true)
    expect(varsOf('VS', '4.0d').some((v) => v.name === 'VSBLFL')).toBe(false)
    expect(varsOf('VS', '4.0d').map((v) => v.name).slice(0, 4)).toEqual(['STUDYID', 'DOMAIN', 'USUBJID', 'SUBJID'])
    expect(varsOf('DM', '4.0d').some((v) => v.name === 'CRACE')).toBe(true)
    expect(varsOf('DM', '3.4').some((v) => v.name === 'CRACE')).toBe(false)
  })
  test('every codelist a variable names exists; quiz answers are valid', () => {
    for (const d of ['DM', 'SV', 'VS', 'EX', 'AE', 'CM', 'DS']) for (const v of varsOf(d, '3.4')) if (v.ct) expect(CT[v.ct], `${d}.${v.name} ${v.ct}`).toBeTruthy()
    for (const t of TOPICS) for (const q of t.quiz) expect(q.answer).toBeLessThan(q.options.length)
  })
  test('CDM Console import turns forms and items into raw rows', () => {
    const file = { format: 'cdm-query-console-project', project: { study: 'HLV-204-201', name: 'demo', forms: { '101-001|SCR|DM|1': {}, '101-001|SCR|SV|1': {}, '101-001|LOG|AE|2': { deleted: true } }, items: { '101-001|SCR|DM|1|SEX': { versions: [{ value: 'M' }, { value: 'F' }] }, '101-001|SCR|SV|1|VISDAT': { versions: [{ value: '2026-03-02' }] } } } }
    const im = importCdmProject(JSON.stringify(file))
    expect(im.forms.DM[0]).toMatchObject({ SUBJID: '101-001', SITEID: '101', VISIT: 'SCR', SEX: 'F' })
    expect(im.forms.AE).toBeUndefined()
    expect(() => importCdmProject('{"format":"other"}')).toThrow(/not a CDM/)
  })
  test('project files round-trip and detect edits', () => {
    const p = createProject(); p.specs.DM = referenceSpec('DM', '3.4')
    const text = exportFile(p)
    expect(importFile(text).project.specs.DM.vars).toEqual(p.specs.DM.vars)
    const tampered = JSON.parse(text); tampered.project.name = 'changed'
    expect(importFile(JSON.stringify(tampered)).warnings[0]).toMatch(/checksum/)
  })
})
