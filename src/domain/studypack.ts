// A study besides GLV-12-301 that the trainer ships with its own raw data, conventions,
// reference mapping and missions (the phase 1 PK study, the oncology study). GLV-12-301 keeps
// its own, richer modules (transfers, trial design, aCRF, define.xml, submission package).
import type { DomainSpec, StudyData } from './engine'
import type { RelDef } from './relrec'
import type { Version } from './standards'
import type { Visit } from './study'

export interface StudyPack {
  id: string; short: string; title: string; sponsor: string; phase: string; indication: string; design: string
  domains: string[] // domains with a reference mapping
  refSpec(domain: string, ver: Version): DomainSpec
  data(): StudyData
  dataFrom?(forms: Record<string, import('./seed').Row[]>): StudyData // the same study from the learner's own file (HRP-301 from the CDM Console)
  formInfo: Record<string, { name: string; source: string; note: string }>
  rawFields: Record<string, { name: string; label: string }[]>
  relrec: RelDef[]; relNeed: string[] // the reference RELREC and the domains it relates
  facts: { what: string; value: string }[]; conventions: { topic: string; rule: string }[]
  standard?: 'send' // a nonclinical study, mapped to SENDIG rather than the SDTMIG
  arms: { code: string; name: string }[]; sites: { id: string; name: string; country: string; iso: string }[]; visits: Visit[]
}
