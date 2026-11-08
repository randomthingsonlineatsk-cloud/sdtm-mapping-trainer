// Classroom mode: the only feature that talks to a server. It uses the shared classroom
// server (a Cloudflare Worker with a D1 database, kept in the eCTD Dossier Builder repository),
// routes under /sdtm/v1. An instructor creates a class and sets missions as assignments, each
// at a level; students join with a code, run the mission in their project and submit it; the
// instructor re-scores each submission in their own browser, comments, and sees a leaderboard.

import type { MissionRun, Project } from './project'
import { migrate } from './project'
import { evaluateMission, evaluatePortfolio, MISSIONS, PORTFOLIO } from './missions'
import { registerCustom } from './standards'

export const DEFAULT_API = 'https://ectd-classroom.randomthingsonlineatsk.workers.dev/sdtm/v1'
export const BUILT_IN_API = (import.meta.env?.VITE_CLASSROOM_API as string | undefined) || DEFAULT_API
export const SUBMISSION_KIND = 'sdtm-mapping-trainer/mission-submission'
const KEY = 'sdtm-classroom'

export interface Session { api: string; token?: string; role?: 'instructor' | 'student'; className?: string; name?: string }
export function loadSession(): Session {
  try { const s = JSON.parse(localStorage.getItem(KEY) ?? '{}'); return { ...s, api: s.api || BUILT_IN_API } } catch { return { api: BUILT_IN_API } }
}
export function saveSession(s: Session) { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private window: the session lasts for this page only */ } }

export async function api<T = Record<string, unknown>>(s: Session, method: string, path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(s.api.replace(/\/+$/, '') + path, { method, headers: { 'content-type': 'application/json', ...(s.token ? { authorization: `Bearer ${s.token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
  } catch { throw new Error('Could not reach the classroom server. Check the address and your connection.') }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `The classroom server answered ${res.status}.`)
  return data as T
}

async function gzip(text: string): Promise<string> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  const buf = new Uint8Array(await new Response(stream).arrayBuffer())
  let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(bin)
}
async function gunzip(b64: string): Promise<string> {
  const bin = atob(b64); const buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}

// What a student submits: the scored run and the whole project, compressed. The project's change
// log is left out (it can be long and plays no part in scoring).
export interface Submission { kind: typeof SUBMISSION_KIND; missionId: string; level: string; ruleSet: string; runStartedUtc: string; score: number; detail: string[]; study: string; gz: string; size: number; gzAll?: string }
// S40 is scored across the learner's projects, so its submission carries all of them (without logs).
export async function submissionPayload(p: Project, run: MissionRun, projects: Project[] = [p]) {
  if (run.score === undefined) throw new Error('Finish and score the mission before submitting it.')
  const text = JSON.stringify({ ...p, log: [] })
  const all = run.id === PORTFOLIO ? await gzip(JSON.stringify(projects.filter((x) => x.userId === p.userId && !x.imported).map((x) => ({ ...x, log: [] })))) : undefined
  const sub: Submission = { ...(all ? { gzAll: all } : {}), kind: SUBMISSION_KIND, missionId: run.id, level: run.level ?? 'standard', ruleSet: run.ruleSet ?? p.ruleSet, runStartedUtc: run.startedUtc, score: run.score, detail: run.detail ?? [], study: p.study, gz: await gzip(text), size: text.length }
  return { project: sub, score: run.score, checks: (run.detail ?? []).slice(0, 12).map((d, i) => ({ id: `d${i + 1}`, label: d.slice(0, 200), ok: run.passed ?? false })) }
}

// Re-score a submitted project with this copy of the app: the run is opened again at its level
// and rule set, and scored on the project as submitted. The submitted project's custom domains
// are registered while scoring, then the instructor's own (restore) again.
export async function verifySubmission(file: Submission, restore?: Project): Promise<{ score: number; passed: boolean; detail: string[]; project: Project }> {
  if (file?.kind !== SUBMISSION_KIND) throw new Error('This is not an SDTM Mapping Trainer mission submission.')
  if (!MISSIONS.some((m) => m.id === file.missionId)) throw new Error(`This version of the app has no mission ${file.missionId}.`)
  const p = migrate(JSON.parse(await gunzip(file.gz)) as Project)
  if (file.missionId === PORTFOLIO) return verifyPortfolio(file, p, restore)
  const run = p.missions.find((m) => m.id === file.missionId && m.startedUtc === file.runStartedUtc)
  if (!run) throw new Error(`The submitted project has no run of ${file.missionId}.`)
  p.missions.push({ ...run, score: undefined, passed: undefined, detail: undefined, endedUtc: undefined })
  p.ruleSet = (run.ruleSet ?? p.ruleSet) as Project['ruleSet']
  registerCustom(p.custom ?? [])
  try {
    const r = evaluateMission(p, file.missionId)
    return { score: r.score, passed: r.passed, detail: r.detail, project: p }
  } finally { p.missions.pop(); registerCustom(restore?.custom ?? []) }
}

// S40: every mapping-mission run in the submitted projects is scored again with this copy of the
// app, then the capstone is worked out from the re-scored runs.
async function verifyPortfolio(file: Submission, p: Project, restore?: Project) {
  if (!file.gzAll) throw new Error('This S40 submission does not carry the student’s projects.')
  const projects = (JSON.parse(await gunzip(file.gzAll)) as Project[]).map(migrate)
  const rescored: string[] = []
  try {
    for (const x of projects) {
      registerCustom(x.custom ?? [])
      for (const run of x.missions.filter((m) => m.score !== undefined && MISSIONS.find((d) => d.id === m.id)?.kind === 'map')) {
        x.missions.push({ ...run, score: undefined, passed: undefined, detail: undefined, endedUtc: undefined })
        const ruleSet = x.ruleSet; x.ruleSet = (run.ruleSet ?? x.ruleSet) as Project['ruleSet']
        try { const r = evaluateMission(x, run.id); if (r.score !== run.score) rescored.push(`${x.study} ${run.id}: reported ${run.score}%, re-scored ${r.score}%`); run.score = r.score; run.passed = r.passed }
        catch (e) { rescored.push(`${x.study} ${run.id}: could not be re-scored (${(e as Error).message})`); run.score = 0; run.passed = false }
        finally { x.missions.pop(); x.ruleSet = ruleSet }
      }
    }
  } finally { registerCustom(restore?.custom ?? []) }
  const r = evaluatePortfolio(projects, p.userId)
  return { score: r.score, passed: r.passed, detail: [...r.detail, ...(rescored.length ? rescored : ['Every counted run re-scored to the score reported'])], project: p }
}
