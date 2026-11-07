// Phase 3f: the PK study PKX-07-101 (EX with dose times, PC, PP, RELREC between them).
import { describe, expect, test } from 'vitest'
import { build, studyFns } from '../src/domain/engine'
import { check, RULE_SETS } from '../src/domain/conformance'
import { pkData, pkRaw, pkReferenceSpec, PK_PLANTED, PK_RELREC, PK_DOMAINS } from '../src/domain/pk'
import { buildRelrec, checkRelrec } from '../src/domain/relrec'
import { createProject, dataFor, isPk, isGlv } from '../src/domain/project'
import { evaluateMission, missionsFor, startMission } from '../src/domain/missions'

const data = pkData()
const ref = Object.fromEntries(PK_DOMAINS.map((d) => [d, build(pkReferenceSpec(d, '3.4'), data)]))
const rows = (d: string) => ref[d].rows

describe('PKX-07-101', () => {
  test('the raw data: 46 screened, 40 dosed, samples and parameters', () => {
    const { forms } = pkRaw()
    expect(forms.DM.length).toBe(46); expect(forms.IRT.length).toBe(40)
    expect(forms.EX.length).toBe(24 * 1 + 16 * 7)
    expect(Object.values(PK_PLANTED).every(Boolean)).toBe(true)
  })
  test('the reference mapping builds without errors and is clean under every rule set but the late trough', () => {
    for (const d of PK_DOMAINS) expect(ref[d].errors, d).toEqual({})
    for (const rs of RULE_SETS) for (const d of PK_DOMAINS) {
      const fs = check(ref[d], '3.4', { dm: d === 'DM' ? undefined : ref.DM, set: rs.id })
      if (d === 'PC') {
        expect(fs.map((f) => `${f.rule} ${f.variable}`), rs.id).toEqual(['TRN-057 PCDTC'])
        expect(fs[0].usubjid).toBe(`PKX-07-101-${PK_PLANTED.lateTrough}`)
      } else expect(fs.filter((f) => f.sev !== 'Warning'), `${rs.id} ${d}`).toEqual([])
    }
  })
  test('PC: reportable run only, BLQ, missing sample, specimen condition, timing', () => {
    const pc = rows('PC')
    const reassay = pc.filter((r) => r.USUBJID.endsWith(PK_PLANTED.reassay!) && r.PCTPTNUM === '4')
    expect(reassay.length).toBe(1)
    const miss = pc.find((r) => r.PCSTAT === 'NOT DONE')!
    expect(miss.USUBJID).toContain(PK_PLANTED.missing!); expect(miss.PCREASND).toBe('SAMPLE NOT RECEIVED'); expect(miss.PCDTC).toBe('')
    expect(pc.filter((r) => r.PCSPCCND === 'HEMOLYZED').length).toBe(1)
    const blq = pc.filter((r) => r.PCSTRESC === 'BLQ')
    expect(blq.length).toBeGreaterThan(100); expect(blq.every((r) => r.PCSTRESN === '' && r.PCLLOQ === '1')).toBe(true)
    // The 24 h sample of a Part B Day 1 dose is drawn on Day 2 and timed from the Day 1 dose.
    const s24 = pc.find((r) => r.PCTPTREF === 'DAY 1 DOSE' && r.PCTPTNUM === '24' && r.PCGRPID === 'DAY1' && rows('DM').find((d) => d.USUBJID === r.USUBJID)!.ARMCD.startsWith('MAD'))!
    expect(s24.VISIT).toBe('DAY 2'); expect(s24.PCELTM).toBe('PT24H')
    expect(pc.find((r) => r.PCTPTNUM === '-0.25')!.PCELTM).toBe('-PT15M')
    expect(pc.filter((r) => !r.PCGRPID).every((r) => /DAY [3-6] DOSE/.test(r.PCTPTREF))).toBe(true)
  })
  test('PP agrees with PC: Cmax is the highest concentration of the profile, Tmax its actual time', () => {
    const fns = studyFns(data, {}, '')
    for (const p of rows('PP').filter((r) => r.PPTESTCD === 'CMAX')) {
      const prof = rows('PC').filter((r) => r.USUBJID === p.USUBJID && r.PCGRPID === p.PPGRPID && r.PCSTRESN !== '')
      const max = Math.max(...prof.map((r) => Number(r.PCSTRESN)))
      expect(Number(p.PPSTRESN)).toBe(max)
      const tmax = rows('PP').find((r) => r.USUBJID === p.USUBJID && r.PPGRPID === p.PPGRPID && r.PPTESTCD === 'TMAX')!
      const at = prof.find((r) => Number(r.PCSTRESN) === max)!
      expect(Number(tmax.PPSTRESN)).toBeCloseTo(Math.max(0, Number(fns.hours(at.PCRFTDTC, at.PCDTC))), 1)
    }
    const nd = rows('PP').filter((r) => r.PPSTAT === 'NOT DONE')
    expect(nd.length).toBeGreaterThanOrEqual(2); expect(nd.every((r) => r.PPORRESU === '' && r.PPREASND.startsWith('NOT CALCULATED'))).toBe(true)
    expect(new Set(rows('PP').map((r) => r.PPORRESU))).toEqual(new Set(['ng/mL', 'h', 'h*ng/mL', '']))
  })
  test('RELREC relates each profile’s PP group to its PC group', () => {
    const rel = buildRelrec(PK_RELREC, ref, data)
    expect(rel.errors).toEqual({}); expect(checkRelrec(rel, ref)).toEqual([])
    expect(rel.rows.length).toBe(2 * (18 + 12 * 2))
    expect(new Set(rel.rows.map((r) => r.IDVAR))).toEqual(new Set(['PCGRPID', 'PPGRPID']))
  })
  test('isodur and hours', () => {
    const f = studyFns(data, {}, '')
    expect([-0.25, 0.5, 1, 1.5, 24, 0].map((h) => f.isodur(h))).toEqual(['-PT15M', 'PT30M', 'PT1H', 'PT1H30M', 'PT24H', 'PT0H'])
    expect(f.hours('2026-04-06T07:00', '2026-04-07T06:45')).toBe(23.75)
    expect(f.hours('2026-04-06', '2026-04-07T06:45')).toBe('')
  })
  test('PK projects: their own data and missions S19 to S21, scored 100 with the reference', () => {
   for (const v of ['3.4', '4.0d'] as const) for (const rs of RULE_SETS) {
    const p = createProject('u', 'none', v, 'PKX-07-101'); p.ruleSet = rs.id
    expect(isPk(p)).toBe(true); expect(isGlv(p)).toBe(false); expect(dataFor(p).studyId).toBe('PKX-07-101')
    expect(missionsFor(p).map((m) => m.id)).toEqual(['S19', 'S20', 'S21'])
    for (const d of PK_DOMAINS) p.specs[d] = pkReferenceSpec(d, v)
    p.relrec = structuredClone(PK_RELREC)
    for (const m of ['S19', 'S20', 'S21']) {
      startMission(p, m)
      const r = evaluateMission(p, m)
      expect(r.score, `${v} ${rs.id} ${m}: ${r.detail.join(' | ')}`).toBe(100); expect(r.passed).toBe(true)
    }
    expect(() => evaluateMission(p, 'S1')).toThrow(/GLV-12-301/)
   }
  })
})

