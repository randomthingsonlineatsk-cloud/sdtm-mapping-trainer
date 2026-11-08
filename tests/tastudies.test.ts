// Phase 6: the diabetes (INS-22-305), cardiovascular (CRD-31-401) and pain (PNR-18-203) studies.
import { describe, expect, test } from 'vitest'
import { build, type StudyData } from '../src/domain/engine'
import { check, RULE_SETS } from '../src/domain/conformance'
import { buildRelrec, checkRelrec } from '../src/domain/relrec'
import { insData, insReferenceSpec, INS_DOMAINS, INS_PLANTED, INS_RELREC } from '../src/domain/ins'
import { cvoData, cvoReferenceSpec, CVO_DOMAINS, CVO_PLANTED } from '../src/domain/cvo'
import { painData, painReferenceSpec, PAIN_DOMAINS, PAIN_PLANTED } from '../src/domain/pain'
import { createProject, dataFor, packOf } from '../src/domain/project'
import { evaluateMission, missionsFor, startMission } from '../src/domain/missions'
import type { DomainSpec } from '../src/domain/engine'
import type { Version } from '../src/domain/standards'

const make = (data: StudyData, spec: (d: string, v: Version) => DomainSpec, doms: string[]) => Object.fromEntries(doms.map((d) => [d, build(spec(d, '3.4'), data)]))
const ins = make(insData(), insReferenceSpec, INS_DOMAINS), cvo = make(cvoData(), cvoReferenceSpec, CVO_DOMAINS), pain = make(painData(), painReferenceSpec, PAIN_DOMAINS)
const of = (rows: Record<string, string>[], subj: string) => rows.filter((r) => r.USUBJID.endsWith(subj))

