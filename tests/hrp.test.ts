// The Ostrevia trial HRP-301 (VERDANT-1): the CDM Console's locked database mapped to SDTM.
import { describe, expect, test } from 'vitest'
import locked from '../src/data/hrp301.json'
import { build } from '../src/domain/engine'
import { check, RULE_SETS } from '../src/domain/conformance'
import { hrpData, hrpReferenceSpec, HRP_DOMAINS, hrpShippedForms } from '../src/domain/hrp'

const data = hrpData()
const ref = Object.fromEntries(HRP_DOMAINS.map((d) => [d, build(hrpReferenceSpec(d, '3.4'), data)]))

describe('HRP-301 from the CDM Console', () => {
  test('the shipped data are the console’s locked database with coded terms', () => {
    const f = locked as { protocol: string; lock: string }
    expect(f.protocol).toBe('HRP-301'); expect(f.lock).toBe('hard')
    const forms = hrpShippedForms()
    expect(new Set(forms.DM.map((r) => r.SUBJID)).size).toBe(48)
    expect(forms.AE.every((r) => r.AEDECOD && r.AESOC && r.AELLTCD)).toBe(true)
    expect(forms.CM.every((r) => r.CMDECOD && r.CMCLAS)).toBe(true)
  })
  test('every reference mapping builds cleanly with no findings under every rule set', () => {
    for (const d of HRP_DOMAINS) {
      expect(ref[d].errors, d).toEqual({})
      expect(ref[d].rows.length, d).toBeGreaterThan(0)
      for (const rs of RULE_SETS) expect(check(ref[d], '3.4', { dm: d === 'DM' ? undefined : ref.DM, set: rs.id }).map((x) => `${x.rule} ${x.variable}: ${x.msg}`), `${rs.id} ${d}`).toEqual([])
    }
  })
  test('DM: 45 randomised across three arms, 3 screen failures; EX one record per bottle', () => {
    const dm = ref.DM.rows
    expect(dm).toHaveLength(48)
    expect(dm.filter((r) => r.ARMNRS === 'SCREEN FAILURE')).toHaveLength(3)
    expect(new Set(dm.filter((r) => r.ARMCD).map((r) => r.ARMCD))).toEqual(new Set(['HRP10', 'HRP25', 'PBO']))
    const ex = ref.EX.rows
    expect(ex.every((r) => r.EXENDTC >= r.EXSTDTC && ['0', '10', '25'].includes(r.EXDOSE))).toBe(true)
    const full = dm.find((r) => r.USUBJID === 'HRP-301-301-001')!
    expect(ex.filter((r) => r.USUBJID === full.USUBJID)).toHaveLength(4)
  })
  test('QS: three scales per visit, baseline on Day 1; LB from the central laboratory without HBV DNA', () => {
    const qs = ref.QS.rows
    expect(new Set(qs.map((r) => r.QSTESTCD))).toEqual(new Set(['IGACHE01', 'HECSI01', 'ITCH01']))
    const bl = qs.filter((r) => r.QSLOBXFL === 'Y')
    expect(bl.every((r) => r.VISIT === 'DAY 1')).toBe(true)
    expect(qs.filter((r) => r.QSTESTCD === 'ITCH01').every((r) => r.QSEVLINT === '-P1D' && !r.QSEVAL)).toBe(true)
    const lb = ref.LB.rows
    expect(new Set(lb.map((r) => r.LBTESTCD))).toEqual(new Set(['ALT', 'AST', 'NEUT', 'LYMPH']))
    expect(lb.some((r) => r.USUBJID === 'HRP-301-303-008' && r.LBTESTCD === 'ALT' && r.LBNRIND === 'HIGH')).toBe(true)
  })
})

describe('HRP-301 missions and the learner’s own locked file', () => {
  test('S45 to S47 score 100 with the reference in both versions and every rule set', async () => {
    const { createProject, dataFor, packOf } = await import('../src/domain/project')
    const { evaluateMission, missionsFor, startMission } = await import('../src/domain/missions')
    for (const v of ['3.4', '4.0d'] as const) for (const rs of RULE_SETS) {
      const p = createProject('u', 'none', v, 'HRP-301'); p.ruleSet = rs.id
      expect(packOf(p)?.id).toBe('HRP-301'); expect(dataFor(p).studyId).toBe('HRP-301')
      expect(missionsFor(p).filter((m) => m.kind === 'map').map((m) => m.id)).toEqual(['S45', 'S46', 'S47'])
      for (const d of HRP_DOMAINS) p.specs[d] = hrpReferenceSpec(d, v)
      for (const m of ['S45', 'S46', 'S47']) { startMission(p, m); const r = evaluateMission(p, m); expect(r.score, `${v} ${rs.id} ${m}: ${r.detail.join(' | ')}`).toBe(100) }
    }
  })
  test('a project on the learner’s own locked console file uses that file’s data', async () => {
    const { createProject, dataFor } = await import('../src/domain/project')
    const forms = structuredClone(hrpShippedForms())
    forms.HEA = forms.HEA.map((r) => (r.SUBJID === '301-001' && r.VISIT === 'W16' ? { ...r, HECSI: '7' } : r))
    const p = createProject('u', 'none', '3.4', 'HRP-301')
    p.cdm = { source: 'my file', importedUtc: '2026-11-09T00:00:00Z', exportedUtc: '', lock: 'hard', forms }
    const qs = build(hrpReferenceSpec('QS', '3.4'), dataFor(p)).rows
    expect(qs.find((r) => r.USUBJID === 'HRP-301-301-001' && r.VISIT === 'WEEK 16' && r.QSTESTCD === 'HECSI01')!.QSORRES).toBe('7')
  })
})
