// Phase 4f: the oncology study ONK-44-302 (RECIST 1.1: TU, TR, RS, PR, DD and death in DM).
import { describe, expect, test } from 'vitest'
import { build } from '../src/domain/engine'
import { check, RULE_SETS } from '../src/domain/conformance'
import { onkData, onkRaw, onkReferenceSpec, ONK_PLANTED, ONK_RELREC, ONK_DOMAINS, recistTarget, recistOverall } from '../src/domain/onc'
import { buildRelrec, checkRelrec } from '../src/domain/relrec'
import { createProject, dataFor, packOf } from '../src/domain/project'
import { evaluateMission, missionsFor, startMission } from '../src/domain/missions'

const data = onkData()
const ref = Object.fromEntries(ONK_DOMAINS.map((d) => [d, build(onkReferenceSpec(d, '3.4'), data)]))
const rows = (d: string) => ref[d].rows

describe('ONK-44-302', () => {
  test('RECIST 1.1 rules', () => {
    expect(recistTarget(70, 100, 100, false)).toBe('PR')
    expect(recistTarget(71, 100, 100, false)).toBe('SD')
    expect(recistTarget(60, 100, 50, false)).toBe('PD')
    expect(recistTarget(23, 30, 19, false)).toBe('SD') // +21% over the nadir but only 4 mm
    expect(recistTarget(0, 100, 10, true)).toBe('CR')
    expect(recistOverall('CR', 'NON-CR/NON-PD', false)).toBe('PR')
    expect(recistOverall('SD', 'NON-CR/NON-PD', true)).toBe('PD')
    expect(recistOverall('CR', '', false)).toBe('CR')
  })
  test('raw data: 48 screened, 42 randomised, planted issues present', () => {
    const { forms, subjects } = onkRaw()
    expect(subjects.length).toBe(48); expect(forms.IRT.length).toBe(42)
    expect(Object.values(ONK_PLANTED).every(Boolean)).toBe(true)
  })
  test('the reference mapping builds cleanly; the site’s sum-of-diameters slip is the only finding', () => {
    for (const d of ONK_DOMAINS) expect(ref[d].errors, d).toEqual({})
    for (const rs of RULE_SETS) for (const d of ONK_DOMAINS) {
      const fs = check(ref[d], '3.4', { dm: d === 'DM' ? undefined : ref.DM, tu: ref.TU, set: rs.id })
      if (d === 'TR') { expect(fs.map((f) => `${f.rule} ${f.usubjid}`), rs.id).toEqual([`TRN-064 ONK-44-302-${ONK_PLANTED.sumError}`]) }
      else expect(fs, `${rs.id} ${d}`).toEqual([])
    }
  })
  test('TU, TR and RS agree with RECIST and with each other', () => {
    const tr = rows('TR'), rs = rows('RS'), tu = rows('TU')
    expect(new Set(tr.map((r) => r.TRTESTCD))).toEqual(new Set(['LDIAM', 'SAXIS', 'TUMSTATE', 'SUMDIAM']))
    const tstm = tr.find((r) => r.TRORRES === 'TOO SMALL TO MEASURE')!
    expect([tstm.TRORRESU, tstm.TRSTRESC, tstm.TRSTRESN, tstm.TRSTRESU]).toEqual(['', '5', '5', 'mm'])
    expect(tr.filter((r) => r.TRSTAT === 'NOT DONE').every((r) => r.USUBJID.endsWith(ONK_PLANTED.scanNotDone!))).toBe(true)
    expect(tr.some((r) => r.EPOCH === 'FOLLOW-UP' && r.USUBJID.endsWith(ONK_PLANTED.followUpScans!))).toBe(true)
    expect(new Set(rs.map((r) => r.RSEVAL))).toEqual(new Set(['INVESTIGATOR', 'INDEPENDENT ASSESSOR']))
    expect(rs.filter((r) => r.RSEVAL === 'INDEPENDENT ASSESSOR').every((r) => r.RSNAM && r.RSEVALID && !r.RSLNKGRP)).toBe(true)
    // Every investigator response points to TR records of the same visit.
    const groups = new Set(tr.map((r) => `${r.USUBJID}|${r.TRLNKGRP}`))
    expect(rs.filter((r) => r.RSLNKGRP).every((r) => groups.has(`${r.USUBJID}|${r.RSLNKGRP}`))).toBe(true)
    // New lesions: identified in TU, PD overall at that visit for the investigator.
    for (const n of tu.filter((r) => r.TUSTRESC === 'NEW')) expect(rs.find((r) => r.USUBJID === n.USUBJID && r.VISIT === n.VISIT && r.RSEVAL === 'INVESTIGATOR' && r.RSTESTCD === 'OVRLRESP')!.RSSTRESC).toBe('PD')
    // The investigator called PR at a 25-29% decrease; the data keep it.
    const pr = rs.filter((r) => r.USUBJID.endsWith(ONK_PLANTED.investigatorPR!) && r.RSEVAL === 'INVESTIGATOR' && r.RSTESTCD === 'TRGRESP')
    expect(pr.some((r) => r.RSSTRESC === 'PR')).toBe(true)
  })
  test('deaths: DM, DD, and a partial date', () => {
    const dm = rows('DM'), dd = rows('DD')
    expect(dm.filter((r) => r.DTHFL === 'Y').length).toBe(dd.length)
    expect(dm.find((r) => r.USUBJID.endsWith(ONK_PLANTED.partialDeath!))!.DTHDTC).toMatch(/^\d{4}-\d{2}$/)
    expect(dd.every((r) => r.DDTESTCD === 'PRCDTH' && r.DDSTRESC === r.DDSTRESC.toUpperCase())).toBe(true)
    expect(rows('PR').some((r) => r.PRCAT === 'RADIOTHERAPY' && r.PRDOSU === 'Gy' && Number(r.PRDOSE) >= 50)).toBe(true)
  })
  test('dataset-level RELREC: TU to TR, TR to RS', () => {
    const rel = buildRelrec(ONK_RELREC, ref, data)
    expect(rel.rows.map((r) => `${r.RELID} ${r.RDOMAIN} ${r.IDVAR} ${r.RELTYPE} ${r.USUBJID}${r.IDVARVAL}`).sort()).toEqual(['TRRS RS RSLNKGRP ONE ', 'TRRS TR TRLNKGRP MANY ', 'TUTR TR TRLNKID MANY ', 'TUTR TU TULNKID ONE '])
    expect(checkRelrec(rel, ref)).toEqual([])
  })
  test('a TR lesion missing from TU is found', () => {
    const tu = { ...ref.TU, rows: ref.TU.rows.filter((r) => !(r.USUBJID === ref.TR.rows[0].USUBJID && r.TULNKID === ref.TR.rows[0].TRLNKID)) }
    expect(check(ref.TR, '3.4', { dm: ref.DM, tu }).some((f) => f.rule === 'TRN-060')).toBe(true)
  })
  test('ONK projects: missions S24 to S26 score 100 with the reference', () => {
    for (const v of ['3.4', '4.0d'] as const) for (const rs of RULE_SETS) {
      const p = createProject('u', 'none', v, 'ONK-44-302'); p.ruleSet = rs.id
      expect(packOf(p)?.id).toBe('ONK-44-302'); expect(dataFor(p).studyId).toBe('ONK-44-302')
      expect(missionsFor(p).map((m) => m.id)).toEqual(['S24', 'S25', 'S26'])
      for (const d of ONK_DOMAINS) p.specs[d] = onkReferenceSpec(d, v)
      p.relrec = structuredClone(ONK_RELREC)
      for (const m of ['S24', 'S25', 'S26']) {
        startMission(p, m)
        const r = evaluateMission(p, m)
        expect(r.score, `${v} ${rs.id} ${m}: ${r.detail.join(' | ')}`).toBe(100); expect(r.passed).toBe(true)
      }
    }
  })
})
