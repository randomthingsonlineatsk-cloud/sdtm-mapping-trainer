// Phase 6: the specialist capstone S40 (across projects) and the certificate endorsements.
import { describe, expect, test } from 'vitest'
import { createProject, type Project } from '../src/domain/project'
import { finishMission, startMission, evaluatePortfolio, missionsFor, MISSIONS } from '../src/domain/missions'
import { certificate } from '../src/domain/certificate'
import { PACKS } from '../src/domain/studies'

function done(study: string, level: 'guided' | 'standard' | 'expert' = 'standard'): Project {
  const p = createProject('u1', 'none', '3.4', study); p.missionLevel = level
  const pack = PACKS[study]
  for (const d of pack.domains) p.specs[d] = pack.refSpec(d, p.version)
  if (pack.relrec.length) p.relrec = structuredClone(pack.relrec)
  for (const m of missionsFor(p)) { startMission(p, m.id); finishMission(p, m.id) }
  return p
}

describe('S40 and endorsements', () => {
  test('S40 is not listed with a study’s missions, and is offered in no classroom', () => {
    expect(missionsFor(createProject('u1', 'none', '3.4', 'ZEN-T-0428')).some((m) => m.id === 'S40')).toBe(false)
    expect(MISSIONS.find((m) => m.id === 'S40')?.kind).toBe('portfolio')
  })
  test('needs the SEND study and two clinical specialist studies, not at guided level', () => {
    const send = done('ZEN-T-0428'), ins = done('INS-22-305'), pain = done('PNR-18-203')
    expect(send.missions.every((r) => r.passed)).toBe(true)
    expect(evaluatePortfolio([send, ins], 'u1').passed).toBe(false)
    const r = evaluatePortfolio([send, ins, pain], 'u1'); expect(r.passed).toBe(true); expect(r.score).toBe(100)
    expect(evaluatePortfolio([send, ins, done('CRD-31-401', 'guided')], 'u1').passed).toBe(false)
    expect(evaluatePortfolio([done('INS-22-305'), ins, pain], 'u1').passed).toBe(false)
    // recorded in any project, it counts towards the certificate
    startMission(pain, 'S40'); finishMission(pain, 'S40', [send, ins, pain])
    const c = certificate([send, ins, pain], 'u1', 'Learner')
    expect(c.passed.some((x) => x.id === 'S40')).toBe(true)
    expect(c.endorsements).toContain('Nonclinical data (SEND)'); expect(c.endorsements).toContain('Specialist capstone S40')
    expect(c.endorsements.some((e) => e.startsWith('Therapeutic areas'))).toBe(false)
    const c3 = certificate([send, ins, pain, done('CRD-31-401')], 'u1', 'Learner')
    expect(c3.endorsements.some((e) => e.startsWith('Therapeutic areas'))).toBe(true)
  })
})
