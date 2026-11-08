// Phase 6: the SEND study ZEN-T-0428 (SENDIG v3.1.1: DM, TX, EX, BW, CL, OM, MI).
import { describe, expect, test } from 'vitest'
import { build } from '../src/domain/engine'
import { check, RULE_SETS } from '../src/domain/conformance'
import { sendData, sendRaw, sendReferenceSpec, SEND_PLANTED, SEND_DOMAINS } from '../src/domain/send'
import { createProject, dataFor, packOf } from '../src/domain/project'
import { evaluateMission, missionsFor, startMission } from '../src/domain/missions'
import { varsOf } from '../src/domain/standards'

const data = sendData()
const ref = Object.fromEntries(SEND_DOMAINS.map((d) => [d, build(sendReferenceSpec(d, 'send'), data, 'send')]))
const rows = (d: string) => ref[d].rows
const of = (d: string, subj: string) => rows(d).filter((r) => r.USUBJID.endsWith(subj))

describe('ZEN-T-0428 (SEND)', () => {
  test('SENDIG metadata replaces the SDTMIG for DM and EX', () => {
    expect(varsOf('DM', 'send').map((v) => v.name)).toContain('SETCD')
    expect(varsOf('DM', 'send').map((v) => v.name)).not.toContain('ACTARMCD')
    expect(varsOf('EX', 'send').find((v) => v.name === 'EXTRTV')?.core).toBe('Exp')
    expect(varsOf('DM', '3.4').map((v) => v.name)).not.toContain('SETCD')
  })
  test('raw data: 100 animals in 6 sets, planted issues present', () => {
    const { forms, subjects } = sendRaw()
    expect(subjects.length).toBe(100); expect(forms.SETS.length).toBe(6)
    expect(Object.values(SEND_PLANTED).length).toBe(5); expect(Object.values(SEND_PLANTED).every(Boolean)).toBe(true)
  })
  test('the reference mapping builds cleanly with no findings under every rule set', () => {
    for (const d of SEND_DOMAINS) expect(ref[d].errors, d).toEqual({})
    for (const rs of RULE_SETS) for (const d of SEND_DOMAINS) expect(check(ref[d], 'send', { dm: d === 'DM' ? undefined : ref.DM, set: rs.id }), `${rs.id} ${d}`).toEqual([])
  })
  test('DM and TX: sets, arms and group codes', () => {
    expect(new Set(rows('DM').map((r) => r.SETCD))).toEqual(new Set(['1', '1R', '2', '3', '4', '4R']))
    expect(rows('DM').every((r) => r.SPECIES === 'RAT' && r.STRAIN === 'SPRAGUE-DAWLEY' && r.ARMCD === r.SETCD && r.AGEU === 'WEEKS')).toBe(true)
    const tx = rows('TX')
    expect(new Set(tx.map((r) => r.TXSEQ)).size).toBe(tx.length)
    expect(tx.filter((r) => r.TXPARMCD === 'TCNTRL').map((r) => `${r.SETCD} ${r.TXVAL}`).sort()).toEqual(['1 VEHICLE CONTROL', '1R VEHICLE CONTROL'])
    expect(tx.filter((r) => r.TXPARMCD === 'SPGRPCD' && r.SETCD.startsWith('4')).every((r) => r.TXVAL === '4')).toBe(true)
  })
  test('EX: the control group gets the test article at 0 with the vehicle; the early death stops on Day 17', () => {
    const ctl = rows('EX').filter((r) => r.EXDOSE === '0')
    expect(ctl.length).toBe(30); expect(ctl.every((r) => r.EXTRT === 'ZEN-55' && r.EXTRTV === '0.5% METHYLCELLULOSE')).toBe(true)
    expect(of('EX', SEND_PLANTED.earlyDeath!)[0].EXENDY).toBe('17')
  })
  test('BW: baseline, terminal fasted, unscheduled, not done and excluded', () => {
    const bw = rows('BW')
    expect(bw.filter((r) => r.BWBLFL === 'Y').length).toBe(100)
    expect(bw.filter((r) => r.BWTESTCD === 'TERMBW').every((r) => r.BWFAST === 'Y')).toBe(true)
    expect(bw.filter((r) => r.BWTESTCD === 'TERMBW').length).toBe(99)
    const un = of('BW', SEND_PLANTED.earlyDeath!).filter((r) => r.BWUSCHFL === 'Y'); expect(un.length).toBe(1); expect(un[0].BWNOMDY).toBe('')
    const nd = bw.filter((r) => r.BWSTAT === 'NOT DONE'); expect(nd.length).toBe(1); expect(nd[0].BWREASND).toBeTruthy()
    const ex = bw.filter((r) => r.BWEXCLFL === 'Y'); expect(ex.length).toBe(1); expect(ex[0].BWREASEX).toBeTruthy(); expect(ex[0].BWORRES).toBeTruthy()
  })
  test('CL: normal examinations are records; unscheduled signs for the early death', () => {
    expect(rows('CL').filter((r) => r.CLSTRESC === 'NORMAL').length).toBeGreaterThan(300)
    expect(of('CL', SEND_PLANTED.earlyDeath!).filter((r) => r.CLUSCHFL === 'Y' && !r.CLNOMDY).length).toBe(5)
  })
  test('OM and MI: three tests per organ, no brain-to-brain ratio, unremarkable tissues and a missing one', () => {
    const om = rows('OM')
    expect(om.some((r) => r.OMSPEC === 'BRAIN' && r.OMTESTCD === 'OWBR')).toBe(false)
    expect(om.length).toBe(99 * 5 * 3 - 99)
    expect(of('OM', SEND_PLANTED.earlyDeath!).length).toBe(0)
    const mi = rows('MI')
    expect(mi.filter((r) => r.MISTRESC === 'UNREMARKABLE').every((r) => r.MIORRES === 'No visible lesions' && !r.MISEV)).toBe(true)
    const nd = mi.filter((r) => r.MISTAT === 'NOT DONE'); expect(nd.length).toBe(1); expect(nd[0].MISPEC).toBe('SPLEEN')
    expect(of('MI', SEND_PLANTED.earlyDeath!).length).toBe(5)
    const hyp = mi.filter((r) => r.MISTRESC === 'HYPERTROPHY, HEPATOCELLULAR')
    expect(hyp.every((r) => r.MISPEC === 'LIVER' && r.MISEV && r.MIORRES.includes('centrilobular'))).toBe(true)
    expect(of('MI', SEND_PLANTED.recoveredLiver!).find((r) => r.MISPEC === 'LIVER')!.MISEV).toBe('MINIMAL')
  })
  test('SEND projects use SENDIG; missions S31 to S33 score 100 with the reference', () => {
    for (const rs of RULE_SETS) {
      const p = createProject('u', 'none', '3.4', 'ZEN-T-0428'); p.ruleSet = rs.id
      expect(p.version).toBe('send'); expect(packOf(p)?.id).toBe('ZEN-T-0428'); expect(dataFor(p).studyId).toBe('ZEN-T-0428')
      expect(missionsFor(p).map((m) => m.id)).toEqual(['S31', 'S32', 'S33', 'S41', 'S43'])
      for (const d of SEND_DOMAINS) p.specs[d] = sendReferenceSpec(d, 'send')
      for (const m of ['S31', 'S32', 'S33']) {
        startMission(p, m)
        const r = evaluateMission(p, m)
        expect(r.score, `${rs.id} ${m}: ${r.detail.join(' | ')}`).toBe(100); expect(r.passed).toBe(true)
      }
    }
    expect(createProject('u', 'none', 'send', 'AIR-09-202').version).toBe('3.4')
  })
})