describe('the therapeutic-area studies', () => {
  test('every reference mapping builds cleanly with no findings under every rule set', () => {
    for (const [ref, doms] of [[ins, INS_DOMAINS], [cvo, CVO_DOMAINS], [pain, PAIN_DOMAINS]] as const) for (const d of doms) {
      expect(ref[d].errors, d).toEqual({})
      for (const rs of RULE_SETS) expect(check(ref[d], '3.4', { dm: d === 'DM' ? undefined : ref.DM, set: rs.id }), `${rs.id} ${d}`).toEqual([])
    }
    for (const pl of [INS_PLANTED, CVO_PLANTED, PAIN_PLANTED]) expect(Object.values(pl).every(Boolean)).toBe(true)
    expect(Object.keys(INS_PLANTED).length).toBe(4); expect(Object.keys(CVO_PLANTED).length).toBe(5); expect(Object.keys(PAIN_PLANTED).length).toBe(3)
  })
  test('INS: titration intervals, levels, meter glucose and the RELREC', () => {
    const ex = ins.EX.rows
    for (const s of new Set(ex.map((r) => r.USUBJID))) {
      const xs = ex.filter((r) => r.USUBJID === s)
      expect(xs[0].EXADJ).toBe(''); expect(xs.slice(1).every((r) => ['TITRATION', 'HYPOGLYCAEMIA'].includes(r.EXADJ))).toBe(true)
      for (let i = 1; i < xs.length; i++) expect(xs[i].EXSTDTC > xs[i - 1].EXENDTC).toBe(true)
    }
    expect(of(ex, INS_PLANTED.doseReduced!).some((r) => r.EXADJ === 'HYPOGLYCAEMIA')).toBe(true)
    expect(of(ins.CE.rows, INS_PLANTED.level3NoGlucose!).some((r) => r.CESCAT === 'LEVEL 3')).toBe(true)
    expect(of(ins.CE.rows, INS_PLANTED.notClassified!).some((r) => r.CESCAT === '')).toBe(true)
    expect(ins.LB.rows.every((r) => r.LBSPEC === 'CAPILLARY BLOOD' && !r.VISITNUM && !r.LBORNRLO && r.LBDTC.includes('T'))).toBe(true)
    const rel = buildRelrec(INS_RELREC, ins, insData())
    expect(checkRelrec(rel, ins)).toEqual([])
    expect(rel.rows.length).toBe(2 * ins.LB.rows.filter((r) => r.LBGRPID).length)
  })
  test('CVO: triplicates, derived means, the unreadable tracing and the committee', () => {
    const eg = cvo.EG.rows, mean = eg.filter((r) => r.EGDRVFL === 'Y')
    expect(mean.every((r) => !r.EGORRES && r.EGSTRESN && !r.EGSPID && r.EGTESTCD !== 'INTP')).toBe(true)
    expect(new Set(eg.filter((r) => r.EGLOBXFL === 'Y').map((r) => `${r.EGDRVFL} ${r.VISIT} ${r.EGTPT}`))).toEqual(new Set(['Y DAY 1 PRE-DOSE']))
    const grp = (r: Record<string, string>) => eg.filter((x) => x.USUBJID === r.USUBJID && x.EGGRPID === r.EGGRPID && x.EGTESTCD === r.EGTESTCD && x.EGDRVFL === '' && x.EGSTRESN)
    for (const m of mean.slice(0, 60)) { const xs = grp(m); expect(Number(m.EGSTRESN)).toBeCloseTo(xs.reduce((a, x) => a + Number(x.EGSTRESN), 0) / xs.length, 1) }
    const bad = of(eg, CVO_PLANTED.unreadable!).filter((r) => r.EGSTAT === 'NOT DONE'); expect(bad.length).toBe(6); expect(bad[0].EGREASND).toBeTruthy()
    expect(of(eg, CVO_PLANTED.prolonged!).some((r) => r.EGTESTCD === 'INTP' && r.EGSTRESC.includes('CLINICALLY SIGNIFICANT'))).toBe(true)
    expect(of(cvo.FA.rows, CVO_PLANTED.pending!).length).toBe(0); expect(of(cvo.CE.rows, CVO_PLANTED.pending!).length).toBe(1)
    expect(cvo.FA.rows.every((r) => r.FAEVAL === 'ADJUDICATION COMMITTEE' && cvo.CE.rows.some((c) => c.USUBJID === r.USUBJID && c.CETERM === r.FAOBJ && c.CELNKID === r.FALNKID))).toBe(true)
    const dead = of(cvo.DM.rows, CVO_PLANTED.death!)[0]; expect(dead.DTHFL).toBe('Y'); expect(dead.RFPENDTC).toBe(dead.DTHDTC); expect(dead.RFENDTC < dead.DTHDTC).toBe(true)
  })
  test('PAIN: daily ratings with a recall period, missed days, rescue over the limit', () => {
    const qs = pain.QS.rows
    expect(qs.every((r) => r.QSEVLINT === '-P1D' && !r.VISITNUM)).toBe(true)
    const bl = qs.filter((r) => r.QSLOBXFL === 'Y'); expect(bl.length).toBe(2 * 30); expect(bl.every((r) => r.QSDY.startsWith('-'))).toBe(true)
    expect(Number(of(pain.CM.rows, PAIN_PLANTED.overLimit!).find((r) => r.CMSTDY === '15')!.CMDOSTOT)).toBe(5000)
    expect(pain.CM.rows.every((r) => Number(r.CMDOSTOT) > 0 && r.CMCAT === 'RESCUE MEDICATION')).toBe(true)
    expect(of(qs, PAIN_PLANTED.screenFail!).length).toBeGreaterThan(0)
  })
  test('missions S34 to S39 score 100 with the reference in both versions and every rule set', () => {
    const cases: [string, string[], (d: string, v: Version) => DomainSpec, string[], unknown?][] = [
      ['INS-22-305', ['S34', 'S35'], insReferenceSpec, INS_DOMAINS, INS_RELREC], ['CRD-31-401', ['S36', 'S37'], cvoReferenceSpec, CVO_DOMAINS], ['PNR-18-203', ['S38', 'S39'], painReferenceSpec, PAIN_DOMAINS]]
    for (const [study, ms, spec, doms, rel] of cases) for (const v of ['3.4', '4.0d'] as const) for (const rs of RULE_SETS) {
      const p = createProject('u', 'none', v, study); p.ruleSet = rs.id
      expect(packOf(p)?.id).toBe(study); expect(dataFor(p).studyId).toBe(study); expect(missionsFor(p).map((m) => m.id)).toEqual(ms)
      for (const d of doms) p.specs[d] = spec(d, v)
      if (rel) p.relrec = structuredClone(rel) as typeof p.relrec
      for (const m of ms) { startMission(p, m); const r = evaluateMission(p, m); expect(r.score, `${study} ${v} ${rs.id} ${m}: ${r.detail.join(' | ')}`).toBe(100) }
    }
  })
})
