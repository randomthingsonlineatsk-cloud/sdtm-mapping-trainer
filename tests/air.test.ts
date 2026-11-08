// Phase 5c: the asthma study AIR-09-202 (RE from a spirometry vendor, QS, inhaled EX).
import { describe, expect, test } from 'vitest'
import { build } from '../src/domain/engine'
import { check, RULE_SETS } from '../src/domain/conformance'
import { airData, airRaw, airReferenceSpec, AIR_PLANTED, AIR_DOMAINS } from '../src/domain/air'
import { createProject, dataFor, packOf } from '../src/domain/project'
import { evaluateMission, missionsFor, startMission } from '../src/domain/missions'

const data = airData()
const ref = Object.fromEntries(AIR_DOMAINS.map((d) => [d, build(airReferenceSpec(d, '3.4'), data)]))
const rows = (d: string) => ref[d].rows

describe('AIR-09-202', () => {
  test('raw data: planted issues present', () => {
    airRaw()
    expect(Object.values(AIR_PLANTED).length).toBe(3); expect(Object.values(AIR_PLANTED).every(Boolean)).toBe(true)
  })
  test('the reference mapping builds cleanly with no findings under every rule set', () => {
    for (const d of AIR_DOMAINS) expect(ref[d].errors, d).toEqual({})
    for (const rs of RULE_SETS) for (const d of AIR_DOMAINS) expect(check(ref[d], '3.4', { dm: d === 'DM' ? undefined : ref.DM, set: rs.id }), `${rs.id} ${d}`).toEqual([])
  })
  test('RE: the BEST row only, four tests, NOT DONE kept, one baseline per test', () => {
    const re = rows('RE')
    expect(new Set(re.map((r) => r.RETESTCD))).toEqual(new Set(['FEV1', 'FVC', 'FEV1FVC', 'FEV1PP']))
    expect(re.every((r) => !String(r.__trace).includes('TRIAL'))).toBe(true)
    const keys = new Set(re.map((r) => `${r.USUBJID}|${r.RETESTCD}|${r.VISITNUM}|${r.RETPTNUM}`)); expect(keys.size).toBe(re.length)
    const nd = re.filter((r) => r.RESTAT === 'NOT DONE'); expect(nd.length).toBe(4)
    expect(nd.every((r) => r.USUBJID.endsWith(AIR_PLANTED.noAcceptable!) && r.REREASND)).toBe(true)
    const bl = re.filter((r) => r.RELOBXFL === 'Y'); expect(new Set(bl.map((r) => `${r.USUBJID}|${r.RETESTCD}`)).size).toBe(bl.length)
    expect(bl.every((r) => r.RETPT !== 'POST-BRONCHODILATOR')).toBe(true)
  })
  test('QS: no record for the unanswered item, a total only when all five are answered', () => {
    const qs = rows('QS'), tot = qs.filter((r) => r.QSTESTCD === 'ASDSTOT')
    expect(tot.every((r) => r.QSDRVFL === 'Y' && !r.QSORRES)).toBe(true)
    const visits = new Map<string, number>()
    for (const r of qs.filter((r) => r.QSTESTCD !== 'ASDSTOT')) visits.set(`${r.USUBJID}|${r.VISITNUM}`, (visits.get(`${r.USUBJID}|${r.VISITNUM}`) ?? 0) + 1)
    for (const t of tot) expect(visits.get(`${t.USUBJID}|${t.VISITNUM}`)).toBe(5)
    expect([...visits].some(([k, n]) => k.includes(AIR_PLANTED.missingItem!) && n === 4)).toBe(true)
    expect(tot.length).toBe([...visits.values()].filter((n) => n === 5).length)
    for (const t of tot) expect(Number(t.QSSTRESN)).toBe(qs.filter((r) => r.USUBJID === t.USUBJID && r.VISITNUM === t.VISITNUM && r.QSTESTCD !== 'ASDSTOT').reduce((a, r) => a + Number(r.QSSTRESN), 0))
  })
  test('EX: inhaled, ug, placebo 0; the screen failure has none', () => {
    const ex = rows('EX')
    expect(ex.every((r) => r.EXROUTE === 'RESPIRATORY (INHALATION)' && r.EXDOSU === 'ug' && (r.EXTRT === 'PLACEBO') === (r.EXDOSE === '0'))).toBe(true)
    expect(ex.some((r) => r.USUBJID.endsWith(AIR_PLANTED.reversibilityFail!))).toBe(false)
  })
  test('AIR projects: missions S27 and S28 score 100 with the reference', () => {
    for (const v of ['3.4', '4.0d'] as const) for (const rs of RULE_SETS) {
      const p = createProject('u', 'none', v, 'AIR-09-202'); p.ruleSet = rs.id
      expect(packOf(p)?.id).toBe('AIR-09-202'); expect(dataFor(p).studyId).toBe('AIR-09-202')
      expect(missionsFor(p).map((m) => m.id)).toEqual(['S27', 'S28'])
      for (const d of AIR_DOMAINS) p.specs[d] = airReferenceSpec(d, v)
      for (const m of ['S27', 'S28']) {
        startMission(p, m)
        const r = evaluateMission(p, m)
        expect(r.score, `${v} ${rs.id} ${m}: ${r.detail.join(' | ')}`).toBe(100); expect(r.passed).toBe(true)
      }
    }
  })
})
