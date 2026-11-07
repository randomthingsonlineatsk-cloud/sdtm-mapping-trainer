// A project: one learner's mapping work on one study, kept in this browser and exportable as a
// file. User and class IDs are part of every project so the shared classroom mode can be added
// in Phase 5.

import type { DomainSpec, StudyData } from './engine'
import { build } from './engine'
import type { Version } from './standards'
import type { RuleSet } from './conformance'
import type { DesignRow } from './design'
import type { Row, Transfer } from './seed'
import type { Plan } from './plan'
import type { RelDef } from './relrec'
import type { CustomDomain } from './standards'
import type { Visit } from './study'
import { STUDY } from './study'
import { studyData, SORT, referenceSpec, REF_DOMAINS } from './reference'
import { PK_STUDY, pkData, pkReferenceSpec, PK_DOMAINS } from './pk'
import { hash } from './util'
import type { Explanation, ValidationRun } from './validation'
import type { CsdrgNotes } from './csdrg'

export interface ImportedStudy { protocol: string; title: string; source: string; importedUtc: string; forms: Record<string, Row[]>; visits: Visit[]; notes: string[] }
export type Level = 'guided' | 'standard' | 'expert'
export interface MissionRun { id: string; startedUtc: string; version: Version; ruleSet?: RuleSet; level?: Level; domainScores?: Record<string, number>; endedUtc?: string; score?: number; passed?: boolean; detail?: string[]; perVar?: { v: string; credit: number; core: string; examples: string[] }[]; domainPass?: Record<string, boolean>; findings?: number }
export interface LogEntry { utc: string; what: string }
export interface QcResolution { status: 'Open' | 'Production corrected' | 'QC corrected' | 'Explained'; note: string; utc: string }
export interface Project {
  schema: 1; id: string; name: string; userId: string; classId: string; createdUtc: string; updatedUtc: string
  version: Version
  study: string // GLV-12-301, or the protocol of an imported CDM Console study
  imported?: ImportedStudy
  specs: Record<string, DomainSpec>
  design: Record<string, DesignRow[]> // TA, TE, TV, TI, TS as tables
  ruleSet: RuleSet
  missions: MissionRun[]
  missionLevel?: Level // the level new mission runs start at
  quiz: Record<string, Record<string, number>>
  log: LogEntry[]
  acrf?: Record<string, Record<string, string>> // annotations per CRF page and field
  relrec?: RelDef[] // relationship rules for RELREC
  custom?: CustomDomain[] // sponsor-defined domains
  plan?: Record<string, Plan> // the written mapping specifications, with their versions
  transfer?: Transfer // the data transfer the project works on (1 when absent)
  qc?: Record<string, DomainSpec> // the independent QC programs
  qcLog?: Record<string, Record<string, QcResolution>> // per domain, per difference
  qcSignoff?: Record<string, { utc: string; by: string; note: string }>
  explain?: Record<string, Explanation> // validation issues explained for the reviewer's guide, by dataset|check|variable
  validation?: ValidationRun[] // the validation runs, newest last
  csdrg?: CsdrgNotes // what the learner wrote in the reviewer's guide
}

const newId = () => `p_${Date.now().toString(36)}_${hash(String(Math.random())).slice(-6)}`
export const STUDIES = [STUDY.id, PK_STUDY.id] as const
export function createProject(userId = 'local-user', classId = 'none', version: Version = '3.4', study: string = STUDY.id): Project {
  const now = new Date().toISOString()
  return { schema: 1, id: newId(), name: `${study} SDTM mapping`, userId, classId, createdUtc: now, updatedUtc: now, version, study, specs: {}, design: {}, ruleSet: 'CDISC', missions: [], quiz: {}, log: [{ utc: now, what: 'Project created' }] }
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
// Which study a project works on: the phase 3 study GLV-12-301, the phase 1 PK study PKX-07-101,
// or a study imported from the CDM Console.
export const isPk = (p: Project) => !p.imported && p.study === PK_STUDY.id
export const isGlv = (p: Project) => !p.imported && p.study !== PK_STUDY.id
export const studyIdOf = (p: Project) => (p.imported ? p.imported.protocol : isPk(p) ? PK_STUDY.id : STUDY.id)
export const refSpecFor = (p: Project, domain: string): DomainSpec => (isPk(p) ? pkReferenceSpec(domain, p.version) : referenceSpec(domain, p.version))
export const refDomainsFor = (p: Project): string[] => (p.imported ? [] : isPk(p) ? PK_DOMAINS : REF_DOMAINS)

export function dataFor(p: Project): StudyData {
  if (isPk(p)) return pkData()
  if (!p.imported) return studyData(p.transfer ?? 1)
  const base: StudyData = { forms: p.imported.forms, studyId: p.imported.protocol, visits: p.imported.visits }
  const dmSpec = p.specs.DM
  if (dmSpec?.vars.length) {
    const b = build(dmSpec, base)
    base.refDm = new Map(b.rows.map((r) => [r.__subj, r]))
  }
  return base
}
