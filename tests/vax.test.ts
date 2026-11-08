// Phase 5d: the vaccine study ALV-3-301 (CE and FA from the e-diary, VS temperatures, IS titres, EX).
import { describe, expect, test } from 'vitest'
import { build } from '../src/domain/engine'
import { check, RULE_SETS } from '../src/domain/conformance'
import { vaxData, vaxRaw, vaxReferenceSpec, VAX_PLANTED, VAX_DOMAINS } from '../src/domain/vax'
import { createProject, dataFor, packOf } from '../src/domain/project'
import { evaluateMission, missionsFor, startMission } from '../src/domain/missions'

const data = vaxData()
const ref = Object.fromEntries(VAX_DOMAINS.map((d) => [d, build(vaxReferenceSpec(d, '3.4'), data)]))
const rows = (d: string) => ref[d].rows
const of = (d: string, subj: string) => rows(d).filter((r) => r.USUBJID.endsWith(subj))

describe('ALV-3-301', () => {
  test('raw data: 63 consented, 60 vaccinated twice, planted issues present', () => {
    const { forms, subjects } = vaxRaw()
    expect(subjects.length).toBe(63); expect(forms.IRT.length).toBe(60); expect(forms.VAX.length).toBe(120)
    expect(Object.values(VAX_PLANTED).length).toBe(4); expect(Object.values(VAX_PLANTED).every(Boolean)).toBe(true)
  })
  test('the reference mapping builds cleanly with no findings under every rule set', () => {
    for (const d of VAX_DOMAINS) expect(ref[d].errors, d).toEqual({})
    for (const rs of RULE_SETS) for (const d of VAX_DOMAINS) expect(check(ref[d], '3.4', { dm: d === 'DM' ? undefined : ref.DM, set: rs.id }), `${rs.id} ${d}`).toEqual([])
  })
  test('CE: every solicited reaction per dose, pre-specified; severity is the worst day', () => {
    const ce = rows('CE')
    expect(ce.length).toBe(60 * 2 * 7); expect(ce.every((r) => r.CEPRESP === 'Y' && r.CECAT === 'REACTOGENICITY')).toBe(true)
    expect(ce.every((r) => (r.CEOCCUR === 'Y') === Boolean(r.CESEV) && (r.CEOCCUR === 'Y') === Boolean(r.CESTDTC))).toBe(true)
    expect(ce.filter((r) => r.CESCAT === 'ADMINISTRATION SITE').every((r) => r.CELOC === 'DELTOID MUSCLE' && r.CELAT)).toBe(true)
    const red = of('CE', VAX_PLANTED.smallRedness!).find((r) => r.CETPTREF === 'DOSE 1' && r.CETERM === 'Injection site redness')!
    expect(red.CEOCCUR).toBe('N')
    const fa = of('FA', VAX_PLANTED.smallRedness!).find((r) => r.FATPTREF === 'DOSE 1' && r.FAOBJ === 'Injection site redness' && r.FATPT === 'DAY 1')!
    expect([fa.FATESTCD, fa.FAORRES, fa.FAORRESU]).toEqual(['LDIAM', '20', 'mm'])
    const sev = { MILD: 1, MODERATE: 2, SEVERE: 3 } as Record<string, number>
    for (const c of ce.filter((r) => r.CEOCCUR === 'Y' && r.CETERM !== 'Fever' && r.CESCAT === 'SYSTEMIC')) {
      const days = rows('FA').filter((f) => f.USUBJID === c.USUBJID && f.FATPTREF === c.CETPTREF && f.FAOBJ === c.CETERM)
      expect(Math.max(...days.map((f) => sev[f.FASTRESC] ?? 0))).toBe(sev[c.CESEV])
    }
  })
  test('CE: a reaction continuing past Day 7 ends on the follow-up date', () => {
    const pain = of('CE', VAX_PLANTED.continuing!).find((r) => r.CETPTREF === 'DOSE 1' && r.CETERM === 'Injection site pain')!
    expect(pain.CEOCCUR).toBe('Y'); expect(Number(pain.CEENDY) - Number(pain.CESTDY)).toBeGreaterThanOrEqual(7)
  })
  test('FA and VS: seven days per dose, missed days NOT DONE, timed from the dose', () => {
    expect(rows('FA').length).toBe(60 * 2 * 6 * 7); expect(rows('VS').length).toBe(60 * 2 * 7)
    const gap = of('FA', VAX_PLANTED.diaryGap!).filter((r) => r.FASTAT === 'NOT DONE')
    expect(gap.length).toBe(6 * 3); expect(gap.every((r) => r.FATPTREF === 'DOSE 2' && r.FATPTNUM >= '5' && r.FAREASND === 'DIARY NOT COMPLETED')).toBe(true)
    expect(rows('FA').filter((r) => r.FASTAT === 'NOT DONE').length).toBe(18)
    expect(of('VS', VAX_PLANTED.diaryGap!).filter((r) => r.VSSTAT === 'NOT DONE').length).toBe(3)
    expect(rows('VS').every((r) => r.VSTESTCD === 'TEMP' && r.VSLOC === 'ORAL CAVITY' && r.VSTPTREF && r.VSRFTDTC)).toBe(true)
    for (const r of rows('FA').slice(0, 50)) expect(r.FADTC >= r.FARFTDTC.slice(0, 10)).toBe(true)
  })
  test('IS: reciprocal titres, <10 kept, QNS not done, one baseline each', () => {
    const is = rows('IS')
    expect(is.find((r) => r.ISORRES === '1:640')?.ISSTRESN ?? '640').toBe('640')
    expect(is.filter((r) => r.ISORRES === '<1:10').every((r) => r.ISSTRESC === '<10' && r.ISSTRESN === '')).toBe(true)
    const qns = of('IS', VAX_PLANTED.qns!).filter((r) => r.ISSTAT === 'NOT DONE')
    expect(qns.length).toBe(1); expect(qns[0].ISREASND).toBe('QUANTITY NOT SUFFICIENT')
    expect(is.filter((r) => r.ISLOBXFL === 'Y').length).toBe(60); expect(is.filter((r) => r.ISLOBXFL === 'Y').every((r) => r.VISITNUM === '1')).toBe(true)
  })
  test('EX: 0.5 mL intramuscular in the deltoid, placebo by volume; DM screen failure', () => {
    expect(rows('EX').every((r) => r.EXDOSE === '0.5' && r.EXDOSU === 'mL' && r.EXROUTE === 'INTRAMUSCULAR' && ['LEFT', 'RIGHT'].includes(r.EXLAT))).toBe(true)
    expect(rows('DM').filter((r) => r.ARMNRS === 'SCREEN FAILURE').length).toBe(3)
  })
  test('ALV projects: missions S29 and S30 score 100 with the reference', () => {
    for (const v of ['3.4', '4.0d'] as const) for (const rs of RULE_SETS) {
      const p = createProject('u', 'none', v, 'ALV-3-301'); p.ruleSet = rs.id
      expect(packOf(p)?.id).toBe('ALV-3-301'); expect(dataFor(p).studyId).toBe('ALV-3-301')
      expect(missionsFor(p).map((m) => m.id)).toEqual(['S29', 'S30'])
      for (const d of VAX_DOMAINS) p.specs[d] = vaxReferenceSpec(d, v)
      for (const m of ['S29', 'S30']) {
        startMission(p, m)
        const r = evaluateMission(p, m)
        expect(r.score, `${v} ${rs.id} ${m}: ${r.detail.join(' | ')}`).toBe(100); expect(r.passed).toBe(true)
      }
    }
  })
})