import { planPackPackage, packFolder, buildPackGuide } from '../src/domain/packPackage'
import { packPackageFiles } from '../src/domain/packPackageBuild'
import { packageFindings, toIssues, runSummary } from '../src/domain/validation'
import { PACKS } from '../src/domain/studies'

describe('specialist study packages', () => {
  const ready = (study: string) => {
    const p = createProject('u', 'none', '3.4', study); p.ruleSet = 'FDA'
    const pack = PACKS[study]
    for (const d of pack.domains) p.specs[d] = pack.refSpec(d, p.version)
    if (pack.relrec.length) p.relrec = structuredClone(pack.relrec)
    return p
  }
  test('SEND: module 4 folder, TS with STSTDTC, nSDRG; S41 scores 100', () => {
    const p = ready('ZEN-T-0428'), data = dataFor(p)
    expect(packFolder(PACKS['ZEN-T-0428'])).toBe('m4/datasets/zen-t-0428/tabulations/send/')
    let plan = planPackPackage(p, data)
    expect(plan.findings.map((f) => f.rule)).toEqual(['PKG-007'])
    ;(p.validation ??= []).push(runSummary(p, toIssues(packageFindings(p, data))))
    plan = planPackPackage(p, data)
    expect(plan.findings).toEqual([])
    expect(plan.all.get('TS')!.rows.find((r) => r.TSPARMCD === 'STSTDTC')!.TSVAL).toBe('2026-04-14')
    const files = packPackageFiles(p, plan)
    expect(files.map((f) => f.name)).toEqual(expect.arrayContaining(['ts.xpt', 'tx.xpt', 'mi.xpt', 'define.xml', 'nsdrg.pdf']))
    expect(new TextDecoder().decode(files.find((f) => f.name === 'define.xml')!.bytes)).toContain('SENDIG')
    expect(buildPackGuide(p, plan).sections.some((s) => s.title.startsWith('Differences between the Study Report'))).toBe(true)
    startMission(p, 'S41'); const r = evaluateMission(p, 'S41')
    expect(r.score, r.detail.join(' | ')).toBe(100); expect(r.passed).toBe(true)
    // without TS the gateway would reject it
    delete p.specs.TS
    expect(planPackPackage(p, data).findings.some((f) => f.rule === 'TRC-TS' && f.sev === 'Error')).toBe(true)
  })
  test('clinical specialist studies: module 5, TS from the protocol with SSTDTC, cSDRG', () => {
    for (const study of ['AIR-09-202', 'CRD-31-401', 'PNR-18-203']) {
      const p = ready(study), data = dataFor(p)
      ;(p.validation ??= []).push(runSummary(p, toIssues(packageFindings(p, data))))
      const plan = planPackPackage(p, data)
      expect(plan.tsBuiltByTrainer).toBe(true)
      expect(plan.all.get('TS')!.rows.find((r) => r.TSPARMCD === 'SSTDTC')!.TSVAL).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(plan.findings.map((f) => f.rule), study).toEqual(['PKG-ACRF'])
      expect(packPackageFiles(p, plan).map((f) => f.name)).toContain('csdrg.pdf')
    }
  })
})