describe('Phase 4d: hand-off to the TLF Programming Lab', () => {
  test('both studies: manifest, Dataset-JSON, XPT and define.xml for every dataset', async () => {
    const { buildHandoff, zipHandoff } = await import('../src/domain/handoff')
    const { unzipSync } = await import('fflate')
    const p = createProject('u', 'none', '3.4', 'PKX-07-101')
    for (const d of PK_DOMAINS) p.specs[d] = pkReferenceSpec(d, '3.4')
    p.relrec = structuredClone(PK_RELREC)
    const h = buildHandoff(p, dataFor(p))
    expect(h.manifest.study.id).toBe('PKX-07-101')
    expect(h.manifest.datasets.map((d) => d.name)).toEqual(expect.arrayContaining(['DM', 'EX', 'PC', 'PP', 'RELREC']))
    const pc = h.manifest.datasets.find((d) => d.name === 'PC')!
    expect(pc.keys).toEqual(['STUDYID', 'USUBJID', 'PCTESTCD', 'PCRFTDTC', 'PCTPTNUM'].filter((k) => pc.keys.includes(k)))
    expect(pc.variables.find((v) => v.name === 'PCSPEC')!.codelist).toBe('SPECTYPE')
    expect(h.manifest.validation.issues.map((i) => `${i.dataset} ${i.check}`)).toEqual(['PC TRN-057'])
    const z = unzipSync(zipHandoff(h.files))
    expect(Object.keys(z)).toEqual(expect.arrayContaining(['handoff.json', 'define.xml', 'datasets/pc.json', 'datasets/pc.xpt']))
    const pcj = JSON.parse(new TextDecoder().decode(z['datasets/pc.json']))
    expect(pcj.studyOID).toBe('PKX-07-101'); expect(pcj.records).toBe(pc.records)
    expect(new TextDecoder().decode(z['define.xml'])).toContain('<StudyName>PKX-07-101</StudyName>')
  })
})
