// The course certificate: pass most of the missions (12 of them, on any of the studies) and the
// capstone S22, in any of your projects in this browser under the same user ID. The verification
// code is made from the name, the passed missions with their scores and levels, and the user ID,
// so a changed name or score gives a different code.

import { MISSIONS } from './missions'
import { hash } from './util'
import type { MissionRun, Project } from './project'

export const CERT_NEEDED = 12
export const CAPSTONE = 'S22'
export interface Passed { id: string; title: string; score: number; level: string; utc: string; study: string }
export function certificate(projects: Project[], userId: string, name: string) {
  const runs: (MissionRun & { study: string })[] = projects.filter((p) => p.userId === userId).flatMap((p) => p.missions.map((r) => ({ ...r, study: p.study })))
  const passed: Passed[] = MISSIONS.map((m) => {
    const best = runs.filter((r) => r.id === m.id && r.passed).sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.endedUtc ?? '').localeCompare(b.endedUtc ?? ''))[0]
    return best && { id: m.id, title: m.title, score: best.score ?? 0, level: (best.level ?? 'standard') as string, utc: best.endedUtc ?? best.startedUtc, study: m.study ?? 'GLV-12-301' }
  }).filter((x): x is Passed => !!x)
  const h = hash(`${name.trim().toLowerCase()}|${passed.map((r) => `${r.id}:${r.score}:${r.level}`).join(',')}|${userId}`).slice(-10).toUpperCase()
  const capstone = passed.some((r) => r.id === CAPSTONE)
  return { passed, capstone, eligible: passed.length >= CERT_NEEDED && capstone, total: MISSIONS.length, code: `SDTM-${h.slice(0, 5)}-${h.slice(5)}`, studies: [...new Set(passed.map((r) => r.study))] }
}
export type Certificate = ReturnType<typeof certificate>
