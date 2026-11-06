// A project: one learner's mapping work on one study, kept in this browser and exportable as a
// file. User and class IDs are part of every project so the shared classroom mode can be added
// in Phase 5.

import type { DomainSpec, StudyData } from './engine'
import { build } from './engine'
import type { Version } from './standards'
import type { RuleSet } from './conformance'
import type { DesignRow } from './design'
import type { Row } from './seed'
import type { Visit } from './study'
import { STUDY } from './study'
import { studyData, SORT } from './reference'
import { hash } from './util'

export interface ImportedStudy { protocol: string; title: string; source: string; importedUtc: string; forms: Record<string, Row[]>; visits: Visit[]; notes: string[] }
export interface MissionRun { id: string; startedUtc: string; version: Version; ruleSet?: RuleSet; domainScores?: Record<string, number>; endedUtc?: string; score?: number; passed?: boolean; detail?: string[]; perVar?: { v: string; credit: number; core: string; examples: string[] }[]; domainPass?: Record<string, boolean>; findings?: number }
export interface LogEntry { utc: string; what: string }
export interface Project {
  schema: 1; id: string; name: string; userId: string; classId: string; createdUtc: string; updatedUtc: string
  version: Version
  study: string // GLV-12-301, or the protocol of an imported CDM Console study
  imported?: ImportedStudy
  specs: Record<string, DomainSpec>
  design: Record<string, DesignRow[]> // TA, TE, TV, TI, TS as tables
  ruleSet: RuleSet
  missions: MissionRun[]
  quiz: Record<string, Record<string, number>>
  log: LogEntry[]
}

const newId = () => `p_${Date.now().toString(36)}_${hash(String(Math.random())).slice(-6)}`
export function createProject(userId = 'local-user', classId = 'none', version: Version = '3.4'): Project {
  const now = new Date().toISOString()
  return { schema: 1, id: newId(), name: `${STUDY.id} SDTM mapping`, userId, classId, createdUtc: now, updatedUtc: now, version, study: STUDY.id, specs: {}, design: {}, ruleSet: 'CDISC', missions: [], quiz: {}, log: [{ utc: now, what: 'Project created' }] }
}
export function migrate(p: Project): Project {
  p.specs ??= {}; p.design ??= {}; p.ruleSet ??= 'CDISC'; p.missions ??= []; p.quiz ??= {}; p.log ??= []; p.version ??= '3.4'; p.study ??= STUDY.id
  p.userId ??= 'local-user'; p.classId ??= 'none'
  return p
}
export function log(p: Project, what: string) { p.log.push({ utc: new Date().toISOString(), what }); if (p.log.length > 500) p.log.splice(0, p.log.length - 500) }

export function emptySpec(domain: string, source: string): DomainSpec {
  return { domain, source, vars: [], rules: {}, sort: SORT[domain] ?? ['USUBJID'] }
}

// The data the engine works on: the shipped study with its reference DM, or an imported study
// whose study-day and epoch functions read the learner's own DM.
export function dataFor(p: Project): StudyData {
  if (!p.imported) return studyData()
  const base: StudyData = { forms: p.imported.forms, studyId: p.imported.protocol, visits: p.imported.visits }
  const dmSpec = p.specs.DM
  if (dmSpec?.vars.length) {
    const b = build(dmSpec, base)
    base.refDm = new Map(b.rows.map((r) => [r.__subj, r]))
  }
  return base
}
