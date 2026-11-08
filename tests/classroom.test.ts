// Phase 5a: classroom submissions are compressed projects that re-score to the same result.
import { describe, expect, test } from 'vitest'
import { createProject } from '../src/domain/project'
import { startMission, finishMission } from '../src/domain/missions'
import { referenceSpec } from '../src/domain/reference'
import { pkReferenceSpec, PK_DOMAINS } from '../src/domain/pk'
import { submissionPayload, verifySubmission, SUBMISSION_KIND } from '../src/domain/classroom'

describe('classroom submissions', () => {
  test('a GLV run re-scores to the same score at its level; an edited score is caught', async () => {
    const p = createProject('u'); p.missionLevel = 'expert'
    p.specs.DM = referenceSpec('DM', '3.4'); p.specs.VS = referenceSpec('VS', '3.4')
    p.specs.VS.rules.VSORRES = { kind: 'const', value: '' } as never
    startMission(p, 'S2'); const run = finishMission(p, 'S2')
    const pl = await submissionPayload(p, run)
    expect(pl.project.kind).toBe(SUBMISSION_KIND); expect(pl.project.level).toBe('expert')
    expect(pl.project.gz.length).toBeLessThan(JSON.stringify(p).length)
    pl.project.score = 100
    const v = await verifySubmission(pl.project)
    expect(v.score).toBe(run.score); expect(v.score).toBeLessThan(100)
  })
  test('a PK run submitted from a PK project re-scores on its own study', async () => {
    const p = createProject('u', 'none', '3.4', 'PKX-07-101')
    for (const d of PK_DOMAINS) p.specs[d] = pkReferenceSpec(d, '3.4')
    startMission(p, 'S20'); const run = finishMission(p, 'S20')
    const v = await verifySubmission((await submissionPayload(p, run)).project, createProject('instructor'))
    expect(v.score).toBe(100); expect(v.passed).toBe(true)
  })
  test('an unfinished run cannot be submitted', async () => {
    const p = createProject('u')
    p.specs.DM = referenceSpec('DM', '3.4')
    await expect(submissionPayload(p, startMission(p, 'S1'))).rejects.toThrow(/Finish/)
  })
})
